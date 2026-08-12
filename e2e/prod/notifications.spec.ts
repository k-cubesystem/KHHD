import { test, expect } from '@playwright/test'
import path from 'path'

// 알림 센터 + 신규 테마 이미지 검증 (배포 후 프로덕션).
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `notif-${n}.png`)

test.describe('알림 센터 · 테마 이미지', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('프로필 알림 링크 → 센터 렌더 + 신규 테마 room.webp 200', async ({ page, request }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

    // 신규 테마 이미지가 실제로 서빙되는지 (그라디언트 폴백 탈출 확인)
    for (const code of ['seolbit', 'daljip', 'hongsal', 'byeolbat']) {
      const res = await request.get(`/shrine/themes/${code}/room.webp`)
      expect(res.status(), `${code} room.webp`).toBe(200)
    }
    console.log('[PASS] 신규 테마 방 이미지 4종 서빙(200)')

    // 로그인
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    // 프로필 → 언어 전환 배선 확인 (P3-14 — 이전엔 어디서도 렌더되지 않았음)
    await page.goto('/protected/profile')
    await expect(page.getByText('언어 / Language')).toBeVisible({ timeout: 25_000 })
    await expect(page.getByRole('button', { name: /Switch to English|한국어로 전환/ })).toBeVisible()
    console.log('[PASS] 언어 전환 UI 배선 (프로필 설정)')

    // 프로필 → 알림 링크가 404가 아닌 실제 센터로
    await page.getByRole('link', { name: '알림' }).first().click()
    await expect(page).toHaveURL(/\/protected\/notifications/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: '알림' })).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: SHOT('1-center'), fullPage: false })
    console.log('[PASS] 알림 센터 렌더 (구 404 링크 수복)')

    // 상점 신물 탭에서 기억의 함이 여전히 노출(업셀 도착지)
    await page.goto('/protected/store?tab=items')
    await expect(page.getByText('기억의 함').first()).toBeVisible({ timeout: 15_000 })
    console.log('[PASS] 업셀 도착지(기억의 함) 정상')

    expect(errors, errors.join('\n')).toHaveLength(0)
  })
})
