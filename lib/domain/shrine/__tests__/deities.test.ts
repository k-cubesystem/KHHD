import { assignGuardian, GUARDIAN_RULES, DEFAULT_GUARDIAN } from '../deities'
import type { Element } from '../types'

describe('assignGuardian — 결정론적 수호신 자동 배정', () => {
  describe('① 고민(focus_areas) 키워드 매칭', () => {
    const cases: Array<[string, string]> = [
      ['재물,투자', 'teoju'],
      ['재물운', 'teoju'],
      ['건강', 'jowang'],
      ['다이어트', 'jowang'],
      ['연애,결혼', 'seonnyeo'],
      ['취업,승진운', 'seongju'],
      ['이직', 'seongju'],
      ['자녀,육아', 'samsin'],
      ['임신', 'samsin'],
      ['시험,합격', 'dongja'],
      ['자격증 준비', 'dongja'],
    ]
    it.each(cases)('focusAreas="%s" → %s', (focusAreas, expected) => {
      const r = assignGuardian({ yongsin: null, focusAreas })
      expect(r.code).toBe(expected)
      expect(r.reason).toBe('concern')
    })
  })

  describe('② 용신 오행 매칭 (고민 없음)', () => {
    const cases: Array<[Element, string]> = [
      ['fire', 'jowang'],
      ['water', 'seonnyeo'],
      ['earth', 'samsin'], // earth 동점(samsin/teoju) → order 낮은 samsin
      ['wood', 'seongju'], // wood 동점(seongju/dongja) → seongju
    ]
    it.each(cases)('yongsin=%s → %s', (yongsin, expected) => {
      const r = assignGuardian({ yongsin, focusAreas: null })
      expect(r.code).toBe(expected)
      expect(r.reason).toBe('element')
    })

    it('metal 용신은 tier1 수호신에 없음 → 기본(samsin)', () => {
      const r = assignGuardian({ yongsin: 'metal', focusAreas: null })
      expect(r.code).toBe(DEFAULT_GUARDIAN)
      expect(r.reason).toBe('default')
    })
  })

  describe('③ 기본값', () => {
    it('용신·고민 모두 없음 → 삼신할매', () => {
      const r = assignGuardian({ yongsin: null, focusAreas: null })
      expect(r.code).toBe('samsin')
      expect(r.reason).toBe('default')
    })
    it('빈 문자열 focusAreas도 안전', () => {
      expect(assignGuardian({ yongsin: null, focusAreas: '   ' }).code).toBe('samsin')
    })
  })

  describe('우선순위: 고민 > 용신', () => {
    it('고민(재물→teoju)이 용신(fire→jowang)을 이긴다', () => {
      const r = assignGuardian({ yongsin: 'fire', focusAreas: '재물' })
      expect(r.code).toBe('teoju')
      expect(r.reason).toBe('concern')
    })
    it('고민+용신이 같은 신위를 가리키면 그 신위', () => {
      const r = assignGuardian({ yongsin: 'water', focusAreas: '연애' })
      expect(r.code).toBe('seonnyeo')
    })
  })

  describe('결정론 보장', () => {
    it('같은 입력은 항상 같은 결과 (동점 포함)', () => {
      const input = { yongsin: 'earth' as Element, focusAreas: null }
      const a = assignGuardian(input)
      const b = assignGuardian(input)
      const c = assignGuardian(input)
      expect(a).toEqual(b)
      expect(b).toEqual(c)
    })
    it('다중 고민 매칭 시 매칭수 많은 신위 우선', () => {
      // 재물 2회 매칭(teoju) vs 건강 1회(jowang)
      const r = assignGuardian({ yongsin: null, focusAreas: '재물,투자,건강' })
      expect(r.code).toBe('teoju')
    })
  })

  describe('시드 정합성', () => {
    it('수호신 규칙은 정확히 6개', () => {
      expect(GUARDIAN_RULES).toHaveLength(6)
    })
    it('규칙 code는 중복 없음 & order 1~6', () => {
      const codes = GUARDIAN_RULES.map((r) => r.code)
      expect(new Set(codes).size).toBe(6)
      expect(GUARDIAN_RULES.map((r) => r.order).sort()).toEqual([1, 2, 3, 4, 5, 6])
    })
  })
})
