import { MetadataRoute } from 'next'
import { TYPE_SLUGS } from '@/lib/domain/saju/saju3'

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

  // 「3초 사주」 공개 페이지 + 유형별 공유 랜딩 10장 — 색인 대상
  const saju3 = ['/saju3', ...TYPE_SLUGS.map((s) => `/saju3/${s}`)].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '/saju3' ? 0.9 : 0.7,
  }))

  return [...routes, ...saju3]
}
