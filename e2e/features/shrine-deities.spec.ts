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
    // 구매는 없다(2026-09-18) — 등급이 닿으면 「모시기」, 모자라면 「○○ 멤버십부터」 문이 선다
    const enshrine = page.getByRole('button', { name: '모시기' })
    const tierDoor = page.getByRole('link', { name: /(싱글|패밀리|비즈니스) 멤버십부터/ })
    const seat = page.getByRole('button', { name: '좌정' })
    await expect(enshrine.or(tierDoor).or(seat).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/복채|만냥/)).toHaveCount(0)
  })
})
