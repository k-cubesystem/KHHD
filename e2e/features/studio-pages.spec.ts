import { test, expect, mockAIResponse, mockImageUpload } from '../fixtures'

test.describe('스튜디오', () => {
  test('스튜디오 메인 페이지', async ({ page }) => {
    await page.goto('/protected/studio')
    await expect(page.locator('main')).toBeVisible()
  })

  test('관상 스튜디오 페이지', async ({ page }) => {
    await mockAIResponse(page, JSON.stringify({ analysis: '이마가 넓어 지혜롭습니다' }))
    await mockImageUpload(page)
    await page.goto('/protected/studio/face')
    await expect(page.locator('main')).toBeVisible()
  })

  test('손금 스튜디오 페이지', async ({ page }) => {
    await mockAIResponse(page, JSON.stringify({ analysis: '생명선이 길고 뚜렷합니다' }))
    await mockImageUpload(page)
    await page.goto('/protected/studio/palm')
    await expect(page.locator('main')).toBeVisible()
  })

  test('풍수 스튜디오 페이지', async ({ page }) => {
    await mockAIResponse(page, JSON.stringify({ analysis: '남향이라 좋은 기운' }))
    await mockImageUpload(page)
    await page.goto('/protected/studio/fengshui')
    await expect(page.locator('main')).toBeVisible()
  })
})
