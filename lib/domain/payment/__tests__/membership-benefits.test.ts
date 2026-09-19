import {
  FAMILY_GATE_BENEFIT_LINES,
  FREE_RETENTION_DAYS,
  FREE_TIER_LIMITS,
  GENERIC_MEMBERSHIP_BENEFIT_LINES,
  SHRINE_GATE_BENEFIT_LINES,
  UNLIMITED_STORAGE_LIMIT,
  intervalWords,
  membershipBenefitLines,
  monthlyPassLine,
  recordKeepingLine,
  relationshipLine,
  servicePeriodLine,
  shrineLine,
  tierFeatureLines,
  tierFeatureSummaryLine,
  toPlanFacts,
  webtoonLine,
  type MembershipPlanFacts,
} from '../membership-benefits'
import { FEATURE_MIN_TIER, TIER_LABEL } from '../membership-tiers'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MEMBER_WEEKLY_QUESTIONS } from '@/lib/domain/chat/entitlements'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'

/**
 * 표시광고법 · 토스 심사 회귀 방지.
 *
 * 2026-08-12 정정(복채 시절) — 실제 시스템과 어긋났던 주장이 문구로 되돌아오지 못하게 막는다:
 *   ① «매일» 준다   ② 상담이 «무제한»   ③ 기록을 «평생» 보관   ④ 회원은 «모두 이용»
 * 2026-09-18 이용권 전환 — 잔액형 재화로 읽히는 말(BANNED_PASS_TERMS)도 함께 막는다.
 *   멤버십은 «지급»하지 않고 «한 달에 쓸 수 있는 몫»을 연다. 남은 장은 넘어가지 않는다.
 */

/** 라이브 SINGLE 플랜(2026-09-18 전환 값) 기준 표본. */
const SINGLE: MembershipPlanFacts = {
  interval: 'MONTH',
  monthlyPasses: 5,
  relationshipLimit: 5,
  storageLimit: 20,
  tier: 'SINGLE',
}

const FAMILY: MembershipPlanFacts = {
  interval: 'MONTH',
  monthlyPasses: 15,
  relationshipLimit: 15,
  storageLimit: 50,
  tier: 'FAMILY',
}

const BUSINESS: MembershipPlanFacts = {
  interval: 'MONTH',
  monthlyPasses: 50,
  relationshipLimit: 50,
  storageLimit: UNLIMITED_STORAGE_LIMIT,
  tier: 'BUSINESS',
}

/** 과장 금지어 — 어떤 혜택 문구에도 들어가면 안 된다. */
const BANNED = ['매일', '무제한', '평생', '모두 이용', '정액', '지급'] as const

function expectNoBannedClaims(lines: readonly string[]): void {
  for (const line of lines) {
    for (const word of BANNED) {
      expect(line).not.toContain(word)
    }
    expect(`${line} → ${findBannedPassTerms(line).join(',')}`).toBe(`${line} → `)
  }
}

describe('멤버십 이용권 — 지급이 아니라 한 달에 쓸 수 있는 몫', () => {
  it('매달 N장 · 이월 없음으로 적는다', () => {
    expect(monthlyPassLine(SINGLE)).toBe('이용권 — 매달 5장 (이월 없음)')
    expect(monthlyPassLine(BUSINESS)).toBe('이용권 — 매달 50장 (이월 없음)')
  })

  it('플랜을 모르면 장 수를 단정하지 않는다', () => {
    const line = monthlyPassLine(null)
    expect(line).not.toMatch(/\d/)
    expect(line).toContain('이월 없음')
  })

  it('«지급»·«매일»·잔액형 어휘를 쓰지 않는다', () => {
    expectNoBannedClaims([monthlyPassLine(SINGLE), monthlyPassLine(null)])
  })
})

describe('기록 보관 — «평생»이 아니다', () => {
  it('개수 상한이 있으면 그대로 밝힌다', () => {
    expect(recordKeepingLine(SINGLE)).toBe('기록 보관 — 최대 20개 · 기간 제한 없이')
  })

  it('999 는 개수 제한 없음 — 화면에는 «무제한»이라 쓰지 않는다', () => {
    expect(recordKeepingLine(BUSINESS)).toBe('기록 보관 — 기간·개수 제한 없이')
  })

  it('플랜을 모르면 개수를 단정하지 않는다(등급마다 다르다)', () => {
    expect(recordKeepingLine(null)).toBe('기록 보관 — 기간 제한 없이 (개수는 등급별)')
  })

  it('어떤 경우에도 금지어가 없다', () => {
    expectNoBannedClaims([recordKeepingLine(SINGLE), recordKeepingLine(BUSINESS), recordKeepingLine(null)])
  })
})

describe('등급 기능 — 정본은 membership-tiers', () => {
  it('싱글은 등급 기능 줄이 없다', () => {
    expect(tierFeatureLines('SINGLE')).toEqual([])
  })

  it('패밀리는 가족 기운 지도·처방전을 연다', () => {
    expect(tierFeatureLines('FAMILY')).toEqual(['가족 기운 지도·처방전 이용'])
  })

  it('비즈니스는 함께 보기까지 연다', () => {
    expect(tierFeatureLines('BUSINESS')).toEqual(['가족 기운 지도·처방전 이용', '둘·셋·넷 함께 보기 이용'])
  })

  it('비회원·모르는 등급은 아무것도 열지 않는다', () => {
    expect(tierFeatureLines(null)).toEqual([])
    expect(tierFeatureLines('TESTER')).toEqual([])
  })

  it('등급을 모를 때는 기준 등급을 안내한다 — 조사는 받침을 따른다', () => {
    expect(tierFeatureSummaryLine()).toBe('가족 기운 지도·처방전은 패밀리부터 · 둘·셋·넷 함께 보기는 비즈니스부터')
  })
})

describe('멤버십 혜택 묶음', () => {
  it('속풀이는 무제한이 아니라 «주 10문»으로 적는다 (2026-08-25 개편)', () => {
    const counsel = membershipBenefitLines(SINGLE).find((l) => l.includes('속풀이'))
    expect(counsel).toBe(`속풀이 — 신령님께 주 ${MEMBER_WEEKLY_QUESTIONS}문 (다 쓰면 광고·이용권으로 이어가기)`)
  })

  it('🔴 회원 문구가 «매일»·«무제한»을 주장하지 않는다 — 무료 일일분은 폐지됐다', () => {
    const counsel = membershipBenefitLines(SINGLE).find((l) => l.includes('속풀이')) ?? ''
    expect(counsel).not.toMatch(/매일|하루|무제한/)
  })

  it('플랜 숫자가 그대로 반영된다', () => {
    expect(membershipBenefitLines(SINGLE)).toContain('가족관리 — 가족·지인 각 5명 등록·궁합')
    expect(membershipBenefitLines(BUSINESS)).toContain('가족관리 — 가족·지인 각 50명 등록·궁합')
    expect(membershipBenefitLines(FAMILY)).toContain('이용권 — 매달 15장 (이월 없음)')
  })

  it('신당은 등급별로 열린다 — 구매 문구가 없다', () => {
    expect(membershipBenefitLines(SINGLE)).toContain(shrineLine())
    expect(shrineLine()).not.toMatch(/구매|가격/)
  })

  it('등급 기능 줄은 그 등급이 여는 것만 붙는다', () => {
    expect(membershipBenefitLines(SINGLE)).not.toContain('가족 기운 지도·처방전 이용')
    expect(membershipBenefitLines(FAMILY)).toContain('가족 기운 지도·처방전 이용')
    expect(membershipBenefitLines(FAMILY)).not.toContain('둘·셋·넷 함께 보기 이용')
    expect(membershipBenefitLines(BUSINESS)).toContain('둘·셋·넷 함께 보기 이용')
    expect(membershipBenefitLines(null)).toContain(tierFeatureSummaryLine())
  })

  it('금지어가 하나도 없다', () => {
    expectNoBannedClaims(membershipBenefitLines(SINGLE))
    expectNoBannedClaims(membershipBenefitLines(FAMILY))
    expectNoBannedClaims(membershipBenefitLines(BUSINESS))
    expectNoBannedClaims(membershipBenefitLines(null))
  })
})

describe('게이트 공통 문구 — 플랜 없이도 정확하다', () => {
  it('금지어가 없다', () => {
    expectNoBannedClaims(GENERIC_MEMBERSHIP_BENEFIT_LINES)
  })

  it('회원도 풀이마다 이용권을 쓴다는 사실을 숨기지 않는다', () => {
    expect(GENERIC_MEMBERSHIP_BENEFIT_LINES.join(' ')).toContain('회원도 이용권으로')
  })

  it('숫자를 박아두지 않는다 — 플랜이 바뀌어도 어긋날 자리가 없다', () => {
    for (const line of GENERIC_MEMBERSHIP_BENEFIT_LINES) {
      expect(line).not.toMatch(/\d/)
    }
  })
})

/**
 * 2026-09-19 배포 전 리뷰 — 구현되지 않았거나 폐지된 혜택이 문구에 남아 있었다.
 *   ① 웹툰 멤버십 전용 회차(라이브 0편)를 «열람»한다고 적음
 *   ② 가족별 신당(2026-08-25 폐지)을 게이트가 약속
 *   ③ 가족 기운 지도(패밀리부터)를 등급 없이 모든 멤버십에 약속
 */
describe('없는 혜택을 팔지 않는다', () => {
  it('웹툰 멤버십 회차는 «연재 예정»이라고 밝힌다 — 열람·입장을 약속하지 않는다', () => {
    const lines = [webtoonLine(), ...membershipBenefitLines(SINGLE), ...GENERIC_MEMBERSHIP_BENEFIT_LINES].filter(
      (line) => line.includes('웹툰')
    )
    expect(lines).toHaveLength(3)
    for (const line of lines) {
      expect(line).toContain('연재 예정')
      expect(line).not.toMatch(/웹툰[^·]*(열람|입장|전용 회차)/)
    }
  })

  it.each([
    ['신당', SHRINE_GATE_BENEFIT_LINES],
    ['가족관리', FAMILY_GATE_BENEFIT_LINES],
  ])('%s 게이트는 폐지된 가족별 신당을 약속하지 않는다', (_label, lines) => {
    for (const line of lines) {
      expect(line).not.toMatch(/가족별 신당|가족 신당/)
    }
    expectNoBannedClaims(lines)
  })

  it.each([
    ['신당', SHRINE_GATE_BENEFIT_LINES],
    ['가족관리', FAMILY_GATE_BENEFIT_LINES],
  ])('%s 게이트가 기운 지도를 말할 때는 여는 등급을 함께 적는다', (_label, lines) => {
    const mapLines = lines.filter((line) => line.includes('기운 지도'))
    expect(mapLines).toEqual([tierFeatureSummaryLine()])
    expect(mapLines[0]).toContain(`${TIER_LABEL[FEATURE_MIN_TIER.familyMap]}부터`)
  })

  it('게이트 화면은 단일 출처 상수를 쓴다 — 레이아웃·페이지가 문구를 따로 적지 않는다', () => {
    const root = join(__dirname, '..', '..', '..', '..')
    const source = (rel: string) => readFileSync(join(root, rel), 'utf8')
    expect(source('app/protected/shrine/layout.tsx')).toContain('SHRINE_GATE_BENEFIT_LINES')
    expect(source('app/protected/shrine/page.tsx')).toContain('SHRINE_GATE_BENEFIT_LINES')
    const familyGate = source('app/protected/family/layout.tsx')
    expect(familyGate).toContain('FAMILY_GATE_BENEFIT_LINES')
    expect(familyGate).not.toContain('기운 지도')
  })
})

describe('단일 출처 상수', () => {
  it('무료 등급 한도는 getUserTierLimits 폴백과 같은 값이어야 한다', () => {
    expect(FREE_TIER_LIMITS.relationshipLimit).toBe(3)
    // 5 로 내렸다(CEO 2026-08-15). 멤버십은 DB 행에서 20·50·200 — 두 값의 차이가 곧 «더 보관된다»의 실체다.
    expect(FREE_TIER_LIMITS.storageLimit).toBe(5)
  })

  it('🔴 무료 한도에 복채 시절 필드가 되살아나지 않는다', () => {
    expect(Object.keys(FREE_TIER_LIMITS).sort()).toEqual(['relationshipLimit', 'storageLimit'])
  })

  it('무료 보관 기간은 30일', () => {
    expect(FREE_RETENTION_DAYS).toBe(30)
  })

  it('intervalWords 는 MONTH/YEAR 를 구분한다', () => {
    expect(intervalWords('MONTH')).toEqual({ every: '달', price: '월' })
    expect(intervalWords('YEAR')).toEqual({ every: '해', price: '연' })
  })

  it('toPlanFacts 는 DB 행을 그대로 옮긴다', () => {
    expect(
      toPlanFacts({ interval: 'MONTH', monthly_passes: 15, relationship_limit: 15, storage_limit: 50, tier: 'FAMILY' })
    ).toEqual({ interval: 'MONTH', monthlyPasses: 15, relationshipLimit: 15, storageLimit: 50, tier: 'FAMILY' })
  })

  it('toPlanFacts 는 등급이 없으면 null 로 둔다', () => {
    expect(
      toPlanFacts({ interval: 'MONTH', monthly_passes: 5, relationship_limit: 5, storage_limit: 20 }).tier
    ).toBeNull()
  })

  it('relationshipLine 은 플랜이 없으면 숫자를 지운다', () => {
    expect(relationshipLine(null)).toBe('가족관리 — 인연 등록·궁합')
  })
})

/**
 * 🔴 카드사 심사가 요구하는 «서비스 제공기간».
 *
 * 토스페이먼츠 판매정책 — 제공기간이 **12개월을 넘으면 입점 불가**이고, 그 기간이
 * **상품페이지에 명확히 적혀 있어야** 한다. 멤버십은 1회 결제가 1개월을 열고 갱신은
 * 새 결제다. 여기 숫자가 흔들리면 심사 답변과 화면이 어긋난다.
 */
describe('이용기간 — 심사가 묻는 «서비스 제공기간»', () => {
  it('1회 결제가 여는 기간을 1개월로 명시한다', () => {
    expect(servicePeriodLine()).toContain('1개월')
  })

  it('갱신과 해지가 함께 적혀 있다 — 자동결제라는 사실을 숨기지 않는다', () => {
    const line = servicePeriodLine()
    expect(line).toContain('자동 갱신')
    expect(line).toContain('해지')
  })

  it('금지어가 없다', () => {
    expectNoBannedClaims([servicePeriodLine()])
  })
})
