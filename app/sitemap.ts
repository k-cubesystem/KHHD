import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/utils/site-url'
import { ILGAN_SLUGS } from '@/lib/domain/saju/ilgan'
import { GUIDE_SLUGS } from '@/lib/content/guide'
import { createAdminClient } from '@/lib/supabase/admin'

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
  // 구 정적 예고편(/webtoon.html)은 /webtoon/0 으로 301 — 사이트맵은 새 주소만 싣는다
  { path: '/webtoon', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/business', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
]

/**
 * 공개(무료·게시) 회차 번호 — 실패하면 빈 배열(사이트맵 생성 자체를 막지 않는다).
 * ⚠️ 빌드 환경에는 Supabase 키가 없을 수 있다 — 그래서 예외를 삼키고, 런타임 재생성 때 채워진다.
 */
async function freeEpisodeNos(): Promise<number[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('webtoon_episodes')
      .select('no, access, published_at')
      .eq('access', 'free')
      .not('published_at', 'is', null)
      .order('no', { ascending: true })
    return (data ?? []).map((r) => Number(r.no)).filter((n) => Number.isInteger(n) && n >= 0)
  } catch {
    return []
  }
}

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // 웹툰 무료 회차 — 비로그인 본문. 검색 유입의 새 문(2026-09-08 공개 전환).
  const webtoon = (await freeEpisodeNos()).map((no) => ({
    url: `${baseUrl}/webtoon/${no}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...routes, ...guide, ...ilgan, ...webtoon]
}
