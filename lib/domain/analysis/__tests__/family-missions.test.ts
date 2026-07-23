import {
  countFamilyMissions,
  isFamilyCoreComplete,
  FAMILY_MISSION_CATEGORIES,
  FAMILY_MISSION_TOTAL,
  FAMILY_CORE_CATEGORIES,
} from '../family-missions'

describe('가족 미션 5종 상수', () => {
  it('사주·관상·손금·풍수·궁합 5종만 포함', () => {
    expect([...FAMILY_MISSION_CATEGORIES]).toEqual(['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'COMPATIBILITY'])
    expect(FAMILY_MISSION_TOTAL).toBe(5)
  })
  it('제외 3종(TODAY/WEALTH/NEW_YEAR)은 미포함', () => {
    for (const excluded of ['TODAY', 'WEALTH', 'NEW_YEAR']) {
      expect(FAMILY_MISSION_CATEGORIES).not.toContain(excluded)
    }
  })
  it('핵심 4상은 궁합을 뺀 개인상', () => {
    expect([...FAMILY_CORE_CATEGORIES]).toEqual(['SAJU', 'FACE', 'HAND', 'FENGSHUI'])
  })
})

describe('countFamilyMissions — 교집합 계산', () => {
  it('빈 배열 → 0', () => {
    expect(countFamilyMissions([])).toBe(0)
  })
  it('5종 전부 → 5', () => {
    expect(countFamilyMissions(['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'COMPATIBILITY'])).toBe(5)
  })
  it('제외 카테고리는 세지 않는다', () => {
    // TODAY·WEALTH·NEW_YEAR 3종은 있어도 미션 카운트에 안 든다
    expect(countFamilyMissions(['TODAY', 'WEALTH', 'NEW_YEAR'])).toBe(0)
    expect(countFamilyMissions(['SAJU', 'TODAY', 'FACE', 'WEALTH'])).toBe(2)
  })
  it('중복은 한 번만 센다', () => {
    expect(countFamilyMissions(['SAJU', 'SAJU', 'FACE'])).toBe(2)
  })
  it('알 수 없는 카테고리는 무시', () => {
    expect(countFamilyMissions(['SAJU', 'UNKNOWN', 'FACE'])).toBe(2)
  })
})

describe('isFamilyCoreComplete — 개인 4상 해금', () => {
  it('4상 모두 완료 → true(궁합 없어도)', () => {
    expect(isFamilyCoreComplete(['SAJU', 'FACE', 'HAND', 'FENGSHUI'])).toBe(true)
    expect(isFamilyCoreComplete(['SAJU', 'FACE', 'HAND', 'FENGSHUI', 'TODAY'])).toBe(true)
  })
  it('하나라도 빠지면 false', () => {
    expect(isFamilyCoreComplete(['SAJU', 'FACE', 'HAND'])).toBe(false)
    expect(isFamilyCoreComplete(['SAJU', 'FACE', 'HAND', 'COMPATIBILITY'])).toBe(false)
  })
  it('빈 배열 → false', () => {
    expect(isFamilyCoreComplete([])).toBe(false)
  })
})
