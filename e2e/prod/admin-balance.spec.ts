import { test, expect } from '@playwright/test'

// 이용권 조정(발급) + 사유 + 감사 로그 실동작 (임시 admin 승격 상태에서만).
// E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD + E2E_ADMIN_TARGET_ID(조정 대상 회원 UUID) 필요.
// 🔴 실제 이용권이 발급된다 — 대상은 검수 전용 계정이어야 하고, 검증 뒤 같은 화면에서 -1 로 되돌린다.
test.describe('어드민 이용권 조정', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.skip(!process.env.E2E_ADMIN_TARGET_ID, 'E2E_ADMIN_TARGET_ID 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('이용권 +1 발급 → 감사 로그 반영 → -1 회수', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_ADMIN_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    const openAdjust = async () => {
      await page.goto(`/admin/users/${process.env.E2E_ADMIN_TARGET_ID}`)
      await expect(page.getByText('계정 정보').first()).toBeVisible({ timeout: 20_000 })
      await page.getByText('이용권 & 멤버십').click()
      await expect(page.getByText('보유 이용권').first()).toBeVisible({ timeout: 10_000 })
      await page.getByRole('button', { name: /이용권 조정/ }).click()
    }

    await openAdjust()
    await page.getByPlaceholder(/예: 3/).fill('1')
    await page.getByPlaceholder(/CS 보상/).fill('e2e 자동 검증 발급')
    await page.getByRole('button', { name: '적용' }).click()
    await expect(page.getByText(/이용권 1장을 발급했어요/).first()).toBeVisible({ timeout: 15_000 })
    console.log('[PASS] 이용권 +1 발급 성공')

    await page.goto('/admin/audit')
    await expect(page.getByText('이용권 조정').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/e2e 자동 검증 발급/).first()).toBeVisible({ timeout: 10_000 })
    console.log('[PASS] 감사 로그에 조정 기록 반영')

    await openAdjust()
    await page.getByPlaceholder(/예: 3/).fill('-1')
    await page.getByPlaceholder(/CS 보상/).fill('e2e 자동 검증 회수')
    await page.getByRole('button', { name: '적용' }).click()
    await expect(page.getByText(/이용권 1장을 회수했어요/).first()).toBeVisible({ timeout: 15_000 })
    console.log('[PASS] 이용권 -1 회수로 원상 복구')
  })
})
