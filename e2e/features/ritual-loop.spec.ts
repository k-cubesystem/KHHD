import { test, expect } from '../fixtures'

/**
 * 초하루 의례 루프 스모크.
 * 창(음력 1~3일) 안팎에 따라 화면이 갈리므로 두 상태 모두 유효한 상태로 검증한다:
 *  - 창 안·미완주: 서간(문안) 화면
 *  - 창 밖 또는 완주: 치부책(복 장부) 화면 + D-day/완료 배지
 */
test.describe('초하루 의례', () => {
  test('의례 페이지가 유효한 상태로 렌더된다', async ({ page }) => {
    await page.goto('/protected/ritual')

    const letterHeading = page.getByRole('heading', { name: /초하루 문안$/ })
    const ledgerHeading = page.getByRole('heading', { name: '우리 집 복 장부' })

    await expect(letterHeading.or(ledgerHeading)).toBeVisible({ timeout: 20_000 })

    if (await ledgerHeading.isVisible()) {
      // 창 밖: D-day 또는 완료 배지 중 하나는 있어야 한다
      const dday = page.getByText(/D-\d+/)
      const doneBadge = page.getByText('✓ 문안 완료')
      const emptyLedger = page.getByText('아직 장부가 비어 있습니다')
      await expect(dday.or(doneBadge).or(emptyLedger).first()).toBeVisible()
    } else {
      // 창 안: 기원 CTA 로 진행 가능
      await expect(page.getByRole('button', { name: '신당에 기원 올리기 →' })).toBeVisible()
    }
  })

  test('대시보드에 초하루 배너/D-day 가 노출된다', async ({ page }) => {
    await page.goto('/protected/analysis')
    const inWindowBanner = page.getByText(/문안이 도착했어요/)
    const dday = page.getByText('다음 초하루 문안까지')
    await expect(inWindowBanner.or(dday).first()).toBeVisible({ timeout: 20_000 })
  })
})
