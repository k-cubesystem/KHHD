import { buildCompatibilityPrompt } from '../compatibility'
import { RELATIONSHIP_TYPES } from '@/lib/constants/relationship-types'
import { getFocusGroupSpec } from '@/lib/domain/compatibility/focus-groups'

const baseInput = {
  person1Name: '홍길동',
  person2Name: '김영희',
  ctx1PromptContext: '일간 甲木, 사주 갑자 을축 병인 정묘',
  ctx2PromptContext: '일간 丙火, 사주 무진 기사 경오 신미',
  engineTotalScore: 62,
  engineMulsangNarrative: '큰 나무와 태양이 만난 풍경',
  categoryBreakdownText: '- 겉성격 합: 70점 — 대화가 잘 통한다',
}

describe('궁합 프롬프트 빌더', () => {
  it('각 관계 프롬프트가 해당 군의 질문 5개·특화지시·금지소재·섹션제목을 포함', () => {
    for (const r of RELATIONSHIP_TYPES) {
      const spec = getFocusGroupSpec(r.value)
      const { userPrompt, focusGroup } = buildCompatibilityPrompt({ ...baseInput, relationship: r.value })
      expect(focusGroup).toBe(spec.group)
      for (const q of spec.questions) expect(userPrompt).toContain(q)
      expect(userPrompt).toContain(spec.guidance)
      expect(userPrompt).toContain(spec.forbidden)
      expect(userPrompt).toContain(spec.placesLabel)
      expect(userPrompt).toContain('"focusAnswers"')
    }
  })

  it('MEETING(소개팅·짝사랑) 프롬프트에는 "과거 역추산"·pastRetrograde 가 없다', () => {
    for (const v of ['dating', 'crush']) {
      const { userPrompt } = buildCompatibilityPrompt({ ...baseInput, relationship: v })
      expect(userPrompt).not.toContain('과거 역추산')
      expect(userPrompt).not.toContain('pastRetrograde')
    }
  })

  it('연애군(COUPLE/MARRIAGE)은 과거 역추산 + pastRetrograde 스키마를 요구', () => {
    for (const v of ['lover', 'marriage', 'spouse']) {
      const { userPrompt } = buildCompatibilityPrompt({ ...baseInput, relationship: v })
      expect(userPrompt).toContain('과거 역추산')
      expect(userPrompt).toContain('"pastRetrograde"')
    }
  })

  it('비연애군(WORK/PARENT_CHILD/SIBLINGS/FRIEND/BUSINESS)은 pastRetrograde 를 요구하지 않는다', () => {
    for (const v of ['boss_employee', 'parent_child', 'siblings', 'friend', 'business_partner']) {
      const { userPrompt } = buildCompatibilityPrompt({ ...baseInput, relationship: v })
      expect(userPrompt).not.toContain('"pastRetrograde"')
    }
  })

  it('WORK 프롬프트는 연애/데이트 소재를 금지하고 협업 방식 제목을 쓴다', () => {
    const { userPrompt } = buildCompatibilityPrompt({ ...baseInput, relationship: 'coworker' })
    expect(userPrompt).toContain('합이 트이는 협업 방식')
    expect(userPrompt).toContain('연애 소재 전면 금지')
  })
})
