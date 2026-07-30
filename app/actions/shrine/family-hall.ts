'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { logger } from '@/lib/utils/logger'
import { parseHallSeats, type HallSeatMap } from '@/lib/domain/shrine/family-hall-layout'

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
  /**
   * 사용자가 끌어 옮긴 좌석 좌표(키 = 본인 'self' / 가족 family_members.id).
   * 비어 있으면 전부 자동 반원 배치 — 저장한 적 없는 신당은 여기가 `{}` 라 화면이 종전과 같다.
   */
  seats: HallSeatMap
}

/** 잠긴 사랑방의 고정 응답. 데이터 자체를 내리지 않는다(ARCH §7). */
const LOCKED: FamilyHallData = { isFamilyTier: false, members: [], allPrayedToday: false, seats: {} }

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

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/**
 * 사랑방 좌석 배치는 **본인 신당 행(shrines.hall_seats)** 에 산다.
 * 사랑방 자체가 본인 신당 탭에서만 열리므로(page.tsx) 배치도 그 한 행에 모인다 — 새 테이블 0.
 *
 * ⚠️ `.is('family_member_id', null)` 없이 조회하면 가족별 신당 행을 잡는다(같은 테이블·같은 user_id).
 * ⚠️ select('*') 인 이유: hall_seats 는 20260730 마이그레이션 이후에만 존재한다. 컬럼을 명시하면
 *    미적용 DB에서 조회가 통째로 실패해 사랑방이 잠긴 것처럼 보인다 — 없는 컬럼은 undefined 로 흘려보낸다.
 */
async function loadHallSeats(supabase: SupabaseServer, userId: string): Promise<HallSeatMap> {
  const { data, error } = await supabase
    .from('shrines')
    .select('*')
    .eq('user_id', userId)
    .is('family_member_id', null)
    .maybeSingle()
  if (error) {
    logger.warn('[family-hall] seat layout load failed:', error)
    return {}
  }
  return parseHallSeats(isRecord(data) ? data.hall_seats : null)
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [presence, seats] = await Promise.all([
    supabase.rpc('get_family_hall_presence'),
    user ? loadHallSeats(supabase, user.id) : Promise.resolve<HallSeatMap>({}),
  ])
  const { data, error } = presence

  if (error) {
    logger.error('[family-hall] presence RPC failed:', error)
    return { isFamilyTier: true, members: [], allPrayedToday: false, seats }
  }

  const rows: unknown = data
  const members = (Array.isArray(rows) ? rows : []).map(toMember).filter((m): m is FamilyHallMember => m !== null)

  return {
    isFamilyTier: true,
    members,
    allPrayedToday: members.length > 0 && members.every((m) => m.prayedToday),
    seats,
  }
}

/**
 * 사랑방 좌석 배치 저장(꾸미기 모드 드래그 종료 / 초기화).
 *
 * 보안 — 이 파일은 'use server' 라 export 가 곧 공개 엔드포인트다:
 * · 재화·권한을 건드리지 않는다. 쓰는 것은 본인 신당 한 행의 `hall_seats` 좌표뿐이다.
 * · 등급 게이트는 읽기와 같은 기준(FAMILY_HALL_TIERS) — 사랑방이 잠긴 계정은 쓰지도 못한다.
 * · 소유자 검증을 액션에서 한다(`user_id = auth.uid()` + `family_member_id IS NULL`). RLS 는 2중 방어.
 * · 좌표는 **서버에서 다시 클램프**한다(parseHallSeats) — 클라 클램프를 신뢰하지 않는다.
 *
 * `null`·`{}` 를 주면 전부 자동 반원 배치로 되돌아간다(초기화 경로).
 */
export async function saveFamilyHallSeats(seats: HallSeatMap | null): Promise<{ success: boolean; error?: string }> {
  const membership = await getCurrentUserMembership()
  if (!membership) return { success: false, error: 'UNAUTHORIZED' }
  if (!FAMILY_HALL_TIERS.has(membership.tier)) return { success: false, error: 'FORBIDDEN' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const parsed = parseHallSeats(seats)

  const { error } = await supabase
    .from('shrines')
    .update({ hall_seats: parsed })
    .eq('user_id', user.id)
    // ⚠️ 본인 신당 행만 — 빼면 가족별 신당 행까지 함께 덮어쓴다
    .is('family_member_id', null)

  if (error) {
    logger.error('[family-hall] seat layout save failed:', error)
    return { success: false, error: 'SAVE_FAILED' }
  }

  // revalidatePath 를 부르지 않는다(고의) — 드래그 1회마다 라우트 전체가 다시 렌더되면
  // 씬·기원·presence 를 전부 다시 읽는다. 화면은 이미 클라 낙관 상태가 들고 있고,
  // 다음 진입에 서버 정본이 내려온다(보기 모드 점화 setPlacementLit 과 같은 규약).
  return { success: true }
}
