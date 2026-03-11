import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'e2e-test@haehwadang.com'
const TEST_PASSWORD = 'TestPass1234!'

test('결제 플로우: 로그인 → 멤버십 → checkout → Toss 결제창', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  const logs: string[] = []
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', (err) => logs.push(`[PAGE_ERROR] ${err.message}`))

  // 1. 로그인
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(TEST_EMAIL)
  await page.getByLabel('비밀번호').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/protected/, { timeout: 15_000 })
  console.log('[PASS] 로그인 성공')

  // 2. 멤버십 페이지
  await page.goto('/protected/membership')
  await page.waitForLoadState('networkidle')

  if (page.url().includes('/manage')) {
    console.log('[INFO] 이미 구독 중 — 테스트 종료')
    await context.close()
    return
  }

  const startButton = page.getByText('지금 시작하기')
  await expect(startButton.first()).toBeVisible({ timeout: 15_000 })
  await startButton.first().click()

  // 3. checkout 페이지
  await page.waitForURL('**/checkout?plan=*', { timeout: 10_000 })
  await expect(page.getByText('결제 확인')).toBeVisible({ timeout: 10_000 })
  console.log('[PASS] checkout 도달')

  // 4. 결제 버튼 클릭
  const payButton = page.getByRole('button', { name: /결제하기/ })
  await expect(payButton).toBeVisible()
  await payButton.click()
  console.log('[INFO] 결제 버튼 클릭')

  // 5. 결과 대기 (15초)
  await page.waitForTimeout(15_000)

  const finalUrl = page.url()
  console.log(`[RESULT] Final URL: ${finalUrl}`)

  // CSP 에러 확인
  const cspErrors = logs.filter((l) => l.includes('Content Security Policy') || l.includes('csp'))
  if (cspErrors.length > 0) {
    console.log(`[WARN] CSP 에러 ${cspErrors.length}건:`)
    cspErrors.forEach((e) => console.log(`  ${e}`))
  }

  // Toss 결제창 리다이렉트 확인
  const isTossRedirect = finalUrl.includes('tosspayments.com') || finalUrl.includes('payment-gateway')
  if (isTossRedirect) {
    console.log('[PASS] Toss 결제창 리다이렉트 성공')
  } else {
    // 에러 메시지 확인
    const errorEl = page.getByText(/결제.*실패|결제.*오류|환경변수|결제 키|결제 모듈/)
    if (await errorEl.isVisible({ timeout: 1_000 }).catch(() => false)) {
      console.log(`[ERROR] ${await errorEl.textContent()}`)
    }
    const checkoutErrors = logs.filter((l) => l.includes('[Checkout]') || l.includes('PAGE_ERROR'))
    checkoutErrors.forEach((e) => console.log(`  ${e}`))
  }

  expect(isTossRedirect).toBe(true)
  await context.close()
})
