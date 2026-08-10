/**
 * 고정 살림(固定 세간) 미세 조정 — 신당마다 **소유자가 직접** 세 덩어리의 자리를 잡는다.
 *
 * 배경(CEO 지시): "선반과 신, 간판이 중간에 붕 떠 있어 / 이걸 꾸미기에서 조절할 수 있게 하자.
 * 그림마다 맞추기가 힘들 것 같으니." — 테마 뮤럴 16장은 저마다 벽선·마루선·툇마루 높이가 달라
 * **정본 좌표 한 벌로 전부를 맞출 수 없다**. 그렇다고 테마마다 좌표표를 따로 들면 뮤럴을 다시 그릴
 * 때마다 표가 낡는다. 그래서 정본은 그대로 두고(theme-stage-geometry.json 무접촉) 신당 행에
 * **가산 오프셋**만 얹는다 — 기본값 `{}` 이면 지금까지의 화면과 한 픽셀도 다르지 않다.
 *
 * 세 덩어리(=한 묶음으로 움직이는 단위):
 *   · deityStage  신위 무대 — 단상 + 제단 상판 + 좌정 신위. **제단 앵커가 함께 간다**.
 *   · familyShelf 가족 선반장 전체(사방탁자 6좌) — 이름패·축복 후광·진열 칸(seat:) 포함.
 *   · ritualHall  의식각 — 현판 4문을 얹은 사방탁자 한 좌.
 *
 * 단위는 **무대 % 좌표**다(대청 로컬 %). 두루마리 와이드(폭 320%)에서도 배치·구조물과 같은 층위라
 * `zoneWidthScale` 을 곱하지 않는다 — 위치는 비율이고, 곱셈 대상은 «크기»뿐이다.
 *
 * 전 함수 순수(side-effect 0) · 결정론 — Date.now()/Math.random() 금지. 클라·서버 공용.
 * ⚠️ 런타임 import 0 이다(타입만 참조) — stage.ts 와 서로 참조해도 순환이 생기지 않는다.
 */

import type { StageAnchor, StageSpec } from './stage'

/** 조절 대상 — 이 셋이 전부다(늘리려면 여기와 UI 배선 두 곳만 본다). */
export type FixtureKey = 'deityStage' | 'familyShelf' | 'ritualHall'

/** 파싱·순회의 단일 출처. 입력 객체의 키를 훑지 않고 **이 목록만** 훑는다(프로토타입 오염 차단). */
export const FIXTURE_KEYS: readonly FixtureKey[] = Object.freeze(['deityStage', 'familyShelf', 'ritualHall'])

/** 정본 좌표에 더하는 이동량(무대 %). */
export interface FixtureOffset {
  dx: number
  dy: number
}

/** 신당 한 채의 조정값. 키가 없으면 정본 그대로다 — 부분 저장이 정상 상태다. */
export type FixtureOffsets = Partial<Record<FixtureKey, FixtureOffset>>

/**
 * 이동 한계 — 조정이지 재배치가 아니다. 가로 ±12%p 는 와이드 세계에서 겉보기 ±38%p(≈1/3 화면),
 * 세로 ±14%p 는 방 높이의 1/7 이다. 이보다 크면 선반장이 제단을 덮거나 의식각이 벽 밖으로 나간다.
 */
export const FIXTURE_DX_RANGE: [number, number] = [-12, 12]
export const FIXTURE_DY_RANGE: [number, number] = [-14, 14]

/** 「움직이지 않음」 — 공유 상수(참조 고정으로 memo·effect deps 를 오염시키지 않는다). */
export const ZERO_FIXTURE_OFFSET: FixtureOffset = Object.freeze({ dx: 0, dy: 0 })

/** 초기화가 저장하는 값이자 마이그레이션 미적용 DB 의 폴백. */
export const EMPTY_FIXTURE_OFFSETS: FixtureOffsets = Object.freeze({})

/** 좌표 절대 범위 — 오프셋을 얹어도 무대 밖으로는 못 나간다(무대 밖 = 증발). */
const FULL: [number, number] = [0, 100]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 소수 2자리 — jsonb 크기와 «서버·클라 같은 값»(하이드레이션)을 동시에 지킨다. */
function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/**
 * 클램프. 비유한(NaN/Infinity)·비수치는 **0**으로 떨어뜨린다 — 이 값의 기본은 "안 움직임"이라
 * min 으로 눕히는 stage.ts 계열과 다르다(깨진 값이 살림을 왼쪽 끝으로 날리면 안 된다).
 */
function clampNum(v: unknown, range: [number, number]): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0
  return Math.min(range[1], Math.max(range[0], v))
}

/** 미지의 값 → 오프셋. 형태가 어긋나면 (0,0). */
function offsetFrom(v: unknown): FixtureOffset {
  const r = isRecord(v) ? v : {}
  return { dx: round2(clampNum(r.dx, FIXTURE_DX_RANGE)), dy: round2(clampNum(r.dy, FIXTURE_DY_RANGE)) }
}

/** 정본과 같은 값인가. 저장 정규화(0 은 안 담는다)와 항등 반환 판정의 단일 기준. */
export function isZeroFixtureOffset(o: FixtureOffset | null | undefined): boolean {
  return !o || (o.dx === 0 && o.dy === 0)
}

/** 범위 클램프 + 소수 2자리. 드래그 중에도 이 함수를 거쳐 «끌 수 있는 곳»과 «저장되는 곳»이 같다. */
export function clampFixtureOffset(o: FixtureOffset): FixtureOffset {
  return offsetFrom(o)
}

/**
 * DB jsonb · 서버 액션 인자 **양쪽의 유일한 관문**. 형태가 어긋난 항목만 버리고 나머지는 살린다.
 *
 * ⚠️ 영(0,0)은 담지 않는다 — 「끌었다가 제자리로 되돌림」과 「초기화」와 「한 번도 안 건드림」이
 *    저장 결과에서 같은 값이 되어야 한다(정규화). 그래야 `{}` = 정본이라는 계약이 한 방향으로만 산다.
 */
export function parseFixtureOffsets(raw: unknown): FixtureOffsets {
  if (!isRecord(raw)) return {}
  const out: FixtureOffsets = {}
  for (const key of FIXTURE_KEYS) {
    const v = raw[key]
    if (!isRecord(v)) continue
    const o = offsetFrom(v)
    if (isZeroFixtureOffset(o)) continue
    out[key] = o
  }
  return out
}

/** 한 덩어리의 이동량. 없으면 **공유 상수** ZERO_FIXTURE_OFFSET(참조 고정). */
export function fixtureDelta(offsets: FixtureOffsets | null | undefined, key: FixtureKey): FixtureOffset {
  const o = offsets ? offsets[key] : undefined
  return o ?? ZERO_FIXTURE_OFFSET
}

function shift(v: number, d: number): number {
  return Math.min(FULL[1], Math.max(FULL[0], round2(v + d)))
}

/**
 * 신위 무대 오프셋을 **구조물과 그 앵커에 한꺼번에** 얹은 새 StageSpec.
 *
 * 이 한 함수가 적용 지점의 전부다 — 룸의 `daecheongStage` memo 단계에서 한 번 통과시키면
 * 단상·상판 렌더(StageLayers)와 스냅 앵커·앵커 링이 **같은 소스**에서 움직인다.
 * (앵커만 따로 옮기면 그림과 자석이 어긋나고, 그 어긋남은 타입도 테스트도 못 잡는다.)
 *
 * · 불변이다 — 입력 stage/structures/anchors 를 손대지 않고 새 객체를 만든다.
 * · 이동량이 0 이거나 구조물이 없으면 **같은 참조**를 돌려준다(레거시 테마 렌더 회귀 0).
 * · 광원(light)은 옮기지 않는다 — 방 전체가 받는 빛은 제단 소유가 아니라 테마 소유다.
 */
export function applyStageFixtureOffsets(stage: StageSpec, offsets: FixtureOffsets): StageSpec
export function applyStageFixtureOffsets(stage: StageSpec | null, offsets: FixtureOffsets): StageSpec | null
export function applyStageFixtureOffsets(stage: StageSpec | null, offsets: FixtureOffsets): StageSpec | null {
  const d = fixtureDelta(offsets, 'deityStage')
  if (stage === null || isZeroFixtureOffset(d) || stage.structures.length === 0) return stage
  return {
    ...stage,
    structures: stage.structures.map((s) => ({
      ...s,
      x: shift(s.x, d.dx),
      y: shift(s.y, d.dy),
      anchors: s.anchors.map((a) => ({ ...a, x: shift(a.x, d.dx), y: shift(a.y, d.dy) })),
    })),
  }
}

/** 화면 픽셀 거리계를 세우는 데 필요한 무대 실측 크기(px). */
export interface FixtureBoxPx {
  width: number
  height: number
}

/**
 * 신위 무대를 옮길 때 **제단 위에 있던 것들을 함께 데려간다** — 저장 시 1회.
 *
 * 판정은 id 링크가 아니라 **거리**다(진열대 동반 이동·축복과 같은 문법): 옮기기 **전** 제단 앵커의
 * 스냅 반경(px) 안에 있던 배치만 같은 delta 로 민다. 전체 교체 저장이 배치 id 를 재발급해도
 * 무너지지 않는 이유가 이것이다.
 *
 * 거리는 **화면 픽셀**로 잰다 — 와이드 룸에서 % 거리계는 가로가 3.2배 왜곡돼(진단 D-3) 상판 밖
 * 허공의 물건까지 끌고 온다. box 를 못 재면(0·비유한) 아무것도 옮기지 않는다(조용한 오작동 금지).
 *
 * 층(layer)을 가리지 않는다 — 상판 위의 제물이 altar 층만은 아니고, "그 자리에 있던 것"이 기준이다.
 * 절대 범위 [0,100] 클램프는 유지된다(무대 밖 좌표 = 증발).
 */
export function companionShiftPlacements<T extends { x: number; y: number }>(
  placements: T[],
  oldAnchors: readonly StageAnchor[],
  delta: FixtureOffset,
  snapRadiusPx: number,
  box: FixtureBoxPx
): T[] {
  if (!Array.isArray(placements) || placements.length === 0) return placements
  // delta 는 «이번 이동분»이라 FIXTURE_*_RANGE(누적 한계)로 클램프하지 않는다 — 비유한만 거른다.
  const dx = typeof delta?.dx === 'number' && Number.isFinite(delta.dx) ? delta.dx : 0
  const dy = typeof delta?.dy === 'number' && Number.isFinite(delta.dy) ? delta.dy : 0
  if (dx === 0 && dy === 0) return placements
  if (!Array.isArray(oldAnchors) || oldAnchors.length === 0) return placements

  const w = box?.width
  const h = box?.height
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return placements
  const r = Number.isFinite(snapRadiusPx) && snapRadiusPx > 0 ? snapRadiusPx : 0
  if (r === 0) return placements

  const sx = w / 100
  const sy = h / 100
  const maxD2 = r * r

  let changed = false
  const out = placements.map((p) => {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return p
    let hit = false
    for (const a of oldAnchors) {
      if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y)) continue
      const ax = (a.x - p.x) * sx
      const ay = (a.y - p.y) * sy
      if (ax * ax + ay * ay <= maxD2) {
        hit = true
        break
      }
    }
    if (!hit) return p
    changed = true
    return { ...p, x: shift(p.x, dx), y: shift(p.y, dy) }
  })
  return changed ? out : placements
}
