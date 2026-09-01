import type { NextConfig } from 'next'

import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

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
      // 비공개 버킷 서명 URL. 웹툰 본문은 최적화를 타지 않으므로(unoptimized) 지금은 쓰이지 않고,
      // 누가 그 옵션을 지웠을 때 조용히 깨지지 말라고 남겨 둔 그물이다.
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/**',
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
              // 🔴 애드센스 도메인 4종(pagead2·googleadservices·tpc·doubleclick)이 빠지면
              //    광고 스크립트가 CSP 에 막혀 «태그는 붙였는데 아무것도 안 뜬다» 가 된다.
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://js.tosspayments.com https://t1.daumcdn.net http://dapi.kakao.com https://dapi.kakao.com https://www.googletagmanager.com https://va.vercel-scripts.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "img-src 'self' data: https: blob: http://t1.daumcdn.net https://t1.daumcdn.net http://map.daumcdn.net https://map.daumcdn.net",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
              // 🔴 adtrafficquality.google 은 애드센스의 무효 트래픽 판정(Sodar) 신호를 보내는 곳이다.
              //    빠지면 **모든 페이지에서** CSP 위반이 콘솔에 찍히고 신호가 서버에 닿지 않는다
              //    (2026-09-01 프로덕션 실측: 20개 페이지 로드 전부 이 오류 1건씩).
              //    광고는 그려지지만 트래픽 품질 신호가 비는 건 수익 판정에 불리하다.
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://images.unsplash.com https://cdn.jsdelivr.net http://dapi.kakao.com https://dapi.kakao.com https://*.google-analytics.com https://*.sentry.io https://*.tosspayments.com https://pagead2.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google",
              // 광고 본문은 iframe(safeframe)으로 들어온다 — frame-src 가 없으면 빈 자리만 남는다.
              "frame-src 'self' https://js.tosspayments.com https://*.tosspayments.com https://postcode.map.daum.net http://postcode.map.daum.net https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
              "media-src 'self' blob: data:",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          // HTTPS 강제 (HTTP 다운그레이드/스트립 공격 방어). 프로덕션 HTTPS 전용, localhost(HTTP)는 브라우저가 무시.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
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

export default withSentryConfig(withNextIntl(bundleAnalyzer(nextConfig)), {
  silent: true,
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },
  disableLogger: true,
})
