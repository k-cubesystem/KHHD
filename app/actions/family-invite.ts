'use server'

/**
 * 가족 초대 링크 — 서버 액션 (로드맵 R-2 「멀티 계정 가족」).
 *
 * ⚠️ 'use server' 파일의 export 는 전부 **공개 엔드포인트**다. 아래 다섯 함수는 모두
 *    맨 앞에서 인증·인가를 스스로 검사한다. UI 가드는 우회 가능하므로 여기가 방어선이다.
 *
 * 발급/취소/수락은 service_role RPC 로만 간다(테이블에 쓰기 정책이 없다).
 * 한도·자기수락·1회용 재확인은 RPC 안 어드바이저리 락 아래에서 원자적으로 한 번 더 일어난다.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { isObject } from '@/lib/utils/type-guards'
import {
  buildInviteUrl,
  inviteExpiryDate,
  isInviteToken,
  resolveInviteViewStatus,
  toInviteRejection,
  type InviteRejection,
  type InviteStatus,
  type InviteViewStatus,
} from '@/lib/domain/family/invite'
import { generateInviteToken, hashInviteToken } from '@/lib/domain/family/invite-token'
import { resolveRelationshipLimit, siteOrigin } from '@/lib/domain/family/invite-repository'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 발급은 넉넉히, 수락은 빡빡히 — 수락 쪽이 토큰 추측 시도를 태울 수 있는 경로다. */
const CREATE_RATE_LIMIT = { interval: 60 * 60 * 1000, uniqueTokenPerInterval: 20 }
const ACCEPT_RATE_LIMIT = { interval: 60 * 60 * 1000, uniqueTokenPerInterval: 10 }

export interface CreatedInvite {
  inviteId: string
  /** 원문 토큰이 실린 링크. **이 응답에만 존재한다** — 이후 어디서도 다시 꺼낼 수 없다. */
  url: string
  expiresAt: string
}

export interface FamilyInviteSummary {
  id: string
  memberId: string
  memberName: string
  relationship: string
  status: InviteViewStatus
  expiresAt: string
  createdAt: string
}

export interface LinkedFamily {
  memberId: string
  memberName: string
  relationship: string
  ownerName: string
  shrineId: string | null
  shrineName: string | null
  missionsTotal: number
  missionsCompleted: number
}

export type InviteActionResult<T> = { ok: true; data: T } | { ok: false; reason: InviteRejection }

function fail(reason: InviteRejection): { ok: false; reason: InviteRejection } {
  return { ok: false, reason }
}

/** RPC 는 테이블을 돌려준다 — 배열 첫 행만 쓰고, 모양이 어긋나면 ERROR 로 눕힌다. */
function firstRpcRow(data: unknown): Record<string, unknown> | null {
  const row = Array.isArray(data) ? data[0] : data
  return isObject(row) ? row : null
}

async function requireUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? { id: user.id } : null
}

/**
 * 초대 링크 발급. 이미 살아 있는 링크가 있으면 **그것을 무효화하고** 새로 낸다(재발급 = 구토큰 사망).
 * 멤버십 회원 전용 — 가족 관리 자체가 멤버십 게이트 뒤에 있고, 마스터는 통과한다.
 */
export async function createFamilyInviteLink(memberId: unknown): Promise<InviteActionResult<CreatedInvite>> {
  const user = await requireUser()
  if (!user) return fail('UNAUTHENTICATED')

  if (typeof memberId !== 'string' || !UUID_PATTERN.test(memberId)) return fail('NOT_FOUND')

  const limiter = await rateLimit(`family-invite-create:${user.id}`, CREATE_RATE_LIMIT)
  if (!limiter.success) return fail('RATE_LIMIT')

  const membership = await getCurrentUserMembership()
  if (!membership) return fail('NO_MEMBERSHIP')

  const token = generateInviteToken()
  const expiresAt = inviteExpiryDate()
  const maxLinked = await resolveRelationshipLimit(user.id)

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('create_family_invite', {
    p_inviter: user.id,
    p_member_id: memberId,
    p_token_hash: hashInviteToken(token),
    p_expires_at: expiresAt.toISOString(),
    p_max_linked: maxLinked,
  })

  if (error) {
    logger.error('[family-invite] 발급 RPC 실패:', error.message)
    return fail('ERROR')
  }

  const row = firstRpcRow(data)
  if (!row) return fail('ERROR')
  if (row.ok !== true) return fail(toInviteRejection(row.reason))
  if (typeof row.invite_id !== 'string') return fail('ERROR')

  revalidatePath('/protected/family')

  return {
    ok: true,
    data: {
      inviteId: row.invite_id,
      url: buildInviteUrl(siteOrigin(), token),
      expiresAt: expiresAt.toISOString(),
    },
  }
}

/** 초대 취소. 남의 초대는 RPC 가 inviter_id 로 걸러 0행을 돌려준다 → FORBIDDEN. */
export async function revokeFamilyInviteLink(inviteId: unknown): Promise<InviteActionResult<null>> {
  const user = await requireUser()
  if (!user) return fail('UNAUTHENTICATED')

  if (typeof inviteId !== 'string' || !UUID_PATTERN.test(inviteId)) return fail('NOT_FOUND')

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('revoke_family_invite', {
    p_inviter: user.id,
    p_invite_id: inviteId,
  })

  if (error) {
    logger.error('[family-invite] 취소 RPC 실패:', error.message)
    return fail('ERROR')
  }
  if (data !== true) return fail('FORBIDDEN')

  revalidatePath('/protected/family')
  return { ok: true, data: null }
}

/**
 * 내가 낸 초대 목록. RLS(family_invites_select_own)에 그대로 기대므로 사용자 클라이언트로 읽는다 —
 * 여기서 service_role 을 쓰면 정책이 살아 있는지 아무도 모르게 된다.
 */
export async function listFamilyInviteLinks(): Promise<FamilyInviteSummary[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('family_invites')
    .select('id, family_member_id, status, expires_at, created_at')
    .eq('inviter_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('[family-invite] 목록 조회 실패:', error.message)
    return []
  }

  const rows = (data ?? []).filter((raw) => typeof raw.id === 'string' && typeof raw.family_member_id === 'string')
  if (rows.length === 0) return []

  // 이름은 따로 읽는다 — PostgREST 임베드는 관계 캐시가 어긋나면 조용히 빈 목록이 된다.
  const { data: memberRows } = await supabase
    .from('family_members')
    .select('id, name, relationship')
    .in(
      'id',
      rows.map((raw) => raw.family_member_id as string)
    )

  const memberById = new Map((memberRows ?? []).map((m) => [m.id as string, m]))
  const now = new Date()

  return rows.map((raw): FamilyInviteSummary => {
    const member = memberById.get(raw.family_member_id as string)
    return {
      id: raw.id as string,
      memberId: raw.family_member_id as string,
      memberName: typeof member?.name === 'string' ? member.name : '가족',
      relationship: typeof member?.relationship === 'string' ? member.relationship : '가족',
      status: resolveInviteViewStatus(raw.status as InviteStatus, String(raw.expires_at), now),
      expiresAt: String(raw.expires_at),
      createdAt: String(raw.created_at),
    }
  })
}

/**
 * 초대 수락 — 링크를 받은 쪽이 부른다.
 *
 * 로그인 필수 · 자기수락 금지 · 한도 · 1회용 · 만료를 모두 통과해야 연결이 선다.
 * 마지막 판정은 전부 RPC 안에서 원자적으로 다시 일어난다(여기 검사는 빠른 거절용).
 */
export async function acceptFamilyInviteLink(
  token: unknown
): Promise<InviteActionResult<{ memberName: string; memberId: string }>> {
  const user = await requireUser()
  if (!user) return fail('UNAUTHENTICATED')

  if (!isInviteToken(token)) return fail('INVALID_TOKEN')

  const limiter = await rateLimit(`family-invite-accept:${user.id}`, ACCEPT_RATE_LIMIT)
  if (!limiter.success) return fail('RATE_LIMIT')

  const admin = createAdminClient()

  // 초대자를 먼저 알아야 「초대자 등급의 한도」를 계산할 수 있다. 해시로만 찾는다.
  const { data: inviteRow, error: lookupError } = await admin
    .from('family_invites')
    .select('inviter_id')
    .eq('token_hash', hashInviteToken(token))
    .maybeSingle()

  if (lookupError) {
    logger.error('[family-invite] 수락 전 조회 실패:', lookupError.message)
    return fail('ERROR')
  }

  const inviterId = (inviteRow as { inviter_id?: string } | null)?.inviter_id
  if (!inviterId) return fail('NOT_FOUND')
  if (inviterId === user.id) return fail('SELF')

  const maxLinked = await resolveRelationshipLimit(inviterId)

  const { data, error } = await admin.rpc('accept_family_invite', {
    p_token_hash: hashInviteToken(token),
    p_accepter: user.id,
    p_max_linked: maxLinked,
  })

  if (error) {
    logger.error('[family-invite] 수락 RPC 실패:', error.message)
    return fail('ERROR')
  }

  const row = firstRpcRow(data)
  if (!row) return fail('ERROR')
  if (row.ok !== true) return fail(toInviteRejection(row.reason))

  revalidatePath('/protected/family')

  return {
    ok: true,
    data: {
      memberName: typeof row.member_name === 'string' ? row.member_name : '가족',
      memberId: typeof row.member_id === 'string' ? row.member_id : '',
    },
  }
}

/**
 * 내가 연결된 가족들(v1 최소 폭) — 자리·신당·미션 진척만 읽는다.
 * 전부 사용자 클라이언트 + RLS(*_select_family_linked)로 읽는다. 소유자 이름만 표시용으로 admin 경유.
 */
export async function getLinkedFamilies(): Promise<LinkedFamily[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: members, error } = await supabase
    .from('family_members')
    .select('id, name, relationship, user_id')
    .eq('linked_user_id', user.id)

  if (error) {
    logger.error('[family-invite] 연결 가족 조회 실패:', error.message)
    return []
  }
  if (!members || members.length === 0) return []

  const memberIds = members.map((m) => m.id as string)
  const ownerIds = Array.from(new Set(members.map((m) => m.user_id as string)))

  const admin = createAdminClient()
  const [{ data: shrines }, { data: missions }, { data: owners }] = await Promise.all([
    supabase.from('shrines').select('id, name, family_member_id').in('family_member_id', memberIds),
    supabase.from('bok_missions').select('family_member_id, is_completed').in('family_member_id', memberIds),
    admin.from('profiles').select('id, full_name').in('id', ownerIds),
  ])

  const shrineByMember = new Map<string, { id: string; name: string | null }>()
  for (const s of shrines ?? []) {
    if (typeof s.family_member_id === 'string') {
      shrineByMember.set(s.family_member_id, { id: s.id as string, name: (s.name as string | null) ?? null })
    }
  }

  const missionStats = new Map<string, { total: number; done: number }>()
  for (const m of missions ?? []) {
    const key = m.family_member_id as string | null
    if (!key) continue
    const stat = missionStats.get(key) ?? { total: 0, done: 0 }
    stat.total += 1
    if (m.is_completed === true) stat.done += 1
    missionStats.set(key, stat)
  }

  const ownerNames = new Map<string, string>()
  for (const o of owners ?? []) {
    const name = (o.full_name as string | null)?.trim()
    ownerNames.set(o.id as string, name && name.length > 0 ? name : '가족')
  }

  return members.map((m) => {
    const memberId = m.id as string
    const shrine = shrineByMember.get(memberId) ?? null
    const stat = missionStats.get(memberId) ?? { total: 0, done: 0 }
    return {
      memberId,
      memberName: (m.name as string) ?? '가족',
      relationship: (m.relationship as string) ?? '가족',
      ownerName: ownerNames.get(m.user_id as string) ?? '가족',
      shrineId: shrine?.id ?? null,
      shrineName: shrine?.name ?? null,
      missionsTotal: stat.total,
      missionsCompleted: stat.done,
    }
  })
}
