import { test, expect } from '../fixtures'

test.describe('결제 / 멤버십', () => {
  test('멤버십 플랜 페이지', async ({ page }) => {
    await page.goto('/protected/membership')
    await expect(page.locator('main')).toBeVisible()
  })

  test('멤버십 플랜 카드 렌더링', async ({ page }) => {
    await page.goto('/protected/membership')
    // Should show pricing/plan cards
    const plans = page.getByText(/SINGLE|FAMILY|BUSINESS/i)
    await expect(plans.first()).toBeVisible({ timeout: 10_000 })
  })

  test('멤버십 관리 페이지', async ({ page }) => {
    await page.goto('/protected/membership/manage')
    await expect(page.locator('main')).toBeVisible()
  })
})
