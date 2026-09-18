/**
 * 상점·결제·멤버십 화면 문구 회귀 — 토스 심사 캡처가 찍히는 지면.
 *
 * 복채(잔액) 폐지(2026-09-18) 뒤에도 이 화면들에 «충전·잔액·무제한» 같은 말이 한 줄이라도 남으면
 * 심사는 상품을 다시 잔액형 재화로 읽는다. 사람 눈으로는 로그인 뒤 화면을 다 훑을 수 없으니 소스에서 잰다.
 *
 * 주석은 걷어낸다 — «옛 복채 팩을 거른다» 같은 역사 설명은 화면에 나가지 않는다.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'

const ROOT = join(__dirname, '..', '..', '..')

const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

const read = (rel: string) => withoutComments(readFileSync(join(ROOT, rel), 'utf8'))

const SURFACES = [
  'app/protected/store/page.tsx',
  'app/protected/store/checkout/page.tsx',
  'app/protected/store/checkout/pass-checkout-client.tsx',
  'components/store/pass-purchase-section.tsx',
  'components/store/PaymentGuide.tsx',
  'components/store/payment-guide-model.ts',
  'app/protected/analysis/success/page.tsx',
  'app/protected/membership/checkout/page.tsx',
  'app/protected/membership/manage/page.tsx',
  'app/protected/membership/success/page.tsx',
  'app/protected/membership/cancel/page.tsx',
  'app/protected/membership/cancel/membership-cancel-form.tsx',
  'app/protected/payment/cancel/page.tsx',
  'app/protected/payment/cancel/charge-cancel-panel.tsx',
  'components/membership/membership-tabs.tsx',
  'components/membership/membership-nudge-modal.tsx',
  'components/membership/subscription-actions.tsx',
  'components/shared/membership-gate.tsx',
  'components/shared/paywall-modal.tsx',
  'components/shared/premium-blur-section.tsx',
  'components/guide/GuideBell.tsx',
]

describe('상점·결제·멤버십 화면 — 금지어', () => {
  it.each(SURFACES)('%s 에 잔액형 재화 어휘가 없다', (rel) => {
    expect(findBannedPassTerms(read(rel))).toEqual([])
  })
})

describe('멤버십 이용권은 «주는 것»이 아니라 «쓸 수 있는 한 달 몫»이다', () => {
  // 멤버십 결제·갱신은 아무것도 지급하지 않는다(토스 빌링 거절 사유가 «구독이 재화를 지급»이었다).
  it.each([
    'components/store/PaymentGuide.tsx',
    'components/membership/membership-nudge-modal.tsx',
    'app/protected/membership/manage/page.tsx',
  ])('%s 는 «매달 이용권을 드린다/받는다»고 적지 않는다', (rel) => {
    expect(read(rel)).not.toMatch(/매달 이용권을 (드|받)/)
  })

  // 월 몫은 구독 시작일 앵커 한 달 창으로 센다 — 연 결제 플랜이어도 «해마다 N장»이 아니다.
  it.each([
    'components/store/PaymentGuide.tsx',
    'components/membership/membership-nudge-modal.tsx',
    'components/membership/membership-tabs.tsx',
    'app/protected/membership/checkout/page.tsx',
  ])('%s 는 이용권 몫을 결제 주기 단어로 적지 않는다', (rel) => {
    const source = read(rel)
    expect(source).not.toMatch(/결제 주기마다/)
    expect(source).not.toMatch(/\$\{[^}]*\.every\}마다 \$\{[^}]*(monthlyPasses|monthly_passes)/)
  })
})

describe('멤버십 카드는 구현이 없는 혜택을 적지 않는다', () => {
  it('플랜 features 깃발(pdf_archive·kakao_daily)로 혜택 줄을 만들지 않는다', () => {
    const source = read('components/membership/membership-tabs.tsx')
    expect(source).not.toContain('pdf_archive')
    expect(source).not.toContain('kakao_daily')
    expect(source).not.toContain('PDF')
  })
})
