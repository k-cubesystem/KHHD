import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  FAMILY_SHELF_THEMES,
  FSHELF_ANCHOR_PREFIX,
  FSHELF_ITEM_SCALE,
  FSHELF_TIERS,
  FSHELF_UNIT,
  FSHELF_UNIT_X,
  MAX_FAMILY_SHELF,
  buildFamilyShelfUnits,
  familyShelfItemScale,
  fshelfSlotAnchors,
  hasFamilyShelf,
  readFamilyShelf,
  type FamilyShelfMemberInput,
} from '../family-shelf'
import { SEAT_ANCHOR_PREFIX } from '../shelf'
import { parseAnchorId } from '../stage'
import { THEME_CODES } from '../theme-stage'
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

  it('★ 유닛 자리가 제단(41~59)·사랑방(78.75~)을 피하고 서로 겹치지 않는다', () => {
    const half = FSHELF_UNIT.w / 2
    const spans = FSHELF_UNIT_X.map((x) => [x - half, x + half])
    for (const [lo, hi] of spans) {
      expect(hi < 41 || lo > 59).toBe(true) // 제단 밴드 밖
      expect(hi).toBeLessThan(78.75) // 사랑방 앞
      expect(lo).toBeGreaterThan(0)
    }
    for (let i = 1; i < spans.length; i += 1) {
      expect(spans[i][0]).toBeGreaterThan(spans[i - 1][1]) // 비겹침(오름차순 전제)
    }
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

  it('★ 유닛당 9칸(3단 × 3칸) — 상단은 가족 자리라 칸이 없다', () => {
    expect(FSHELF_TIERS.boards.length).toBe(3)
    expect(anchors.length).toBe(units.length * 9)
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

  it('앵커가 유닛 박스 안에 있고, 단이 위→아래로 내려간다', () => {
    const u = units[0]
    const mine = anchors.filter((a) => a.id.includes(u.key))
    for (const a of mine) {
      expect(Math.abs(a.x - u.x)).toBeLessThanOrEqual(FSHELF_UNIT.w / 2)
      expect(a.y).toBeGreaterThan(u.top)
      expect(a.y).toBeLessThan(u.bottom)
    }
    const ys = [...new Set(mine.map((a) => a.y))].sort((a, b) => a - b)
    expect(ys.length).toBe(3)
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

describe('가족 선반장 — 축복 읽기', () => {
  const unit = buildFamilyShelfUnits([member(0, { avatarId: 'fire_dokkaebi' })])[0]
  const elements = new Map<string, Element | null>()
  const el = (id: string): Element | null => elements.get(id) ?? null

  it('★ 유닛 박스 안 + 오행 일치 → 축복. 밖이거나 어긋나면 아니다', () => {
    const inFire = place(unit.x + 1, 40, 'a')
    const inWater = place(unit.x - 1, 45, 'b')
    const outFire = place(unit.x + 20, 40, 'c')
    elements.set('a', 'fire').set('b', 'water').set('c', 'fire')
    expect(readFamilyShelf(unit, [inFire], el)).toEqual({ laid: 1, blessed: true })
    expect(readFamilyShelf(unit, [inWater], el)).toEqual({ laid: 1, blessed: false })
    expect(readFamilyShelf(unit, [outFire], el)).toEqual({ laid: 0, blessed: false })
  })

  it('정령 미설정 가족은 무엇을 두어도 그 사람 것 — 배제하지 않는다(시렁 규율 승계)', () => {
    const noGuardian = buildFamilyShelfUnits([member(1)])[0]
    const anyItem = place(noGuardian.x, 40, 'z')
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
  it('★ 진열 축소는 좌표 판정이다 — 상자 안이면 줄고 밖이면 원치수', () => {
    expect(FSHELF_ITEM_SCALE).toBeLessThan(1)
    // 유닛 하나로 잰다 — 이웃 유닛(x 7·16)은 여유를 얹으면 상자가 서로 겹쳐 경계가 흐려진다
    const units = buildFamilyShelfUnits([member(0)])
    const u = units[0]
    const mid = (u.top + u.bottom) / 2
    expect(familyShelfItemScale(u.x, mid, units)).toBe(FSHELF_ITEM_SCALE)
    // 칸 끝에 반쯤 걸친 것도 «그 선반의 것» (여유 1.2%p) · 그보다 밖은 자유 배치다
    expect(familyShelfItemScale(u.x + u.w / 2 + 1.2, mid, units)).toBe(FSHELF_ITEM_SCALE)
    expect(familyShelfItemScale(u.x + u.w / 2 + 1.3, mid, units)).toBe(1)
    expect(familyShelfItemScale(u.x, u.top - 0.1, units)).toBe(1)
    expect(familyShelfItemScale(u.x, u.bottom + 0.1, units)).toBe(1)
    // 유닛이 없으면(가족 선반장 미보유 신당) 아무것도 줄이지 않는다 · 깨진 좌표도 원치수
    expect(familyShelfItemScale(u.x, mid, [])).toBe(1)
    expect(familyShelfItemScale(Number.NaN, mid, units)).toBe(1)
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
      [u.x, (u.top + u.bottom) / 2],
      [u.x + u.w / 2 + 1.2, u.bottom],
      [u.x + 20, u.top],
    ]) {
      const inBox = familyShelfItemScale(x, y, units) === FSHELF_ITEM_SCALE
      expect([x, y, readFamilyShelf(u, [place(x, y)], el).laid > 0]).toEqual([x, y, inBox])
    }
  })

  it('룸이 진열 축소를 실제로 적용한다 — 배선이 통째로 빠지면 칸에 끼인 그림이 된다', () => {
    expect(ROOM.includes('familyShelfItemScale') || ROOM.includes('FSHELF_ITEM_SCALE')).toBe(true)
  })

  it('★ 스프라이트가 실재하고 벽 컴포넌트가 그 경로를 쓴다', () => {
    const rel = 'public/shrine/stage/banga/shelf-sabang.webp'
    expect(existsSync(path.join(process.cwd(), rel))).toBe(true)
    expect(WALL).toContain('/shrine/stage/banga/shelf-sabang.webp')
  })

  it('★ 축복 맥동은 기존 클래스 재사용(shelf-blessed-aura) — 새 keyframes 를 만들지 않는다', () => {
    expect(WALL).toContain('shelf-blessed-aura')
  })
})
