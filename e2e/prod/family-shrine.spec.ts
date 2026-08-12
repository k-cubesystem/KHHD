import { test, expect } from '@playwright/test'
import path from 'path'

// 가족별 신당 P1 검증 (배포 후 프로덕션) — 대상 탭 → 가족 신당 진입 → 강신(최초) 또는 방(재방문).
// E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com E2E_USER_EMAIL/PASSWORD
// 전제: 테스트 계정에 가족이 1명 이상 등록돼 있어야 한다 (없으면 탭 미노출 → 테스트 skip 처리).
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `family-shrine-${n}.png`)

test.describe('가족별 신당', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] }, deviceScaleFactor: 3 })

  test('대상 탭 → 가족 신당 강신/입장 → 가족 스코프 신위전', async ({ page }) => {
    test.setTimeout(120_000)

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

    // 1) 신당 페이지 — 대상 탭 노출 (본인 '나' + 가족 + '새 가족')
    await page.goto('/protected/shrine')
    await page.getByText('나 의 신 당').waitFor({ timeout: 20_000 })
    const selfTab = page.getByRole('link', { name: /^나$/ })
    const hasTabs = await selfTab.isVisible().catch(() => false)
    test.skip(!hasTabs, '가족 미등록 — 대상 탭 미노출 (계정 데이터 전제 미충족)')
    await expect(page.getByRole('link', { name: '새 가족' })).toBeVisible()
    await page.screenshot({ path: SHOT('1-tabs'), fullPage: false })
    console.log('[PASS] 대상 탭 노출 (나 | 가족 | +새 가족)')

    // 2) 첫 가족 탭 클릭 → 가족 신당 (최초면 강신 의식, 재방문이면 바로 방)
    const familyTab = page.locator('a[href*="/protected/shrine?member="]').first()
    await expect(familyTab).toBeVisible()
    await familyTab.click()
    await expect(page).toHaveURL(/member=/, { timeout: 15_000 })

    const gangshin = page.getByText('降 神')
    const familyRoom = page.getByText('가 족 신 당')
    await expect(gangshin.or(familyRoom).first()).toBeVisible({ timeout: 25_000 })

    if (await gangshin.isVisible().catch(() => false)) {
      await page.screenshot({ path: SHOT('2-gangshin'), fullPage: false })
      console.log('[PASS] 가족 신당 최초 진입 — 강신 의식 연출')
      await page.getByRole('button', { name: '연출 건너뛰기' }).click()
    }

    // 3) 가족 방 렌더 — 헤더 라벨 + 신당명, 主神 좌정(신당지기) 확인
    await expect(familyRoom).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/의 신당/).first()).toBeVisible()
    await page
      .waitForFunction(() => Array.from(document.images).every((im) => im.complete && im.naturalWidth > 0), {
        timeout: 10_000,
      })
      .catch(() => {})
    await page.screenshot({ path: SHOT('3-family-room'), fullPage: true })
    console.log('[PASS] 가족 신당 방 렌더 (가 족 신 당 헤더)')

    // 4) 가족 스코프 신위전 — 헤더 '신당테마' 버튼(구 '모아보기')이 member= 를 보존해야 한다
    //    (신위전은 그 화면의 한 탭이 되었다 — CEO 6차 지시 2026-07-30, 라벨 개명 8차)
    await page.getByRole('link', { name: '신당 꾸미기 · 테마 · 아이템 · 신위 · 신수' }).click()
    await expect(page).toHaveURL(/\/protected\/shrine\/collection\?tab=theme&member=/, { timeout: 15_000 })
    await page.getByRole('link', { name: '신위', exact: true }).click()
    await expect(page).toHaveURL(/\/protected\/shrine\/collection\?tab=deity&member=/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: '신위전(神位殿)' })).toBeVisible({ timeout: 15_000 })
    // 가족 신당에 主神이 좌정돼 있으므로 '主神 좌정중' 표시가 존재
    await expect(page.getByText('主神 좌정중').first()).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: SHOT('4-family-deities'), fullPage: false })
    console.log('[PASS] 가족 스코프 신위전 (member 파라미터 보존 + 主神 좌정중)')

    // 5) 뒤로가기 — 가족 신당으로 복귀
    await page.getByRole('link', { name: /신당으로/ }).click()
    await expect(page).toHaveURL(/\/protected\/shrine\?member=/, { timeout: 15_000 })
    console.log('[PASS] 신위전 → 가족 신당 복귀 링크')
  })
})
