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
  fshelfSlotAnchors,
  hasFamilyShelf,
  readFamilyShelf,
  type FamilyShelfMemberInput,
} from '../family-shelf'
import { SEAT_ANCHOR_PREFIX } from '../shelf'
import { parseAnchorId } from '../stage'
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
  it('★ 메인 테마(반가)에만 선다 — 확산은 FAMILY_SHELF_THEMES 한 곳에서 연다', () => {
    expect(FAMILY_SHELF_THEMES).toEqual(['banga'])
    expect(hasFamilyShelf('banga')).toBe(true)
    expect(hasFamilyShelf('dangsan')).toBe(false)
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

  it('칸 y 가 벽 존(y 4~60) 안이다 — 벽걸이 신물이 칸에 스냅될 수 있어야 한다', () => {
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
  it('★ 방이 유닛을 세우고 칸 앵커를 스냅 후보에 합류시킨다', () => {
    expect(ROOM).toContain('buildFamilyShelfUnits')
    expect(ROOM).toContain('fshelfSlotAnchors(familyShelfUnits)')
    expect(ROOM).toContain('<FamilyShelfWall')
  })

  it('★ 칸에 스냅된 아이템은 진열 축소를 탄다 — 원치수로는 칸에 끼인다', () => {
    expect(FSHELF_ITEM_SCALE).toBeLessThan(1)
    expect(ROOM).toContain('FSHELF_ANCHOR_PREFIX')
    expect(ROOM).toContain('FSHELF_ITEM_SCALE')
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
