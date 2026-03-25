import type { NextConfig } from 'next'

import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // 🚀 BOOSTER: Next.js Image 최적화 설정
  images: {
    // WebP → AVIF 순서로 최신 포맷 우선 제공 (파일 크기 30~50% 절감)
    formats: ['image/avif', 'image/webp'],
    // Supabase Storage 외부 이미지 허용 (관상/손금 업로드 이미지 등)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Vercel Hobby Plan 무료 이미지 최적화 한도(5000/월) 내에서 최대 효율
    minimumCacheTTL: 2678400, // 31일 캐시 (재요청 최소화)
  },

  // 정적 자산 캐싱 최적화
  async rewrites() {
    return []
  },

  // Security headers
  async headers() {
    return [
      // 🚀 BOOSTER: 정적 자산 장기 캐시 (재방문 시 0ms 로드)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2678400, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://js.tosspayments.com https://t1.daumcdn.net http://dapi.kakao.com https://dapi.kakao.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "img-src 'self' data: https: blob: http://t1.daumcdn.net https://t1.daumcdn.net http://map.daumcdn.net https://map.daumcdn.net",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://images.unsplash.com https://cdn.jsdelivr.net http://dapi.kakao.com https://dapi.kakao.com https://*.google-analytics.com https://*.sentry.io https://*.tosspayments.com",
              "frame-src 'self' https://js.tosspayments.com https://*.tosspayments.com https://postcode.map.daum.net http://postcode.map.daum.net",
              "media-src 'self' blob: data:",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(bundleAnalyzer(nextConfig), {
  silent: true,
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
  disableLogger: true,
})
