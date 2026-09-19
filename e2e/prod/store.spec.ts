import { test, expect } from '@playwright/test'
import path from 'path'

// 통합 상점 스모크 (배포 후 프로덕션, 매일 CI).
// E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com E2E_USER_EMAIL/PASSWORD
//
// 🔴 이 스펙은 매일 프로덕션에서 돈다 — 실구매 경로에 들어가지 않는다.
//    주문 확인 화면까지만 가서 «동의 전에는 결제 버튼이 잠겨 있다»를 보고 멈춘다. 체크·결제 버튼을 누르지 않는다.
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `store-${n}.png`)

const PASS_PACKS = ['이용권 1장', '이용권 5장', '이용권 10장']

test.describe('통합 상점', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('프로필 상점 연동 → 4탭 → 이용권 3종·주문 확인 동의 게이트 → 테마 → 신물 → 멤버십 → 지난 대화', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    // 로그인
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    // 1) 프로필 — 바로가기에 상점 있고 멤버십 없음
    await page.goto('/protected/profile')
    const shortcutStore = page.getByRole('link', { name: '상점' }).first()
    await expect(shortcutStore).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: '멤버십', exact: true })).toHaveCount(0)
    await page.screenshot({ path: SHOT('1-profile'), fullPage: false })
    console.log('[PASS] 프로필: 상점 바로가기 + 멤버십 버튼 제거')

    // 2) 상점 — 4탭 렌더 (기본: 이용권)
    await shortcutStore.click()
    await expect(page).toHaveURL(/\/protected\/store/, { timeout: 15_000 })
    // 정문 첫 진입엔 결제 도우미가 한 번 자동으로 뜬다 — 닫고 간다(열린 채면 뒤의 버튼이 눌리지 않는다).
    const guide = page.getByRole('dialog', { name: '결제 도우미' })
    const guideOpened = await guide
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
    if (guideOpened) {
      await page.keyboard.press('Escape')
      await expect(guide).toBeHidden()
      console.log('[PASS] 결제 도우미 자동 열림 → 닫힘')
    }
    for (const label of ['이용권', '멤버십', '신당 테마', '신물']) {
      await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible({ timeout: 15_000 })
    }
    await expect(page.getByRole('link', { name: '이용권', exact: true })).toHaveAttribute('aria-current', 'page')
    console.log('[PASS] 상점 4탭 렌더 · 기본 탭 = 이용권')

    // 3) 이용권 탭 — 팩 3종 + 유효기간 표기
    for (const name of PASS_PACKS) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({ timeout: 15_000 })
    }
    await expect(page.getByText(/유효기간 결제일로부터 \d+일/).first()).toBeVisible()
    await page.screenshot({ path: SHOT('2-passes'), fullPage: true })
    console.log('[PASS] 이용권 팩 3종 노출')

    // 4) 주문 확인 — 동의 전에는 결제 버튼이 잠겨 있다 (여기서 멈춘다: 체크·결제 금지)
    await page.getByRole('button', { name: /이용권 1장 구매하기/ }).click()
    await expect(page).toHaveURL(/\/protected\/store\/checkout\?pack=/, { timeout: 15_000 })
    await expect(page.getByText('주문 확인')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('구매조건을 확인했으며 결제진행에 동의합니다')).toBeVisible()
    await expect(page.getByRole('checkbox')).not.toBeChecked()
    await expect(page.getByRole('button', { name: /원 결제하기/ })).toBeDisabled()
    await page.screenshot({ path: SHOT('3-checkout'), fullPage: true })
    console.log('[PASS] 주문 확인 — 동의 전 결제 버튼 잠김')

    // 5) 옛 복채 탭 링크 → 이용권 탭으로 받는다
    await page.goto('/protected/store?tab=bokchae')
    await expect(page.getByRole('link', { name: '이용권', exact: true })).toHaveAttribute('aria-current', 'page', {
      timeout: 15_000,
    })
    console.log('[PASS] 옛 ?tab=bokchae → 이용권 탭')

    // 6) 신당 테마 탭 — 8종 카드 (테마는 등급으로 열린다 — 적용 버튼은 누르지 않는다)
    await page.getByRole('link', { name: '신당 테마', exact: true }).click()
    await expect(page).toHaveURL(/tab=theme/)
    // 카드 설명문에도 테마 이름이 나온다(«…조선 반가의 안채…») — 이름표만 정확히 집는다.
    await expect(page.getByText('설빛 서고', { exact: true })).toBeVisible({ timeout: 15_000 })
    for (const name of ['초가 신당', '조선 반가', '용궁', '도깨비 불', '달집 마당', '홍살문 안뜰', '별밭 천문각']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
    }
    await page.screenshot({ path: SHOT('4-themes'), fullPage: true })
    console.log('[PASS] 테마 8종 노출')

    // 7) 신물 탭 — 기억의 함 + 배치 효험 뱃지
    await page.getByRole('link', { name: '신물', exact: true }).click()
    await expect(page).toHaveURL(/tab=items/)
    await expect(page.getByText('기억의 함').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/배치 효험: 대화 보존 \+90일/).first()).toBeVisible()
    await page.screenshot({ path: SHOT('5-items'), fullPage: false })
    console.log('[PASS] 기억의 함 + 배치 효험 뱃지')

    // 8) 멤버십 탭 — 플랜 노출
    await page.getByRole('link', { name: '멤버십', exact: true }).click()
    await expect(page).toHaveURL(/tab=membership/)
    await expect(page.getByText(/멤버십/).first()).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: SHOT('6-membership'), fullPage: false })
    console.log('[PASS] 멤버십 탭 렌더')

    // 9) 구 링크 리다이렉트 — /protected/membership → 상점 멤버십 탭
    await page.goto('/protected/membership')
    await expect(page).toHaveURL(/\/protected\/store\?tab=membership/, { timeout: 15_000 })
    console.log('[PASS] 멤버십 구 링크 → 상점 리다이렉트')

    // 10) 속풀이 — 지난 대화 패널
    await page.goto('/protected/ai-shaman')
    // 지난 대화는 헤더의 더보기 시트 안에 있다(속풀이 개편 때 관리 UI 를 시트로 내렸다).
    await page.getByRole('button', { name: '대화 설정 열기' }).click({ timeout: 20_000 })
    const historyBtn = page.getByRole('button', { name: '지난 대화 열람' })
    await expect(historyBtn).toBeVisible({ timeout: 20_000 })
    await historyBtn.click()
    await expect(page.getByRole('dialog', { name: '지난 대화' })).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: SHOT('7-history'), fullPage: false })
    console.log('[PASS] 지난 대화 패널')

    expect(errors, errors.join('\n')).toHaveLength(0)
  })
})
