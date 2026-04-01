'use server'

import { cookies } from 'next/headers'
import { type Locale, locales, defaultLocale } from './request'

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) return
  const cookieStore = await cookies()
  cookieStore.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('locale')?.value
  return raw === 'en' ? 'en' : defaultLocale
}
