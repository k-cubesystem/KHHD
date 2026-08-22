import { test, expect, type Page } from '@playwright/test'
import path from 'path'

// 디테일 v2 (세션29) 신설 스펙 — 가족관리·지식가이드·명식개편 prod 검증.
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `detailv2-${n}.png`)

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
  await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/protected/, { timeout: 20_000 })
}

test.describe('디테일 v2 — 가족·지식·명식', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } })

  test('V1: 프로필 "가족·인연 관리" 라벨 + 가족 목록 클린 렌더', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    await login(page)

    await page.goto('/protected/profile')
    await expect(page.getByText('가족·인연 관리')).toBeVisible({ timeout: 30_000 })
    console.log('[PASS] V1 프로필 라벨 "가족·인연 관리"')

    await page.goto('/protected/family')
    await expect(page.getByRole('heading', { name: '가족 관리' })).toBeVisible({ timeout: 30_000 })
    // 본인 레코드는 카드로 뜨지 않는다(숨김) — '내 계정' 배지 관계칩이 목록에 없어야
    await expect(page.getByText('본인', { exact: true })).toHaveCount(0)
    console.log('[PASS] V1 가족 목록에 본인 카드 숨김')
    await page.screenshot({ path: SHOT('family') })

    expect(errors).toEqual([])
  })

  test('V2: 하단 바는 없고, 투어 없는 페이지에서도 상단 종은 선다', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    await login(page)

    // 🔴 2026-08-24 CEO 지시로 하단 상시 바를 내렸고, 안내는 상단 바의 종으로 옮겼다.
    //    그래서 두 가지를 함께 본다 — 하단 바는 «부재», 상단 종은 «존재».
    //    /protected/notifications 는 투어 정의가 없는 경로다(지식 팁만 남는 자리).
    await page.goto('/protected/notifications')
    await expect(page.locator('[data-guide-bar]')).toHaveCount(0)
    const bell = page.getByRole('button', { name: /안내 펼치기$/ })
    await expect(bell).toBeVisible({ timeout: 30_000 })
    console.log('[PASS] 하단 바 부재 + 투어 없는 페이지에서도 상단 종 유지')
    await page.screenshot({ path: SHOT('guide') })

    expect(errors).toEqual([])
  })

  test('V4: 내 명식 페이지 클린 렌더(콘솔 0)', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`[console] ${m.text()}`)
    })

    await login(page)

    await page.goto('/protected/profile/manse')
    // 나의 사주 탭은 로그인 즉시 렌더 — 용어 사전은 항상 존재하는 안정 앵커
    await expect(page.getByRole('heading', { name: '사주 용어 사전' })).toBeVisible({ timeout: 30_000 })
    console.log('[PASS] V4 명식 나의사주 탭 렌더')
    await page.screenshot({ path: SHOT('manse') })

    // 애니메이션/이미지 로드 경합 후 콘솔 에러 없음 확인
    await page.waitForTimeout(1500)
    expect(errors).toEqual([])
  })
})
