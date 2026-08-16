import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/utils/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/protected/'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
