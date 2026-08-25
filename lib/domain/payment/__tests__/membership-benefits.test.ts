import {
  FREE_RETENTION_DAYS,
  FREE_TIER_LIMITS,
  GENERIC_MEMBERSHIP_BENEFIT_LINES,
  UNLIMITED_STORAGE_LIMIT,
  bokchaeGrantLine,
  dailySpendCapLine,
  intervalWords,
  membershipBenefitLines,
  recordKeepingLine,
  relationshipLine,
  servicePeriodLine,
  toPlanFacts,
  type MembershipPlanFacts,
} from '../membership-benefits'
import { VOUCHER_CATALOG } from '../vouchers'
import { MEMBER_WEEKLY_QUESTIONS } from '@/lib/domain/chat/entitlements'

/**
 * 표시광고법 회귀 방지 — 2026-08-12 정정.
 * 실제 시스템과 어긋났던 주장 네 가지가 문구로 되돌아오지 못하게 막는다:
 *   ① 복채를 «매일» 준다   ② 상담이 «무제한»   ③ 기록을 «평생» 보관   ④ 회원은 «모두 이용»
 */

/** 라이브 SINGLE 플랜(2026-08-12 DB 실측) 기준 표본. */
const SINGLE: MembershipPlanFacts = {
  interval: 'MONTH',
  talismansPerPeriod: 10,
  relationshipLimit: 3,
  storageLimit: 10,
}

const BUSINESS: MembershipPlanFacts = {
  interval: 'MONTH',
  talismansPerPeriod: 100,
  relationshipLimit: 50,
  storageLimit: UNLIMITED_STORAGE_LIMIT,
}

/** 금지어 — 어떤 혜택 문구에도 들어가면 안 된다. */
const BANNED = ['매일', '무제한', '평생', '모두 이용', '정액'] as const

function expectNoBannedClaims(lines: readonly string[]): void {
  for (const line of lines) {
    for (const word of BANNED) {
      expect(line).not.toContain(word)
    }
  }
}

describe('복채 지급 — 주기 지급이지 일일 지급이 아니다', () => {
  it('달마다 N만냥으로 적는다', () => {
    expect(bokchaeGrantLine(SINGLE)).toBe('복채 — 달마다 10만냥 지급')
  })

  it('연 결제 플랜이면 주기 표기가 따라간다', () => {
    expect(bokchaeGrantLine({ ...SINGLE, interval: 'YEAR' })).toBe('복채 — 해마다 10만냥 지급')
  })

  it('플랜을 모르면 숫자·주기를 단정하지 않는다', () => {
    expect(bokchaeGrantLine(null)).toBe('복채 — 결제 주기마다 지급')
  })

  it('«매일»·«정액»을 쓰지 않는다', () => {
    expectNoBannedClaims([bokchaeGrantLine(SINGLE), bokchaeGrantLine(null)])
  })
})

describe('하루 사용 상한 — 지급과 다른 개념', () => {
  it('«사용»으로 적고 충전분 예외를 함께 밝힌다', () => {
    const line = dailySpendCapLine(10)
    expect(line).toContain('하루 10만냥까지 사용')
    expect(line).toContain('충전한 복채는 상한 없음')
  })

  it('한도를 지급량처럼 적지 않는다 — «N만냥 지급»이 나오면 안 된다', () => {
    expect(dailySpendCapLine(10)).not.toMatch(/\d+만냥\s*지급/)
  })
})

describe('기록 보관 — «평생»이 아니다', () => {
  it('개수 상한이 있으면 그대로 밝힌다', () => {
    expect(recordKeepingLine(SINGLE)).toBe('기록 보관 — 최대 10개 · 기간 제한 없이')
  })

  it('999 는 개수 제한 없음', () => {
    expect(recordKeepingLine(BUSINESS)).toBe('기록 보관 — 기간·개수 제한 없이')
  })

  it('플랜을 모르면 개수를 단정하지 않는다(등급마다 다르다)', () => {
    expect(recordKeepingLine(null)).toBe('기록 보관 — 기간 제한 없이 (개수는 등급별)')
  })

  it('어떤 경우에도 «평생»이라 하지 않는다', () => {
    expectNoBannedClaims([recordKeepingLine(SINGLE), recordKeepingLine(BUSINESS), recordKeepingLine(null)])
  })
})

describe('멤버십 혜택 묶음 — 여는 것은 «입장»', () => {
  it('속풀이는 무제한이 아니라 «주 10문»으로 적는다 (2026-08-25 개편)', () => {
    const lines = membershipBenefitLines(SINGLE)
    const counsel = lines.find((l) => l.includes('속풀이'))
    expect(counsel).toBe(`속풀이 — 신령님께 주 ${MEMBER_WEEKLY_QUESTIONS}문 (소진 후엔 광고·질문권으로 이어가기)`)
  })

  it('🔴 회원 문구가 «매일»·«무제한»을 주장하지 않는다 — 무료 일일분은 폐지됐다', () => {
    const counsel = membershipBenefitLines(SINGLE).find((l) => l.includes('속풀이')) ?? ''
    expect(counsel).not.toMatch(/매일|하루|무제한/)
  })

  it('플랜 숫자가 그대로 반영된다', () => {
    expect(membershipBenefitLines(SINGLE)).toContain('가족관리 — 가족·지인 각 3명 등록·궁합')
    expect(membershipBenefitLines(BUSINESS)).toContain('가족관리 — 가족·지인 각 50명 등록·궁합')
  })

  it('금지어가 하나도 없다', () => {
    expectNoBannedClaims(membershipBenefitLines(SINGLE))
    expectNoBannedClaims(membershipBenefitLines(BUSINESS))
    expectNoBannedClaims(membershipBenefitLines(null))
  })
})

describe('게이트 공통 문구 — 플랜 없이도 정확하다', () => {
  it('금지어가 없다', () => {
    expectNoBannedClaims(GENERIC_MEMBERSHIP_BENEFIT_LINES)
  })

  it('회원도 풀이마다 복채를 낸다는 사실을 숨기지 않는다', () => {
    expect(GENERIC_MEMBERSHIP_BENEFIT_LINES.join(' ')).toContain('회원도 복채로')
  })

  it('숫자를 박아두지 않는다 — 플랜이 바뀌어도 어긋날 자리가 없다', () => {
    for (const line of GENERIC_MEMBERSHIP_BENEFIT_LINES) {
      expect(line).not.toMatch(/\d/)
    }
  })
})

describe('1일 이용권 설명 — «무제한» 금지', () => {
  it('입장을 여는 상품으로 적혀 있다', () => {
    const d = VOUCHER_CATALOG.CHAT_DAY_PASS.description
    expect(d).not.toContain('무제한')
    expect(d).toContain('들어갈 수 있습니다')
  })
})

describe('단일 출처 상수', () => {
  it('무료 등급 한도는 getUserTierLimits 폴백과 같은 값이어야 한다', () => {
    expect(FREE_TIER_LIMITS.relationshipLimit).toBe(3)
    // 5 로 내렸다(CEO 2026-08-15). 멤버십은 DB 행에서 20 — 두 값의 차이가 곧 «더 보관된다»의 실체다.
    expect(FREE_TIER_LIMITS.storageLimit).toBe(5)
    expect(FREE_TIER_LIMITS.talismansPerPeriod).toBe(0)
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
      toPlanFacts({ interval: 'MONTH', talismans_per_period: 30, relationship_limit: 10, storage_limit: 50 })
    ).toEqual({ interval: 'MONTH', talismansPerPeriod: 30, relationshipLimit: 10, storageLimit: 50 })
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
