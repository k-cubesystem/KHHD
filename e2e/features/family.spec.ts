import { test, expect } from '../fixtures'

test.describe('가족 관리', () => {
  test('가족 목록 페이지', async ({ page }) => {
    await page.goto('/protected/family')
    await expect(page.locator('main')).toBeVisible()
  })

  test('가족 추가 폼 존재', async ({ page }) => {
    await page.goto('/protected/family')
    // Look for add family member button
    const addBtn = page.getByRole('button', { name: /추가|등록|add/i }).or(
      page.getByRole('link', { name: /추가|등록|add/i })
    )
    await expect(addBtn.first()).toBeVisible({ timeout: 10_000 })
  })

  test('가족 궁합 매트릭스 접근', async ({ page }) => {
    await page.goto('/protected/family/compatibility-matrix')
    await expect(page.locator('main')).toBeVisible()
  })
})
