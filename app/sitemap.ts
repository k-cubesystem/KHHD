import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/utils/site-url'

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

interface PublicRoute {
  path: string
  priority: number
  changeFrequency: ChangeFrequency
}

/** 로그인 없이 열리는 페이지만 등재한다 — /protected/* 는 미들웨어가 /auth/login 으로 돌리므로 크롤러에게 무의미. */
const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/story', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/webtoon.html', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/business', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/auth/login', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/auth/sign-up', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl()
  const lastModified = new Date()

  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
