import { test, expect } from '@playwright/test'

// 클라이언트 예외 재현 프로브 — 주요 페이지를 순회하며 console.error / pageerror / Application error 화면을 수집.
// E2E_PROD_SMOKE=1 게이트. 일회성 진단이 아니라 상시 스모크로 유지 (크래시 회귀 방지).
test.describe('클라이언트 예외 프로브', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('랜딩→로그인→주요 페이지 콘솔 에러 수집', async ({ page }) => {
    test.setTimeout(180_000)
    const errors: string[] = []
    page.on('pageerror', (err) =>
      errors.push(`[pageerror] ${page.url()} :: ${err.message}\n${(err.stack ?? '').slice(0, 1200)}`)
    )
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console] ${page.url()} :: ${msg.text().slice(0, 800)}`)
    })

    const visit = async (path: string) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' }).catch((e) => errors.push(`[nav] ${path} :: ${e}`))
      await page.waitForTimeout(2500)
      const appError = await page
        .getByText('Application error: a client-side exception')
        .isVisible()
        .catch(() => false)
      if (appError) errors.push(`[APP-ERROR-SCREEN] ${path}`)
      console.log(`[VISIT] ${path} — appError=${appError}`)
    }

    await visit('/')
    await visit('/auth/login')

    // 로그인
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })
    await page.waitForTimeout(3000)

    await visit('/protected')
    await visit('/protected/profile')
    await visit('/protected/store')
    await visit('/protected/store?tab=membership')
    await visit('/protected/shrine')
    await visit('/protected/ai-shaman')

    console.log(`\n===== 수집된 에러 ${errors.length}건 =====`)
    for (const e of errors) console.log(e)

    const appErrors = errors.filter((e) => e.startsWith('[APP-ERROR-SCREEN]') || e.startsWith('[pageerror]'))
    expect(appErrors, appErrors.join('\n')).toHaveLength(0)
  })
})
