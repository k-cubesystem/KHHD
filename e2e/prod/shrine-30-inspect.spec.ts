import { test, expect } from '@playwright/test'
import path from 'path'

// 신당 3.0 핵심 루프 프로덕션 검수: 방(테마배경·主神·인연바·전체화면) → 판테온(17신위)
// → 대화(신위 페르소나·감정 표정 아바타·[[emotion]] 누수·인연 적립).
// 실행: E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com E2E_USER_EMAIL/PASSWORD
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `shrine30-${n}.png`)

test.describe('신당 3.0 핵심 루프 검수', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정 — 스킵')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('방 → 판테온 → 대화 감정·인연 루프', async ({ page }) => {
    test.setTimeout(240_000)

    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200))
    })
    page.on('pageerror', (err) => consoleErrors.push(`PAGE_ERROR ${String(err).slice(0, 200)}`))
    const assetHits: string[] = []
    const failedRes: string[] = []
    page.on('response', (res) => {
      const u = res.url()
      if (u.includes('/shrine/themes/') || u.includes('/shrine/deities/')) {
        assetHits.push(`${res.status()} ${u.split('/shrine/')[1]}`)
      }
      if (res.status() >= 400) failedRes.push(`${res.status()} ${u.slice(0, 140)}`)
    })

    // 로그인
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    const dlg = page.getByRole('dialog', { name: '오픈 이벤트' })
    await page.addLocatorHandler(dlg, async () => {
      await dlg.getByRole('button', { name: 'Close' }).click()
    })

    // ── 1) 신당 방 ──
    await page.goto('/protected/shrine')
    // 오픈이벤트 팝업은 클릭 시에만 핸들러가 돌므로 스크린샷 전에 명시적으로 닫는다
    await dlg.waitFor({ timeout: 5_000 }).catch(() => {})
    if (await dlg.isVisible().catch(() => false)) {
      await dlg
        .getByRole('button', { name: 'Close' })
        .click()
        .catch(() => {})
      await dlg.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
    }
    await page
      .getByText(/나 의 신 당|수호신을 좌정|신당을 만들/)
      .first()
      .waitFor({ timeout: 20_000 })
      .catch(() => {})

    // 방 로드는 비동기 — 즉시 검사 대신 대기 기반 단언(플레이크 방지)
    await expect(page.getByRole('img', { name: '삼신할매' }).first()).toBeVisible({ timeout: 20_000 })
    console.log('[CHECK] 제단 主神(삼신할매) 렌더: true')

    await expect(page.getByText(/緣|인연/).first()).toBeVisible({ timeout: 10_000 })
    console.log('[CHECK] 인연 바 표시: true')

    await expect(page.getByRole('button', { name: '전체화면' })).toBeVisible({ timeout: 10_000 })
    console.log('[CHECK] 전체화면 버튼: true')

    console.log(
      `[CHECK] 대화 진입 UI 부재(제거 확인): ${!(await page
        .getByText('말을 건네보세요')
        .isVisible()
        .catch(() => false))}`
    )

    await page
      .waitForFunction(() => Array.from(document.images).every((im) => im.complete && im.naturalWidth > 0), {
        timeout: 15_000,
      })
      .catch(() => {})
    await page.screenshot({ path: SHOT('1-room-desktop'), fullPage: false })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: SHOT('2-room-mobile'), fullPage: false })
    await page.setViewportSize({ width: 1280, height: 900 })

    // ── 2) 판테온 ──
    await page.goto('/protected/shrine/deities')
    await expect(page.getByRole('heading', { name: '신위 · 판테온' })).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    const deityImgCount = await page.locator('img[src*="/shrine/deities/"]').count()
    console.log(`[CHECK] 판테온 신위 이미지 수: ${deityImgCount}`)
    // fullPage는 프로덕션 e2e에서 브라우저 불안정 플레이크 이력 — 뷰포트만
    await page.screenshot({ path: SHOT('3-pantheon') })

    // ── 3) 대화: 감정 아바타 + 태그 누수 + 페르소나 ──
    await page.goto('/protected/ai-shaman')
    const input = page.getByPlaceholder(/고민을 편하게 적어주세요/)
    await expect(input).toBeVisible({ timeout: 20_000 })

    // 팝업 명시 닫기(force 클릭은 locator handler 미트리거) + 세션 히스토리 로딩 완료 대기
    await dlg.waitFor({ timeout: 5_000 }).catch(() => {})
    if (await dlg.isVisible().catch(() => false)) {
      await dlg
        .getByRole('button', { name: 'Close' })
        .click()
        .catch(() => {})
      await dlg.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
    }
    // 채팅 페이지는 백그라운드 요청이 이어져 networkidle이 안 올 수 있음 — 상한 필수
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(1_500)

    // 첫 로드 시 헤더 아바타 상태 (deityCode는 첫 응답 후에만 세팅되는 구조 확인용)
    const initialDeityAvatar = await page
      .getByRole('img', { name: '좌정 신위' })
      .isVisible()
      .catch(() => false)
    console.log(`[CHECK] 첫 로드 시 신위 아바타(응답 전): ${initialDeityAvatar} (false면 해화지기 폴백 상태)`)
    await page.screenshot({ path: SHOT('4-chat-initial') })

    // 과거 히스토리의 '듣기' 버튼과 구분: 전송 전 개수를 기록하고 +1 될 때까지 대기
    const listenBtns = page.getByRole('button', { name: '음성으로 듣기' })
    const listenBefore = await listenBtns.count()

    const chip = page.getByRole('button', { name: /궁금|삼재|재물|연애|행운|귀인|이직|부부/ }).first()
    await expect(chip).toBeVisible({ timeout: 10_000 })
    const chipText = ((await chip.textContent()) || '').replace(/[✦✧+\s]+/g, ' ').trim()
    await chip.click({ force: true })
    await expect(page.getByText(chipText).last()).toBeVisible({ timeout: 10_000 })
    console.log('[PASS] 유저 메시지 전송')

    await expect(async () => {
      expect(await listenBtns.count()).toBeGreaterThan(listenBefore)
    }).toPass({ timeout: 90_000 })
    console.log('[PASS] 새 AI 응답 수신 (히스토리 제외)')

    const deityAvatarAfter = page.getByRole('img', { name: '좌정 신위' })
    const avatarVisible = await deityAvatarAfter.isVisible().catch(() => false)
    const avatarSrc = avatarVisible ? await deityAvatarAfter.getAttribute('src') : null
    console.log(`[CHECK] 응답 후 신위 표정 아바타: ${avatarVisible} src=${avatarSrc}`)

    const bodyText = (await page.locator('body').innerText()).slice(0, 20_000)
    const tagLeak = /\[\[|\]\]/.test(bodyText)
    console.log(`[CHECK] [[emotion]] 태그 누수: ${tagLeak}`)

    await page.screenshot({ path: SHOT('5-chat-response'), fullPage: false })

    console.log('[ASSETS]', JSON.stringify(assetHits.slice(0, 30)))
    console.log('[HTTP_4XX_5XX]', JSON.stringify(failedRes.slice(0, 20)))
    console.log('[CONSOLE_ERRORS]', JSON.stringify(consoleErrors.slice(0, 20)))
  })
})
