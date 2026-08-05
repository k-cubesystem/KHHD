/**
 * 세간(가구) — 가족 한 사람에게 바치는 자리. 시렁이 원형(原型)이다.
 *
 * 벽에 매어 기물을 얹는 전통 선반이 시렁이다. 여기서는 세간 하나에 **가족 한 명을 지정**하고,
 * 그 사람의 정령 오행에 맞는 신물을 곁에 두면 세간이 깨어난다(축복). 가족이 사랑방 바닥에
 * 앉아만 있던 것에서 — 각자 **자기 자리**가 생긴다. 시렁만이 아니라 제상·소반·반닫이·문갑·
 * 보료·병풍·방석까지, 상점 「시렁·세간」 갈래 전부가 자리다.
 *
 * ⚠️ 얹힘 판정은 **거리**다(부모-자식 테이블이 아니라). 배치 자유도 v2의 자유 배치를 그대로
 *    쓰고, 세간 반경 안의 신물을 "얹힌 것"으로 센다 — 공명(detectResonance)과 같은 문법이라
 *    사용자가 새로 배울 것이 없다.
 * ⚠️ 필요한 오행 = 그 가족의 **수호 정령 오행**(family_members.avatar_id → FamilyAvatar.element).
 *    사주를 다시 계산하지 않는 이유: 정령은 그 사람이 직접 고른 자기 기운이고, 이미 아바타
 *    색·기운지도가 전부 그 오행으로 그려진다 — 여기만 다른 기준을 쓰면 세계가 갈라진다.
 */

import type { CatalogItem, Element, Placement } from './types'
import { findFamilyAvatar } from '@/lib/domain/family/avatars'

/** 카탈로그 type — DB CHECK 와 문자열이 같아야 한다. */
export const SHELF_TYPE = 'shelf'

/**
 * 가족 자리가 되는 세간 type 전부 — 상점 「시렁·세간」 갈래와 **단일 출처**다
 * (shop-sections 가 이 배열을 그대로 쓰고, 테스트가 대조한다). 여기 없는 type 에
 * 가족을 붙이면 이름표가 방을 뒤덮으므로 서버 액션도 이 목록으로 거른다.
 */
export const FAMILY_SEAT_TYPES: readonly string[] = Object.freeze([
  'shelf',
  'screen',
  'cushion',
  'statue',
  'table',
  'chest',
])

/** 가족 한 사람을 지정할 수 있는 세간인가. */
export function isFamilySeat(item: Pick<CatalogItem, 'type'> | null | undefined): boolean {
  return item != null && FAMILY_SEAT_TYPES.includes(item.type)
}

/**
 * 진열대 — **위에 아이템을 얹어 진열하는** 세간(시렁 널·제상/소반 상판·반닫이/문갑 윗면).
 * 자리(FAMILY_SEAT_TYPES)의 부분집합이다: 보료·방석·병풍은 자리이되 진열대는 아니다
 * (요 위·병풍 위에 물건을 얹는 살림은 없다 — 곁에 두는 것까지가 문법).
 * 진열대는 ① 드래그 스냅 앵커(진열 칸)를 노출하고 ② 위에 얹힌 아이템의 z 를 끌어올리고
 * ③ 옮길 때 얹힌 아이템을 함께 데려간다.
 */
export const SEAT_SURFACE_TYPES: readonly string[] = Object.freeze(['shelf', 'table', 'chest'])

export function isSeatSurface(item: Pick<CatalogItem, 'type'> | null | undefined): boolean {
  return item != null && SEAT_SURFACE_TYPES.includes(item.type)
}

/**
 * 진열대 스냅 앵커 id 프리픽스 — `seat:<배치id>:<칸번호>`.
 * ⚠️ 저장 경로(saveShrineLayout)가 이 프리픽스로 **존 클램프를 건너뛴다**: 제물(altar 존
 *    y48~58)이 바닥 가구 상판(존 밖)에 얹히는 유일한 경로다. 층 존은 UX 가드일 뿐 보안
 *    경계가 아니고(RLS 가 소유권을 지킨다), 절대 범위 [0,100] 클램프는 유지된다.
 * ⚠️ 전체 교체 저장이 배치 id 를 재발급하므로 저장 뒤 프리픽스 뒤 id 는 **dangling 이 정상**이다 —
 *    진열 관계(z·동반 이동·축복)는 전부 거리로 다시 판정하고, 이 문자열은 존 우회 표식으로만 산다.
 */
export const SEAT_ANCHOR_PREFIX = 'seat:'

/**
 * 얹힘 반경(% 좌표 유클리드). 공명(22)보다 좁다 — 자리는 "그 위·곁"이지 "근처"가 아니다.
 * 시렁 널 폭(md 기준 화면 약 26%)의 절반보다 조금 넉넉한 값.
 */
export const SHELF_RADIUS = 15

/**
 * 크기별 얹힘 반경 — lg 진열대(제상)는 확대 표시로 상판이 넓어, 15%로는 상판 가장자리의
 * 제물이 "얹혔는데 안 얹힌 것"이 된다. ⚠️ sm·md 는 15 그대로다(무손실 — 라이브 시렁의
 * 축복 판정이 좁아지면 기존 배치가 다음 로드에 어두워진다). 넓히는 방향만 허용.
 */
export const SEAT_RADIUS: Readonly<Record<'sm' | 'md' | 'lg', number>> = Object.freeze({
  sm: SHELF_RADIUS,
  md: SHELF_RADIUS,
  lg: 19,
})

export function seatRadius(size: 'sm' | 'md' | 'lg' | null | undefined): number {
  return (size && SEAT_RADIUS[size]) || SHELF_RADIUS
}

/** 크기별 얹을 수 있는 신물 수 — 널(상판) 길이가 다르다. 세간 전 종 공통. */
export const SHELF_CAPACITY: Readonly<Record<'sm' | 'md' | 'lg', number>> = Object.freeze({
  sm: 2,
  md: 3,
  lg: 4,
})

/**
 * 진열 칸 — 진열대 **중심 기준 % 오프셋**. 칸 수 = SHELF_CAPACITY(소2·중3·대4).
 * dy 가 음수인 것이 문법이다: 배치 좌표는 중심점(translate -50%,-50%)이고, 얹힌 물건의
 * 중심은 진열대 중심보다 위(상판 언저리)에 있어야 "위에 섰다"로 읽힌다.
 * 값은 확대 표시 규격(FURNITURE_PX × 3.2em)의 상판 폭을 눈대중한 것 — 앵커는 자석 보너스이지
 * 제약이 아니라(자유 배치 그대로), 정밀도보다 "탁 붙는 손맛"이 목적이다.
 */
export const SURFACE_SLOTS: Readonly<Record<'sm' | 'md' | 'lg', ReadonlyArray<{ dx: number; dy: number }>>> =
  Object.freeze({
    sm: Object.freeze([Object.freeze({ dx: -4, dy: -3.5 }), Object.freeze({ dx: 4, dy: -3.5 })]),
    md: Object.freeze([
      Object.freeze({ dx: -6, dy: -4 }),
      Object.freeze({ dx: 0, dy: -4.5 }),
      Object.freeze({ dx: 6, dy: -4 }),
    ]),
    lg: Object.freeze([
      Object.freeze({ dx: -9, dy: -4.5 }),
      Object.freeze({ dx: -3, dy: -5.5 }),
      Object.freeze({ dx: 3, dy: -5.5 }),
      Object.freeze({ dx: 9, dy: -4.5 }),
    ]),
  })

export function surfaceSlotOffsets(
  size: 'sm' | 'md' | 'lg' | null | undefined
): ReadonlyArray<{ dx: number; dy: number }> {
  return (size && SURFACE_SLOTS[size]) || SURFACE_SLOTS.md
}

/**
 * 진열대 **위** 판정 — 반경 안이면서 진열대 중심보다 위쪽(상판 언저리)에 있는가.
 * 축복(readShelf)은 "곁"까지 세지만, z 끌어올림·동반 이동은 "위"만 건드린다 —
 * 진열대 앞에 세워 둔 물건이 갑자기 진열대 앞으로 튀어나오거나 같이 끌려가면 안 된다.
 */
export function isOnSurface(
  item: Pick<Placement, 'x' | 'y'>,
  seat: Pick<Placement, 'x' | 'y'>,
  size: 'sm' | 'md' | 'lg' | null | undefined
): boolean {
  const dx = item.x - seat.x
  const dy = item.y - seat.y
  if (dy > 2) return false
  return Math.sqrt(dx * dx + dy * dy) <= seatRadius(size)
}

export function isShelf(item: Pick<CatalogItem, 'type'> | null | undefined): boolean {
  return item?.type === SHELF_TYPE
}

/** 가족의 수호 정령 오행. 아바타 미설정·경로형(본인 사진)은 null — 오행 매칭 없이 이름표만 단다. */
export function familyGuardianElement(avatarId: string | null | undefined): Element | null {
  if (!avatarId) return null
  return findFamilyAvatar(avatarId)?.element ?? null
}

export interface ShelfReading {
  /** 반경 안의 신물 수(시렁 자신 제외) */
  laid: number
  /** 그중 지정된 가족의 정령 오행과 맞는 수 */
  matched: number
  /** 얹을 수 있는 상한 */
  capacity: number
  /** 축복 발동 — 가족이 지정되어 있고, 맞는 오행이 하나라도 얹혀 있다 */
  blessed: boolean
}

/**
 * 자리(세간) 하나를 읽는다.
 *
 * ⚠️ 가족은 지정됐는데 정령 오행이 없으면(경로형 아바타) **얹힌 것 전부를 맞는 것으로 친다** —
 *    "무엇을 얹어도 그 사람 것"이다. 오행을 모른다고 축복을 영영 잠그면, 아바타를 사진으로 둔
 *    가족만 이 기능에서 배제된다.
 */
export function readShelf(
  shelf: Placement,
  guardian: Element | null,
  hasMember: boolean,
  placements: readonly Placement[],
  catalogById: ReadonlyMap<string, CatalogItem>
): ShelfReading {
  const size = catalogById.get(shelf.catalogItemId)?.size ?? 'md'
  const capacity = SHELF_CAPACITY[size]
  const radius = seatRadius(size)

  let laid = 0
  let matched = 0
  for (const p of placements) {
    if (p.id === shelf.id) continue
    const item = catalogById.get(p.catalogItemId)
    if (!item || isFamilySeat(item)) continue // 세간 위의 세간은 얹은 것으로 세지 않는다
    const dx = p.x - shelf.x
    const dy = p.y - shelf.y
    if (Math.sqrt(dx * dx + dy * dy) > radius) continue
    laid += 1
    if (guardian === null || item.element === guardian) matched += 1
  }

  return {
    laid,
    matched,
    capacity,
    blessed: hasMember && matched >= 1,
  }
}
