import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  FAMILY_SEAT_TYPES,
  SEAT_ANCHOR_PREFIX,
  SEAT_SURFACE_TYPES,
  SHELF_CAPACITY,
  SHELF_RADIUS,
  SHELF_TYPE,
  SURFACE_SLOTS,
  familyGuardianElement,
  isFamilySeat,
  isOnSurface,
  isSeatSurface,
  isShelf,
  readShelf,
  seatRadius,
  surfaceSlotOffsets,
} from '../shelf'
import { parseAnchorId } from '../stage'
import { SHOP_SECTIONS } from '../shop-sections'
import { motionVariance, varianceStyle, hashId } from '../motion-variance'
import type { CatalogItem, Placement } from '../types'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION = read('supabase/migrations/20260805_shrine_shelf.sql')
const SEATS_MIGRATION = read('supabase/migrations/20260806_shrine_family_seats.sql')
const ROOM = read('components/shrine/scene/ShrineRoomClient.tsx')
const SCENE_ACTION = read('app/actions/shrine/scene.ts')

let seq = 0
function item(over: Partial<CatalogItem>): CatalogItem {
  seq += 1
  return {
    id: over.id ?? `cat-${seq}`,
    name: over.name ?? `item-${seq}`,
    description: null,
    type: over.type ?? 'candle',
    rarity: 'common',
    emoji: '🕯️',
    spriteUrl: null,
    element: over.element !== undefined ? over.element : 'fire',
    energyPower: 10,
    layer: 'wall',
    size: over.size ?? 'md',
    behavior: {},
    priceBok: 0,
    priceKrw: 0,
    priceBokchae: 0,
    unlockEffect: null,
    matters: [],
    originNote: null,
  }
}

function place(catalogItemId: string, x: number, y: number): Placement {
  seq += 1
  return { id: `pl-${seq}`, catalogItemId, layer: 'wall', x, y, flip: false, state: {} }
}

describe('시렁 — 가족 한 사람에게 바치는 자리', () => {
  const shelfCat = item({ id: 'shelf-md', type: SHELF_TYPE, element: null, size: 'md' })
  const fireCat = item({ id: 'fire-item', element: 'fire' })
  const waterCat = item({ id: 'water-item', element: 'water' })
  const byId = new Map<string, CatalogItem>([
    [shelfCat.id, shelfCat],
    [fireCat.id, fireCat],
    [waterCat.id, waterCat],
  ])

  it('★ 반경 안 + 오행 일치 + 가족 지정 → 축복', () => {
    const shelf = place(shelfCat.id, 50, 30)
    const near = place(fireCat.id, 55, 32)
    const r = readShelf(shelf, 'fire', true, [shelf, near], byId)
    expect(r).toMatchObject({ laid: 1, matched: 1, blessed: true, capacity: 3 })
  })

  it('★ 가족이 지정되지 않으면 무엇을 얹어도 축복이 아니다 — 자리는 사람이 만든다', () => {
    const shelf = place(shelfCat.id, 50, 30)
    const near = place(fireCat.id, 55, 32)
    expect(readShelf(shelf, 'fire', false, [shelf, near], byId).blessed).toBe(false)
  })

  it('★ 오행이 어긋난 신물은 얹혀도(laid) 맞지(matched) 않는다', () => {
    const shelf = place(shelfCat.id, 50, 30)
    const wrong = place(waterCat.id, 54, 31)
    const r = readShelf(shelf, 'fire', true, [shelf, wrong], byId)
    expect(r).toMatchObject({ laid: 1, matched: 0, blessed: false })
  })

  it('★ 정령 오행을 모르면(경로형 아바타) 얹힌 전부를 맞는 것으로 친다 — 배제하지 않는다', () => {
    const shelf = place(shelfCat.id, 50, 30)
    const any = place(waterCat.id, 54, 31)
    expect(readShelf(shelf, null, true, [shelf, any], byId).blessed).toBe(true)
  })

  it('반경 밖은 얹힌 것이 아니고, 시렁 자신·다른 시렁은 세지 않는다', () => {
    const shelf = place(shelfCat.id, 50, 30)
    const far = place(fireCat.id, 50 + SHELF_RADIUS + 1, 30)
    const shelf2 = place(shelfCat.id, 52, 31)
    const r = readShelf(shelf, 'fire', true, [shelf, far, shelf2], byId)
    expect(r.laid).toBe(0)
  })

  it('크기별 상한이 널 길이를 따른다 (소2·중3·대4)', () => {
    expect(SHELF_CAPACITY.sm).toBe(2)
    expect(SHELF_CAPACITY.md).toBe(3)
    expect(SHELF_CAPACITY.lg).toBe(4)
  })

  it('수호 정령 오행 — 아바타 id 로 결정되고, 모르는 id·미설정은 null', () => {
    expect(familyGuardianElement('water_dokkaebi')).toBe('water')
    expect(familyGuardianElement('fire_dokkaebi')).toBe('fire')
    expect(familyGuardianElement(null)).toBeNull()
    expect(familyGuardianElement('custom-photo-path.webp')).toBeNull()
  })

  it('isShelf 는 type 하나만 본다', () => {
    expect(isShelf(item({ type: SHELF_TYPE }))).toBe(true)
    expect(isShelf(item({ type: 'candle' }))).toBe(false)
    expect(isShelf(null)).toBe(false)
  })
})

describe('가족 자리 — 시렁을 넘어 세간 전반으로', () => {
  it('★ 세간 type 전부가 자리다 — 제상·소반(table)·반닫이·문갑(chest)·보료(cushion)·병풍(screen)까지', () => {
    for (const t of FAMILY_SEAT_TYPES) expect([t, isFamilySeat(item({ type: t }))]).toEqual([t, true])
    expect(isFamilySeat(item({ type: 'candle' }))).toBe(false)
    expect(isFamilySeat(item({ type: 'guardian' }))).toBe(false)
    expect(isFamilySeat(null)).toBe(false)
  })

  it('★ 상점 「시렁·세간」 갈래와 단일 출처다 — 두 목록이 어긋나면 상점과 배정이 갈라진다', () => {
    const section = SHOP_SECTIONS.find((s) => s.key === 'shelf')
    expect(section?.types).toEqual(FAMILY_SEAT_TYPES)
  })

  it('★ 세간 곁의 세간은 얹은 것으로 세지 않는다 — 가구는 신물이 아니다', () => {
    const shelfCat = item({ id: 'seat-shelf', type: SHELF_TYPE, element: null, size: 'md' })
    const cushionCat = item({ id: 'seat-cushion', type: 'cushion', element: null, size: 'md' })
    const fireCat = item({ id: 'fire-near', element: 'fire' })
    const byId = new Map<string, CatalogItem>([
      [shelfCat.id, shelfCat],
      [cushionCat.id, cushionCat],
      [fireCat.id, fireCat],
    ])
    const shelf = place(shelfCat.id, 50, 30)
    const cushion = place(cushionCat.id, 53, 31)
    const fire = place(fireCat.id, 47, 29)
    const r = readShelf(shelf, 'fire', true, [shelf, cushion, fire], byId)
    expect(r).toMatchObject({ laid: 1, matched: 1, blessed: true })
  })

  it('★ 방이 세간 판정에 isFamilySeat 를 쓴다 — z 끌어올림에서 가구 위 가구를 거르는 판정', () => {
    // (2026-08-10 자석 폐지 전에는 «진열대 스냅 후보에서 세간을 거르는» 자리였다.
    //  스냅이 사라진 지금 같은 판정이 깊이 역전 교정(surfaceZById)에 그대로 산다)
    expect(ROOM).toContain('isFamilySeat(qi)')
  })

  it('★ 세간별 가족 배정 UI 는 물러났다(2026-08-06) — 가족의 자리는 선반장 하나다', () => {
    // 배정 시트·액션이 되살아나면 가족이 방에 두 번 서는 그림이 재발한다
    expect(ROOM).not.toContain('ShelfAssignSheet')
    expect(existsSync(path.join(process.cwd(), 'app/actions/shrine/shelf.ts'))).toBe(false)
    // 단, familyMemberId 는 저장 경로에 계속 실린다 — 빼면 기존 지정 데이터가 저장마다 소멸한다
  })
})

describe('진열대 — 위에 얹어 진열하는 세간', () => {
  it('★ 진열대는 자리의 부분집합 — 시렁·상(table)·궤(chest)만. 보료·병풍·기억의 함은 자리이되 진열대가 아니다', () => {
    for (const t of SEAT_SURFACE_TYPES) {
      expect([t, FAMILY_SEAT_TYPES.includes(t)]).toEqual([t, true])
      expect([t, isSeatSurface(item({ type: t }))]).toEqual([t, true])
    }
    expect(isSeatSurface(item({ type: 'cushion' }))).toBe(false)
    expect(isSeatSurface(item({ type: 'screen' }))).toBe(false)
    expect(isSeatSurface(item({ type: 'statue' }))).toBe(false)
    expect(isSeatSurface(null)).toBe(false)
  })

  it('★ 진열 칸 수 = 얹힘 상한(소2·중3·대4), dy 전부 음수(상판은 중심보다 위), 좌우 대칭', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const slots = surfaceSlotOffsets(size)
      expect(slots.length).toBe(SHELF_CAPACITY[size])
      for (const s of slots) expect(s.dy).toBeLessThan(0)
      expect(slots.reduce((a, s) => a + s.dx, 0)).toBe(0)
    }
    expect(surfaceSlotOffsets(null)).toEqual(SURFACE_SLOTS.md)
  })

  it('★ 얹힘 반경 — sm·md 는 15 그대로(무손실 — 라이브 시렁 축복이 좁아지면 안 된다), lg 만 19', () => {
    expect(seatRadius('sm')).toBe(SHELF_RADIUS)
    expect(seatRadius('md')).toBe(SHELF_RADIUS)
    expect(seatRadius('lg')).toBe(19)
    expect(seatRadius(null)).toBe(SHELF_RADIUS)
  })

  it('★ lg 진열대(제상)는 17% 거리 제물도 얹힘으로 센다 — 확대 상판의 가장자리 배제 방지', () => {
    const jesangCat = item({ id: 'jesang', type: 'table', element: null, size: 'lg' })
    const fireCat = item({ id: 'fire-edge', element: 'fire' })
    const byId = new Map<string, CatalogItem>([
      [jesangCat.id, jesangCat],
      [fireCat.id, fireCat],
    ])
    const seat = place(jesangCat.id, 50, 70)
    const edge = place(fireCat.id, 67, 70)
    expect(readShelf(seat, 'fire', true, [seat, edge], byId).blessed).toBe(true)
  })

  it('★ isOnSurface — 위는 참, 곁이라도 아래(앞에 세운 것)·반경 밖은 거짓', () => {
    const seat = { x: 50, y: 70 }
    expect(isOnSurface({ x: 53, y: 65 }, seat, 'md')).toBe(true)
    expect(isOnSurface({ x: 50, y: 74 }, seat, 'md')).toBe(false)
    expect(isOnSurface({ x: 70, y: 65 }, seat, 'md')).toBe(false)
  })

  it('★ seat: 앵커 id 는 저장 왕복을 살아남는다 — parseAnchorId 62자 한도 안', () => {
    const id = `${SEAT_ANCHOR_PREFIX}0f47c1e2-8f6a-4b7e-9c3d-1a2b3c4d5e6f:3`
    expect(id.length).toBeLessThanOrEqual(62)
    expect(parseAnchorId(id)).toBe(id)
  })

  it('★ 계약 — 저장·드래그 모두 자유 배치(존 클램프 폐지 2026-08-07), 절대 범위 [0,100]만 지킨다', () => {
    // 존 클램프가 되살아나면 "구역에 묶여 자유도가 낮다"가 재발하고, 절대 클램프가 사라지면
    // 방 밖 좌표가 저장돼 아이템이 증발한다 — 두 방향 모두 여기서 걸린다.
    expect(SCENE_ACTION).toContain('clampPct(p.x, FULL_RANGE)')
    expect(SCENE_ACTION).toContain('clampPct(p.y, FULL_RANGE)')
    expect(SCENE_ACTION).not.toContain('zone.x')
    expect(ROOM).toContain('clampPct(freeX, FREE_RANGE)')
    expect(ROOM).not.toContain('clampPct(freeX, zone.x)')
  })

  it('★ 계약 — 자석도 동반 이동도 없다(2026-08-10 CEO 지시), 깊이 역전 교정만 남는다', () => {
    // CEO 실기기 지시: 「자석처럼 붙는 기능 빼고 아무 곳이나 놓게」 · 「서로 묶여서 움직이는 것도 해결」.
    // ① 진열 칸 스냅 앵커가 되살아나면 손이 놓은 자리를 무대가 다시 빼앗는다.
    expect(ROOM).not.toContain('surfaceAnchors')
    expect(ROOM).not.toContain('nearestAnchor')
    // ② 진열대 동반 이동이 되살아나면 가구 하나를 끌 때 위 제물이 통째로 따라온다.
    expect(ROOM).not.toContain('isOnSurface(q, p, carry.size)')
    // ③ 얹힘 관계는 여전히 **거리**로 판정한다 — 스냅과 독립이라 깊이 역전 교정은 그대로 산다.
    expect(ROOM).toContain('isOnSurface(q, s.p, s.size)')
    expect(ROOM).toContain('zOverride ?? depthZ')
  })

  it('★ 계약 — 신물 표시 크기는 종전 23·29·35 의 +25% 다 (CEO 「너무 작아 잘 안 보여」)', () => {
    // 되돌아가면 실기기에서 다시 «점»이 된다. 스크립트(stage-theme-harmony·stage-grand-altar)가
    // 이 블록의 md 를 정규식으로 읽어 가므로 표기 형태도 함께 고정한다.
    const block = ROOM.match(/const SIZE_PX[^=]*=\s*\{([^}]*)\}/)?.[1] ?? ''
    const px = (k: string) => Number(block.match(new RegExp(`${k}:\\s*'([\\d.]+)px'`))?.[1])
    expect([px('sm'), px('md'), px('lg')]).toEqual([23 * 1.25, 29 * 1.25, 35 * 1.25])
  })
})

describe('가구 5종 — 마이그레이션 계약 (20260806_shrine_family_seats)', () => {
  it("★ DB type CHECK 에 'table'·'chest' 가 있다", () => {
    expect(SEATS_MIGRATION).toMatch(/'table',\s*'chest'\s*\n?\)\)/)
  })

  it('★ 5종 전부 시드에 있고, element null(공명 밖) 규율을 지킨다', () => {
    for (const name of ['제상', '개다리소반', '반닫이', '문갑', '보료']) {
      expect([name, SEATS_MIGRATION.includes(`('${name}',`)]).toEqual([name, true])
    }
    // 세간 5행 전부 element 자리가 null — 오행을 주면 공명 계산에 끼어든다
    const rows = SEATS_MIGRATION.match(/'(?:table|chest|cushion)', null, 0, 'floor'/g) ?? []
    expect(rows.length).toBe(5)
  })

  it('★ 설명의 「N 점까지」가 도메인 상한과 같다 — 소2·중3·대4', () => {
    expect(SEATS_MIGRATION).toContain('네 점까지 올립니다') // 제상 lg=4
    expect(SEATS_MIGRATION).toContain('두 점까지 올립니다') // 소반·문갑 sm=2
    expect(SEATS_MIGRATION).toContain('세 점까지 위에 올립니다') // 반닫이 md=3
    expect(SEATS_MIGRATION).toContain('세 점까지 곁에 둡니다') // 보료 md=3
  })

  it('★ 스프라이트 5장이 실재한다 — 연결만 하고 파일이 없으면 방에 깨진 그림이 뜬다', () => {
    for (const slug of ['table-jesang', 'table-soban', 'chest-bandaji', 'chest-mungap', 'cushion-boryo']) {
      const rel = `public/shrine/items/${slug}.webp`
      expect([slug, existsSync(path.join(process.cwd(), rel))]).toEqual([slug, true])
      expect(SEATS_MIGRATION).toContain(`/shrine/items/${slug}.webp`)
    }
  })
})

describe('시렁 — 계약이 세 곳에서 같다', () => {
  it("★ DB type CHECK 에 'shelf' 가 있고, 시렁 3종의 capacity 문구가 도메인 상수와 같다", () => {
    expect(MIGRATION).toMatch(/'shelf'\s*\)\)/)
    expect(MIGRATION).toContain('두 점까지')
    expect(MIGRATION).toContain('세 점까지')
    expect(MIGRATION).toContain('네 점까지')
  })

  it('★ 저장 경로가 가족 지정을 실어 나른다 — 빠지면 저장마다 지정이 날아간다', () => {
    expect(SCENE_ACTION).toContain('family_member_id: famIds[i]')
    expect(ROOM).toContain('familyMemberId: p.familyMemberId')
  })

  it('★ 방문자 씬은 가족 이름표를 조회조차 하지 않는다', () => {
    const pub = SCENE_ACTION.slice(SCENE_ACTION.indexOf('export async function getPublicSceneData'))
    expect(pub).toContain('familyTags: {}')
  })
})

describe('연출 위상 변주 — 군대 행진을 흩는다', () => {
  it('★ 결정론 — 같은 id 는 언제나 같은 편차 (하이드레이션이 걸려 있다)', () => {
    expect(motionVariance('pl-abc')).toEqual(motionVariance('pl-abc'))
    expect(hashId('pl-abc')).toBe(hashId('pl-abc'))
  })

  it('★ 위상은 음수다 — 처음 몇 초 얼어 있다 움직이기 시작하면 들킨다', () => {
    for (const id of ['a', 'b', 'c', 'pl-1', 'pl-2']) {
      expect(motionVariance(id).delaySec).toBeLessThanOrEqual(0)
      expect(motionVariance(id).delaySec).toBeGreaterThanOrEqual(-8)
    }
  })

  it('박자 배율은 0.92~1.12 안이다 — 그 밖이면 연출이 다른 물건처럼 보인다', () => {
    for (let i = 0; i < 50; i += 1) {
      const v = motionVariance(`pl-${i}`)
      expect(v.durScale).toBeGreaterThanOrEqual(0.92)
      expect(v.durScale).toBeLessThanOrEqual(1.12)
    }
  })

  it('서로 다른 id 50개가 실제로 흩어진다 (위상 고유값 30개 이상)', () => {
    const phases = new Set<number>()
    for (let i = 0; i < 50; i += 1) phases.add(motionVariance(`pl-${i}`).delaySec)
    expect(phases.size).toBeGreaterThanOrEqual(30)
  })

  it('varianceStyle — 위상만 기본, 박자는 요청할 때만 (유한+무한 겹침 보호)', () => {
    const only = varianceStyle('x', false, 8)
    expect(only.animationDelay).toMatch(/^-\d+(\.\d+)?s$/)
    expect(only.animationDuration).toBeUndefined()
    const withDur = varianceStyle('x', true, 8)
    expect(withDur.animationDuration).toMatch(/s$/)
  })
})
