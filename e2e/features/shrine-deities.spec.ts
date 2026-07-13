import { test, expect } from '../fixtures'

test.describe('신위 판테온 (shrine 3.0)', () => {
  test('판테온 페이지 로드', async ({ page }) => {
    await page.goto('/protected/shrine/deities')
    await expect(page.getByRole('heading', { name: '신위전(神位殿)' })).toBeVisible({ timeout: 20_000 })
  })

  test('수호신 좌정 CTA 또는 主神 노출', async ({ page }) => {
    await page.goto('/protected/shrine/deities')
    const seatCta = page.getByRole('button', { name: /수호신 좌정하기/ })
    const mainDeity = page.getByText('主神 좌정중')
    await expect(seatCta.or(mainDeity).first()).toBeVisible({ timeout: 20_000 })
  })

  test('등급별 신위 카탈로그 렌더링', async ({ page }) => {
    await page.goto('/protected/shrine/deities')
    await expect(page.getByText('무료 좌정')).toBeVisible({ timeout: 20_000 })
    const enshrineButtons = page.getByRole('button', { name: /봉안 · \d+복채/ })
    await expect(enshrineButtons.first()).toBeVisible({ timeout: 10_000 })
  })
})
