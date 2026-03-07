import { test as setup, expect } from '@playwright/test'
import path from 'path'

const USER_FILE = path.join(__dirname, '.auth', 'user.json')
const ADMIN_FILE = path.join(__dirname, '.auth', 'admin.json')

setup('authenticate as user', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || 'test@example.com')
  await page.getByLabel('비밀번호').fill(process.env.E2E_USER_PASSWORD || 'test1234!')
  await page.getByRole('button', { name: '로그인', exact: true }).click()

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/protected/, { timeout: 15_000 })

  await page.context().storageState({ path: USER_FILE })
})

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(process.env.E2E_ADMIN_EMAIL || 'admin@example.com')
  await page.getByLabel('비밀번호').fill(process.env.E2E_ADMIN_PASSWORD || 'admin1234!')
  await page.getByRole('button', { name: '로그인', exact: true }).click()

  await expect(page).toHaveURL(/protected|admin/, { timeout: 15_000 })

  await page.context().storageState({ path: ADMIN_FILE })
})
