import { test, expect } from '@playwright/test'

test.describe('메인 페이지 네비게이션', () => {
  test('랜딩 페이지가 로드된다', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/해화당/)
  })

  test('대시보드 접근', async ({ page }) => {
    await page.goto('/protected')
    await expect(page).toHaveURL(/protected/)
    // Dashboard should have key sections
    await expect(page.locator('main')).toBeVisible()
  })

  test('404 페이지', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist')
    expect(response?.status()).toBe(404)
  })

  test('분석 페이지 접근', async ({ page }) => {
    await page.goto('/protected/analysis')
    await expect(page).toHaveURL(/analysis/)
  })

  test('스튜디오 페이지 접근', async ({ page }) => {
    await page.goto('/protected/studio')
    await expect(page).toHaveURL(/studio/)
  })

  test('프로필 페이지 접근', async ({ page }) => {
    await page.goto('/protected/profile')
    await expect(page).toHaveURL(/profile/)
  })
})
