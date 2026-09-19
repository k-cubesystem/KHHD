/**
 * 첫 구독 첫 달 할인 · 약관 개정 공지 — 문구와 날짜의 계약.
 *
 * 🔴 자동결제 금액이 바뀌는 상품이다. 첫 결제 금액을 말하는 자리마다 정가가 함께 있어야 한다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'
import {
  FIRST_MONTH_DISCOUNT_RATE,
  firstMonthDiscountPercent,
  firstMonthEligibilityLine,
  firstMonthOfferLine,
  firstMonthPrice,
} from '../membership-intro'
import {
  PREVIOUS_TERMS_DATE,
  TERMS_EFFECTIVE_DATE,
  TERMS_NOTICE_DATE,
  TERMS_REVISION_REASONS,
  formatTermsDate,
  isTermsInEffect,
  isTermsNoticeActive,
  termsNoticeLine,
} from '@/lib/domain/legal/terms-revision'

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

describe('첫 달 할인 — 금액', () => {
  it('세 등급의 첫 결제 금액', () => {
    expect(FIRST_MONTH_DISCOUNT_RATE).toBe(0.5)
    expect(firstMonthDiscountPercent()).toBe(50)
    expect(firstMonthPrice(12_800)).toBe(6_400)
    expect(firstMonthPrice(29_900)).toBe(14_950)
    expect(firstMonthPrice(99_000)).toBe(49_500)
  })

  it('잘못된 정가에는 0 — 음수나 NaN 을 청구 금액으로 만들지 않는다', () => {
    expect(firstMonthPrice(0)).toBe(0)
    expect(firstMonthPrice(-1)).toBe(0)
    expect(firstMonthPrice(Number.NaN)).toBe(0)
  })
})

describe('첫 달 할인 — 문구', () => {
  it('🔴 첫 결제 금액과 정가를 한 줄에 함께 적는다', () => {
    const line = firstMonthOfferLine(12_800)
    expect(line).toContain('6,400원')
    expect(line).toContain('다음 결제부터 12,800원')
  })

  it('누가 받는지(처음 결제 · 계정당 1회)를 숨기지 않는다', () => {
    const line = firstMonthEligibilityLine()
    expect(line).toContain('처음 결제')
    expect(line).toContain('계정당 1회')
    expect(line).toContain('50%')
  })

  it('금지어가 없다', () => {
    expect(findBannedPassTerms(firstMonthOfferLine(29_900))).toEqual([])
    expect(findBannedPassTerms(firstMonthEligibilityLine())).toEqual([])
  })

  it('결제 확인 화면과 구매조건 동의가 정가를 함께 보여 준다', () => {
    const checkout = read('app/protected/membership/checkout/page.tsx')
    expect(checkout).toContain('getFirstMonthOffer')
    expect(checkout).toContain('다음 결제부터')
    expect(checkout).toContain('regularAmount=')

    const consent = read('components/payment/purchase-consent.tsx')
    expect(consent).toContain('regularAmount')
    expect(consent).toContain('다음 결제부터')
  })

  it('약관 제6조에 첫 달 할인과 환불 기준(실제 결제 금액)이 적혀 있다 — 할인율 숫자는 약관에 박지 않는다', () => {
    const terms = read('app/terms/page.tsx')
    expect(terms).toContain('처음 결제하는 회원에게 첫 결제 주기의 요금을 할인')
    expect(terms).toContain('실제로 결제한 금액을 기준')
    expect(/\d+%/.test(terms)).toBe(false)
  })
})

describe('약관 개정 공지 — 제3조 제3항(적용일자 7일 전부터 공지)', () => {
  const day = (iso: string) => Date.parse(`${iso}T00:00:00+09:00`)

  it('🔴 시행일은 공지일로부터 7일 이상 뒤다', () => {
    expect((day(TERMS_EFFECTIVE_DATE) - day(TERMS_NOTICE_DATE)) / 86_400_000).toBeGreaterThanOrEqual(7)
  })

  it('공지 띠는 공지일부터 시행 뒤 7일까지 뜨고, 그 뒤에는 스스로 사라진다', () => {
    expect(isTermsNoticeActive(day(TERMS_NOTICE_DATE) - 1)).toBe(false)
    expect(isTermsNoticeActive(day(TERMS_NOTICE_DATE))).toBe(true)
    expect(isTermsNoticeActive(day(TERMS_EFFECTIVE_DATE) + 7 * 86_400_000)).toBe(true)
    expect(isTermsNoticeActive(day(TERMS_EFFECTIVE_DATE) + 9 * 86_400_000)).toBe(false)
  })

  it('시행 전에는 «개정됩니다», 시행 뒤에는 «개정 시행되었습니다»', () => {
    expect(isTermsInEffect(day(TERMS_EFFECTIVE_DATE) - 1)).toBe(false)
    expect(termsNoticeLine(day(TERMS_EFFECTIVE_DATE) - 1)).toContain('개정됩니다')
    expect(termsNoticeLine(day(TERMS_EFFECTIVE_DATE))).toContain('시행되었습니다')
    expect(formatTermsDate('2026-09-26')).toBe('2026년 9월 26일')
  })

  it('현행 약관이 개정 사유·공지일·종전 약관 링크를 함께 보여 준다', () => {
    const terms = read('app/terms/page.tsx')
    expect(terms).toContain('TERMS_REVISION_REASONS')
    expect(terms).toContain('NOTICE_DATE')
    expect(terms).toContain('`/terms/${PREVIOUS_TERMS_DATE}`')
    expect(TERMS_REVISION_REASONS.length).toBeGreaterThan(0)
    for (const reason of TERMS_REVISION_REASONS) expect(findBannedPassTerms(reason)).toEqual([])
  })

  it('종전 약관이 보존 게시돼 있고 검색에는 올리지 않는다', () => {
    const previous = read(`app/terms/${PREVIOUS_TERMS_DATE}/page.tsx`)
    expect(previous).toContain('이용약관 (종전)')
    expect(previous).toContain('index: false')
  })

  it('초기 화면(랜딩)에 공지 띠가 걸려 있다', () => {
    expect(read('app/page.tsx')).toContain('<TermsRevisionNotice />')
  })
})
