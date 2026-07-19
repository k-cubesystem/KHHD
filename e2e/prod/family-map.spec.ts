import { test, expect, type Page } from '@playwright/test'
import path from 'path'

// 우리 가족 기운 지도 (로드맵 13 잔여) — 배포 후 프로덕션 검증.
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `fammap-${n}.png`)

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
  await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/protected/, { timeout: 20_000 })
  const dlg = page.getByRole('dialog', { name: '오픈 이벤트' })
  await page.addLocatorHandler(dlg, async () => {
    await dlg.getByRole('button', { name: 'Close' }).click()
  })
}

test.describe('우리 가족 기운 지도', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } })

  test('가족 관리 → 지도 진입 + 오행·평균 렌더', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    await login(page)

    // 가족 관리 페이지의 입구
    await page.goto('/protected/family')
    const entry = page.getByRole('link', { name: /우리 가족 기운 지도/ })
    await expect(entry).toBeVisible({ timeout: 30_000 })
    console.log('[PASS] 가족 관리에 기운 지도 입구')

    await entry.click()
    await expect(page).toHaveURL(/\/protected\/family\/map/, { timeout: 20_000 })

    // 본인 1명뿐이면 빈 상태, 2명 이상이면 지도
    const emptyState = page.getByText('아직 견줄 기운이 없습니다')
    const mapHeading = page.getByRole('heading', { name: '우리 가족 기운 지도' })
    await expect(emptyState.or(mapHeading).first()).toBeVisible({ timeout: 30_000 })

    if (await emptyState.isVisible().catch(() => false)) {
      console.log('[PASS] 가족 0명 → 빈 상태 안내 (등록 유도)')
    } else {
      await expect(mapHeading).toBeVisible()
      await expect(page.getByText('가족 전체 균형')).toBeVisible()
      await expect(page.getByText('함께 채울 기운')).toBeVisible()
      await expect(page.getByText('구성원별 기운')).toBeVisible()
      console.log('[PASS] 지도 렌더 (전체 균형 + 구성원별)')

      // 오행 5종 라벨이 각 카드마다 — 최소 1세트는 보여야 한다
      for (const han of ['木', '火', '土', '金', '水']) {
        await expect(page.getByText(han, { exact: true }).first()).toBeVisible()
      }
      console.log('[PASS] 오행 5종 표기')

      // 신물 업셀 링크가 상점 아이템 탭으로
      const upsell = page.getByRole('link', { name: /기운 신물 보러가기/ })
      await expect(upsell).toBeVisible()
      expect(await upsell.getAttribute('href')).toContain('/protected/store?tab=items')
      console.log('[PASS] 용신 신물 업셀 → 상점 아이템 탭')
    }

    await page.screenshot({ path: SHOT('map'), fullPage: true })
    expect(errors, errors.join('\n')).toHaveLength(0)
  })
})
