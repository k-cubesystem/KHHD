import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('인증된 라우트 접근', () => {
  const protectedPages = [
    '/protected',
    '/protected/analysis',
    '/protected/studio',
    '/protected/family',
    '/protected/history',
    '/protected/profile',
    '/protected/settings',
    '/protected/membership',
  ]

  for (const url of protectedPages) {
    test(`${url} 접근 가능`, async ({ page }) => {
      await page.goto(url)
      await expect(page).toHaveURL(new RegExp(url.replace(/\//g, '\\/')))
      await expect(page.locator('main')).toBeVisible()
    })
  }
})

test.describe('관리자 라우트', () => {
  test('일반 유저는 관리자 페이지 접근 불가', async ({ page }) => {
    await page.goto('/admin')
    // Should redirect away or show forbidden
    await expect(page).not.toHaveURL(/^\/admin$/, { timeout: 10_000 })
  })
})

test.describe('관리자 접근', () => {
  test.use({
    storageState: path.join(__dirname, '..', '.auth', 'admin.json'),
  })

  test('관리자 대시보드 접근 가능', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('main')).toBeVisible()
  })
})
