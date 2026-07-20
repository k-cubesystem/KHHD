import { test, expect } from '@playwright/test'

// 궁합 관계별 개편(Part A): 입력 화면의 관계 선택이 렌더되고 관계군 옵션이 노출되는지 (배포 후 프로덕션).
// 실분석은 토큰 소모라 스킵(테스트 계정 대상 1명 — 2인 궁합 불가). 관계 선택 UX 위주로 검증.
test.describe('궁합 관계 선택 · 입력 UX', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  async function login(page: import('@playwright/test').Page) {
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

  test('관계 선택 렌더 + 관계군 옵션(소개팅·동료 등) 노출', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    await login(page)
    await page.goto('/protected/analysis/compatibility')

    await expect(page.getByRole('heading', { name: '궁합 분석' })).toBeVisible({ timeout: 25_000 })
    await expect(page.getByRole('heading', { name: '두 사람의 관계' })).toBeVisible({ timeout: 15_000 })
    console.log('[PASS] 궁합 입력 화면 렌더')

    // 관계 셀렉트 오픈 → 관계군을 대표하는 옵션 확인 (연애 외 관계도 지원)
    await page.getByRole('combobox').first().click()
    await expect(page.getByRole('option', { name: /소개팅/ })).toBeVisible({ timeout: 10_000 }) // MEETING
    await expect(page.getByRole('option', { name: /동료/ })).toBeVisible() // WORK
    await expect(page.getByRole('option', { name: /형제/ })).toBeVisible() // SIBLINGS
    console.log('[PASS] 관계군 옵션(소개팅·동료·형제) 노출')

    // 동료(WORK) 선택 → 질문 미리보기 칩이 그 관계군 질문으로 갱신
    await page.getByRole('option', { name: /동료/ }).click()
    await expect(page.getByText('이런 게 궁금하시죠?')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('이 사람과 일하면 시너지가 나나요, 소모가 되나요?')).toBeVisible()
    console.log('[PASS] 질문 미리보기 칩(WORK 군) 노출')

    const realErrors = errors.filter((e) => !/Minified React error #(418|423|425)/.test(e))
    expect(realErrors, realErrors.join('\n')).toHaveLength(0)
  })
})
