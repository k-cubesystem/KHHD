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
