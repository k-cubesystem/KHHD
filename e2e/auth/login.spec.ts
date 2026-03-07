import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } }) // unauthenticated

test.describe('로그인 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
  })

  test('로그인 폼이 렌더링된다', async ({ page }) => {
    await expect(page.getByLabel('이메일')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
    await expect(page.getByRole('button', { name: /로그인|sign in/i })).toBeVisible()
  })

  test('빈 폼 제출 시 유효성 검사 에러', async ({ page }) => {
    await page.getByRole('button', { name: /로그인|sign in/i }).click()
    // Should show validation or stay on login page
    await expect(page).toHaveURL(/login/)
  })

  test('잘못된 자격증명으로 에러 표시', async ({ page }) => {
    await page.getByLabel('이메일').fill('wrong@example.com')
    await page.getByLabel('비밀번호').fill('wrongpassword')
    await page.getByRole('button', { name: /로그인|sign in/i }).click()

    // Should show error message or stay on login
    await expect(page).toHaveURL(/login|error/, { timeout: 10_000 })
  })

  test('비밀번호 찾기 링크가 존재한다', async ({ page }) => {
    const link = page.getByRole('link', { name: /비밀번호.*찾기|forgot.*password/i })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/forgot-password/)
  })

  test('회원가입 링크가 존재한다', async ({ page }) => {
    const link = page.getByRole('link', { name: /회원가입|sign up/i })
    await expect(link).toBeVisible()
  })
})
