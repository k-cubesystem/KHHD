import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  GUARDIANS,
  GUARDIAN_TYPE,
  MAX_GUARDIANS,
  findGuardian,
  guardianSpriteUrl,
  isGuardianType,
  parseGuardianSlugs,
} from '../guardians'
import { OBANGKI_MATTERS } from '@/lib/domain/ritual/obangki'
import { SHOP_SECTIONS, sectionForType } from '../shop-sections'
import { ELEMENTS } from '../energy'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION = read('supabase/migrations/20260805c_shrine_guardians.sql')
const ROOM = read('components/shrine/scene/ShrineRoomClient.tsx')
const SCENE_ACTION = read('app/actions/shrine/scene.ts')
const EQUIP_ACTION = read('app/actions/shrine/guardians.ts')

describe('신수 32 — 카탈로그가 완결돼 있다', () => {
  it('★ 정확히 32좌 · 슬러그 유일 · 갈래 4종 분포(영수12·차사4·도깨비8·정령8)', () => {
    expect(GUARDIANS).toHaveLength(32)
    expect(new Set(GUARDIANS.map((g) => g.slug)).size).toBe(32)
    const byCat = (c: string) => GUARDIANS.filter((g) => g.category === c).length
    expect(byCat('beast')).toBe(12)
    expect(byCat('chasa')).toBe(4)
    expect(byCat('dokkaebi')).toBe(8)
    expect(byCat('spirit')).toBe(8)
  })

  it('오행이 고르게 깔린다 — 어느 기운의 신당이든 맞는 신수가 있다 (각 5좌 이상)', () => {
    for (const el of ELEMENTS) {
      const n = GUARDIANS.filter((g) => g.element === el).length
      expect([el, n >= 5]).toEqual([el, true])
    }
  })

  it('★ 전거·역할·기도 갈래가 전부 채워져 있고, 갈래는 문복 7종 안에서만 논다', () => {
    for (const g of GUARDIANS) {
      expect([g.slug, g.origin.length > 8]).toEqual([g.slug, true])
      expect([g.slug, g.role.length > 8]).toEqual([g.slug, true])
      expect([g.slug, g.matters.length >= 1]).toEqual([g.slug, true])
      for (const m of g.matters) expect([g.slug, OBANGKI_MATTERS.includes(m)]).toEqual([g.slug, true])
    }
  })

  it('★ 스프라이트 32장이 실재한다 — 파일이 빠지면 깨진 그림이 방을 돌아다닌다', () => {
    for (const g of GUARDIANS) {
      const p = path.join(process.cwd(), 'public', guardianSpriteUrl(g.slug))
      expect([g.slug, existsSync(p)]).toEqual([g.slug, true])
    }
  })

  it('★ 마이그레이션과 도메인이 한 벌이다 — 이름·스프라이트 경로가 32좌 전부 일치', () => {
    for (const g of GUARDIANS) {
      expect([g.slug, MIGRATION.includes(`('${g.name}',`)]).toEqual([g.slug, true])
      expect([g.slug, MIGRATION.includes(`/shrine/guardians/${g.slug}.webp`)]).toEqual([g.slug, true])
    }
    // DB CHECK 에 guardian 타입과 2좌 상한이 있다
    expect(MIGRATION).toContain(`'${GUARDIAN_TYPE}'`)
    expect(MIGRATION).toContain('cardinality(guardians) <= 2')
    expect(MAX_GUARDIANS).toBe(2)
  })
})

describe('신수 — 배치 아이템이 아니다 (두 관문)', () => {
  it('★ 트레이가 거른다 — 스스로 거니는 존재를 바닥에 못 박게 두지 않는다', () => {
    expect(ROOM).toContain('.filter((e) => !isGuardianType(e.item.type))')
  })

  it('★ 배치 저장(서버)이 최종 관문이다', () => {
    expect(SCENE_ACTION).toContain("error: 'GUARDIAN_NOT_PLACEABLE'")
  })

  it('타입 판정은 문자열 하나만 본다', () => {
    expect(isGuardianType('guardian')).toBe(true)
    expect(isGuardianType('candle')).toBe(false)
    expect(isGuardianType(null)).toBe(false)
  })
})

describe('신수 — 착좌 규율', () => {
  it('★ 착좌는 admin 경유다 — 컬럼 화이트리스트를 열지 않는 것이 방어다', () => {
    expect(EQUIP_ACTION).toContain('createAdminClient()')
    // 검증(보유·본인 신당)이 admin 호출보다 먼저 있어야 한다
    const adminAt = EQUIP_ACTION.indexOf('createAdminClient()')
    const ownAt = EQUIP_ACTION.indexOf("error: 'NOT_OWNED'")
    const shrineAt = EQUIP_ACTION.indexOf("error: 'SHRINE_NOT_FOUND'")
    expect(ownAt).toBeGreaterThan(-1)
    expect(ownAt).toBeLessThan(adminAt)
    expect(shrineAt).toBeLessThan(adminAt)
    // 마이그레이션이 guardians 에 grant 를 추가하지 않는다
    expect(MIGRATION.toLowerCase()).not.toContain('grant update')
  })

  it('★ parseGuardianSlugs — 모르는 슬러그는 버리고, 상한을 자르고, 중복을 걷는다', () => {
    expect(parseGuardianSlugs(['haetae', 'nope', 'haetae', 'saja', 'okto'])).toEqual(['haetae', 'saja'])
    expect(parseGuardianSlugs(null)).toEqual([])
    expect(parseGuardianSlugs('haetae')).toEqual([])
  })

  it('findGuardian 은 슬러그로 찾는다', () => {
    expect(findGuardian('cheongryong')?.name).toBe('청룡')
    expect(findGuardian('nope')).toBeUndefined()
  })
})

describe('신수 — 신·신당 없이도 기본 사용', () => {
  it('★ 본인 신당이 없으면 착좌가 만들어 준다 — 개설 절차가 신수의 관문이 아니다', () => {
    expect(EQUIP_ACTION).toContain("name: '나의 신당'")
    // 자동 생성이 admin 호출보다 앞(사용자 클라이언트 insert — 컬럼 화이트리스트 안)
    const createAt = EQUIP_ACTION.indexOf("name: '나의 신당'")
    const adminAt = EQUIP_ACTION.indexOf('createAdminClient()')
    expect(createAt).toBeGreaterThan(-1)
    expect(createAt).toBeLessThan(adminAt)
  })

  it('★ 봉헌이 신수 탭에서 바로 된다 — 결제 경로는 purchaseToInventory 한 벌 재사용', () => {
    expect(EQUIP_ACTION).toContain('export async function purchaseGuardian')
    expect(EQUIP_ACTION).toContain('purchaseToInventory(String(item.id))')
    const grid = readFileSync(path.join(process.cwd(), 'components/shrine/GuardianGrid.tsx'), 'utf8')
    expect(grid).toContain('purchaseGuardian')
  })
})

describe('상점 갈래 — 카탈로그의 모든 type 이 갈래 하나에 속한다', () => {
  it('★ DB type CHECK 목록 전부가 갈래에 배정돼 있고, 겹치지 않는다', () => {
    // CHECK 는 최신 마이그레이션이 정본 — 가족 자리 확장(20260806)이 table·chest 를 더했다
    const SEATS_MIGRATION = read('supabase/migrations/20260806_shrine_family_seats.sql')
    const check = /type in \(([\s\S]*?)\)\)/.exec(SEATS_MIGRATION)?.[1] ?? ''
    const dbTypes = [...check.matchAll(/'([a-z]+)'/g)].map((m) => m[1])
    expect(dbTypes.length).toBeGreaterThanOrEqual(24)
    const all = SHOP_SECTIONS.flatMap((s) => s.types)
    expect(new Set(all).size).toBe(all.length) // 겹침 없음
    for (const t of dbTypes) {
      // 모르는 type 은 폴백 갈래로 접히므로 sectionForType 이 항상 답을 준다
      expect([t, sectionForType(t).key.length > 0]).toEqual([t, true])
    }
    // 명시 배정 커버리지 — 폴백에 기대는 type 이 없어야 한다(새 type 추가 시 여기서 걸린다)
    for (const t of dbTypes) expect([t, all.includes(t)]).toEqual([t, true])
  })
})

describe('신수 — 배회 주체 교체', () => {
  it('★ 방은 이제 WalkingKeeper 를 그리지 않는다 — 거니는 일은 신수의 몫이다', () => {
    expect(ROOM).toContain('<GuardianWalkers')
    expect(ROOM).not.toContain('<WalkingKeeper')
  })

  it('씬이 착좌 슬러그를 실어 나른다 (소유자·방문자 양쪽)', () => {
    const hits = SCENE_ACTION.match(/guardians: parseGuardianSlugs\(shrine\.guardians\)/g) ?? []
    expect(hits.length).toBeGreaterThanOrEqual(2)
  })
})
