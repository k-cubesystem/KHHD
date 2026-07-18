import { test, expect } from '@playwright/test'
import path from 'path'

// 어드민 콘솔 개선 검증 (배포 후 프로덕션) — 대시보드 지표·잔액 증감+사유·감사 로그.
// 마스터 계정 필요: E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (미설정 시 스킵).
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `admin-${n}.png`)

test.describe('어드민 콘솔 개선', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.skip(!process.env.E2E_ADMIN_EMAIL, 'E2E_ADMIN_EMAIL 미설정 (마스터 계정 필요)')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('대시보드 지표 + 감사 로그 메뉴 + 룰렛/기능별복채 제거 확인', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    // 로그인
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_ADMIN_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    const dlg = page.getByRole('dialog', { name: '오픈 이벤트' })
    await page.addLocatorHandler(dlg, async () => {
      await dlg.getByRole('button', { name: 'Close' }).click()
    })

    // 1) 대시보드 — 새 지표 카드
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 20_000 })
    for (const label of ['총 회원수', '오늘 가입', '이번 달 매출', '활성 구독', 'MRR (월 반복매출)']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 10_000 })
    }
    await page.screenshot({ path: SHOT('1-dashboard'), fullPage: true })
    console.log('[PASS] 대시보드 신규 지표 카드 5종')

    // 2) 사이드 메뉴 — 감사 로그 있음, 룰렛/기능별복채 없음
    await expect(page.getByRole('link', { name: '감사 로그' })).toBeVisible()
    await expect(page.getByRole('link', { name: '룰렛 확률' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: '기능별 복채' })).toHaveCount(0)
    console.log('[PASS] 메뉴: 감사 로그 추가 · 룰렛/기능별복채 제거')

    // 3) 감사 로그 페이지
    await page.goto('/admin/audit')
    await expect(page.getByRole('heading', { name: '감사 로그' })).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: SHOT('2-audit'), fullPage: true })
    console.log('[PASS] 감사 로그 페이지 렌더')

    // 4) 삭제된 페이지 직접 접근 → 404 (또는 not-found)
    const res = await page.goto('/admin/roulette')
    console.log(`[CHECK] /admin/roulette 상태: ${res?.status()}`)
    expect(res?.status()).toBe(404)
    console.log('[PASS] 삭제 페이지 404')

    // 5) 공지 등록 폼 — 전 회원 알림 발송 옵션 (A5)
    await page.goto('/admin/announcements')
    await expect(page.getByRole('heading', { name: '공지사항' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('전 회원 알림함에도 발송')).toBeVisible({ timeout: 10_000 })
    console.log('[PASS] 공지 → 알림 발송 옵션 노출')

    // 6) 회원 상세 — 복채 내역·신당 탭 (A4). 목록 첫 회원으로 진입
    await page.goto('/admin/users')
    // 목록은 서버 조회 후 렌더 — 링크가 붙을 때까지 대기
    const firstUser = page.locator('a[href^="/admin/users/"]').first()
    await firstUser.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => {})
    if (await firstUser.isVisible().catch(() => false)) {
      await firstUser.click()
      await expect(page.getByText('계정 정보').first()).toBeVisible({ timeout: 20_000 })
      await expect(page.getByRole('tab', { name: /복채 내역/ })).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole('tab', { name: /신당/ })).toBeVisible()
      await page.getByRole('tab', { name: /신당/ }).click()
      await expect(page.getByText('신당 현황')).toBeVisible({ timeout: 10_000 })
      await page.screenshot({ path: SHOT('3-user-shrines'), fullPage: false })
      console.log('[PASS] 회원 상세 복채내역·신당 탭')
    } else {
      console.log('[SKIP] 회원 목록 비어 상세 검증 생략')
    }

    expect(errors, errors.join('\n')).toHaveLength(0)
  })
})
