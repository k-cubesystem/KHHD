import { test, expect } from '../fixtures'

test.describe('결제 / 멤버십', () => {
  test('멤버십 플랜 페이지', async ({ page }) => {
    await page.goto('/protected/membership')
    await expect(page.locator('main')).toBeVisible()
  })

  test('멤버십 플랜 카드 렌더링', async ({ page }) => {
    await page.goto('/protected/membership')
    // 단일통화(복채) 전환 후 플랜 탭은 한국어 라벨로 노출됨
    const plans = page.getByText(/싱글 멤버십|패밀리 멤버십|비즈니스 멤버십|SINGLE|FAMILY|BUSINESS/i)
    await expect(plans.first()).toBeVisible({ timeout: 10_000 })
  })

  test('멤버십 관리 페이지', async ({ page }) => {
    await page.goto('/protected/membership/manage')
    await expect(page.locator('main')).toBeVisible()
  })
})
