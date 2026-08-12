import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  FAMILY_SHELF_THEMES,
  FSHELF_ANCHOR_PREFIX,
  FSHELF_ITEM_FOOT,
  FSHELF_ITEM_SCALE,
  FSHELF_TIERS,
  FSHELF_UNIT,
  FSHELF_UNIT_X,
  MAX_FAMILY_SHELF,
  buildFamilyShelfUnits,
  familyShelfItemScale,
  fshelfDisplayBox,
  fshelfSlotAnchors,
  hasFamilyShelf,
  readFamilyShelf,
  type FamilyShelfMemberInput,
} from '../family-shelf'
import { RITUAL_HALL_UNIT } from '@/components/shrine/scene/RitualHall'
import { SEAT_ANCHOR_PREFIX } from '../shelf'
import { parseAnchorId } from '../stage'
import { THEME_CODES, THEME_STAGE_WIDTH } from '../theme-stage'
import { ZONES } from '../zones'
import type { Element, Placement } from '../types'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const ROOM = read('components/shrine/scene/ShrineRoomClient.tsx')
const WALL = read('components/shrine/scene/FamilyShelfWall.tsx')

const member = (i: number, over?: Partial<FamilyShelfMemberInput>): FamilyShelfMemberInput => ({
  memberId: over?.memberId !== undefined ? over.memberId : `member-${i}`,
  name: over?.name ?? `가족${i}`,
  avatarId: over?.avatarId !== undefined ? over.avatarId : null,
})

let seq = 0
function place(x: number, y: number, catalogItemId = `cat-${(seq += 1)}`): Placement {
  return { id: `pl-${(seq += 1)}`, catalogItemId, layer: 'wall', x, y, flip: false, state: {} }
}

describe('가족 선반장 — 기본 사양(아이템이 아니다)', () => {
  it('★ 16테마 전부에 선다(2026-08-07 확산) — 실제 발화는 worldActive 안쪽 게이트가 판정한다', () => {
    // 목록에 있어도 그 테마에 와이드 시드(stage.zones)가 없으면 룸의 worldActive 가 거짓이라
    // 선반장은 켜지지 않는다 — 코드와 데이터의 출하 순서를 분리하는 이중 게이트다.
    expect(FAMILY_SHELF_THEMES).toHaveLength(16)
    expect([...FAMILY_SHELF_THEMES].sort()).toEqual([...THEME_CODES].sort())
    expect(hasFamilyShelf('banga')).toBe(true)
    expect(hasFamilyShelf('dangsan')).toBe(true)
    expect(hasFamilyShelf('없는테마')).toBe(false)
    expect(hasFamilyShelf(null)).toBe(false)
  })

  it('★ 가족 수대로 서고 상한 6좌 — 순번 배정이라 가족을 지워도 남은 이가 당겨 선다', () => {
    const eight = Array.from({ length: 8 }, (_, i) => member(i))
    const units = buildFamilyShelfUnits(eight)
    expect(units.length).toBe(MAX_FAMILY_SHELF)
    expect(units.map((u) => u.x)).toEqual([...FSHELF_UNIT_X])
    expect(buildFamilyShelfUnits([])).toEqual([])
    expect(buildFamilyShelfUnits(null)).toEqual([])
    // 본인 좌석(memberId null)은 'self' 키 — 사랑방 좌석 계약 승계
    expect(buildFamilyShelfUnits([member(0, { memberId: null })])[0].key).toBe('self')
  })

  it('★ 유닛 자리가 제단(41~59)·의식각(84.95~)을 피하고 서로 겹치지 않는다', () => {
    const half = FSHELF_UNIT.w / 2
    const spans = FSHELF_UNIT_X.map((x) => [x - half, x + half])
    for (const [lo, hi] of spans) {
      expect(hi < 41 || lo > 59).toBe(true) // 제단 밴드 밖
      expect(hi).toBeLessThan(RITUAL_HALL_UNIT.x - RITUAL_HALL_UNIT.w / 2) // 의식각 앞
      expect(lo).toBeGreaterThan(0)
    }
    for (let i = 1; i < spans.length; i += 1) {
      expect(spans[i][0]).toBeGreaterThan(spans[i - 1][1]) // 비겹침(오름차순 전제)
    }
  })

  /**
   * ★ v2 「1가족 1진열」의 헤드라인 수치 — PLAN-family-shelf-v2 §2-B 「결과 수치」표 그대로.
   *
   * 반려의 근거가 전부 산술이었으므로 합격의 근거도 산술이어야 한다. 이 셋 중 하나라도 무너지면
   * CEO 검수 ①⑤(가족 4명이 한 화면 · 폰에서 틀과 안 겹침)가 다시 불합격이 된다.
   */
  it('★ 왼벽 4좌가 정확히 한 화면(31.25%p)에 들어간다 — v1 은 114% 라 카메라를 밀어야 했다', () => {
    const half = FSHELF_UNIT.w / 2
    const left = FSHELF_UNIT_X.slice(0, 4)
    const span = left[3] + half - (left[0] - half)
    // 한 화면 = 방 폭 100% 를 세계 좌표로 환산한 값 (세계는 방의 3.2배라 100 ÷ 3.2)
    expect(span).toBeCloseTo(10000 / THEME_STAGE_WIDTH, 6)
    expect(span).toBeCloseTo(31.25, 6)
    // 좌 사이 틈 — 축소 상자(유닛 폭)가 겹치지 않아 그 사이가 자유 지대로 남는다
    const gaps = left.slice(1).map((x, i) => Math.round((x - left[i] - FSHELF_UNIT.w) * 100) / 100)
    expect(gaps).toEqual([1.35, 1.35, 1.35])
  })

  it('★ 폰에서 틀과 겹치지 않는다 — 틀은 세로 고정이라 좁은 방일수록 넓어진다', () => {
    // 틀: 세로 71.56%p 고정 · 가로는 종횡비. 390폰(방 382×608)에서 실측 x 37.48~62.52.
    const PHONE_FRAME_RIGHT = 62.52
    const rightWall = FSHELF_UNIT_X.slice(4)
    for (const x of rightWall) expect(x - FSHELF_UNIT.w / 2).toBeGreaterThan(PHONE_FRAME_RIGHT)
  })

  it('★ 정령 오행이 유닛에 실린다 — 축복 기준은 사주가 아니라 정령(시렁과 같은 규율)', () => {
    const u = buildFamilyShelfUnits([member(0, { avatarId: 'water_dokkaebi' })])[0]
    expect(u.guardian).toBe('water')
    expect(buildFamilyShelfUnits([member(1)])[0].guardian).toBeNull()
  })
})

describe('가족 선반장 — 진열 칸 앵커', () => {
  const units = buildFamilyShelfUnits([member(0), member(1, { memberId: null, name: '나' })])
  const anchors = fshelfSlotAnchors(units)

  it('★ 유닛당 1칸(1단 × 1칸) — 폰에서 «온전히 드는 아이템 수»가 1 이다(B안)', () => {
    expect(FSHELF_TIERS.boards.length).toBe(1)
    expect(FSHELF_TIERS.slotsPerTier).toBe(1)
    expect(FSHELF_TIERS.slotDx).toEqual([0])
    expect(anchors.length).toBe(units.length)
  })

  /**
   * ★ 아이템의 **발이 널에 닿는다** — v1 이 55px 꺼져 있던 자리 (PLAN §1-3)
   *
   * 렌더 규약상 그려진 밑변은 배율과 무관하게 «저장 y + 원치수 반높이» 다. 그래서 앵커는
   * 「널 상면 − 반높이」여야 하고, v1 의 3.5 는 그 값(9.35)의 1/3 도 안 됐다.
   */
  it('★ itemLift 가 아이템 반높이다 — 앵커에 놓으면 발이 정확히 널 상면에 선다', () => {
    expect(FSHELF_TIERS.itemLift).toBe(FSHELF_ITEM_FOOT)
    const u = units[0]
    const h = u.bottom - u.top
    const boardY = u.top + FSHELF_TIERS.boards[0] * h
    const a = anchors.find((x) => x.id.includes(u.key))
    expect(a).toBeDefined()
    expect((a?.y ?? 0) + FSHELF_ITEM_FOOT).toBeCloseTo(boardY, 6)
  })

  /**
   * ★ 아이템이 **칸을 안 넘는다** — CEO 검수 ③. v1 은 142~157% 로 위 널을 뚫었다.
   * 아이템 그린 세로 = 3.2em × SIZE_PX.md × FSHELF_ITEM_SCALE. 그 값을 룸 소스에서 읽어 온다
   * (도메인이 렌더 상수를 import 할 수 없으니 대조는 여기서 한다 — 「숫자 두 벌」 방어).
   */
  it('★ 아이템 세로가 칸 개구를 안 넘는다 — 룸의 SIZE_PX·ASSET_EM 에서 재계산한다', () => {
    const md = Number(/md:\s*'([\d.]+)px'/.exec(ROOM)?.[1])
    const em = Number(/const ASSET_EM = ([\d.]+)/.exec(ROOM)?.[1])
    expect(Number.isFinite(md) && Number.isFinite(em)).toBe(true)
    const REF_ROOM_H = 620 // 기준 방 높이 = min(72vh, 620)
    // 발 상수가 «원치수 반높이»에서 나온 값 그대로인가 (룸이 크기를 바꾸면 여기서 깨진다)
    expect(FSHELF_ITEM_FOOT).toBeCloseTo(((em * md) / 2 / REF_ROOM_H) * 100, 2)
    const drawnH = em * md * FSHELF_ITEM_SCALE // 69.6px
    const openPct = FSHELF_TIERS.boards[0] - FSHELF_TIERS.displayTop
    const openPx = openPct * (FSHELF_UNIT.bottom - FSHELF_UNIT.top) * (REF_ROOM_H / 100)
    expect(drawnH / openPx).toBeLessThan(1) // v1 은 1.42~1.57 이었다
    expect(drawnH / openPx).toBeGreaterThan(0.7) // 너무 작으면 진열이 아니라 미아가 된다
  })

  it('★ id 는 seat: 로 시작한다 — 저장 존 우회(saveShrineLayout)와 같은 길을 타는 계약', () => {
    expect(FSHELF_ANCHOR_PREFIX.startsWith(SEAT_ANCHOR_PREFIX)).toBe(true)
    for (const a of anchors) expect(a.id.startsWith(FSHELF_ANCHOR_PREFIX)).toBe(true)
  })

  it('★ id 가 저장 왕복을 살아남는다 — parseAnchorId 62자 한도 안(uuid 가족 키 포함)', () => {
    const uuid = buildFamilyShelfUnits([member(0, { memberId: '0f47c1e2-8f6a-4b7e-9c3d-1a2b3c4d5e6f' })])
    for (const a of fshelfSlotAnchors(uuid)) {
      expect(a.id.length).toBeLessThanOrEqual(62)
      expect(parseAnchorId(a.id)).toBe(a.id)
    }
  })

  it('앵커가 유닛 박스 안에 있다', () => {
    const u = units[0]
    const mine = anchors.filter((a) => a.id.includes(u.key))
    for (const a of mine) {
      expect(Math.abs(a.x - u.x)).toBeLessThanOrEqual(FSHELF_UNIT.w / 2)
      expect(a.y).toBeGreaterThan(u.top)
      expect(a.y).toBeLessThan(u.bottom)
    }
    expect(new Set(mine.map((a) => a.y)).size).toBe(1)
  })

  // v5 「마루 1/3 접지」에서 상자가 82 까지 내려오며 맨 아래 칸이 68.42 가 됐다 — 벽 존도 70 까지
  // 함께 열었다(넓히는 방향만). 범위를 리터럴로 적지 않고 ZONES 를 읽는 이유가 이런 회차 때문이다.
  it('칸 y 가 벽 존 안이다 — 벽걸이 신물이 칸에 스냅될 수 있어야 한다', () => {
    for (const a of anchors) {
      expect(a.y).toBeGreaterThanOrEqual(ZONES.wall.y[0])
      expect(a.y).toBeLessThanOrEqual(ZONES.wall.y[1])
    }
  })
})

/** 그 유닛의 진열 칸 한가운데에 «세운» 아이템의 저장 y — 발 좌표를 되돌린 값이다. */
function onShelfY(u: ReturnType<typeof buildFamilyShelfUnits>[number]): number {
  const b = fshelfDisplayBox(u)
  return (b.y0 + b.y1) / 2 - FSHELF_ITEM_FOOT
}

describe('가족 선반장 — 축복 읽기', () => {
  const unit = buildFamilyShelfUnits([member(0, { avatarId: 'fire_dokkaebi' })])[0]
  const elements = new Map<string, Element | null>()
  const el = (id: string): Element | null => elements.get(id) ?? null

  it('★ 진열 칸 안 + 오행 일치 → 축복. 밖이거나 어긋나면 아니다', () => {
    const y = onShelfY(unit)
    const inFire = place(unit.x + 1, y, 'a')
    const inWater = place(unit.x - 1, y, 'b')
    const outFire = place(unit.x + 20, y, 'c')
    elements.set('a', 'fire').set('b', 'water').set('c', 'fire')
    expect(readFamilyShelf(unit, [inFire], el)).toEqual({ laid: 1, blessed: true })
    expect(readFamilyShelf(unit, [inWater], el)).toEqual({ laid: 1, blessed: false })
    expect(readFamilyShelf(unit, [outFire], el)).toEqual({ laid: 0, blessed: false })
  })

  /**
   * ★ 「선반 앞·위에 둔 물건」은 그 선반의 것이 아니다 — v1 이 못 지키던 줄 (PLAN §1-4)
   * v1 의 상자는 유닛 전체 + 여유 1.2 라 **가족 자리(맨 위 칸) 높이에 둔 물건도** 축복을 받고
   * 40% 작아졌다. v2 는 상자가 개구 사각형이라 그 위·아래는 자유 배치다.
   */
  it('★ 가족 자리 높이·다리 아래는 진열이 아니다 — 상자가 «보이는 칸»과 같다', () => {
    elements.set('u', 'fire')
    const aboveShelf = place(unit.x, unit.top + 2, 'u') // 가족 아바타 칸 언저리
    const belowShelf = place(unit.x, unit.bottom + 4, 'u') // 다리 아래 마루
    expect(readFamilyShelf(unit, [aboveShelf], el).laid).toBe(0)
    expect(readFamilyShelf(unit, [belowShelf], el).laid).toBe(0)
  })

  it('정령 미설정 가족은 무엇을 두어도 그 사람 것 — 배제하지 않는다(시렁 규율 승계)', () => {
    const noGuardian = buildFamilyShelfUnits([member(1)])[0]
    const anyItem = place(noGuardian.x, onShelfY(noGuardian), 'z')
    elements.set('z', 'water')
    expect(readFamilyShelf(noGuardian, [anyItem], el).blessed).toBe(true)
  })
})

describe('가족 선반장 — 배선 계약', () => {
  it('★ 방이 유닛을 세운다 — 칸 자석은 2026-08-10 폐지(CEO 「아무 곳이나 놓게」)', () => {
    expect(ROOM).toContain('buildFamilyShelfUnits')
    expect(ROOM).toContain('<FamilyShelfWall')
    // 칸 앵커를 스냅 후보로 되돌리면 선반 앞에 둔 물건이 칸으로 빨려 들어간다
    expect(ROOM).not.toContain('fshelfSlotAnchors(familyShelfUnits)')
  })

  /**
   * ★ 진열 축소 판정 — anchorId 가 아니라 **좌표**다 (2026-08-10 자석 폐지 이후)
   *
   * 자석이 사라져 새 배치에는 `seat:fshelf:` anchorId 가 발급되지 않는다. id 로 갈라 두면 새로 얹은
   * 신물만 원치수로 칸에 끼이고 옛 배치는 줄어든 채 남아 **같은 선반에 두 크기가 섞인다.**
   * 이 신당의 다른 관계 판정과 같은 문법으로 되돌린다 — 거리·좌표로 다시 잰다.
   */
  it('★ 진열 축소는 좌표 판정이다 — 개구 사각형 안이면 줄고 밖이면 원치수', () => {
    expect(FSHELF_ITEM_SCALE).toBeLessThan(1)
    const units = buildFamilyShelfUnits([member(0)])
    const u = units[0]
    const y = onShelfY(u)
    expect(familyShelfItemScale(u.x, y, units)).toBe(FSHELF_ITEM_SCALE)
    // 가로는 **유닛 폭 그대로** — 여유를 얹으면 이웃 상자가 겹쳐 v1 의 「보이지 않는 축소 구역」이 돌아온다
    expect(familyShelfItemScale(u.x + u.w / 2, y, units)).toBe(FSHELF_ITEM_SCALE)
    expect(familyShelfItemScale(u.x + u.w / 2 + 0.1, y, units)).toBe(1)
    // 세로는 «아이템의 발»로 잰다 — 널 앞뒤 1.2%p 만 여유다
    const box = fshelfDisplayBox(u)
    expect(familyShelfItemScale(u.x, box.y0 - FSHELF_ITEM_FOOT, units)).toBe(FSHELF_ITEM_SCALE)
    expect(familyShelfItemScale(u.x, box.y0 - FSHELF_ITEM_FOOT - 0.1, units)).toBe(1)
    expect(familyShelfItemScale(u.x, box.y1 - FSHELF_ITEM_FOOT + 1.2, units)).toBe(FSHELF_ITEM_SCALE)
    expect(familyShelfItemScale(u.x, box.y1 - FSHELF_ITEM_FOOT + 1.3, units)).toBe(1)
    // 유닛이 없으면(가족 선반장 미보유 신당) 아무것도 줄이지 않는다 · 깨진 좌표도 원치수
    expect(familyShelfItemScale(u.x, y, [])).toBe(1)
    expect(familyShelfItemScale(Number.NaN, y, units)).toBe(1)
  })

  /**
   * ★ 이웃 상자가 겹치지 않는다 — v1 최대 결함의 회귀 방어 (PLAN §1-4)
   * v1 은 왼벽 4좌의 축소 상자가 서로 겹쳐 x 1.475~39.525(화면 1.22장) 전체가 하나짜리 축소
   * 구역이었고, 그 경계는 화면에 **안 보였다**. v2 는 좌 사이 1.35%p 가 자유 지대다.
   */
  it('★ 좌 사이에 자유 지대가 있다 — 선반 사이에 둔 물건은 안 줄어든다', () => {
    const units = buildFamilyShelfUnits(Array.from({ length: 6 }, (_, i) => member(i)))
    const y = onShelfY(units[0])
    for (let i = 1; i < 4; i += 1) {
      const between = (units[i - 1].x + units[i].x) / 2
      expect(familyShelfItemScale(between, y, units)).toBe(1)
    }
  })

  it('★ 옛 anchorId 배치도 같은 판정에 포함된다 — 두 세대가 한 크기로 읽힌다', () => {
    const units = buildFamilyShelfUnits([member(0)])
    // 자석 시절 저장된 좌표 = 칸 앵커 값 그대로. 좌표 판정이 그 자리를 그대로 덮는가.
    for (const a of fshelfSlotAnchors(units)) {
      expect([a.id, familyShelfItemScale(a.x, a.y, units)]).toEqual([a.id, FSHELF_ITEM_SCALE])
    }
  })

  it('★ 축복 읽기와 진열 축소가 같은 상자를 쓴다 — 자가 두 벌이면 언젠가 갈라진다', () => {
    const units = buildFamilyShelfUnits([member(0, { avatarId: 'fire_dokkaebi' })])
    const u = units[0]
    const el = (): Element | null => 'fire'
    for (const [x, y] of [
      [u.x, onShelfY(u)],
      [u.x + u.w / 2, onShelfY(u)],
      [u.x, u.top + 1],
      [u.x + 20, u.top],
    ]) {
      const inBox = familyShelfItemScale(x, y, units) === FSHELF_ITEM_SCALE
      expect([x, y, readFamilyShelf(u, [place(x, y)], el).laid > 0]).toEqual([x, y, inBox])
    }
  })

  it('룸이 진열 축소를 실제로 적용한다 — 배선이 통째로 빠지면 칸에 끼인 그림이 된다', () => {
    expect(ROOM.includes('familyShelfItemScale') || ROOM.includes('FSHELF_ITEM_SCALE')).toBe(true)
  })

  /**
   * ★ 자산은 **파일명 버전업**이 계약이다 — 같은 이름으로 덮어쓰면 폰 캐시가 옛 그림을 준다
   *   (2026-08-11 v5 회차에서 실제로 겪은 함정). v1 스프라이트는 원복 레버로 남겨 둔다.
   */
  it('★ v2 스프라이트가 실재하고 벽 컴포넌트가 그 경로를 쓴다 (v1 은 원복 레버로 남는다)', () => {
    const v2 = 'public/shrine/stage/banga/shelf-sabang-v2.webp'
    expect(existsSync(path.join(process.cwd(), v2))).toBe(true)
    expect(existsSync(path.join(process.cwd(), 'public/shrine/stage/banga/shelf-sabang.webp'))).toBe(true)
    expect(WALL).toContain('/shrine/stage/banga/shelf-sabang-v2.webp')
  })

  /**
   * ★ 널 상면 표가 **스프라이트 실측과 같은가** — v1 이 조용히 3%p 틀려 있던 자리.
   * 생성 스크립트가 세그먼트를 조립하므로, 랜드마크는 그 스크립트의 규격에서 재현된다:
   *   비개구 4띠(153+29+25+29=236) 고정 · 진열칸만 늘려 12.9/28 을 만든다.
   */
  it('★ FSHELF_TIERS 가 스프라이트 조립 규격에서 재현된다 — 손으로 적은 값이 아니다', () => {
    const NON_OPEN = [153, 29, 25, 29] // 천판+가족칸 · 널1 · 널2 · 다리 (원본 실측 px)
    const sum = NON_OPEN.reduce((a, b) => a + b, 0)
    const totalH = Math.round(sum / (1 - 12.9 / 28))
    const displayH = totalH - sum
    const at = (px: number) => px / totalH
    /**
     * 표의 값은 **구운 자산의 알파 주사**에서 왔고, 조립 규격은 **자를 때 쓴 경계**다.
     * 둘은 몰딩 모서리의 안티에일리어싱(1~3px)만큼 어긋난다 — 유닛 세로 28%p 기준 0.19%p,
     * 화면에서 1.2px 다. 그래서 «같은 값»이 아니라 «5px 안에서 만나는가»를 잰다.
     * (여기서 완전 일치를 강요하면 다음에 자산을 구울 때 아무도 이 표를 못 갱신한다.)
     */
    const near = (a: number, b: number) => expect(Math.abs(a - b) * totalH).toBeLessThan(5)
    near(FSHELF_TIERS.familyBay[0], at(50)) // 천판(49px) 아래 = 가족 칸 시작
    near(FSHELF_TIERS.familyBay[1], at(NON_OPEN[0]))
    near(FSHELF_TIERS.family, (FSHELF_TIERS.familyBay[0] + FSHELF_TIERS.familyBay[1]) / 2)
    near(FSHELF_TIERS.displayTop, at(NON_OPEN[0] + NON_OPEN[1]))
    near(FSHELF_TIERS.boards[0], at(NON_OPEN[0] + NON_OPEN[1] + displayH))
    // 생성 스크립트가 실재해야 이 표를 다시 만들 수 있다(자산만 있고 레시피가 없으면 다음 회차가 막힌다)
    expect(existsSync(path.join(process.cwd(), 'scripts/shrine-assets/stage-shelf-v2.mjs'))).toBe(true)
  })

  it('★ 축복 맥동은 기존 클래스 재사용(shelf-blessed-aura) — 새 keyframes 를 만들지 않는다', () => {
    expect(WALL).toContain('shelf-blessed-aura')
  })
})
