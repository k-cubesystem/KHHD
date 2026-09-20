import { test, expect, type Page } from '@playwright/test'
import path from 'path'

// 상단 바 「내 이용권」 — 태극 옆 표 아이콘을 누르면 등급·이용권·구매·멤버십 권유가 뜬다(2026-09-20).
// 단위 테스트는 목 데이터로만 본다. 여기서는 «실제 로그인 상태에서 서버 왕복이 살아 있는가»를 본다:
//   ① 상단 바에 네 아이콘이 한 줄로 서고 상호가 가려지지 않는다
//   ② 표를 누르면 팝업이 뜨고 등급·이용권 줄이 채워진다(스피너에 갇히지 않는다)
//   ③ 닫았다 다시 열어도 뜬다(열 때마다 다시 읽는다)
//   ④ 같은 등급 표시명을 쓰는 태극(내 명식) 팝업이 깨지지 않았다
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `header-pass-${n}.png`)

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
  await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/protected/, { timeout: 20_000 })
}

test.describe('상단 바 — 내 이용권 팝업', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 360, height: 800 } })

  test('표 아이콘 → 등급·이용권이 채워진 팝업, 다시 열어도 뜬다', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    await login(page)
    await page.goto('/protected/analysis')

    const header = page.locator('header').first()
    await expect(header.getByText('청담해화당')).toBeVisible({ timeout: 30_000 })
    for (const name of ['내 명식 바로보기', '내 이용권 보기', '홈']) {
      await expect(header.getByLabel(name)).toBeVisible()
    }
    // 360px 에서 아이콘 넷이 바 밖으로 밀리지 않는다
    const homeBox = await header.getByLabel('홈').boundingBox()
    expect(homeBox && homeBox.x + homeBox.width).toBeLessThanOrEqual(360)
    await page.screenshot({ path: SHOT('bar'), fullPage: false })

    await header.getByLabel('내 이용권 보기').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('내 이용권', { exact: true })).toBeVisible()
    await expect(dialog.getByText('등급', { exact: true })).toBeVisible({ timeout: 20_000 })
    // 일반 회원이면 «이용권 N장»/«이번 달 N장», 검수·관리자 계정이면 «이용권 관리자»
    await expect(dialog.getByText(/^(이용권 \d+장|이번 달 \d+장|이용권 관리자)$/)).toBeVisible()
    await expect(dialog.getByRole('link', { name: '이용권 안내 · 환불 정책' })).toBeVisible()
    await page.screenshot({ path: SHOT('popup'), fullPage: false })

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await header.getByLabel('내 이용권 보기').click()
    await expect(dialog.getByText('등급', { exact: true })).toBeVisible({ timeout: 20_000 })
    await page.keyboard.press('Escape')

    // 태극 팝업 — 등급 표시명을 같은 함수로 모았으므로 함께 본다
    await header.getByLabel('내 명식 바로보기').click()
    await expect(page.getByRole('dialog').getByText('내 명식 바로보기')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('등급', { exact: true })).toBeVisible({ timeout: 20_000 })

    expect(errors, errors.join('\n')).toHaveLength(0)
  })
})
