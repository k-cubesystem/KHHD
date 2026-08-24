import { test, expect, type Page } from '@playwright/test'
import path from 'path'

// 🔴 2026-08-24 CEO 지시로 «하단 가이드 공지 바»를 내렸다(app/protected/layout.tsx 주석 참조).
// 그래서 이 스펙의 성격이 뒤집혔다 — 예전엔 «바가 뜨는가 + 입력창을 안 덮는가»를 봤고,
// 지금은 «바가 정말 사라졌는가 + 그 자리를 대신 차지한 것은 없는가»를 본다.
// 컴포넌트 자체는 남아 있으므로(되살리기 쉽게) 실수로 다시 마운트되면 여기서 잡힌다.
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `guide-${n}.png`)

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
  await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/protected/, { timeout: 20_000 })
}

test.describe('하단 가이드 바 — 내려간 상태 유지', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  // 앱은 max-w-480 모바일 셸이다 — 겹침·가림은 좁은 폭에서 터지므로 모바일 뷰포트로 본다.
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } })

  test('허브·속풀이 어디에도 가이드 바가 없다', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    await login(page)

    // 1) 허브 — 카드·푸터를 가리던 상시 바가 사라졌는지
    await page.goto('/protected/analysis')
    await expect(page.getByRole('heading', { name: '인기테마운세' })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-guide-bar]')).toHaveCount(0)
    // 구 UI(우하단 떠 있던 아바타)도 여전히 없어야 한다
    await expect(page.getByRole('button', { name: /^가이드 / })).toHaveCount(0)
    console.log('[PASS] 허브에 가이드 바 없음')
    await page.screenshot({ path: SHOT('hub'), fullPage: false })

    // 2) 속풀이 — 입력창이 그대로 쓸 수 있는지(바가 없어졌으니 가릴 것도 없다)
    await page.goto('/protected/ai-shaman')
    const input = page.getByPlaceholder(/고민|질문|입력|여쭤/).first()
    await expect(input).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-guide-bar]')).toHaveCount(0)
    await input.click({ timeout: 10_000 })
    await input.fill('겹침 확인')
    await expect(input).toHaveValue('겹침 확인')
    await input.fill('')
    console.log('[PASS] 속풀이에 가이드 바 없음 · 입력창 정상')

    await page.screenshot({ path: SHOT('chat'), fullPage: false })
    expect(errors, errors.join('\n')).toHaveLength(0)
  })

  test('공지 전달 경로는 살아 있다 — 알림 화면', async ({ page }) => {
    test.setTimeout(120_000)
    // 바를 내린 대가로 공지가 사라지면 안 된다. 알림 화면이 그 역할을 계속 진다.
    await login(page)
    await page.goto('/protected/notifications')
    await expect(page.getByRole('button', { name: /모두 읽음|읽음 처리/ }).or(page.getByText(/알림/))).toBeVisible({
      timeout: 30_000,
    })
    console.log('[PASS] 알림 화면 생존')
  })
})
