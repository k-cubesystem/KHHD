/**
 * 토스 키 배선 회귀선 — **상점(MID)이 둘인데 키를 한 쌍만 쓰면 결제가 거절된다** (2026-08-17).
 *
 * ## 무엇을 지키나
 * · 일반결제 `khaehwjxqe`     — 복채 충전 승인 · 충전 취소
 * · 정기결제 `bill_khaehqj1a` — 빌링키 발급 · 정기 청구 · 멤버십 취소
 *
 * 한 키로 다른 상점의 결제를 부르면 토스가 거절하고, 사용자는 «결제가 안 된다»·«환불이 안 된다»
 * 만 본다. 어느 파일이 어느 키를 쓰는지는 **눈으로 확인할 수 없으므로** 테스트가 붙든다.
 *
 * 🔴 웹훅은 특히 조용하다 — 한쪽 상점 웹훅이 전량 401 로 떨어져도 화면에는 아무 일도 안 생기고,
 *    취소 통지를 못 받아 **복채 회수가 안 걸린다**. 돈이 새는 자리라 여기서 함께 막는다.
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(__dirname, '..', '..', '..')
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

/** 시크릿 키를 만드는 유일한 자리. 여기 말고는 아무도 env 를 직접 읽지 않는다. */
const KEYS_MODULE = 'lib/config/toss-keys.ts'

describe('🔴 토스 시크릿 키 — 상점별로 갈라 쓴다', () => {
  it('시크릿 키 env 를 직접 읽는 파일은 단일 출처 하나뿐이다', () => {
    const scan = (dir: string, out: string[] = []): string[] => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue
          scan(rel, out)
        } else if (/\.tsx?$/.test(e.name)) {
          out.push(rel)
        }
      }
      return out
    }

    const offenders = [...scan('app'), ...scan('lib')]
      .filter((f) => f !== KEYS_MODULE)
      .filter((f) => /process\.env\.TOSS_(PAYMENTS_)?(BILLING_)?SECRET_KEY/.test(read(f)))

    expect(offenders).toEqual([])
  })

  it('일반결제 경로는 일반 키를, 정기결제 경로는 빌링 키를 쓴다', () => {
    const expectations: Array<{ file: string; uses: string; not: string }> = [
      // 복채 충전 승인 — 일반결제 상점
      { file: 'app/actions/payment/payment.ts', uses: 'tossGeneralSecretKey', not: 'tossBillingSecretKey' },
      // 빌링키 발급 + 첫 청구 — 정기결제 상점
      { file: 'app/actions/payment/subscription.ts', uses: 'tossBillingSecretKey', not: 'tossGeneralSecretKey' },
      // 갱신 크론 — 정기결제 상점
      { file: 'app/api/cron/billing/route.ts', uses: 'tossBillingSecretKey', not: 'tossGeneralSecretKey' },
    ]

    for (const { file, uses, not } of expectations) {
      const source = read(file)
      expect(`${file}: ${source.includes(uses)}`).toBe(`${file}: true`)
      expect(`${file}: ${source.includes(not)}`).toBe(`${file}: false`)
    }
  })

  it('취소는 결제가 일어난 상점의 키로 부른다 (충전=일반 · 멤버십=빌링)', () => {
    const source = read('app/actions/payment/cancel-request.ts')

    // 두 키가 **모두** 쓰여야 한다 — 하나만 있으면 한쪽 취소가 통째로 실패한다.
    expect(source).toContain('tossGeneralSecretKey')
    expect(source).toContain('tossBillingSecretKey')

    // 충전 취소(payment.payment_key)는 일반 키 바로 옆에 온다.
    expect(source).toMatch(/secretKey: tossGeneralSecretKey,\s*\n\s*paymentKey: payment\.payment_key/)
    // 멤버십 취소(lastPayment.payment_key)는 빌링 키 바로 옆에 온다.
    expect(source).toMatch(/secretKey: tossBillingSecretKey,\s*\n\s*paymentKey: lastPayment\.payment_key/)
  })

  it('🔴 웹훅은 등록된 시크릿 전부와 대조한다 (한쪽 상점 통지가 사라지지 않게)', () => {
    const source = read('app/api/webhooks/toss/route.ts')

    expect(source).toContain('tossWebhookSecretKeys')
    // 단일 값 비교로 되돌아가면 다른 상점 웹훅이 전량 401 이 된다.
    expect(source).toMatch(/tossWebhookSecretKeys\.some\(/)
  })
})

describe('🔴 클라이언트 SDK — 용도를 반드시 밝힌다', () => {
  it('getTossPaymentsSDK 를 인자 없이 부르는 곳이 없다', () => {
    const scan = (dir: string, out: string[] = []): string[] => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === '.next') continue
          scan(rel, out)
        } else if (/\.tsx?$/.test(e.name)) {
          out.push(rel)
        }
      }
      return out
    }

    const offenders = [...scan('app'), ...scan('components')].filter((f) => read(f).includes('getTossPaymentsSDK()'))

    expect(offenders).toEqual([])
  })

  it('requestBillingAuth 를 쓰는 화면은 billing SDK 로 연다', () => {
    const billingScreens = [
      'app/protected/membership/checkout/page.tsx',
      'components/membership/membership-card.tsx',
      'components/membership/pricing-card.tsx',
      'components/membership/subscription-actions.tsx',
      // payment-widget.tsx 는 2026-08-20에 삭제됐다 — 상점(store)이 이미 파는 것을
      // 죽은 zen 팔레트(흰 위 흰 글씨)로 한 번 더 그리던 사본이었다.
    ]

    for (const file of billingScreens) {
      const source = read(file)
      expect(`${file}: ${source.includes('requestBillingAuth')}`).toBe(`${file}: true`)
      expect(`${file}: ${source.includes("getTossPaymentsSDK('billing')")}`).toBe(`${file}: true`)
    }
  })

  it('복채 충전(requestPayment)은 general SDK 로 연다', () => {
    // 2026-09-01: 결제창을 여는 자리가 상점 카드에서 **주문 확인 화면**으로 옮겨졌다.
    // 상품 카드는 이제 결제창을 열 수 없다(동의 없는 결제 경로 제거) — 그건
    // purchase-consent-gate.test.ts 가 따로 잠근다. 불변식은 그대로고 지점만 옮긴다.
    const source = read('app/protected/store/checkout/bokchae-checkout-client.tsx')

    expect(source).toContain('requestPayment')
    expect(source).toContain("getTossPaymentsSDK('general')")
  })

  it('게이트가 실제로 위반을 잡는다 (자가검증)', () => {
    const violating = `const sdk = await getTossPaymentsSDK()`
    expect(violating.includes('getTossPaymentsSDK()')).toBe(true)
  })
})
