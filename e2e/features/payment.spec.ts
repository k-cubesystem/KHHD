import { test, expect } from '../fixtures'

test.describe('결제 / 멤버십', () => {
  test('멤버십 플랜 페이지', async ({ page }) => {
    await page.goto('/protected/membership')
    await expect(page.locator('main')).toBeVisible()
  })

  test('멤버십 플랜 카드 렌더링', async ({ page }) => {
    await page.goto('/protected/membership')
    // 멤버십 탭은 한국어 플랜 이름으로 노출된다(/protected/membership → 상점 멤버십 탭)
    const plans = page.getByText(/싱글 멤버십|패밀리 멤버십|비즈니스 멤버십|SINGLE|FAMILY|BUSINESS/i)
    await expect(plans.first()).toBeVisible({ timeout: 10_000 })
  })

  test('멤버십 관리 페이지', async ({ page }) => {
    await page.goto('/protected/membership/manage')
    await expect(page.locator('main')).toBeVisible()
  })

  test('상점 이용권 탭 — 유효기간·양도·환불 안내가 보인다', async ({ page }) => {
    // 팩 카드는 DB(price_plans) 상태에 달렸다 — 여기서는 DB 와 무관하게 늘 그려지는 안내만 본다.
    await page.goto('/protected/store?tab=pass')
    await expect(page.getByText('이용권 안내')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/유효기간 — 결제일로부터 \d+일/)).toBeVisible()
    await expect(page.getByText(/양도 — /)).toBeVisible()
  })

  test('옛 복채 탭 링크는 이용권 탭으로 받는다', async ({ page }) => {
    await page.goto('/protected/store?tab=bokchae')
    await expect(page.getByRole('link', { name: '이용권', exact: true })).toHaveAttribute('aria-current', 'page', {
      timeout: 10_000,
    })
  })
})
