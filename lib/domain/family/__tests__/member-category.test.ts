/**
 * 인연 갈래(가족/지인)의 계약.
 *
 * 🔴 이 파일이 지키는 단 하나: **모르는 값은 가족으로 떨어진다.**
 * 갈래는 나중에 생긴 개념이라 옛 데이터에는 값이 없거나 이상할 수 있다. 그때 지인으로 밀면
 * 그 사람이 가족 신당·기운 지도에서 **조용히 사라진다** — 사용자는 지웠다고 느낀다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  ACQUAINTANCE_RELATIONS,
  DEFAULT_MEMBER_CATEGORY,
  FAMILY_RELATIONS,
  MEMBER_CATEGORIES,
  MEMBER_CATEGORY_META,
  isMemberCategory,
  memberCategoryLabel,
  relationsFor,
  toMemberCategory,
} from '@/lib/domain/family/member-category'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('🔴 갈래 판정 — 잃어버린 값은 가족이다', () => {
  it('빈 값·모르는 값·null 은 전부 가족으로 떨어진다', () => {
    for (const input of [null, undefined, '', '알수없음', 'FAMILY', 'friend']) {
      expect({ input, category: toMemberCategory(input) }).toEqual({ input, category: 'family' })
    }
  })

  it('기본값이 가족이다 (지인은 새로 등록할 때 스스로 고르는 값이다)', () => {
    expect(DEFAULT_MEMBER_CATEGORY).toBe('family')
  })

  it('아는 값만 통과시킨다', () => {
    expect(isMemberCategory('family')).toBe(true)
    expect(isMemberCategory('acquaintance')).toBe(true)
    expect(isMemberCategory('friend')).toBe(false)
  })

  it('갈래는 둘뿐이고 둘 다 라벨·안내 문구를 갖는다', () => {
    expect(MEMBER_CATEGORIES).toEqual(['family', 'acquaintance'])
    for (const key of MEMBER_CATEGORIES) {
      expect(MEMBER_CATEGORY_META[key].label.length).toBeGreaterThan(0)
      expect(MEMBER_CATEGORY_META[key].pickHint.length).toBeGreaterThan(0)
    }
    expect(memberCategoryLabel('acquaintance')).toBe('지인')
  })
})

describe('관계 목록 — 갈래와 어긋나지 않게', () => {
  it('🔴 지인 목록에 가족 관계가 섞이지 않는다', () => {
    // 지인으로 등록하며 «배우자»를 고르면 갈래와 관계가 다른 말을 하는 데이터가 남는다.
    for (const relation of ACQUAINTANCE_RELATIONS) {
      expect(FAMILY_RELATIONS).not.toContain(relation)
    }
  })

  it('갈래마다 고를 관계가 있다', () => {
    expect(relationsFor('family').length).toBeGreaterThan(0)
    expect(relationsFor('acquaintance').length).toBeGreaterThan(0)
    expect(relationsFor('acquaintance')).toEqual(ACQUAINTANCE_RELATIONS)
  })
})

describe('🔴 배선 — 갈래가 실제로 흐른다', () => {
  it('대상 뷰가 갈래를 실어 오고, 타입도 그것을 요구한다', () => {
    const destiny = read('app/actions/user/destiny.ts')

    expect(destiny).toContain('member_category')
    expect(destiny).toContain('member_category: MemberCategory')
  })

  it('즉석 등록이 갈래를 저장한다 (풀이 화면을 떠나지 않고 등록하는 경로)', () => {
    const family = read('app/actions/user/family.ts')

    expect(family).toContain('quickAddDestinyTarget')
    expect(family).toContain('member_category')
  })

  it('대상 선택기가 본인·가족·지인으로 갈라 보여 준다', () => {
    const selector = read('components/destiny/target-selector.tsx')

    expect(selector).toContain('QuickAddTarget')
    expect(selector).toContain("'family', 'acquaintance'")
  })

  it('기운 지도가 갈래를 싣고, 지인은 기본에서 빠져 있다', () => {
    // 「우리 가족 기운」 화면이라 지인이 자동으로 섞이면 평균과 «메워주는 관계»가 엉뚱해진다.
    expect(read('lib/domain/shrine/energy-map.ts')).toContain('category: MemberCategory')
    expect(read('components/family/FamilyEnergyMap.tsx')).toContain("e.category !== 'acquaintance'")
  })

  it('가족 화면이 갈래 탭으로 나뉜다', () => {
    expect(read('app/protected/family/family-page-client.tsx')).toContain('MEMBER_CATEGORIES')
  })

  it('마이그레이션 파일이 남아 있다 (DB 에만 두면 재구축에서 되돌아간다)', () => {
    const migration = read('supabase/migrations/20260816_member_category.sql')

    expect(migration).toContain('member_category')
    expect(migration).toContain("default 'family'")
    // 뷰는 drop 후 재생성해야 한다 — 컬럼을 중간에 끼우면 42P16 으로 막힌다.
    expect(migration).toContain('drop view if exists v_destiny_targets')
  })
})
