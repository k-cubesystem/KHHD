/**
 * 가족 선반장(사방탁자 四方卓子) — 벽을 쓰는 **기본 사양** 가구. 상점 아이템이 아니다.
 *
 * 가족 한 사람마다 선반장 하나가 자동으로 선다(2026-08-06 지시): 맨 위 칸은 그 가족의
 * **자리**(정령 아바타가 앉는다)이고, 그 아래 칸 하나에 아이템을 진열한다.
 * 진열은 기존 배치 문법 그대로다 — 관계는 전부 거리·좌표로 판정한다(id 링크 금지).
 *
 * ── v2 「1가족 1진열」 (2026-08-12 · CEO 「가족선반 B안으로 수정」 · PLAN-family-shelf-v2 B안) ──
 * v1(3단 × 3칸 = 54자리)은 **산술이 안 맞았다**: 칸 안폭이 폰에서 56.6px 인데 아이템 그린 폭이
 * 60.9px 라 한 점도 칸에 안 들어갔고, 그 못 들어가는 칸을 6명분 벽에 붙여 놓은 것이
 * 「자리만 차지」였다(벽 존의 86.2% 점유). 처방은 칸을 줄이는 게 아니라 **프레임 낭비를 걷는 것**:
 *   · 스프라이트 재조립 — 빈 여백·기둥을 걷어 칸 안폭 **53.5% → 80.2%**
 *     (scripts/shrine-assets/stage-shelf-v2.mjs · 생성 API 0회)
 *   · 유닛 8.65×42 → **6.8×28** (면적 −47%) · 3단 9칸 → **1단 1칸**
 *   · 널 상면을 «코드가 정한 값»에서 **스프라이트 실측**으로 (v1 의 0.31/0.55/0.76 은 셋 다
 *     실제 널보다 3%p 아래였다 — 아이템이 «자기 널»이 아니라 한 칸 아래 널에 얹혀 보였다)
 *   · 판정 좌표를 **아이템의 발**로 통일 — 눈이 보는 접지와 코드가 재는 좌표를 한 줄로 만든다
 *
 * ── 원복 레버 ────────────────────────────────────────────────────────────────
 *   1순위  이 파일의 상수 한 벌(FSHELF_H·FSHELF_UNIT·FSHELF_UNIT_X·FSHELF_TIERS)과 벽 컴포넌트의
 *          SPRITE 경로를 v1 값으로 되돌린다. **데이터 원복 SQL 은 없다** — 배치 좌표를 한 건도
 *          건드리지 않았다(B안의 최대 안전판).
 *   2순위  FAMILY_SHELF_THEMES = [] — 선반장이 통째로 사라지고 진열한 아이템은 그 자리에 남는다.
 *
 * ⚠️ 좌표는 전부 **세계(world) %** 다 — 「큰 방 하나」(폭 320%)의 stageContent 좌표계.
 *    표준 와이드 무대(theme-stage.ts)가 전 테마 공통이라 좌표는 테마와 무관하다.
 * ⚠️ 유닛은 배치(placements)가 아니다 — 렌더 전용 파생물이라 저장할 것이 없다. 가족을
 *    지우면 선반장이 사라지고, 위에 진열했던 아이템은 그 자리에 남는다(자유 배치로 회귀).
 */

import { findFamilyAvatar } from '@/lib/domain/family/avatars'
import { STAGE_WALL_GROUND_LINE_Y } from './theme-stage'
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

/**
 * **아이템의 발** — 저장 좌표(중심)에서 그려진 밑변까지의 거리(무대 %).
 *
 * 렌더 규약이 특이하다. 아이템 래퍼는 `transform: translate(-50%,-50%) scale(s)` 에
 * `transform-origin: 50% 100%` 다. 두 변환을 밑변 기준으로 합성하면 밑변의 이동량에서
 * **scale 항이 사라진다** — 그려진 밑변은 배율과 무관하게 언제나
 *
 *     저장 y + (원치수 높이 ÷ 2) = y + (3.2em × 36.25px) ÷ 2 = y + 58px
 *
 * 다. 기준 방 높이 620px 기준으로 **9.35%p**(390폰 608px 에서는 9.54%p — 방 높이는 기기가
 * 바뀌어도 min(72vh,620) 라 편차가 2% 안이다).
 *
 * v1 은 앵커를 「널 − 3.5」로 잡아 아이템 발이 널보다 **55px 아래**에 떨어졌다. 화면에서는
 * 「자기 널」이 아니라 한 칸 아래 널에 얹힌 것처럼 보이고 몸통이 위 널을 뚫었다(PLAN §1-3).
 * 이 상수 하나가 그 어긋남의 유일한 해다 — 축소·축복 판정도 전부 이 발 좌표로 잰다.
 *
 * ⚠️ 룸이 SIZE_PX.md·ASSET_EM 을 바꾸면 이 값을 다시 정한다: `발 = ASSET_EM × md ÷ 2 ÷ 620`.
 *    도메인이 렌더 상수를 import 할 수 없으므로(클라 컴포넌트 내부 const), 그 대조는
 *    `__tests__/family-shelf.test.ts` 가 소스를 읽어서 한다.
 */
export const FSHELF_ITEM_FOOT = 9.35

/** 최대 유닛 수 — 왼벽 4 + 오른벽 2 (제단 41~59 · 의식각 84.95~ 를 피한 자리) */
export const MAX_FAMILY_SHELF = 6

/**
 * 유닛 x 중심(세계 %) — 왼벽 4자리 + 제단과 의식각 사이 오른벽 2자리.
 *
 * v2 에서 두 가지가 함께 풀린다(PLAN-family-shelf-v2 §1-1·§1-6):
 *  · **왼벽 4좌가 한 화면에 든다** — 2.6 ~ 33.85 = 31.25%p = 정확히 한 화면(세계 320% ÷ 3.2).
 *    v1 은 35.65%p(114%)라 가족이 넷이면 카메라를 밀어야 다 보였다.
 *  · **폰에서 틀과 안 겹친다** — 틀은 세로 고정·가로 종횡비라 방이 좁을수록 넓어져 390폰에서
 *    x 37.48~62.52 를 먹는다. v1 의 오른벽 첫 좌(63.5, 좌단 59.175)는 41px(유닛 폭의 39%)
 *    겹쳐 「웅장한 틀」을 선반이 가리고 있었다. 67 은 좌단이 63.6 이라 겹침 0 이다.
 * 좌 사이 틈은 1.35%p — 축소 상자(유닛 폭)끼리 겹치지 않아 그 사이가 **자유 지대**로 남는다.
 */
export const FSHELF_UNIT_X: readonly number[] = Object.freeze([6, 14.15, 22.3, 30.45, 67, 75.5])

/**
 * 유닛 세로 길이(세계 %) — **불변**이다. 스프라이트는 `objectFit:'fill'` 로 상자에 늘려 그리므로
 * 이 값을 바꾸면 가구가 세로로 늘어나고, 단 비율(FSHELF_TIERS)이 기대는 정합도 함께 깨진다.
 * 접지를 고칠 때는 높이가 아니라 **상자 전체를 평행이동**한다(top·bottom 을 같은 delta 로).
 *
 * v2: 42 → **28**. 진열 칸 하나(12.9%p)가 아이템 그린 세로 69.6px 를 87% 로 담는 크기에서
 * 역산했고, 나머지 네 띠(천판+가족칸·널1·널2·다리)는 스프라이트 원본 비율 그대로다.
 */
const FSHELF_H = 28

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
 * ── 벽 접지선으로 한 칸 더 (2026-08-12 · 무대 기하 v6 · CEO 「선반과 간판은 좀 더 뒤로」) ──
 * v5 는 **틀과 사방탁자를 같은 줄(82)** 에 세웠다. 그런데 틀은 방 한가운데 나와 선 제단이고
 * 사방탁자는 벽에 붙여 두는 벽 살림이다 — 같은 줄에 세우면 벽 가구가 제단과 나란히 앞으로
 * 나와 서서 배경(뮤럴의 벽면)과 따로 노는 그림이 된다. 그래서 벽 살림만 마루 안쪽 깊이를
 * 1/3 로 줄인다: `STAGE_WALL_GROUND_LINE_Y` = 마루선 + 바닥밴드/9 = **76** (틀 82 보다 6%p 뒤).
 * 「뒤로」의 나머지 몫은 좌표가 아니라 **크기**(유닛 42 → 28 · 8.65 → 6.8)와 **그림자**가 든다 —
 * 원근에서 뒤로 가는 것은 «위로 올라가는 것»이 아니라 «작아지고 그림자가 짧아지는 것»이다.
 *
 * ⚠️ 진열 칸 앵커(`seat:fshelf:`)가 이 상자에서 파생되므로 **함께 올라간다**. 이미 진열해 둔
 *    아이템은 절대 좌표라 따라오지 않는다 — 그리고 v2 는 **동반 이동 SQL 을 쓰지 않는다**
 *    (PLAN-family-shelf-v2 §2-B: 대상이 8행·4채뿐이고, 20260810c 주석이 「자유 배치는 사용자가
 *    거기에 둔 물건이라 건드리지 않는다」로 이미 규율을 세워 놨다). 새 개구 밖으로 나가는
 *    배치는 **그 자리에서 원치수로 돌아온다** — 그것이 v2 의 유일한 시각 변화다.
 */
export const FSHELF_UNIT = Object.freeze({
  /** 폭(세계 %) — 겉보기 ≈ 22vw. 칸 안폭 80.2% 라 아이템(그린 폭 60.9px)이 폰에서도 든다 */
  w: 6.8,
  /** 상단 y — 밑동에서 파생(높이 불변). 창방 팻말 띠(≈4~12) 아래로 충분히 내려온다 */
  top: STAGE_WALL_GROUND_LINE_Y - FSHELF_H,
  /**
   * 밑동 y = **벽 접지선**. v2 스프라이트는 발밑 투명 여백을 잘라 냈으므로(원본 271×640 의
   * 아래 17px = 2.66%) **상자 하단 = 그려진 발끝**이다 — v5 까지 남아 있던 1.1%p 의 「붕 뜸」이
   * 여기서 0 이 된다. 접지 그림자(FamilyShelfWall)는 그 발끝 줄에 정확히 깔린다.
   */
  bottom: STAGE_WALL_GROUND_LINE_Y,
})

/**
 * 단(段) 기하 — 유닛 높이에 대한 비율. **전부 스프라이트 알파 실측값**이다
 * (shelf-sabang-v2.webp 247×438 · scripts/shrine-assets/stage-shelf-v2.mjs 가 굽고 출력한다).
 *
 * v1 은 이 표를 손으로 적었고 셋 다 실제 널보다 3%p 아래였다 — 3단 널(0.76)은 아예 **닫힌
 * 수납장 문짝 한가운데**였다. 「자동 검출 불신·육안이 정본」 규율의 반대편 함정이다: 눈으로만
 * 보고 적은 숫자는 조용히 틀린다. 자산을 다시 구우면 스크립트 출력의 랜드마크로 이 표를 갱신한다.
 *
 * ⚠️ 이 블록은 합성 QA(scripts/shrine-assets/stage-theme-harmony.mjs)가 **정규식으로 읽는다** —
 *    `FSHELF_TIERS = Object.freeze({` 형태와 `family:` 키를 지울 수 없다.
 */
export const FSHELF_TIERS = Object.freeze({
  /** 가족 아바타 중심 — 칸1(가족 자리) 개구의 한가운데 */
  family: 0.2329,
  /** 칸1(가족 자리) 개구 [천장, 바닥] — 아바타 지름을 여기서 파생한다(칸을 넘지 않게) */
  familyBay: Object.freeze([0.1164, 0.3493]),
  /** 진열 칸 천장(널1 밑면) — 아이템이 위 널을 뚫는지 재는 줄 */
  displayTop: 0.4224,
  /** 아이템 단 **널 상면** — v2 는 한 단(널2). 배열인 것은 원복·확장의 자리를 남겨 둔 것이다 */
  boards: Object.freeze([0.8767]),
  /** 칸당 진열 수 — 폰에서 온전히 드는 수가 1 이다(PLAN §1-2) */
  slotsPerTier: 1,
  /** 칸 안 가로 간격(세계 %) — 한 점이라 가운데 하나 */
  slotDx: Object.freeze([0]),
  /** 앵커 y = 널 상면 − 이 값. **아이템 반높이 파생**이라 발이 정확히 널에 닿는다 */
  itemLift: FSHELF_ITEM_FOOT,
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

/**
 * 유닛의 진열 칸 앵커 — v2 는 유닛당 **1개**(1단 × 1칸).
 *
 * ⚠️ 프로덕션은 이 함수를 부르지 않는다(2026-08-10 자석 폐지 · 테스트가 「안 부름」을 계약으로
 *    못 박고 있다). 남겨 두는 이유는 둘이다: ① 널 상면 파생식이 실제로 발을 널에 앉히는지
 *    테스트가 이 좌표로 재고 ② 자석을 되살릴 때의 착지점이 여기다.
 */
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

/** 널 앞뒤 여유(무대 %) — 널 끝에 발을 반쯤 걸친 물건도 «그 선반의 것»으로 친다. */
const FOOT_PAD = 1.2

/** 유닛의 진열 칸 사각형(무대 %) — 눈에 보이는 개구 그 자체다. 렌더도 판정도 여기서 파생한다. */
export function fshelfDisplayBox(unit: FamilyShelfUnit): { x0: number; x1: number; y0: number; y1: number } {
  const h = unit.bottom - unit.top
  return {
    x0: unit.x - unit.w / 2,
    x1: unit.x + unit.w / 2,
    y0: unit.top + FSHELF_TIERS.displayTop * h,
    y1: unit.top + FSHELF_TIERS.boards[0] * h,
  }
}

/**
 * 유닛 상자 판정 — **축복 읽기와 진열 축소가 같은 자를 쓴다**. 자가 두 벌이 되면 «축복은 받는데
 * 크기는 안 줄어드는» 물건이 생기고, 그 어긋남은 타입도 테스트도 안 잡는다.
 *
 * ── v2: 상자가 «유닛 전체»에서 «개구 사각형»으로 좁아졌다 ─────────────────────
 * v1 의 상자는 유닛 전체(8.65 × 42) + 여유 1.2 였다. 좌 사이 틈이 0.35%p 라 **이웃 상자끼리
 * 겹쳐** 왼벽 전체(38%p = 화면 1.22장)가 하나짜리 축소 구역이었다 — 선반 «앞»에 두려던 물건도
 * 예고 없이 40% 작아지는데 경계가 화면에 안 보였다(PLAN §1-4). v2 는 상자를 **화면에 보이는
 * 칸**과 같게 만든다: 가로는 유닛 폭(여유 0 — 그래야 이웃 사이 1.35%p 가 자유 지대로 남는다),
 * 세로는 개구의 천장~널 상면.
 *
 * 그리고 세로는 저장 좌표(중심)가 아니라 **아이템의 발**로 잰다. 눈이 보는 접지와 코드가 재는
 * 좌표를 하나로 만드는 한 줄이다 — 이게 없으면 「널 위에 서 있는데 축소가 안 되는」 물건이 난다.
 */
function inDisplayBox(unit: FamilyShelfUnit, x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false
  const box = fshelfDisplayBox(unit)
  if (x < box.x0 || x > box.x1) return false
  const foot = y + FSHELF_ITEM_FOOT
  return foot >= box.y0 && foot <= box.y1 + FOOT_PAD
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
  for (const u of units) if (inDisplayBox(u, x, y)) return FSHELF_ITEM_SCALE
  return 1
}

/**
 * 유닛 축복 읽기 — 유닛 박스 안 아이템 중 그 가족의 정령 오행과 맞는 것이 하나라도 있으면
 * 깨어난다(시렁 readShelf 와 같은 문법 — 정령 미설정은 무엇이든 그 사람 것으로 친다).
 * 박스 판정은 진열 축소와 **같은 함수**(inDisplayBox)를 쓴다 — 아이템의 발이 그 칸에 서 있는가다.
 */
export function readFamilyShelf(
  unit: FamilyShelfUnit,
  placements: readonly Placement[],
  elementOf: (catalogItemId: string) => Element | null
): { laid: number; blessed: boolean } {
  let laid = 0
  let matched = 0
  for (const p of placements) {
    if (!inDisplayBox(unit, p.x, p.y)) continue
    laid += 1
    const el = elementOf(p.catalogItemId)
    if (unit.guardian === null || el === unit.guardian) matched += 1
  }
  return { laid, blessed: matched >= 1 }
}
