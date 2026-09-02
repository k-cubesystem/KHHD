import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/utils/site-url'
import { ILGAN_SLUGS } from '@/lib/domain/saju/ilgan'
import { GUIDE_SLUGS } from '@/lib/content/guide'

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

interface PublicRoute {
  path: string
  priority: number
  changeFrequency: ChangeFrequency
}

/**
 * 로그인 없이 열리고 «읽을 것이 있는» 페이지만 등재한다.
 * · /protected/* 는 미들웨어가 /auth/login 으로 돌리므로 크롤러에게 무의미.
 * · /auth/login·sign-up 은 폼뿐인 화면이라 뺐다(2026-09-02 애드센스 «콘텐츠 부족» 반려 대응 —
 *   사이트맵에 얇은 페이지를 올리면 «읽을 것 없는 페이지»로 집계된다).
 */
const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/guide', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/story', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/webtoon.html', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/business', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl()
  const lastModified = new Date()

  const routes = PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }))

  // 명리 가이드 32편 — 로그인 없이 읽는 본문. 색인의 주력.
  const guide = GUIDE_SLUGS.map((slug) => ({
    url: `${baseUrl}/guide/${slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // 「3초 일간」 공개 페이지 + 일간별 공유 랜딩 10장 — 색인 대상(「경금 일간」 검색 유입)
  const ilgan = ['/ilgan', ...ILGAN_SLUGS.map((s) => `/ilgan/${s}`)].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: route === '/ilgan' ? 0.9 : 0.7,
  }))

  return [...routes, ...guide, ...ilgan]
}
