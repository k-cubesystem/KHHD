/**
 * 가족 초대 — 서버 전용 조회 계층.
 *
 * 서버 액션('use server')과 공개 수락 페이지(RSC)가 같은 판정을 쓰도록 여기 모은다.
 * 'use server' 파일은 export 가 곧 공개 엔드포인트라 이런 내부 함수를 둘 수 없다.
 *
 * ⚠️ 클라이언트 컴포넌트에서 import 금지(service_role 클라이언트를 잡는다).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { hasUnlimitedAccess, UNLIMITED_TIER_LIMITS } from '@/lib/auth/privileges'
import { logger } from '@/lib/utils/logger'
import { resolveInviteViewStatus, type InviteStatus, type InviteViewStatus } from './invite'
import { hashInviteToken } from './invite-token'

/**
 * 무료 회원 인연 한도. 보호파일 app/actions/payment/membership.ts 의 기본값과 같은 수다.
 * ⚠️ 그쪽 getUserTierLimits 는 **현재 로그인 사용자 전용**이라 초대자(=타인)의 한도에는 못 쓴다.
 *    그래서 같은 규칙을 여기서 admin 클라이언트로 다시 읽는다. 마스터 판정만은 privileges.ts 단일 기준.
 */
const FREE_RELATIONSHIP_LIMIT = 3
const TESTER_RELATIONSHIP_LIMIT = 10

/** 임의 사용자의 인연 한도. 조회 실패는 무료 한도로 내려앉는다(안전 측 실패). */
export async function resolveRelationshipLimit(userId: string): Promise<number> {
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  const role = (profile as { role?: string } | null)?.role ?? null

  if (hasUnlimitedAccess(role)) return UNLIMITED_TIER_LIMITS.relationship_limit
  if (role === 'tester') return TESTER_RELATIONSHIP_LIMIT

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('membership_plans(relationship_limit)')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const plans = (subscription as { membership_plans?: unknown } | null)?.membership_plans
  const plan = Array.isArray(plans) ? plans[0] : plans
  const limit = (plan as { relationship_limit?: number } | null | undefined)?.relationship_limit

  return typeof limit === 'number' && limit > 0 ? limit : FREE_RELATIONSHIP_LIMIT
}

export interface InvitePreview {
  inviterId: string
  familyMemberId: string
  /** 초대한 사람의 표시 이름. 없으면 '가족'. 이메일은 절대 싣지 않는다. */
  inviterName: string
  /** 초대받은 자리(가족 구성원)의 이름·관계. */
  memberName: string
  relationship: string
  status: InviteViewStatus
  expiresAt: string
}

interface InviteRow {
  inviter_id: string
  family_member_id: string
  status: InviteStatus
  expires_at: string
}

/**
 * 토큰으로 초대장을 미리 본다(미로그인 방문자도 이 화면을 본다).
 *
 * 노출 폭은 「누가·어느 자리로 불렀는가」까지다 — 생년월일·사주·이메일 따위는 싣지 않는다.
 * 토큰이 없거나 형식이 어긋나면 호출부에서 이미 끊는다.
 */
export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('family_invites')
    .select('inviter_id, family_member_id, status, expires_at')
    .eq('token_hash', hashInviteToken(token))
    .maybeSingle()

  if (error) {
    logger.error('[family-invite] 초대 조회 실패:', error.message)
    return null
  }
  if (!data) return null

  const invite = data as InviteRow

  const [{ data: profile }, { data: member }] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', invite.inviter_id).maybeSingle(),
    admin.from('family_members').select('name, relationship').eq('id', invite.family_member_id).maybeSingle(),
  ])

  const inviterName = (profile as { full_name?: string | null } | null)?.full_name?.trim()
  const memberRow = member as { name?: string; relationship?: string } | null

  return {
    inviterId: invite.inviter_id,
    familyMemberId: invite.family_member_id,
    inviterName: inviterName && inviterName.length > 0 ? inviterName : '가족',
    memberName: memberRow?.name ?? '가족',
    relationship: memberRow?.relationship ?? '가족',
    status: resolveInviteViewStatus(invite.status, invite.expires_at),
    expiresAt: invite.expires_at,
  }
}
