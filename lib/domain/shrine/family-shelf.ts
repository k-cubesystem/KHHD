/**
 * 가족 선반장(사방탁자 四方卓子) — 벽을 쓰는 **기본 사양** 가구. 상점 아이템이 아니다.
 *
 * 가족 한 사람마다 선반장 하나가 자동으로 선다(2026-08-06 지시): 맨 위 칸은 그 가족의
 * **자리**(정령 아바타가 앉는다)이고, 아래 열린 세 칸(2·3·4단)에는 아이템을 가지런히
 * 진열한다. 진열은 기존 배치 문법 그대로다 — 칸이 스냅 앵커(`seat:fshelf:…`)를 노출하고,
 * 저장은 `seat:` 프리픽스 존 우회를 태우고, 관계는 전부 거리·좌표로 판정한다.
 *
 * ⚠️ 좌표는 전부 **세계(world) %** 다 — 반가 「큰 방 하나」(폭 320%)의 stageContent 좌표계.
 *    단일 무대(레거시 room.webp) 테마에는 아직 선반장이 없다(테마별 확산은 다음 차수 —
 *    THEMES 게이트가 그 확산 지점이다).
 * ⚠️ 유닛은 배치(placements)가 아니다 — 렌더 전용 파생물이라 저장할 것이 없다. 가족을
 *    지우면 선반장이 사라지고, 위에 진열했던 아이템은 그 자리에 남는다(자유 배치로 회귀).
 */

import { findFamilyAvatar } from '@/lib/domain/family/avatars'
import type { Element, Placement } from './types'

/** 유닛을 세우는 데 필요한 최소 형태 — FamilyHallMember(사랑방 좌석)와 구조 호환이다. */
export interface FamilyShelfMemberInput {
  /** null = 본인 (사랑방 좌석 계약 승계) */
  memberId: string | null
  name: string
  avatarId: string | null
}

/** 선반장이 서는 테마 — v1 은 메인 테마(반가)뿐. 확산 시 여기에 code 를 더한다. */
export const FAMILY_SHELF_THEMES: readonly string[] = Object.freeze(['banga'])

export function hasFamilyShelf(themeCode: string | null | undefined): boolean {
  return typeof themeCode === 'string' && FAMILY_SHELF_THEMES.includes(themeCode)
}

/** 진열 칸 앵커 id 프리픽스 — `seat:` 로 시작해야 저장 존 우회(saveShrineLayout)를 탄다. */
export const FSHELF_ANCHOR_PREFIX = 'seat:fshelf:'

/**
 * 선반 칸에 스냅된 아이템의 표시 축소 배율 — 칸(개구부) 높이가 일반 아이템(md 92px)보다
 * 낮아, 원치수로는 진열이 아니라 «끼임»이 된다. 축소는 anchorId 프리픽스로 판정한다
 * (스냅으로 얹은 것만 줄어든다 — 자유 배치로 근처에 둔 것은 원치수 그대로).
 */
export const FSHELF_ITEM_SCALE = 0.6

/** 최대 유닛 수 — 왼벽 4 + 오른벽 2 (제단 41~59 · 사랑방 78.75~ 를 피한 자리) */
export const MAX_FAMILY_SHELF = 6

/**
 * 유닛 x 중심(세계 %) — 문(door-banga, 2026-08-06 제거)이 있던 왼벽 4자리 + 제단과 사랑방
 * 사이 오른벽 2자리. 폭(UNIT_W)과 함께 서로 겹치지 않음을 테스트가 대조한다.
 */
export const FSHELF_UNIT_X: readonly number[] = Object.freeze([7, 16, 25, 34, 63.5, 72.5])

/** 유닛 박스 — 세계 % (스프라이트 shelf-sabang.webp 를 object-fit:fill 로 채운다) */
export const FSHELF_UNIT = Object.freeze({
  /** 폭(세계 %) — 겉보기 ≈ 28vw (세계 폭 320% 기준) */
  w: 8.65,
  /** 상단 y — 창방 팻말 띠(≈4~12) 아래 */
  top: 20,
  /** 하단 y — 마루선(62). 선반장은 바닥에 서서 벽에 붙는 가구다 */
  bottom: 62,
})

/**
 * 단(段) 기하 — 유닛 높이에 대한 비율(스프라이트 shelf-sabang.webp 271×640 실측).
 * family = 맨 위 열린 칸(가족 자리), boards = 2·3·4단 **널 상면**의 세로 위치.
 */
export const FSHELF_TIERS = Object.freeze({
  /** 가족 아바타 중심 (유닛 높이 비율) */
  family: 0.16,
  /** 아이템 단 널 상면 3곳 (유닛 높이 비율, 위→아래) */
  boards: Object.freeze([0.31, 0.55, 0.76]),
  /** 칸당 진열 수 */
  slotsPerTier: 3,
  /** 칸 안 가로 간격(세계 %) — 유닛 폭 8.65 안에서 3점 */
  slotDx: Object.freeze([-2.2, 0, 2.2]),
  /** 앵커 y = 널 상면 − 이 값(아이템 중심이 널 위에 서게) */
  itemLift: 3.5,
})

export interface FamilyShelfUnit {
  /** 가족 키 — 본인 좌석은 'self' (FamilyHallMember.memberId null 승계) */
  key: string
  name: string
  avatarId: string | null
  /** 수호 정령 오행 — 축복 판정 기준(시렁과 동일 규율: 사주 아닌 정령) */
  guardian: Element | null
  /** 유닛 중심 x (세계 %) */
  x: number
  /** 박스 기하 (세계 %) */
  top: number
  bottom: number
  w: number
}

/**
 * 가족 목록 → 선반장 유닛. 사랑방 좌석 순서 그대로(본인 포함), 상한 MAX_FAMILY_SHELF.
 * 자리 배정은 순번이다 — 이름·id 로 자리를 저장하지 않는다(가족을 지워도 남은 이가 당겨 선다).
 */
export function buildFamilyShelfUnits(
  members: readonly FamilyShelfMemberInput[] | null | undefined
): FamilyShelfUnit[] {
  if (!Array.isArray(members) || members.length === 0) return []
  return members.slice(0, MAX_FAMILY_SHELF).map((m, i) => ({
    key: m.memberId ?? 'self',
    name: m.name,
    avatarId: m.avatarId,
    guardian: findFamilyAvatar(m.avatarId)?.element ?? null,
    x: FSHELF_UNIT_X[i],
    top: FSHELF_UNIT.top,
    bottom: FSHELF_UNIT.bottom,
    w: FSHELF_UNIT.w,
  }))
}

export interface FShelfSlotAnchor {
  id: string
  x: number
  y: number
  label: string
}

/** 유닛의 진열 칸 앵커 9개(3단 × 3칸) — Sprite 스냅 후보에 합류한다. */
export function fshelfSlotAnchors(units: readonly FamilyShelfUnit[]): FShelfSlotAnchor[] {
  const out: FShelfSlotAnchor[] = []
  for (const u of units) {
    const h = u.bottom - u.top
    FSHELF_TIERS.boards.forEach((bf, t) => {
      const boardY = u.top + bf * h
      FSHELF_TIERS.slotDx.forEach((dx, s) => {
        out.push({
          id: `${FSHELF_ANCHOR_PREFIX}${u.key}:${t}-${s}`,
          x: Math.min(100, Math.max(0, u.x + dx)),
          y: Math.max(0, boardY - FSHELF_TIERS.itemLift),
          label: `${u.name}의 선반`,
        })
      })
    })
  }
  return out
}

/**
 * 유닛 축복 읽기 — 유닛 박스 안 아이템 중 그 가족의 정령 오행과 맞는 것이 하나라도 있으면
 * 깨어난다(시렁 readShelf 와 같은 문법 — 정령 미설정은 무엇이든 그 사람 것으로 친다).
 * 박스 판정: |dx| ≤ w/2 + 1.2(칸 밖 삐짐 여유) · top~bottom.
 */
export function readFamilyShelf(
  unit: FamilyShelfUnit,
  placements: readonly Placement[],
  elementOf: (catalogItemId: string) => Element | null
): { laid: number; blessed: boolean } {
  const halfW = unit.w / 2 + 1.2
  let laid = 0
  let matched = 0
  for (const p of placements) {
    if (Math.abs(p.x - unit.x) > halfW) continue
    if (p.y < unit.top || p.y > unit.bottom) continue
    laid += 1
    const el = elementOf(p.catalogItemId)
    if (unit.guardian === null || el === unit.guardian) matched += 1
  }
  return { laid, blessed: matched >= 1 }
}
