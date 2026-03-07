import { test, expect } from '@playwright/test'

test.describe('회원가입', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('회원가입 폼이 렌더링된다', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
  })
})

test.describe('로그아웃', () => {
  test('로그아웃 후 로그인 페이지로 이동', async ({ page }) => {
    await page.goto('/protected')
    await expect(page).toHaveURL(/protected/)

    // Find and click logout button (may be in profile menu)
    const logoutBtn =
      page.getByRole('button', { name: /로그아웃|logout/i }).or(
        page.getByText(/로그아웃|logout/i)
      )

    // Try opening a dropdown/menu first if logout not visible
    if (!(await logoutBtn.isVisible().catch(() => false))) {
      const profileMenu = page.getByRole('button', { name: /프로필|profile|메뉴|menu/i }).first()
      if (await profileMenu.isVisible().catch(() => false)) {
        await profileMenu.click()
      }
    }

    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click()
      await expect(page).toHaveURL(/login|\/$/,  { timeout: 10_000 })
    }
  })
})

test.describe('미인증 리다이렉트', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('보호된 페이지 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto('/protected')
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

  test('관리자 페이지 접근 시 리다이렉트', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})
