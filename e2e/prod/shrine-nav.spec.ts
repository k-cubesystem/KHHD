import { test, expect } from '@playwright/test'
import path from 'path'

// 신당 3.0 메뉴/네비 정합 검증 (배포 후 프로덕션).
// E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com E2E_USER_EMAIL/PASSWORD
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `shrine-nav-${n}.png`)

test.describe('신당 3.0 네비게이션', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('메뉴에 신당 편입 + 신위 판테온 도달', async ({ page }) => {
    test.setTimeout(90_000)

    // 로그인
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    // 오픈이벤트 팝업 자동 닫기
    const dlg = page.getByRole('dialog', { name: '오픈 이벤트' })
    await page.addLocatorHandler(dlg, async () => {
      await dlg.getByRole('button', { name: 'Close' }).click()
    })

    // 1) 하단 네비: 신당 있고 사주팔자 없음
    const nav = page.getByRole('navigation', { name: '주요 메뉴' })
    await expect(nav.getByText('신당', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(nav.getByText('사주팔자')).toHaveCount(0)
    await expect(nav.getByText('고민상담', { exact: true })).toBeVisible()
    await page.screenshot({ path: SHOT('1-nav'), fullPage: false })
    console.log('[PASS] 하단 네비에 신당 편입 · 사주팔자 제거 확인')

    // 2) 신당 클릭 → /protected/shrine
    await nav.getByText('신당', { exact: true }).click()
    await expect(page).toHaveURL(/\/protected\/shrine(\/|$|\?)/, { timeout: 15_000 })
    await expect(page.locator('main')).toBeVisible()
    // 방 로드(getSceneData) 완료 대기 — '불러오는 중' 스피너 이후 실제 방/셋업 렌더
    await page
      .getByText(/나 의 신 당|수호신을 좌정|신당을 만들/)
      .first()
      .waitFor({ timeout: 15_000 })
      .catch(() => {})
    await page
      .waitForFunction(() => Array.from(document.images).every((im) => im.complete && im.naturalWidth > 0), {
        timeout: 10_000,
      })
      .catch(() => {})
    await page.screenshot({ path: SHOT('2-shrine'), fullPage: true })
    const hasRoom = await page
      .getByText('나 의 신 당')
      .isVisible()
      .catch(() => false)
    const hasSetup = await page
      .getByText(/나의 신당|신당을 만들|만들어보세요/)
      .first()
      .isVisible()
      .catch(() => false)
    console.log(`[INFO] 신당 페이지: room=${hasRoom} setup=${hasSetup}`)

    // 3) 신위 판테온 도달 — 신위전은 모아보기의 한 탭이 되었다(CEO 6차 지시 2026-07-30).
    //    방이면 헤더 '모아보기' 버튼 → '신위' 탭, 아니면 구 주소로(리다이렉트가 받는다).
    if (hasRoom) {
      await page.getByRole('link', { name: '신당테마·아이템·신위 모아보기' }).click()
      await expect(page).toHaveURL(/\/protected\/shrine\/collection/, { timeout: 15_000 })
      await page.getByRole('link', { name: '신위', exact: true }).click()
    } else {
      await page.goto('/protected/shrine/deities')
    }
    await expect(page).toHaveURL(/\/protected\/shrine\/collection\?tab=deity/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: '신위전(神位殿)' })).toBeVisible({ timeout: 15_000 })
    // 신위 이미지 전부 로드 대기(스크린샷 정확도)
    await page.waitForLoadState('networkidle').catch(() => {})
    await page
      .waitForFunction(() => Array.from(document.images).every((im) => im.complete && im.naturalWidth > 0), {
        timeout: 15_000,
      })
      .catch(() => {})
    await page.screenshot({ path: SHOT('3-deities'), fullPage: true })
    console.log('[PASS] 신위 판테온 도달')

    // 4) 뒤로가기 링크
    await expect(page.getByRole('link', { name: /신당으로/ })).toBeVisible()
    console.log('[PASS] 신당으로 뒤로가기 링크 존재')
  })
})
