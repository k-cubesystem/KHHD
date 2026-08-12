import * as businessCopy from '../copy'
import { FAQ_ITEMS, PRICING_TIERS, PROCESS_STEPS, TRUST_FACTS, VALUE_PROPS } from '../copy'

/**
 * /business 표시·광고법 회귀 방지 — 2026-08-12 CEO 지시(무료 체험 폐기) + 근거 없는 주장 정리.
 *
 * 라이브에서 확인된 사실: business_inquiries 0건 · membership_plans 에 기업 플랜 행 없음.
 * 즉 이 페이지가 «지금 제공 중»이라 말할 수 있는 것은 문의 접수뿐이다.
 * 아래 네 가지가 문구로 되돌아오지 못하게 막는다:
 *   ① 무료 체험·연 계약 할인   ② 금지어(매일·무제한·평생·모두 이용·정액)
 *   ③ 지어낸 실적 수치·요금     ④ 도입 기업 후기
 */

/** 화면에 실제로 나가는 모든 문장. */
const ALL_COPY: readonly string[] = [
  ...TRUST_FACTS.map((f) => f.label),
  ...PRICING_TIERS.flatMap((t) => [t.name, t.subtitle, t.price, t.priceNote, t.cta, ...t.features]),
  ...PROCESS_STEPS.flatMap((s) => [s.title, s.desc]),
  ...VALUE_PROPS.flatMap((v) => [v.title, v.desc]),
  ...FAQ_ITEMS.flatMap((f) => [f.q, f.a]),
]

describe('무료 체험·연 계약 할인 — 구현이 없으므로 문구도 없다', () => {
  it.each(['무료 체험', '무료체험', '무료 이용', '체험판'])('«%s» 이 없다', (word) => {
    for (const line of ALL_COPY) expect(line).not.toContain(word)
  })

  it('연 계약 할인을 약속하지 않는다', () => {
    for (const line of ALL_COPY) {
      expect(line).not.toMatch(/연\s*계약.*할인/)
      expect(line).not.toMatch(/\d+개월\s*(무료|할인)/)
    }
  })
})

describe('금지어 — 멤버십 문구와 같은 규율', () => {
  it.each(['매일', '무제한', '평생', '모두 이용', '정액'])('«%s» 이 없다', (word) => {
    for (const line of ALL_COPY) expect(line).not.toContain(word)
  })
})

describe('요금 — 공개된 표준 요금제가 없다', () => {
  it('모든 등급이 «문의»다 — 금액을 지어내지 않는다', () => {
    for (const tier of PRICING_TIERS) expect(tier.price).toBe('문의')
  })

  it('상담 범위 어디에도 원 단위 금액이 없다', () => {
    for (const line of ALL_COPY) expect(line).not.toMatch(/[\d,]+\s*(만)?원/)
  })

  it('«가장 인기» 같은 실적 기반 강조가 없다 — 도입 기업이 0곳이다', () => {
    for (const line of ALL_COPY) expect(line).not.toContain('인기')
  })
})

describe('실적 수치 — 뒷받침할 데이터가 없다', () => {
  it('도입 기업 수·갱신율·만족도를 싣지 않는다', () => {
    for (const line of ALL_COPY) {
      expect(line).not.toMatch(/\d+\s*%/)
      expect(line).not.toMatch(/\d(\.\d)?\s*\/\s*5/)
      expect(line).not.toMatch(/도입\s*기업\s*\d/)
    }
  })

  it('확인 가능한 사실에는 근거가 붙어 있다', () => {
    for (const fact of TRUST_FACTS) expect(fact.basis.length).toBeGreaterThan(0)
  })
})

describe('후기 — 도입 기업이 0곳이라 실을 수 없다', () => {
  it('후기 데이터를 내보내지 않는다 — 되살리려면 실제 도입 기업 동의부터 받아야 한다', () => {
    expect(Object.keys(businessCopy)).not.toContain('TESTIMONIALS')
  })
})

describe('미구현 기능 — «제공 중»이라 말하지 않는다', () => {
  it('SSO·기업 전용 접속 코드를 제공한다고 하지 않는다', () => {
    const sso = FAQ_ITEMS.find((f) => f.a.includes('SSO'))
    expect(sso?.a).toContain('아직 제공하지 않으며')
  })

  it('HR 어드민 대시보드를 제공한다고 하지 않는다', () => {
    const dash = FAQ_ITEMS.find((f) => f.a.includes('대시보드'))
    expect(dash?.a).toContain('아직 제공하지 않으며')
  })

  it('채용·승진 판단 도구로 팔지 않는다', () => {
    for (const line of ALL_COPY) {
      expect(line).not.toContain('채용 적합도')
      expect(line).not.toContain('승진')
    }
  })
})
