import { MetadataRoute } from 'next'

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

  return routes
}
