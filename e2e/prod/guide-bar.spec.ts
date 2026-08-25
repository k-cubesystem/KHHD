import { test, expect, type Page } from '@playwright/test'
import path from 'path'

// 가이드 UI 두 번의 이동 — 하단 메뉴 위 공지 바 → (2026-08-24 CEO 지시로 내림) → **상단 바의 종**.
// 그래서 이 스펙은 두 가지를 함께 본다:
//   ① 하단 상시 바가 정말 사라졌는가 (실수로 다시 마운트되면 여기서 잡힌다)
//   ② 그 안내가 상단 바의 종으로 살아 있는가 — 상시 노출은 종 아이콘뿐, 누를 때만 펼쳐진다
// 공지·개인 알림 전달 경로(/protected/notifications)도 여전히 살아 있어야 한다.
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `guide-${n}.png`)

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
  await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/protected/, { timeout: 20_000 })
}

const bell = (page: Page) => page.getByRole('button', { name: /안내 펼치기$/ })

test.describe('가이드 — 하단 바 부재 + 상단 종', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  // 앱은 max-w-480 모바일 셸이다 — 겹침·가림은 좁은 폭에서 터지므로 모바일 뷰포트로 본다.
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } })

  test('허브·속풀이 어디에도 하단 가이드 바가 없다', async ({ page }) => {
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
    console.log('[PASS] 허브에 하단 가이드 바 없음')
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
    console.log('[PASS] 속풀이에 하단 가이드 바 없음 · 입력창 정상')

    await page.screenshot({ path: SHOT('chat'), fullPage: false })
    expect(errors, errors.join('\n')).toHaveLength(0)
  })

  test('신당에도 하단 안내 바가 없다 (「오늘 할 것」 바 제거, 2026-08-25)', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page)

    // 🔴 신당은 자체 하단 바(ShrineGuideBar «오늘 할 것 N개»)를 따로 갖고 있었다.
    //    전 화면에서 하단 상시 안내를 걷어내는 지시라 이것도 함께 내려갔다.
    await page.goto('/protected/shrine')
    await expect(bell(page)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /오늘 할 것/ })).toHaveCount(0)
    await expect(page.locator('[data-guide-bar]')).toHaveCount(0)
    console.log('[PASS] 신당에 하단 안내 바 없음')
  })

  test('상단 태극 — 내 명식 팝업이 열리고 사주팔자·오행이 선다', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page)
    await page.goto('/protected/analysis')

    const taegeuk = page.getByRole('button', { name: '내 명식 바로보기' })
    await expect(taegeuk).toBeVisible({ timeout: 30_000 })
    await taegeuk.click()

    await expect(page.getByText('사주팔자(四柱八字)')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('오행(五行) 분포')).toBeVisible()
    // 복채·등급·신위 세 칸이 각자 제 화면으로 간다
    await expect(page.getByText('복채', { exact: true })).toBeVisible()
    await expect(page.getByText('등급', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /만세력에서 자세히 보기/ })).toBeVisible()
    console.log('[PASS] 태극 팝업 — 명식·오행·계정 요약')
  })

  test('종은 상단 바 안에 있고, 자동으로 펼쳐지지 않는다', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page)
    await page.goto('/protected/analysis')

    await expect(bell(page)).toBeVisible({ timeout: 30_000 })

    // 종 아래끝이 헤더(h-14 = 56px) 안이어야 한다 — 본문으로 흘러내리면 실패
    const bellBox = await bell(page).boundingBox()
    expect(bellBox, '종 박스').not.toBeNull()
    if (bellBox) {
      expect(Math.round(bellBox.y + bellBox.height)).toBeLessThanOrEqual(58)
      console.log(`[PASS] 종이 상단 바 안 (아래끝 ${Math.round(bellBox.y + bellBox.height)} ≤ 58)`)
    }

    // 🔴 자동 노출은 없앴다 — 누르기 전에는 패널이 없어야 한다(상시 안내로 되돌아가는 회귀 방지)
    await expect(page.locator('[data-guide-panel]')).toHaveCount(0)
    console.log('[PASS] 자동 노출 없음')
  })

  test('종 탭 → 패널이 바 바로 아래로 펼쳐지고, 다시 탭하면 닫힌다', async ({ page }) => {
    test.setTimeout(120_000)
    await login(page)
    await page.goto('/protected/analysis')

    await expect(bell(page)).toBeVisible({ timeout: 30_000 })
    await bell(page).click()

    const panel = page.locator('[data-guide-panel]')
    await expect(panel).toBeVisible({ timeout: 10_000 })

    const panelBox = await panel.boundingBox()
    expect(panelBox, '패널 박스').not.toBeNull()
    if (panelBox) {
      // 헤더(56px) 바로 아래에서 시작해야 한다 — 화면 한가운데나 하단에 뜨면 실패
      expect(panelBox.y).toBeGreaterThanOrEqual(54)
      expect(panelBox.y).toBeLessThanOrEqual(80)
      console.log(`[PASS] 패널이 바 바로 아래 (y=${Math.round(panelBox.y)})`)
    }
    await page.screenshot({ path: SHOT('expanded'), fullPage: false })

    await page.getByRole('button', { name: '안내 접기' }).click()
    await expect(panel).toHaveCount(0, { timeout: 10_000 })
    console.log('[PASS] 종 재탭 → 닫힘')
  })

  test('공지 전달 경로는 살아 있다 — 알림 화면', async ({ page }) => {
    test.setTimeout(120_000)
    // 바를 내린 대가로 공지가 사라지면 안 된다. 종과 별개로 알림 화면도 그 역할을 계속 진다.
    await login(page)
    await page.goto('/protected/notifications')
    await expect(page.getByRole('button', { name: /모두 읽음|읽음 처리/ }).or(page.getByText(/알림/))).toBeVisible({
      timeout: 30_000,
    })
    console.log('[PASS] 알림 화면 생존')
  })
})
