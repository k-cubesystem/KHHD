import { test, expect, type Page } from '@playwright/test'
import path from 'path'

// 가이드 UI 전환 검증 — 우하단 떠 있는 아바타 → 하단 메뉴 위 공지 바 (2026-07-20).
// 핵심 회귀: 고민상담 화면에서 가이드가 입력창·전송 버튼을 덮지 않아야 한다.
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `guide-${n}.png`)

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
  await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/protected/, { timeout: 20_000 })
  const dlg = page.getByRole('dialog', { name: '오픈 이벤트' })
  await page.addLocatorHandler(dlg, async () => {
    await dlg.getByRole('button', { name: 'Close' }).click()
  })
}

test.describe('가이드 공지 바', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('고민상담: 우하단 아바타 없음 + 바가 입력창을 덮지 않음', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    await login(page)
    await page.goto('/protected/ai-shaman')
    await expect(page.getByPlaceholder(/고민|질문|입력/)).toBeVisible({ timeout: 30_000 })

    // 1) 구 우하단 아바타(가이드 …)가 사라졌는지
    await expect(page.getByRole('button', { name: /^가이드 / })).toHaveCount(0)
    console.log('[PASS] 우하단 신 아바타 제거됨')

    // 2) 가이드가 하단 바로 뜨는지 (펼침 또는 접힘 중 하나)
    const bar = page.locator('[data-guide-bar]')
    await expect(bar).toBeVisible({ timeout: 15_000 })
    const barBox = await bar.boundingBox()
    expect(barBox, '가이드 바 박스').not.toBeNull()
    console.log('[PASS] 하단 가이드 바 노출')

    // 3) 하단 메뉴 "위쪽"에 있는지 — 바 아래끝이 메뉴 위끝보다 위여야 한다
    const nav = page.locator('nav').filter({ hasText: '고민상담' }).first()
    const navBox = await nav.boundingBox()
    expect(navBox, '하단 메뉴 박스').not.toBeNull()
    if (barBox && navBox) {
      expect(Math.round(barBox.y + barBox.height)).toBeLessThanOrEqual(Math.round(navBox.y) + 2)
      console.log(
        `[PASS] 바가 메뉴 위쪽 (바 하단 ${Math.round(barBox.y + barBox.height)} ≤ 메뉴 상단 ${Math.round(navBox.y)})`
      )
    }

    // 4) 실제 겹침 검사 — 입력창·전송 버튼과 가이드 바의 사각형이 교차하면 실패
    const input = page.getByPlaceholder(/고민|질문|입력/).first()
    const inputBox = await input.boundingBox()
    expect(inputBox, '입력창 박스').not.toBeNull()
    if (barBox && inputBox) {
      const overlap =
        barBox.x < inputBox.x + inputBox.width &&
        barBox.x + barBox.width > inputBox.x &&
        barBox.y < inputBox.y + inputBox.height &&
        barBox.y + barBox.height > inputBox.y
      expect(overlap, '가이드 바가 입력창을 덮음').toBe(false)
      console.log('[PASS] 입력창과 겹치지 않음')
    }

    // 5) 입력창이 실제로 클릭·타이핑 가능한지 (가려지면 Playwright 가 막힌다)
    await input.click({ timeout: 10_000 })
    await input.fill('겹침 확인')
    await expect(input).toHaveValue('겹침 확인')
    await input.fill('')
    console.log('[PASS] 입력창 클릭·타이핑 가능')

    await page.screenshot({ path: SHOT('chat'), fullPage: false })
    expect(errors, errors.join('\n')).toHaveLength(0)
  })

  test('접기 → 펼치기 재진입 동작', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page)
    await page.goto('/protected/analysis')

    const bar = page.locator('[data-guide-bar]')
    await expect(bar).toBeVisible({ timeout: 30_000 })

    // 펼쳐져 있으면 접고, 접힌 줄을 눌러 다시 펼친다
    const close = page.getByRole('button', { name: '안내 접기' })
    if (await close.isVisible().catch(() => false)) {
      await close.click()
    }
    const collapsed = page.getByRole('button', { name: /안내 펼치기$/ })
    await expect(collapsed).toBeVisible({ timeout: 10_000 })
    console.log('[PASS] 접힌 줄 노출')

    await collapsed.click()
    await expect(page.getByRole('button', { name: '안내 접기' })).toBeVisible({ timeout: 10_000 })
    console.log('[PASS] 접힌 줄 탭 → 다시 펼쳐짐')

    await page.screenshot({ path: SHOT('expanded'), fullPage: false })
  })
})
