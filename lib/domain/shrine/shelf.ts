/**
 * 시렁(선반) — 가족 한 사람에게 바치는 자리.
 *
 * 벽에 매어 기물을 얹는 전통 선반이 시렁이다. 여기서는 그 위에 **가족 한 명을 지정**하고,
 * 그 사람의 정령 오행에 맞는 신물을 얹으면 시렁이 깨어난다(축복). 가족이 사랑방 바닥에
 * 앉아만 있던 것에서 — 각자 **자기 자리**가 생긴다.
 *
 * ⚠️ 얹힘 판정은 **거리**다(부모-자식 테이블이 아니라). 배치 자유도 v2의 자유 배치를 그대로
 *    쓰고, 시렁 반경 안의 신물을 "얹힌 것"으로 센다 — 공명(detectResonance)과 같은 문법이라
 *    사용자가 새로 배울 것이 없다.
 * ⚠️ 필요한 오행 = 그 가족의 **수호 정령 오행**(family_members.avatar_id → FamilyAvatar.element).
 *    사주를 다시 계산하지 않는 이유: 정령은 그 사람이 직접 고른 자기 기운이고, 이미 아바타
 *    색·기운지도가 전부 그 오행으로 그려진다 — 시렁만 다른 기준을 쓰면 세계가 갈라진다.
 */

import type { CatalogItem, Element, Placement } from './types'
import { findFamilyAvatar } from '@/lib/domain/family/avatars'

/** 카탈로그 type — DB CHECK 와 문자열이 같아야 한다. */
export const SHELF_TYPE = 'shelf'

/**
 * 얹힘 반경(% 좌표 유클리드). 공명(22)보다 좁다 — 시렁은 "그 위"이지 "근처"가 아니다.
 * 시렁 널 폭(md 기준 화면 약 26%)의 절반보다 조금 넉넉한 값.
 */
export const SHELF_RADIUS = 15

/** 크기별 얹을 수 있는 신물 수 — 널 길이가 다르다. */
export const SHELF_CAPACITY: Readonly<Record<'sm' | 'md' | 'lg', number>> = Object.freeze({
  sm: 2,
  md: 3,
  lg: 4,
})

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
 * 시렁 하나를 읽는다.
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

  let laid = 0
  let matched = 0
  for (const p of placements) {
    if (p.id === shelf.id) continue
    const item = catalogById.get(p.catalogItemId)
    if (!item || isShelf(item)) continue // 시렁 위의 시렁은 없다
    const dx = p.x - shelf.x
    const dy = p.y - shelf.y
    if (Math.sqrt(dx * dx + dy * dy) > SHELF_RADIUS) continue
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
