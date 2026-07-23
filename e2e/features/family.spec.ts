import { test, expect } from '../fixtures'

test.describe('가족 관리', () => {
  test('가족 목록 페이지', async ({ page }) => {
    await page.goto('/protected/family')
    await expect(page.locator('main')).toBeVisible()
  })

  test('가족 추가 폼 또는 멤버십 게이트 노출', async ({ page }) => {
    await page.goto('/protected/family')
    // 2026-07-23: 가족관리는 멤버십 전용 게이트 도입. 멤버십 보유 시 추가 버튼, 미보유 시 게이트.
    const addOrGate = page
      .getByRole('button', { name: /추가|등록|add/i })
      .or(page.getByRole('link', { name: /추가|등록|add/i }))
      .or(page.getByRole('button', { name: /멤버십 시작하기/ }))
    await expect(addOrGate.first()).toBeVisible({ timeout: 20_000 })
  })

  test('가족 궁합 매트릭스 접근', async ({ page }) => {
    await page.goto('/protected/family/compatibility-matrix')
    await expect(page.locator('main')).toBeVisible()
  })
})
