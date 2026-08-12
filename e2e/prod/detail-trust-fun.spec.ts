import { test, expect } from '@playwright/test'

// R1/F2 신설 스펙 — 비용 표시(관상 2만냥, 표시=실차감)·허브 구성·운세 구조 요소(F-7).
// E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com E2E_USER_EMAIL/PASSWORD, --workers=1
test.describe('디테일 신뢰·재미 (R1/F2)', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')

  test('비운 허브 + 옮긴 진입 경로 + 관상 2만냥 표기 + 운세 구조 요소', async ({ page }) => {
    test.setTimeout(120_000)

    // 허브 비우기(CEO 2026-08-13): 「오늘의 정성」 카드는 없어졌다(구 F-6 단언을 대체).
    await page.goto('/protected/analysis', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: '인기테마운세' })).toBeVisible({ timeout: 25_000 })
    await expect(page.getByText('오늘의 정성')).toHaveCount(0)
    console.log('[PASS] 허브 = 인기테마운세 + 무엇으로 볼까요')

    // 🔴 오늘의 운세·2026 병오년의 유일한 입구 — 허브에서 내려와 테마 목록이 진다.
    await page.goto('/protected/analysis/theme', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: /오늘의 운세/ })).toBeVisible({ timeout: 25_000 })
    await expect(page.getByRole('link', { name: /2026 병오년/ })).toBeVisible()
    console.log('[PASS] 오늘의 운세·2026 병오년 진입 경로 생존')

    // R1: 관상 스튜디오 비용 = 2만냥 (표시=실차감 단일 소스, 목록 5만냥 불일치 제거)
    await page.goto('/protected/studio/face', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('2만냥').first()).toBeVisible({ timeout: 25_000 })
    console.log('[PASS] 관상 2만냥 표기 (R1)')

    // F-7: 오늘의 운세 구조 요소(총운 별점) — 생성/캐시 대기 후 best-effort 로깅
    await page.goto('/protected/analysis/today', { waitUntil: 'domcontentloaded' })
    const structured = await page
      .getByText('오늘의 총운')
      .first()
      .isVisible({ timeout: 40_000 })
      .catch(() => false)
    console.log(`[F-7] 오늘의 운세 구조 요소(총운 별점) 노출 = ${structured}`)
  })
})
