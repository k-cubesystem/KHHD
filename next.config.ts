import type { NextConfig } from 'next'

import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 이미지 업로드를 위해 10MB로 증가
    },
  },
  // 정적 자산 캐싱 최적화
  async rewrites() {
    return []
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://js.tosspayments.com https://t1.daumcdn.net http://dapi.kakao.com https://dapi.kakao.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "img-src 'self' data: https: blob: http://t1.daumcdn.net https://t1.daumcdn.net http://map.daumcdn.net https://map.daumcdn.net",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com https://images.unsplash.com https://cdn.jsdelivr.net http://dapi.kakao.com https://dapi.kakao.com",
              "frame-src 'self' https://js.tosspayments.com",
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
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default bundleAnalyzer(nextConfig)
