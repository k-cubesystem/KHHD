import { test, expect, mockAIResponse } from '../fixtures'

test.describe('운세', () => {
  test('주간 운세 페이지', async ({ page }) => {
    await mockAIResponse(page, JSON.stringify({ fortune: '이번 주 좋은 일이 생깁니다' }))
    await page.goto('/protected/fortune/weekly')
    await expect(page.locator('main')).toBeVisible()
  })

  test('월간 운세 페이지', async ({ page }) => {
    await mockAIResponse(page, JSON.stringify({ fortune: '이번 달 금전운이 좋습니다' }))
    await page.goto('/protected/fortune/monthly')
    await expect(page.locator('main')).toBeVisible()
  })

  test('대시보드에서 운세 확인', async ({ page }) => {
    await mockAIResponse(page, JSON.stringify({ fortune: '오늘의 운세' }))
    await page.goto('/protected')
    await expect(page.locator('main')).toBeVisible()
  })
})
