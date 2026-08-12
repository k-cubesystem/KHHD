import { test, expect } from '@playwright/test'

// 분석 기록 신뢰성(Part B): 히스토리 상세가 raw JSON 덤프가 아닌 전용 뷰로 렌더되고,
// 재분석/공유 버튼이 노출되는지 (배포 후 프로덕션). 기존 TODAY 기록으로 검증 — 분석 실행 불필요.
test.describe('분석 기록 상세 · 재조회 품질', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('히스토리 상세: JSON 덤프 부재 + 재분석/공유 버튼', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    // 로그인
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    // 히스토리 목록
    await page.goto('/protected/history')
    await expect(page.getByRole('heading', { name: '운명 아카이브' })).toBeVisible({ timeout: 25_000 })

    // 기록 카드(제목 "…님의 … 분석") 클릭 → 상세 모달
    const cardHeading = page.getByRole('heading', { name: /님의 .*분석$/ }).first()
    await expect(cardHeading).toBeVisible({ timeout: 15_000 })
    await cardHeading.click()

    await expect(page.getByRole('heading', { name: '분석 상세' })).toBeVisible({ timeout: 10_000 })
    console.log('[PASS] 히스토리 상세 모달 오픈')

    // R1: raw JSON 덤프가 아니어야 한다 — 구 "분석 결과 원본" 헤딩·<pre> 원문 부재
    await expect(page.getByText('분석 결과 원본')).toHaveCount(0)
    await expect(page.locator('pre')).toHaveCount(0)
    // 전용 뷰가 실제 섹션을 렌더(내용 없음 방지)
    await expect(page.getByText(/분석 내용|요약|타고난 성격|관상 요약|궁합 요약|현재 운기/).first()).toBeVisible({
      timeout: 10_000,
    })
    console.log('[PASS] 전용 뷰 렌더 (raw JSON 덤프 제거)')

    // R2: 재분석 버튼(실존 라우트 — 단위 테스트가 404 방지 보증)
    await expect(page.getByRole('button', { name: '재분석하기' })).toBeVisible()
    // 공유 버튼 노출
    await expect(page.getByRole('button', { name: /공유/ })).toBeVisible()
    console.log('[PASS] 재분석·공유 버튼 노출')

    expect(errors, errors.join('\n')).toHaveLength(0)
  })
})
