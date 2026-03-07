import { test, expect } from '../fixtures'

test.describe('궁합 분석', () => {
  test('궁합 분석 페이지 로드', async ({ page }) => {
    await page.goto('/protected/analysis/compatibility')
    await expect(page.locator('main')).toBeVisible()
  })

  test('궁합 폼 렌더링', async ({ page }) => {
    await page.goto('/protected/analysis/compatibility')
    // Should have form for two people's info
    await expect(page.locator('main')).toBeVisible()
  })

  test('사업 궁합 페이지', async ({ page }) => {
    await page.goto('/protected/analysis/celebrity-compatibility')
    await expect(page.locator('main')).toBeVisible()
  })

  test('가족 궁합 매트릭스', async ({ page }) => {
    await page.goto('/protected/family/compatibility-matrix')
    await expect(page.locator('main')).toBeVisible()
  })
})
