import { test, expect } from '@playwright/test'
import path from 'path'

// 통합 상점 + 테마 8종 + 기억의 함 + 지난 대화 검증 (배포 후 프로덕션).
// E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com E2E_USER_EMAIL/PASSWORD
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `store-${n}.png`)

test.describe('통합 상점', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('프로필 상점 연동 → 4탭 → 테마 8종 구매 → 기억의 함 → 지난 대화', async ({ page }) => {
    test.setTimeout(150_000)

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

    // 2) 상점 — 4탭 렌더 (기본: 복채 충전)
    await shortcutStore.click()
    await expect(page).toHaveURL(/\/protected\/store/, { timeout: 15_000 })
    for (const label of ['복채 충전', '멤버십', '신당 테마', '신물']) {
      await expect(page.getByRole('link', { name: label })).toBeVisible({ timeout: 15_000 })
    }
    console.log('[PASS] 상점 4탭 렌더')

    // 3) 신당 테마 탭 — 8종 카드
    await page.getByRole('link', { name: '신당 테마' }).click()
    await expect(page).toHaveURL(/tab=theme/)
    await expect(page.getByText('설빛 서고')).toBeVisible({ timeout: 15_000 })
    for (const name of ['초가 신당', '조선 반가', '용궁', '도깨비 불', '달집 마당', '홍살문 안뜰', '별밭 천문각']) {
      await expect(page.getByText(name)).toBeVisible()
    }
    await page.screenshot({ path: SHOT('2-themes'), fullPage: true })
    console.log('[PASS] 테마 8종 노출')

    // 4) 테마 구매 (설빛 서고 1복채) — 재실행 시 이미 보유
    const seolbitCard = page.locator('div.rounded-xl', { hasText: '설빛 서고' }).first()
    const buyBtn = seolbitCard.getByRole('button', { name: /봉헌/ })
    const ownedLink = seolbitCard.getByRole('link', { name: /보유중|기본 제공/ })
    if (await buyBtn.isVisible().catch(() => false)) {
      await buyBtn.click()
      await expect(page.getByText('봉헌 완료').first()).toBeVisible({ timeout: 15_000 })
      await expect(ownedLink).toBeVisible({ timeout: 10_000 })
      console.log('[PASS] 테마 구매(복채) → 보유 전환')
    } else {
      await expect(ownedLink).toBeVisible()
      console.log('[PASS] 테마 이미 보유 (재실행 멱등)')
    }

    // 5) 신물 탭 — 기억의 함 + 배치 효험 뱃지
    await page.getByRole('link', { name: '신물' }).click()
    await expect(page).toHaveURL(/tab=items/)
    await expect(page.getByText('기억의 함').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/배치 효험: 대화 보존 \+90일/).first()).toBeVisible()
    await page.screenshot({ path: SHOT('3-items'), fullPage: false })
    console.log('[PASS] 기억의 함 + 배치 효험 뱃지')

    // 6) 멤버십 탭 — 플랜 노출
    await page.getByRole('link', { name: '멤버십' }).click()
    await expect(page).toHaveURL(/tab=membership/)
    await expect(page.getByText(/멤버십/).first()).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: SHOT('4-membership'), fullPage: false })
    console.log('[PASS] 멤버십 탭 렌더')

    // 7) 구 링크 리다이렉트 — /protected/membership → 상점 멤버십 탭
    await page.goto('/protected/membership')
    await expect(page).toHaveURL(/\/protected\/store\?tab=membership/, { timeout: 15_000 })
    console.log('[PASS] 멤버십 구 링크 → 상점 리다이렉트')

    // 7.5) 테스트 충전 (admin/tester 전용) — wallets 원자 RPC 경로 검증 (테스트 계정 role=tester)
    await page.goto('/protected/store?tab=bokchae')
    const testChargeBtn = page.getByRole('button', { name: /TEST: 복채 10만냥 무료 충전/ })
    if (await testChargeBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await testChargeBtn.click()
      await expect(page.getByText('테스트 복채 10만냥 충전 완료!').first()).toBeVisible({ timeout: 15_000 })
      console.log('[PASS] 테스트 충전 (add_wallet_balance RPC) 성공')
    } else {
      console.log('[SKIP] 테스트 충전 버튼 미노출 (tester 권한 아님)')
    }

    // 8) 고민상담 — 지난 대화 패널
    await page.goto('/protected/ai-shaman')
    const historyBtn = page.getByRole('button', { name: '지난 대화 열람' })
    await expect(historyBtn).toBeVisible({ timeout: 20_000 })
    await historyBtn.click()
    await expect(page.getByRole('dialog', { name: '지난 대화' })).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: SHOT('5-history'), fullPage: false })
    console.log('[PASS] 지난 대화 패널')
  })
})
