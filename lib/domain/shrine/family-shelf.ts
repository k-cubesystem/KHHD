/**
 * 가족 선반장(사방탁자 四方卓子) — 벽을 쓰는 **기본 사양** 가구. 상점 아이템이 아니다.
 *
 * 가족 한 사람마다 선반장 하나가 자동으로 선다(2026-08-06 지시): 맨 위 칸은 그 가족의
 * **자리**(정령 아바타가 앉는다)이고, 아래 열린 세 칸(2·3·4단)에는 아이템을 가지런히
 * 진열한다. 진열은 기존 배치 문법 그대로다 — 칸이 스냅 앵커(`seat:fshelf:…`)를 노출하고,
 * 저장은 `seat:` 프리픽스 존 우회를 태우고, 관계는 전부 거리·좌표로 판정한다.
 *
 * ⚠️ 좌표는 전부 **세계(world) %** 다 — 「큰 방 하나」(폭 320%)의 stageContent 좌표계.
 *    표준 와이드 무대(theme-stage.ts)가 전 테마 공통이라 좌표는 테마와 무관하다.
 * ⚠️ 유닛은 배치(placements)가 아니다 — 렌더 전용 파생물이라 저장할 것이 없다. 가족을
 *    지우면 선반장이 사라지고, 위에 진열했던 아이템은 그 자리에 남는다(자유 배치로 회귀).
 */

import { findFamilyAvatar } from '@/lib/domain/family/avatars'
import { STAGE_GROUND_LINE_Y } from './theme-stage'
import type { Element, Placement } from './types'

/** 유닛을 세우는 데 필요한 최소 형태 — FamilyHallMember(사랑방 좌석)와 구조 호환이다. */
export interface FamilyShelfMemberInput {
  /** null = 본인 (사랑방 좌석 계약 승계) */
  memberId: string | null
  name: string
  avatarId: string | null
}

/**
 * 선반장이 서는 테마 — **16종 전부**(2026-08-07 확산).
 *
 * ⚠️ 이 목록은 게이트 두 겹 중 **바깥쪽**이다. 룸의 조건은
 *   `worldActive && hasFamilyShelf(code) && hall?.isFamilyTier`
 * 이고 `worldActive` 는 그 테마의 stage jsonb 에 `zones`(폭 320)가 실려 있을 때만 참이다.
 * 즉 여기에 이름이 있어도 **와이드 시드가 없는 테마에서는 선반장이 켜지지 않는다** —
 * 선반장 좌표가 폭 320 세계의 값이라 단일 무대(폭 100)에 세우면 벽 밖으로 밀려나기 때문이다.
 * 덕분에 코드(이 목록)와 데이터(시드)의 출하 순서를 서로 기다리지 않아도 된다.
 * 목록 자체는 theme-stage.ts THEME_CODES 와 같은 16종이고, 그 대조는 theme-stage.test 가 한다.
 */
export const FAMILY_SHELF_THEMES: readonly string[] = Object.freeze([
  'banga',
  'choga',
  'yonggung',
  'dokkaebi',
  'seolbit',
  'daljip',
  'hongsal',
  'byeolbat',
  'dangsan',
  'yeondeung',
  'seonang',
  'jangdok',
  'daejanggan',
  'jonggak',
  'saemgut',
  'naru',
])

export function hasFamilyShelf(themeCode: string | null | undefined): boolean {
  return typeof themeCode === 'string' && FAMILY_SHELF_THEMES.includes(themeCode)
}

/** 진열 칸 앵커 id 프리픽스 — `seat:` 로 시작해야 저장 존 우회(saveShrineLayout)를 탄다. */
export const FSHELF_ANCHOR_PREFIX = 'seat:fshelf:'

/**
 * 선반에 올려 둔 아이템의 표시 축소 배율 — 칸(개구부) 높이가 일반 아이템보다 낮아,
 * 원치수로는 진열이 아니라 «끼임»이 된다.
 *
 * ── 판정이 바뀌었다: anchorId → **좌표** (2026-08-10 · 자석 폐지) ──────────────
 * 종전에는 `anchorId` 가 `seat:fshelf:` 로 시작하는가로 갈랐다. 자석이 사라져 **새 배치에는
 * anchorId 가 발급되지 않으므로** 그 판정은 조용히 죽는다 — 새로 얹은 신물만 원치수로 칸에
 * 끼이고, 옛 배치는 줄어든 채 남아 같은 선반에 두 크기가 섞인다(무증상 어긋남).
 * 그래서 이 신당의 다른 관계 판정과 같은 문법으로 되돌린다: **거리·좌표로 다시 잰다**
 * (진열대 동반 이동·축복 읽기·제단 동반 이동이 전부 그 문법이다 — id 링크를 믿지 않는다).
 * 옛 anchorId 보유 배치도 좌표가 칸 안에 있으므로 같은 판정에 자연히 포함된다.
 *
 * ── 값은 0.6 **유지** — 진열은 이미 +25% 커졌다 (합성판 실측) ──────────────────
 * 같은 회차에 기본 아이템이 +25% 커졌으므로(SIZE_PX.md 29 → 36.25) **배율을 그대로 두어도**
 * 진열 겉보기는 3.2 × 29 × 0.6 = 55.7px → 3.2 × 36.25 × 0.6 ≈ **69.6px** 로 함께 커진다.
 * 여기서 0.75 로 더 올리는 안은 합성판에서 반려됐다(`stage-grand-altar-ground.mjs --verify --compose`):
 * 상자가 87px 가 되어 3단 칸 개구부(0.21 × 42%p × 620 ≈ **55px**)를 넘고 접시가 사방탁자 기둥
 * 밖으로 삐져나왔다 — 「진열」이 아니라 「끼임」으로 되돌아간다.
 * (상자는 **아래를 기준으로** 커진다 — transform-origin 50% 100% 라 밑변은 널 위 그 자리에 남고
 *  위로만 자란다. 그래서 배율을 올릴 때 먼저 터지는 것은 접지가 아니라 칸 높이다.)
 *
 * ⚠️ 룸이 SIZE_PX.md 를 또 바꾸면 이 값을 다시 정한다: 배율' = 69.6 / (3.2 × 새 md).
 */
export const FSHELF_ITEM_SCALE = 0.6

/** 최대 유닛 수 — 왼벽 4 + 오른벽 2 (제단 41~59 · 사랑방 78.75~ 를 피한 자리) */
export const MAX_FAMILY_SHELF = 6

/**
 * 유닛 x 중심(세계 %) — 문(door-banga, 2026-08-06 제거)이 있던 왼벽 4자리 + 제단과 사랑방
 * 사이 오른벽 2자리. 폭(UNIT_W)과 함께 서로 겹치지 않음을 테스트가 대조한다.
 */
export const FSHELF_UNIT_X: readonly number[] = Object.freeze([7, 16, 25, 34, 63.5, 72.5])

/**
 * 유닛 세로 길이(세계 %) — **불변**이다. 스프라이트는 `objectFit:'fill'` 로 상자에 늘려 그리므로
 * 이 값을 바꾸면 가구가 세로로 늘어나고, 단 비율(FSHELF_TIERS)이 기대는 정합도 함께 깨진다.
 * 접지를 고칠 때는 높이가 아니라 **상자 전체를 평행이동**한다(top·bottom 을 같은 delta 로).
 */
const FSHELF_H = 42

/**
 * 유닛 박스 — 세계 % (스프라이트 shelf-sabang.webp 를 object-fit:fill 로 채운다)
 *
 * ── 접지 수복 (2026-08-10 · CEO 실기기 검수) ────────────────────────────────
 * "틀과 선반들이 공중에 떠 있어. 마루 라인에 맞춰서 내려와야 해."
 * v3 마루선(60)에 발을 2%p 묻고 서던 밑동 62 를 그대로 둔 채 마루선만 v4.1 **73** 으로 내려서,
 * 사방탁자 두 벌이 마루보다 11%p 위 허공에 서 있었다(직전 회차는 «사용자 조절이 덮는다»로 동결).
 * 이제 **밑동을 파생**한다 — 신수(KEEPER_POS = 마루선−1)와 같은 규약이라, 다음에 마루선을 옮길 때
 * 여기는 공짜로 따라온다. 높이는 그대로 두고 top 을 같은 delta 로 함께 내려 스프라이트 왜곡은 0 이다.
 *
 * ── 마루 1/3 접지 (2026-08-10 밤 · 무대 기하 v5) ─────────────────────────────
 * "선반과 틀 같은 건 마루 3/1은 자리를 잡아야 해."
 * 마루선에 발끝만 걸친 v4.1 은 접지선은 맞았지만 가구가 **벽에 붙어** 보였다. 파생 기준을
 * 마루선(73) → **접지선(STAGE_GROUND_LINE_Y 82 = 마루선 + 바닥밴드/3)** 으로 한 칸 옮긴다.
 * 여전히 파생이라 마루선이 또 움직여도 따라오고, 이번에도 **평행이동 +9**(31→40 · 73→82)다.
 *
 * ⚠️ 진열 칸 앵커(`seat:fshelf:`)가 이 상자에서 파생되므로 **함께 내려간다**. 이미 진열해 둔
 *    아이템은 절대 좌표라 따라오지 않는다 — 동반 이동은 마이그레이션이 (앵커 id + 옛 칸 좌표
 *    정확일치로) 담당한다: v4.1 은 `20260810b_family_shelf_ground_shift.sql`(+11),
 *    v5 는 `20260810c_stage_ground_v5_shift.sql`(+9).
 */
export const FSHELF_UNIT = Object.freeze({
  /** 폭(세계 %) — 겉보기 ≈ 28vw (세계 폭 320% 기준) */
  w: 8.65,
  /** 상단 y — 밑동에서 파생(높이 불변). 창방 팻말 띠(≈4~12) 아래로 충분히 내려온다 */
  top: STAGE_GROUND_LINE_Y - FSHELF_H,
  /**
   * 밑동 y = **접지선**(마루 깊이 1/3 지점). 그려진 발끝은 스프라이트 자체의 발밑 투명 여백
   * (271×640 중 17px = 2.66%) 만큼, 즉 42 × 0.0266 ≈ **1.1%p** 위에서 끝난다 — 그 몫은 렌더의
   * drop-shadow 가 덮는다. v4.1 에서는 그 1.1 을 마저 내리면 맨 아래 칸 앵커가 벽 존(≤60) 밖으로
   * 나가는 것이 한계선이었는데, v5 는 존 상한이 70 으로 넓어져 그 제약이 풀렸다 — 그래도 여백을
   * 더 먹지 않는 이유는 같다: 「상자 하단 = 접지선」이라는 **한 줄짜리 등식**을 지키기 위해서다.
   */
  bottom: STAGE_GROUND_LINE_Y,
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

/** 칸 밖 삐짐 여유(세계 %) — 널 끝에 반쯤 걸친 물건도 «그 선반의 것»으로 친다. */
const UNIT_BOX_PAD = 1.2

/**
 * 유닛 상자 판정 — **축복 읽기와 진열 축소가 같은 자를 쓴다**. 자가 두 벌이 되면 «축복은 받는데
 * 크기는 안 줄어드는» 물건이 생기고, 그 어긋남은 타입도 테스트도 안 잡는다.
 */
function inUnitBox(unit: FamilyShelfUnit, x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false
  return Math.abs(x - unit.x) <= unit.w / 2 + UNIT_BOX_PAD && y >= unit.top && y <= unit.bottom
}

/**
 * 아이템 표시 배율 — 선반 유닛 상자 안이면 축소(FSHELF_ITEM_SCALE), 아니면 1.
 *
 * 자석이 사라진 뒤의 «선반에 올려 뒀다»의 정의다. anchorId 를 보지 않으므로 새 배치·옛 배치·
 * 손으로 옮긴 배치가 **같은 규칙**을 받는다(id 링크 금지 · 관계는 전부 거리·좌표 재판정).
 * 유닛 목록은 이미 「고정 살림 조절」 오프셋이 얹힌 것이어야 한다 — 룸이 그 좌표로 그린다.
 */
export function familyShelfItemScale(
  x: number,
  y: number,
  units: readonly FamilyShelfUnit[] | null | undefined
): number {
  if (!Array.isArray(units) || units.length === 0) return 1
  for (const u of units) if (inUnitBox(u, x, y)) return FSHELF_ITEM_SCALE
  return 1
}

/**
 * 유닛 축복 읽기 — 유닛 박스 안 아이템 중 그 가족의 정령 오행과 맞는 것이 하나라도 있으면
 * 깨어난다(시렁 readShelf 와 같은 문법 — 정령 미설정은 무엇이든 그 사람 것으로 친다).
 * 박스 판정은 진열 축소와 **같은 함수**(inUnitBox)를 쓴다.
 */
export function readFamilyShelf(
  unit: FamilyShelfUnit,
  placements: readonly Placement[],
  elementOf: (catalogItemId: string) => Element | null
): { laid: number; blessed: boolean } {
  let laid = 0
  let matched = 0
  for (const p of placements) {
    if (!inUnitBox(unit, p.x, p.y)) continue
    laid += 1
    const el = elementOf(p.catalogItemId)
    if (unit.guardian === null || el === unit.guardian) matched += 1
  }
  return { laid, blessed: matched >= 1 }
}
