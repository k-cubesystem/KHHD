/**
 * 첫 구독 첫 달 할인 · 약관 단일 현행본 — 문구와 날짜의 계약.
 *
 * 🔴 자동결제 금액이 바뀌는 상품이다. 첫 결제 금액을 말하는 자리마다 정가가 함께 있어야 한다.
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { renderToStaticMarkup } from 'react-dom/server'
import TermsOfServicePage from '@/app/terms/page'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'
import {
  FIRST_MONTH_DISCOUNT_RATE,
  firstMonthDiscountPercent,
  firstMonthEligibilityLine,
  firstMonthOfferLine,
  firstMonthPrice,
} from '../membership-intro'
import { TERMS_EFFECTIVE_DATE, formatTermsDate } from '@/lib/domain/legal/terms-revision'

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')
const exists = (rel: string) => existsSync(join(process.cwd(), rel))

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

// 2026-09-22 CEO 결정: 실사용자가 없어 개정 공지·종전 약관·경과 조항 없이 단일 현행본만 게시한다.
// 토스 심사자가 «옛 재화가 아직 있다»로 읽을 흔적(종전 약관 링크·전환 부칙·공지 띠)이 되살아나지 않게 막는다.
describe('약관 단일 현행본 — 개정·경과 흔적 없음', () => {
  const TRANSITION_WORDS = ['종전', '개정 안내', '공지일', '2026-03-03', '전환', '보전', '/terms/']
  const source = read('app/terms/page.tsx')
  const html = renderToStaticMarkup(TermsOfServicePage())

  it('🔴 시행일은 2026년 9월 22일 하나다', () => {
    expect(TERMS_EFFECTIVE_DATE).toBe('2026-09-22')
    expect(formatTermsDate(TERMS_EFFECTIVE_DATE)).toBe('2026년 9월 22일')
    expect(html).toContain('시행일: 2026년 9월 22일')
    expect(html).toContain('<h2>부칙</h2><p>이 약관은 2026년 9월 22일부터 시행합니다.</p>')
  })

  it('약관 원문과 화면 어디에도 종전 약관·개정 안내·경과 문구가 없다', () => {
    for (const word of TRANSITION_WORDS) {
      expect(source).not.toContain(word)
      expect(html).not.toContain(word)
    }
  })

  it('화면 문구에 금지어가 없다(BANNED_PASS_TERMS)', () => {
    expect(findBannedPassTerms(source)).toEqual([])
    expect(findBannedPassTerms(html)).toEqual([])
  })

  it('종전 약관 페이지와 랜딩 공지 띠가 없다', () => {
    expect(exists('app/terms/2026-03-03')).toBe(false)
    expect(exists('components/legal/terms-revision-notice.tsx')).toBe(false)
    expect(read('app/page.tsx')).not.toContain('TermsRevisionNotice')
    expect(read('app/sitemap.ts')).not.toContain('/terms/')
  })

  it('옛 종전 약관 주소는 현행 약관으로 영구 이동한다 — 옛 알림 링크가 404 가 되지 않게', () => {
    expect(read('next.config.ts')).toMatch(
      /\{\s*source:\s*'\/terms\/2026-03-03',\s*destination:\s*'\/terms',\s*permanent:\s*true\s*\}/
    )
  })
})
