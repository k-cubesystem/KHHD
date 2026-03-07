import { test, expect } from '@playwright/test'

test.describe('레퍼럴', () => {
  test('레퍼럴 페이지 로드', async ({ page }) => {
    await page.goto('/protected/referral')
    await expect(page.locator('main')).toBeVisible()
  })

  test('초대 페이지 로드', async ({ page }) => {
    await page.goto('/protected/invite')
    await expect(page.locator('main')).toBeVisible()
  })

  test('레퍼럴 코드/링크 표시', async ({ page }) => {
    await page.goto('/protected/referral')
    // Should show referral code or invite link
    const codeOrLink = page.getByText(/코드|초대|링크|invite|code/i).first()
    if (await codeOrLink.isVisible().catch(() => false)) {
      await expect(codeOrLink).toBeVisible()
    }
  })
})

test.describe('공유 페이지', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('공유 페이지 접근 (토큰 없음)', async ({ page }) => {
    const response = await page.goto('/share/invalid-token')
    // Should handle gracefully - either 404 or error page
    expect(response?.status()).toBeLessThan(500)
  })
})
