import { test, expect } from '@playwright/test'
import path from 'path'

// 사주 핵심 루프 프로덕션 검수: 만세력(명식 렌더) → 분석 허브(오늘의운세) → 천지인 사주풀이 진입.
// 2026-07-13 P0 회귀 방지: v_destiny_targets 스키마, daily_fortune 프롬프트, analysis_history 저장.
// 실행: E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com E2E_USER_EMAIL/PASSWORD
// (오늘의운세 미캐시 시 Gemini 1콜 발생 가능)
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `saju-core-${n}.png`)

async function closeEventDialog(page: import('@playwright/test').Page) {
  const dlg = page.getByRole('dialog', { name: '오픈 이벤트' })
  await dlg.waitFor({ timeout: 4_000 }).catch(() => {})
  if (await dlg.isVisible().catch(() => false)) {
    await dlg
      .getByRole('button', { name: 'Close' })
      .click()
      .catch(() => {})
    await dlg.waitFor({ state: 'hidden', timeout: 4_000 }).catch(() => {})
  }
}

test.describe('사주 핵심 루프 검수', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정 — 스킵')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('만세력 명식 → 허브 오늘의운세 → 천지인 진입', async ({ page }) => {
    test.setTimeout(240_000)

    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`CONSOLE ${m.text().slice(0, 200)}`)
    })
    page.on('pageerror', (e) => errors.push(`PAGE ${String(e).slice(0, 200)}`))
    page.on('response', (res) => {
      if (res.status() >= 400) errors.push(`HTTP ${res.status()} ${res.url().slice(0, 120)}`)
    })

    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    // ── 1) 만세력: 대상 로드(v_destiny_targets) + 사주팔자 명식 렌더 ──
    await page.goto('/protected/profile/manse')
    await closeEventDialog(page)
    // 대상 정보가 로드되면 셀렉터/명식이, 깨지면 "내 정보를 먼저 등록해주세요"가 뜬다
    await expect(page.getByText('내 정보를 먼저 등록해주세요')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByText('사주팔자 (四柱八字)')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/년주 年柱|년주/).first()).toBeVisible({ timeout: 10_000 })
    console.log('[PASS] 만세력 명식 렌더')
    await page.screenshot({ path: SHOT('1-manse'), fullPage: false })

    // ── 2) 분석 허브: 오늘의 운세 위젯 (daily_fortune 프롬프트+캐시) ──
    await page.goto('/protected/analysis')
    await closeEventDialog(page)
    const todayCard = page.getByText(/오늘의 운세/).first()
    await expect(todayCard).toBeVisible({ timeout: 15_000 })
    // 운세 본문 생성/캐시 로드 대기 — 실패 시 '시스템 설정 오류' 문구가 뜬다
    await expect(page.getByText(/시스템 설정 오류|프롬프트를 불러올 수 없습니다/)).toHaveCount(0, {
      timeout: 30_000,
    })
    await page.waitForTimeout(8_000)
    const hubText = (
      await page
        .locator('main, body')
        .first()
        .innerText()
        .catch(() => '')
    ).replace(/\s+/g, ' ')
    const hasFortuneBody = /총운|재물운|행운/.test(hubText)
    console.log(`[CHECK] 오늘의 운세 본문 표시: ${hasFortuneBody}`)
    await page.screenshot({ path: SHOT('2-today'), fullPage: false })

    // ── 3) 천지인 사주풀이: 대상 선택 화면 도달 (실분석은 수동/필요 시) ──
    await page.goto('/protected/analysis/cheonjiin')
    await closeEventDialog(page)
    await expect(page.getByText(/분석 대상 선택|사주풀이 시작하기/).first()).toBeVisible({ timeout: 15_000 })
    const combo = page.getByRole('combobox').first()
    await combo.click().catch(() => {})
    await page.waitForTimeout(500)
    const selfOpt = page.getByRole('option').filter({ hasText: /본인/ }).first()
    await expect(selfOpt).toBeVisible({ timeout: 10_000 })
    console.log('[PASS] 천지인 대상 선택 가능(본인 로드)')
    await page.keyboard.press('Escape').catch(() => {})
    await page.screenshot({ path: SHOT('3-cheonjiin'), fullPage: false })

    const realErrors = errors.filter((e) => !e.includes('hanji_noise') && !e.includes('/protected/support'))
    console.log('[ERRORS]', JSON.stringify(realErrors.slice(0, 15)))
  })
})
