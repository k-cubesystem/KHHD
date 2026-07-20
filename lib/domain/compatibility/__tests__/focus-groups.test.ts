import { RELATIONSHIP_TYPES } from '@/lib/constants/relationship-types'
import { FOCUS_GROUPS, resolveFocusGroup, MAPPED_RELATIONSHIPS, type FocusGroup } from '../focus-groups'

describe('FocusGroup 매핑', () => {
  it('RELATIONSHIP_TYPES 19종이 모두 한 군에 매핑된다 (누락/초과 0)', () => {
    const values = RELATIONSHIP_TYPES.map((r) => r.value)
    expect(values).toHaveLength(19)
    const mapped = new Set(MAPPED_RELATIONSHIPS)
    const missing = values.filter((v) => !mapped.has(v))
    expect(missing).toEqual([])
    expect(MAPPED_RELATIONSHIPS).toHaveLength(values.length)
  })

  it('각 군은 질문 5개를 가지며 group 필드가 키와 일치', () => {
    for (const g of Object.keys(FOCUS_GROUPS) as FocusGroup[]) {
      expect(FOCUS_GROUPS[g].questions).toHaveLength(5)
      expect(FOCUS_GROUPS[g].group).toBe(g)
    }
  })

  it('과거 역추산 생성은 COUPLE·MARRIAGE 만', () => {
    for (const g of Object.keys(FOCUS_GROUPS) as FocusGroup[]) {
      expect(FOCUS_GROUPS[g].generatePastRetrograde).toBe(g === 'COUPLE' || g === 'MARRIAGE')
    }
  })

  it('대표 매핑 + 매핑 불가 시 COUPLE 기본', () => {
    expect(resolveFocusGroup('dating')).toBe('MEETING')
    expect(resolveFocusGroup('crush')).toBe('MEETING')
    expect(resolveFocusGroup('lover')).toBe('COUPLE')
    expect(resolveFocusGroup('marriage')).toBe('COUPLE')
    expect(resolveFocusGroup('spouse')).toBe('MARRIAGE')
    expect(resolveFocusGroup('parent_child')).toBe('PARENT_CHILD')
    expect(resolveFocusGroup('in_laws')).toBe('PARENT_CHILD')
    expect(resolveFocusGroup('siblings')).toBe('SIBLINGS')
    expect(resolveFocusGroup('friend')).toBe('FRIEND')
    expect(resolveFocusGroup('roommate')).toBe('FRIEND')
    expect(resolveFocusGroup('boss_employee')).toBe('WORK')
    expect(resolveFocusGroup('part_timer')).toBe('WORK')
    expect(resolveFocusGroup('business_partner')).toBe('BUSINESS')
    expect(resolveFocusGroup('client')).toBe('BUSINESS')
    expect(resolveFocusGroup('unknown_xyz')).toBe('COUPLE')
  })
})
