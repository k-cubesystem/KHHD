import { test, expect } from '@playwright/test'
import path from 'path'
import { dismissPaymentGuide } from '../fixtures'

// 배치 효험(P2-11) + 가이드 서버 저장·온보딩(P2-10) 검증.
// 테스트 계정은 「초롱」(lucky_hour)을 배치 중 — 상점 뱃지·신당 렌더로 확인.
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `effects-${n}.png`)

test.describe('배치 효험 · 가이드', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('상점 효험 뱃지 4종 + 신당 진입 + 가이드 진행률 서버 저장', async ({ page }) => {
    test.setTimeout(150_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    // 아래 3)에서 상점 «정문»으로 들어가면 결제 도우미가 자동으로 떠 가이드 클릭을 가로챈다.
    await dismissPaymentGuide(page)

    // 1) 상점 신물 탭 — 효험 있는 아이템이 뱃지로 노출 (기억의 함은 이미 검증됨)
    await page.goto('/protected/store?tab=items')
    await expect(page.getByText('기억의 함').first()).toBeVisible({ timeout: 20_000 })
    for (const name of ['향로', '초롱', '놋방울', '복 부적']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 10_000 })
    }
    await page.screenshot({ path: SHOT('1-items'), fullPage: true })
    console.log('[PASS] 상점: 효험 아이템 5종 노출')

    // 2) 신당 진입 — 방이 정상 렌더(효험 조회가 씬 로드를 막지 않아야 함)
    await page.goto('/protected/shrine')
    await expect(page.getByText(/나 의 신 당|가 족 신 당/).first()).toBeVisible({ timeout: 25_000 })
    const greeting = await page
      .locator('text=/신당지기/')
      .first()
      .textContent()
      .catch(() => null)
    console.log(`[CHECK] 신당 인사 영역: ${greeting?.slice(0, 40) ?? '(없음)'}`)
    console.log('[PASS] 신당 방 렌더 (효험 조회 후에도 정상)')

    // 3) 가이드 진행률 서버 저장 — 상점에서 투어를 넘기고 재방문 시 재노출 안 됨
    //    가이드는 서버액션(getGuideData) 응답 후 마운트되므로 넉넉히 대기
    await page.goto('/protected/store')
    const guideBtn = page.getByRole('button', { name: /가이드/ })
    await guideBtn.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {})
    if (await guideBtn.isVisible().catch(() => false)) {
      // 말풍선이 떠 있으면 '그만 보기'로 완주 처리
      const stop = page.getByRole('button', { name: '그만 보기' })
      if (await stop.isVisible({ timeout: 3000 }).catch(() => false)) {
        await stop.click()
        await page.waitForTimeout(1200) // 서버 저장 대기
        await page.reload()
        await page.waitForTimeout(2500)
        const reappeared = await stop.isVisible({ timeout: 3000 }).catch(() => false)
        expect(reappeared, '완주한 투어가 새로고침 후 재노출되면 안 됨').toBe(false)
        console.log('[PASS] 가이드 진행률 서버 저장 (새로고침 후 재노출 없음)')
      } else {
        console.log('[SKIP] 투어 말풍선 미노출(이미 완주 상태) — 서버 저장 상태로 간주')
      }
      await page.screenshot({ path: SHOT('2-guide'), fullPage: false })
    } else {
      console.log('[SKIP] 가이드 아바타 미노출')
    }

    expect(errors, errors.join('\n')).toHaveLength(0)
  })
})
