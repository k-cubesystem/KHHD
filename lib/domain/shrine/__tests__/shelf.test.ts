import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SHELF_CAPACITY, SHELF_RADIUS, SHELF_TYPE, familyGuardianElement, isShelf, readShelf } from '../shelf'
import { motionVariance, varianceStyle, hashId } from '../motion-variance'
import type { CatalogItem, Element, Placement } from '../types'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION = read('supabase/migrations/20260805_shrine_shelf.sql')
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
