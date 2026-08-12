import { test, expect } from '@playwright/test'

// 배포 후 프로덕션 스모크: 실제 로그인 → 해화지기에게 실제 AI 응답까지 확인.
// 실행 조건: E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com E2E_USER_EMAIL/PASSWORD
// (Gemini 1콜 발생 — 평시 로컬 실행에선 자동 스킵)
test.describe('프로덕션 스모크', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정 — 스킵')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('로그인 → 해화지기 실제 AI 응답', async ({ page }) => {
    test.setTimeout(120_000)
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[BROWSER_ERROR]', msg.text().slice(0, 200))
    })
    page.on('pageerror', (err) => console.log('[PAGE_ERROR]', String(err).slice(0, 200)))

    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호').fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    await page.goto('/protected/ai-shaman')

    const question = '한 문장으로 오늘의 기운을 알려주세요'
    const input = page.getByPlaceholder(/고민을 편하게 적어주세요/)
    await expect(input).toBeVisible({ timeout: 20_000 })
    await expect(input).toBeEnabled({ timeout: 20_000 })
    page.on('response', async (res) => {
      if (res.request().method() === 'POST') {
        const body = await res.text().catch(() => '')
        console.log('[POST]', res.status(), res.url().slice(-40), '|', body.slice(0, 300))
      }
    })

    // 타이핑 대신 추천 질문 칩 클릭 — handleSend(q) 직접 트리거(controlled input 이슈 회피)
    const chip = page.getByRole('button', { name: /궁금|삼재|재물|연애|행운|귀인|이직|부부/ }).first()
    await expect(chip).toBeVisible({ timeout: 10_000 })
    const chipText = ((await chip.textContent()) || question).replace(/[✦✧+\s]+/g, ' ').trim()
    // 칩이 상시 모션 애니메이션 중이라 stable 판정이 안 남 → 강제 클릭
    await chip.click({ force: true })

    // 1) 전송 자체가 됐는지 — 유저 말풍선 확인 (실패 시 토스트 내용 출력)
    try {
      await expect(page.getByText(chipText).last()).toBeVisible({ timeout: 10_000 })
    } catch (e) {
      const toasts = await page
        .locator('[data-sonner-toast], [role="status"], [role="alert"]')
        .allTextContents()
        .catch(() => [])
      console.log('[TOASTS]', JSON.stringify(toasts))
      throw e
    }
    console.log('[PASS] 유저 메시지 전송됨')

    // 2) 실제 Gemini 응답 — assistant 말풍선에 '음성으로 듣기' 버튼이 붙는다
    await expect(page.getByRole('button', { name: '음성으로 듣기' }).first()).toBeVisible({
      timeout: 60_000,
    })
  })
})
