'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { logger } from '@/lib/utils/logger'

/**
 * 가족 사랑방 데이터 (PRD-shrine-gamefeel-v1 §안3 / ARCH §3·§7).
 *
 * 사랑방은 **FAMILY 멤버십 킬러 씬**이다. 게이트는 lib/auth/subscription.ts 단일 기준을 거치고
 * (마스터 무제한은 그 안에서 lib/auth/privileges.ts 로 판정된다 — 여기서 role 검사 금지),
 * presence 는 서버 스코프가 고정된 RPC 하나로만 가져온다(직접 select 금지 — wallets RPC 교훈).
 *
 * 실시간이 아니다. 진입 시 1회 로드하고 끝낸다(PRD §7: presence 는 "다음 진입 시 재생").
 */

/** 사랑방이 열리는 등급. MASTER 는 subscription.ts 가 privileges 기준으로 붙여 주는 값이다. */
const FAMILY_HALL_TIERS: ReadonlySet<string> = new Set(['FAMILY', 'BUSINESS', 'MASTER'])

export interface FamilyHallMember {
  /** null = 본인 좌석 (family_members 행이 아니다) */
  memberId: string | null
  name: string
  relationship: string
  /** lib/domain/family/avatars.ts 카탈로그 id. 미설정·본인은 null */
  avatarId: string | null
  /** 오늘(KST) 그 대상 신당에 소유자가 기도(소원)했는가 */
  prayedToday: boolean
  /** 마지막 기도 시각 ISO. 한 번도 없으면 null */
  lastWishAt: string | null
}

export interface FamilyHallData {
  /** false = 사랑방 잠김(비 FAMILY·비로그인). 업셀 씬을 렌더한다. */
  isFamilyTier: boolean
  members: FamilyHallMember[]
  /** 좌석이 1개 이상이고 전원이 오늘 기도했는가 — 만개 연출 조건 */
  allPrayedToday: boolean
}

/** 잠긴 사랑방의 고정 응답. 데이터 자체를 내리지 않는다(ARCH §7). */
const LOCKED: FamilyHallData = { isFamilyTier: false, members: [], allPrayedToday: false }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

/** RPC 행 → 좌석. 형태가 어긋난 행은 버린다(부분 손상이 화면 전체를 깨뜨리지 않게). */
function toMember(row: unknown): FamilyHallMember | null {
  if (!isRecord(row)) return null
  const name = str(row.name)
  if (!name) return null
  return {
    memberId: str(row.member_id),
    name,
    relationship: str(row.relationship) ?? '가족',
    avatarId: str(row.avatar_id),
    prayedToday: row.prayed_today === true,
    lastWishAt: str(row.last_wish_at),
  }
}

/**
 * 사랑방 좌석 presence. 비 FAMILY·비로그인은 좌석을 내리지 않고 잠금 상태만 돌려준다(업셀 씬용).
 *
 * 조회 실패(RPC 미적용·장애) 시에도 **등급은 유지**한다 — 돈을 낸 FAMILY 회원에게
 * 업셀 문을 보여주는 것이 빈 방보다 나쁘기 때문이다. 빈 좌석은 컴포넌트가 빈 상태로 안내한다.
 */
export async function getFamilyHallData(): Promise<FamilyHallData> {
  // 인증 + 등급을 한 번에 — getCurrentUserMembership 은 비로그인이면 null 을 준다.
  const membership = await getCurrentUserMembership()
  if (!membership || !FAMILY_HALL_TIERS.has(membership.tier)) return LOCKED

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_family_hall_presence')

  if (error) {
    logger.error('[family-hall] presence RPC failed:', error)
    return { isFamilyTier: true, members: [], allPrayedToday: false }
  }

  const rows: unknown = data
  const members = (Array.isArray(rows) ? rows : []).map(toMember).filter((m): m is FamilyHallMember => m !== null)

  return {
    isFamilyTier: true,
    members,
    allPrayedToday: members.length > 0 && members.every((m) => m.prayedToday),
  }
}
