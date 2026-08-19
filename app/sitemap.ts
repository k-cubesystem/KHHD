import { MetadataRoute } from 'next'
import { ILGAN_SLUGS } from '@/lib/domain/saju/ilgan'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://haehwadang.com'

  // Static routes
  const routes = [
    '',
    '/auth/login',
    '/auth/register',
    '/protected',
    '/protected/analysis',
    '/protected/membership',
    '/protected/profile',
    '/protected/saju/manse',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // 「3초 일간」 공개 페이지 + 일간별 공유 랜딩 10장 — 색인 대상(「경금 일간」 검색 유입)
  const ilgan = ['/ilgan', ...ILGAN_SLUGS.map((s) => `/ilgan/${s}`)].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '/ilgan' ? 0.9 : 0.7,
  }))

  return [...routes, ...ilgan]
}
