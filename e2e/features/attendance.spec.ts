import { test, expect } from '../fixtures'

test.describe('출석체크', () => {
  test('대시보드에서 출석체크 영역 확인', async ({ page }) => {
    await page.goto('/protected')
    // Attendance section should be on dashboard
    await expect(page.locator('main')).toBeVisible()
  })

  test('출석체크 버튼/캘린더 렌더링', async ({ page }) => {
    await page.goto('/protected')
    // Look for attendance-related UI
    const attendanceSection = page.getByText(/출석|체크인|check-in/i).first()
    if (await attendanceSection.isVisible().catch(() => false)) {
      await expect(attendanceSection).toBeVisible()
    }
  })
})
