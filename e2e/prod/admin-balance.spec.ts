import { test, expect } from '@playwright/test'

// 잔액 증감 + 사유 + 감사 로그 실동작 (임시 admin 승격 상태에서만).
// E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + E2E_ADMIN_TARGET_ID(조정 대상 회원 UUID) 필요.
test.describe('어드민 잔액 조정', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.skip(!process.env.E2E_ADMIN_TARGET_ID, 'E2E_ADMIN_TARGET_ID 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('복채 +10 조정 → 감사 로그 반영', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_ADMIN_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    const dlg = page.getByRole('dialog', { name: '오픈 이벤트' })
    await page.addLocatorHandler(dlg, async () => {
      await dlg.getByRole('button', { name: 'Close' }).click()
    })

    // 회원 상세 → 지갑 탭 → 복채 조정
    await page.goto(`/admin/users/${process.env.E2E_ADMIN_TARGET_ID}`)
    await expect(page.getByText('계정 정보').first()).toBeVisible({ timeout: 20_000 })
    await page.getByText('지갑 & 멤버십').click()
    await expect(page.getByText('복채 지갑').first()).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /복채 조정/ }).click()

    await page.getByPlaceholder(/예: 100/).fill('10')
    await page.getByPlaceholder(/CS 보상/).fill('e2e 자동 검증 지급')
    await page.getByRole('button', { name: '적용' }).click()

    await expect(page.getByText(/복채를 \+?10만냥 조정/).first()).toBeVisible({ timeout: 15_000 })
    console.log('[PASS] 복채 +10 조정 성공')

    // 감사 로그에 반영
    await page.goto('/admin/audit')
    await expect(page.getByText('복채 조정').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/e2e 자동 검증 지급/).first()).toBeVisible({ timeout: 10_000 })
    console.log('[PASS] 감사 로그에 조정 기록 반영')
  })
})
