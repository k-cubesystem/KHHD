import { test as base, expect, type Page } from '@playwright/test'
import path from 'path'

type Fixtures = {
  authenticatedPage: Page
  adminPage: Page
}

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, '..', '.auth', 'user.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, '..', '.auth', 'admin.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect }

/**
 * 결제 도우미(PaymentGuide) 자동 열림을 무해화한다.
 *
 * 상점 «정문»(탭 파라미터 없는 /protected/store)에 처음 들어가면 안내 모달이 250ms 뒤 뜬다
 * (components/store/PaymentGuide.tsx — localStorage 'hhd:payment-guide-seen' 로 1회만).
 * 새 브라우저 컨텍스트는 그 기록이 없으므로 매번 열려 클릭을 가로챈다.
 *
 * addLocatorHandler 라 «언제 뜨든» 알아서 닫힌다 — 호출 순서에 민감하지 않다.
 * 상점 정문을 밟는 스펙에서 로그인 직후 한 번 불러두면 된다.
 */
export async function dismissPaymentGuide(page: Page): Promise<void> {
  const guide = page.getByRole('dialog', { name: '결제 도우미' })
  await page.addLocatorHandler(guide, async () => {
    await guide
      .getByRole('button', { name: 'Close' })
      .click()
      .catch(() => {})
  })
}

/**
 * Mock AI API responses by intercepting fetch calls to Gemini API
 */
export async function mockAIResponse(page: Page, response: string) {
  await page.route('**/generativelanguage.googleapis.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: response }],
            },
          },
        ],
      }),
    })
  })
}

/**
 * Mock image upload responses
 */
export async function mockImageUpload(page: Page) {
  await page.route('**/storage/v1/object/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ Key: 'test/mock-image.jpg' }),
    })
  })
}
