import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('관리자 기능', () => {
  test.use({
    storageState: path.join(__dirname, '..', '.auth', 'admin.json'),
  })

  test('관리자 대시보드 로드', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('main')).toBeVisible()
  })

  test('관리자 대시보드 통계', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page.locator('main')).toBeVisible()
  })

  test('사용자 관리 페이지', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.locator('main')).toBeVisible()
  })

  test('결제 관리 페이지', async ({ page }) => {
    await page.goto('/admin/payments')
    await expect(page.locator('main')).toBeVisible()
  })

  test('모니터링 페이지', async ({ page }) => {
    await page.goto('/admin/monitoring')
    await expect(page.locator('main')).toBeVisible()
  })

  test('서비스 제어 페이지', async ({ page }) => {
    await page.goto('/admin/service-control')
    await expect(page.locator('main')).toBeVisible()
  })
})
