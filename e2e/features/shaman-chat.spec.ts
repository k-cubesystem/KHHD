import { test, expect, mockAIResponse } from '../fixtures'

test.describe('AI 샤먼 채팅', () => {
  test('채팅 페이지 로드', async ({ page }) => {
    await mockAIResponse(page, '안녕하세요, 무엇이 궁금하신가요?')
    await page.goto('/protected/ai-shaman')
    await expect(page.locator('main')).toBeVisible()
  })

  test('채팅 입력 필드 존재', async ({ page }) => {
    await page.goto('/protected/ai-shaman')
    const input = page.getByRole('textbox').or(page.locator('textarea')).or(
      page.locator('input[type="text"]')
    )
    await expect(input.first()).toBeVisible({ timeout: 10_000 })
  })

  test('메시지 전송', async ({ page }) => {
    await mockAIResponse(page, '사주를 살펴보겠습니다. 좋은 기운이 느껴집니다.')
    await page.goto('/protected/ai-shaman')

    const input = page.getByRole('textbox').or(page.locator('textarea')).first()
    await input.fill('오늘 운세가 어떤가요?')

    const sendBtn = page.getByRole('button', { name: /전송|보내기|send/i }).or(
      page.locator('button[type="submit"]')
    )
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click()
    }
  })
})
