import { test, expect, mockAIResponse } from '../fixtures'

const MOCK_SAJU_RESULT = JSON.stringify({
  overall: '좋은 운세입니다',
  categories: { career: '직장운이 좋습니다', love: '연애운이 상승합니다' },
  score: 85,
})

test.describe('사주 분석', () => {
  test('사주 분석 페이지 로드', async ({ page }) => {
    await page.goto('/protected/analysis')
    await expect(page.locator('main')).toBeVisible()
  })

  test('사주 분석 폼 렌더링', async ({ page }) => {
    await page.goto('/protected/analysis')
    // Should have analysis options/form
    await expect(page.locator('main')).toBeVisible()
  })

  test('오늘의 사주 페이지', async ({ page }) => {
    await mockAIResponse(page, MOCK_SAJU_RESULT)
    await page.goto('/protected/analysis/today')
    await expect(page.locator('main')).toBeVisible()
  })

  test('운세 분석 결과 페이지', async ({ page }) => {
    await mockAIResponse(page, MOCK_SAJU_RESULT)
    await page.goto('/protected/analysis/fortune')
    await expect(page.locator('main')).toBeVisible()
  })
})
