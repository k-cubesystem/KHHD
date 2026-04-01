import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['ko', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'ko'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('locale')?.value
  const locale: Locale = raw === 'en' ? 'en' : 'ko'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
