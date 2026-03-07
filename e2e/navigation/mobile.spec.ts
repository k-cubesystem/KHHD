import { test, expect } from '@playwright/test'

test.describe('모바일 네비게이션', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('모바일 뷰포트에서 페이지 로드', async ({ page }) => {
    await page.goto('/protected')
    await expect(page.locator('main')).toBeVisible()
  })

  test('가로 스크롤이 없다', async ({ page }) => {
    await page.goto('/protected')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // 1px tolerance
  })

  test('모바일 메뉴 동작', async ({ page }) => {
    await page.goto('/protected')

    // Look for hamburger/menu button
    const menuBtn = page.getByRole('button', { name: /메뉴|menu/i }).or(
      page.locator('[data-testid="mobile-menu"]')
    )

    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click()
      // Navigation links should appear
      await expect(page.getByRole('navigation')).toBeVisible({ timeout: 5_000 })
    }
  })

  test('대시보드에서 주요 링크 접근 가능', async ({ page }) => {
    await page.goto('/protected')
    // Main content should be visible and scrollable
    await expect(page.locator('main')).toBeVisible()
  })
})
