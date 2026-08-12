/**
 * 결제 도우미 표시 모델 — «숫자는 단일 출처에서만 온다» 계약을 못 박는다.
 *
 * 여기서 지키는 것:
 *  - 기능별 복채는 FEATURE_COST 와 항상 같다(안내 문구가 실차감과 어긋나면 표시광고법 문제).
 *  - 멤버십·복채팩 숫자는 넘겨준 DB 행에서만 온다 — 플랜을 바꾸면 안내도 따라 바뀐다.
 *  - 회원 판정은 planId → tier 순으로 해석되고, 플랜을 못 찾으면 숫자 문구를 지운다(마스터).
 */
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { VOUCHER_CATALOG } from '@/lib/domain/payment/vouchers'
import { buildPaymentGuideModel, intervalWords, type PlanInput, type PackInput } from '../payment-guide-model'

const PLANS: PlanInput[] = [
  {
    id: 'plan-single',
    name: '싱글 멤버십',
    tier: 'SINGLE',
    price: 9900,
    interval: 'MONTH',
    talismans_per_period: 10,
    relationship_limit: 3,
  },
  {
    id: 'plan-family',
    name: '패밀리 멤버십',
    tier: 'FAMILY',
    price: 29900,
    interval: 'MONTH',
    talismans_per_period: 30,
    relationship_limit: 10,
  },
  {
    id: 'plan-dead',
    name: '폐지된 플랜',
    tier: 'BUSINESS',
    price: 100,
    interval: 'MONTH',
    talismans_per_period: 1,
    relationship_limit: 1,
    is_active: false,
  },
]

const PACKS: PackInput[] = [
  { name: '행운 꾸러미', credits: 10, bonus_credits: 1, price: 100000 },
  { name: '소복 씨앗', credits: 5, bonus_credits: 0, price: 50000 },
  { name: '폐지팩', credits: 1, price: 1000, is_active: false },
]

const build = (membership: { tier: string; planId: string | null } | null = null) =>
  buildPaymentGuideModel({ plans: PLANS, packs: PACKS, retentionDays: 30, membership })

describe('buildPaymentGuideModel', () => {
  it('기능별 복채는 FEATURE_COST 와 한 글자도 어긋나지 않는다', () => {
    const model = build()
    const all = [...model.paidFeatures, ...model.freeFeatures]

    expect(all).toHaveLength(Object.keys(FEATURE_COST).length)
    for (const f of all) {
      expect(f.cost).toBe(FEATURE_COST[f.key].display)
    }
    // 무료/유료 분류도 소스가 정한다
    expect(model.freeFeatures.every((f) => FEATURE_COST[f.key].free)).toBe(true)
    expect(model.paidFeatures.every((f) => !FEATURE_COST[f.key].free)).toBe(true)
  })

  it('입문 상품은 «가장 싼 활성 상품» — 정렬 순서나 비활성 행에 속지 않는다', () => {
    const model = build()
    expect(model.entryPack?.name).toBe('소복 씨앗')
    expect(model.entryPack?.price).toBe(50000)
    expect(model.entryPlan?.name).toBe('싱글 멤버십')
    expect(model.entryPlan?.price).toBe(9900)
  })

  it('플랜 값이 바뀌면 안내 숫자도 따라 바뀐다(하드코딩 없음)', () => {
    const bumped = buildPaymentGuideModel({
      plans: [{ ...PLANS[0], price: 12900, talismans_per_period: 15, relationship_limit: 5 }],
      packs: PACKS,
      retentionDays: 45,
      membership: null,
    })
    expect(bumped.entryPlan?.price).toBe(12900)
    expect(bumped.entryPlan?.bokchaePerPeriod).toBe(15)
    expect(bumped.entryPlan?.relationshipLimit).toBe(5)
    expect(bumped.retentionDays).toBe(45)
  })

  it('이용권은 VOUCHER_CATALOG 에서 온다', () => {
    const model = build()
    expect(model.chatPass.label).toBe(VOUCHER_CATALOG.CHAT_DAY_PASS.label)
    expect(model.chatPass.priceBokchae).toBe(VOUCHER_CATALOG.CHAT_DAY_PASS.priceBokchae)
  })

  it('비회원이면 membership 은 null', () => {
    expect(build().membership).toBeNull()
  })

  it('회원은 planId 로 플랜을 찾는다', () => {
    const model = build({ tier: 'FAMILY', planId: 'plan-family' })
    expect(model.membership?.label).toBe('패밀리 멤버십')
    expect(model.membership?.plan?.bokchaePerPeriod).toBe(30)
  })

  it('planId 가 없으면 등급으로 찾는다', () => {
    const model = build({ tier: 'SINGLE', planId: null })
    expect(model.membership?.plan?.id).toBe('plan-single')
  })

  it('마스터처럼 플랜이 없는 등급은 plan=null — 숫자 문구를 만들지 않는다', () => {
    const model = build({ tier: 'MASTER', planId: null })
    expect(model.membership?.label).toBe('마스터')
    expect(model.membership?.plan).toBeNull()
  })
})

describe('intervalWords', () => {
  it('월 구독', () => expect(intervalWords('MONTH')).toEqual({ every: '달', price: '월' }))
  it('연 구독', () => expect(intervalWords('YEAR')).toEqual({ every: '해', price: '연' }))
})
