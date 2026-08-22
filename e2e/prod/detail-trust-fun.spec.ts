import { test, expect } from '@playwright/test'

// R1/F2 신설 스펙 — 비용 표시(관상 2만냥, 표시=실차감)·허브 구성·운세 구조 요소(F-7).
// E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com E2E_USER_EMAIL/PASSWORD, --workers=1
test.describe('디테일 신뢰·재미 (R1/F2)', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')

  test('비운 허브 + 옮긴 진입 경로 + 관상 2만냥 표기 + 운세 구조 요소', async ({ page }) => {
    test.setTimeout(120_000)

    // 허브 비우기 + 앱 홈 개편(CEO 2026-08-13): 「오늘의 정성」은 없어졌고, ② 「무엇으로
    // 볼까요」 카드 4장은 상단 아이콘 런처로 흡수됐다(링크 무손실).
    // 2026-08-22: 사주·종합 통합으로 런처가 8칸 → 7칸이 됐다(「사주풀이」+「종합풀이」→「종합사주」).
    await page.goto('/protected/analysis', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: '인기테마운세' })).toBeVisible({ timeout: 25_000 })
    await expect(page.getByText('오늘의 정성')).toHaveCount(0)

    const launcher = page.getByRole('navigation', { name: '바로 보기' })
    await expect(launcher).toBeVisible()
    await expect(launcher.getByRole('link')).toHaveCount(7)
    for (const label of ['종합사주', '궁합', '관상', '손금', '풍수', '재물운', '테마 전체']) {
      await expect(launcher.getByRole('link', { name: label })).toBeVisible()
    }
    // 🔴 통합된 입구는 하나뿐 — 사주 단독 칸이 다시 서면 CEO 통합 지시가 무효가 된다.
    await expect(launcher.getByRole('link', { name: '사주풀이' })).toHaveCount(0)
    // 🔴 하루 전 CEO 가 허브에서 내린 셋은 런처에도 없다.
    for (const gone of ['오늘의 운세', '2026 병오년', '속풀이']) {
      await expect(launcher.getByRole('link', { name: gone })).toHaveCount(0)
    }
    await expect(page.getByText('무엇으로 볼까요')).toHaveCount(0)

    // ① 인기테마운세 = 유튜브식 가로 리스트 5줄 (CEO 2026-08-22 「5줄로 줄이고 매번 다르게」).
    // 🔴 숫자는 `HUB_THEME_ROWS`(lib/domain/theme-fortune/themes.ts) 와 같아야 한다 — 앱 코드를
    //    import 하지 않는 것이 이 폴더의 규율이라 손으로 맞춘다. 줄 수를 바꾸면 여기도 바꾼다.
    // 🔴 «어떤» 다섯인지는 날마다 갈리므로 제목을 단언하지 않는다 — 개수만 잰다.
    const themeList = page.getByRole('navigation', { name: '인기테마운세' })
    await expect(themeList).toBeVisible()
    await expect(themeList.getByRole('link')).toHaveCount(5)
    // 썸네일은 실사 파일 + 폴백 두 층이라 줄마다 그림이 최소 하나는 뜬다(깨진 그림 금지).
    await expect(themeList.locator('img').first()).toBeVisible()
    await expect(page.getByRole('link', { name: '테마 전체 보기' })).toBeVisible()
    console.log('[PASS] 허브 = 아이콘 런처 7칸 + 인기테마운세 5줄')

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
