/**
 * 결제 도우미 표시 모델 — «숫자는 단일 출처에서만 온다» 계약을 못 박는다.
 *
 * 여기서 지키는 것:
 *  - 기능별 이용권 장 수는 FEATURE_COST 와 항상 같다(안내 문구가 실사용과 어긋나면 표시광고법 문제).
 *  - 멤버십·이용권 팩 숫자는 넘겨준 DB 행에서만 온다 — 플랜을 바꾸면 안내도 따라 바뀐다.
 *  - 회원 판정은 planId → tier 순으로 해석되고, 플랜을 못 찾으면 숫자 문구를 지운다(마스터).
 *  - 등급이 있어야 쓰는 풀이는 최소 등급을 함께 싣는다 — 이용권만 사면 되는 것처럼 보이면 표시광고법 문제.
 */
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { FEATURE_MIN_TIER, TIER_LABEL } from '@/lib/domain/payment/membership-tiers'
import { PASS_VALID_DAYS } from '@/lib/domain/entitlement/pass'
import {
  buildPaymentGuideModel,
  intervalWords,
  passUsageFeatures,
  type PlanInput,
  type PackInput,
} from '../payment-guide-model'

const PLANS: PlanInput[] = [
  {
    id: 'plan-single',
    name: '싱글 멤버십',
    tier: 'SINGLE',
    price: 12800,
    interval: 'MONTH',
    monthly_passes: 5,
    relationship_limit: 5,
  },
  {
    id: 'plan-family',
    name: '패밀리 멤버십',
    tier: 'FAMILY',
    price: 29900,
    interval: 'MONTH',
    monthly_passes: 15,
    relationship_limit: 15,
  },
  {
    id: 'plan-dead',
    name: '폐지된 플랜',
    tier: 'BUSINESS',
    price: 100,
    interval: 'MONTH',
    monthly_passes: 1,
    relationship_limit: 1,
    is_active: false,
  },
]

const PACKS: PackInput[] = [
  { name: '이용권 5장', credits: 5, price: 19800, product_kind: 'pass', valid_days: 90 },
  { name: '이용권 1장', credits: 1, price: 4800, product_kind: 'pass', valid_days: 90 },
  { name: '폐지팩', credits: 1, price: 1000, product_kind: 'pass', is_active: false },
  { name: '옛 복채 팩', credits: 1, price: 100, product_kind: 'bokchae' },
]

const build = (membership: { tier: string; planId: string | null } | null = null) =>
  buildPaymentGuideModel({ plans: PLANS, packs: PACKS, retentionDays: 30, membership })

describe('buildPaymentGuideModel', () => {
  it('기능별 장 수는 FEATURE_COST 와 한 글자도 어긋나지 않는다', () => {
    const model = build()
    const all = [...model.paidFeatures, ...model.freeFeatures]

    expect(all).toHaveLength(Object.keys(FEATURE_COST).length)
    for (const f of all) {
      expect(f.cost).toBe(FEATURE_COST[f.key].display)
    }
    expect(model.freeFeatures.every((f) => FEATURE_COST[f.key].free)).toBe(true)
    expect(model.paidFeatures.every((f) => !FEATURE_COST[f.key].free)).toBe(true)
  })

  it('등급이 있어야 쓰는 풀이는 최소 등급을 싣고, 나머지는 null 이다', () => {
    const byKey = new Map([...build().paidFeatures, ...build().freeFeatures].map((f) => [f.key, f.minTierLabel]))

    expect(byKey.get('circleNarrative')).toBe(TIER_LABEL[FEATURE_MIN_TIER.familyMap])
    expect(byKey.get('togetherNarrative')).toBe(TIER_LABEL[FEATURE_MIN_TIER.togetherView])
    for (const key of ['saju', 'compatibility', 'face', 'wealth', 'samhap', 'today'] as const) {
      expect(byKey.get(key)).toBeNull()
    }
  })

  it('입문 상품은 «가장 싼 활성 이용권 팩» — 정렬 순서·비활성 행·옛 복채 팩에 속지 않는다', () => {
    const model = build()
    expect(model.entryPack).toEqual({ name: '이용권 1장', passes: 1, price: 4800, validDays: 90 })
    expect(model.entryPlan?.name).toBe('싱글 멤버십')
    expect(model.entryPlan?.price).toBe(12800)
  })

  it('유효기간이 비어 있는 팩은 정본 상수(PASS_VALID_DAYS)로 읽는다', () => {
    const model = buildPaymentGuideModel({
      plans: PLANS,
      packs: [{ name: '이용권 1장', credits: 1, price: 4800, product_kind: 'pass', valid_days: null }],
      retentionDays: 30,
      membership: null,
    })
    expect(model.entryPack?.validDays).toBe(PASS_VALID_DAYS)
  })

  it('플랜 값이 바뀌면 안내 숫자도 따라 바뀐다(하드코딩 없음)', () => {
    const bumped = buildPaymentGuideModel({
      plans: [{ ...PLANS[0], price: 13900, monthly_passes: 7, relationship_limit: 6 }],
      packs: PACKS,
      retentionDays: 45,
      membership: null,
    })
    expect(bumped.entryPlan?.price).toBe(13900)
    expect(bumped.entryPlan?.monthlyPasses).toBe(7)
    expect(bumped.entryPlan?.relationshipLimit).toBe(6)
    expect(bumped.retentionDays).toBe(45)
  })

  it('비회원이면 membership 은 null', () => {
    expect(build().membership).toBeNull()
  })

  it('회원은 planId 로 플랜을 찾는다', () => {
    const model = build({ tier: 'FAMILY', planId: 'plan-family' })
    expect(model.membership?.label).toBe('패밀리 멤버십')
    expect(model.membership?.plan?.monthlyPasses).toBe(15)
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

describe('passUsageFeatures — 주문 확인 화면의 «사용처»', () => {
  // 토스 충전업종 양식이 «사용처»를 묻는다. 이용권을 쓰는 기능이 하나라도 빠지면 그 기능은 고지 밖에서 쓰인다.
  it('이용권을 쓰는 기능을 빠짐없이, FEATURE_COST 장 수 그대로 싣는다', () => {
    const paidKeys = (Object.keys(FEATURE_COST) as Array<keyof typeof FEATURE_COST>).filter(
      (k) => !FEATURE_COST[k].free
    )
    const usage = passUsageFeatures()
    expect(usage.map((f) => f.key).sort()).toEqual([...paidKeys].sort())
    for (const f of usage) expect(f.cost).toBe(FEATURE_COST[f.key].display)
  })

  it('결제 도우미의 유료 목록과 같다 — 두 화면이 다른 사용처를 말하지 않는다', () => {
    const guide = buildPaymentGuideModel({ plans: [], packs: [], retentionDays: 30, membership: null })
    expect(passUsageFeatures()).toEqual(guide.paidFeatures)
  })
})
