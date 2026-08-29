import type { Metadata } from 'next'
import { Noto_Sans_KR, Noto_Serif_KR, Nanum_Myeongjo, Playfair_Display } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { SWRegister } from '@/components/sw-register'
import { AgentationWrapper } from '@/components/agentation-wrapper'
import { QueryProvider } from '@/components/providers/query-provider'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { GoogleAnalytics } from '@next/third-parties/google'
import Script from 'next/script'
import { ADSENSE_CLIENT, isLiveAdEnvironment } from '@/lib/domain/ads/adsense'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'

const notoSans = Noto_Sans_KR({
  variable: '--font-noto-sans',
  display: 'swap',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
})

const notoSerif = Noto_Serif_KR({
  variable: '--font-noto-serif',
  display: 'swap',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
})

const nanumMyeongjo = Nanum_Myeongjo({
  variable: '--font-gungseo',
  display: 'swap',
  weight: ['400', '700', '800'], // 400, 700, 800 available for Nanum Myeongjo typically
  subsets: ['latin'],
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  display: 'swap',
  subsets: ['latin'],
})

const defaultUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: '청담해화당 - AI 사주 운세 분석',
    template: '%s | 청담해화당',
  },
  description: '전통 명리학과 현대 데이터 사이언스의 결합, AI 마스터의 정교한 운명 분석 리포트',
  keywords: ['사주', '운세', '신년운세', '토정비결', '궁합', '관상', '손금', 'AI 점술', '해화당', '청담해화당'],
  authors: [{ name: 'Haehwadang Team' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: defaultUrl,
    title: '청담해화당 - AI 사주 운세 분석',
    description: '당신의 운명을 비춰주는 프리미엄 AI 사주 분석',
    siteName: '청담해화당',
    images: [
      {
        url: '/api/og?title=청담해화당&desc=당신의 운명을 비춰주는 프리미엄 AI 사주 분석',
        width: 1200,
        height: 630,
        alt: '청담해화당 - AI 사주 운세 분석',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '청담해화당 - AI 사주 운세 분석',
    description: '당신의 운명을 비춰주는 프리미엄 AI 사주 분석',
    images: ['/api/og?title=청담해화당&desc=당신의 운명을 비춰주는 프리미엄 AI 사주 분석'],
    creator: '@haehwadang',
  },
  manifest: '/manifest.json',
  icons: {
    apple: '/app-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '청담해화당',
  },
}

export const viewport = {
  themeColor: '#0f0f10',
}
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning translate="no">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body
        className={`${notoSans.variable} ${notoSerif.variable} ${nanumMyeongjo.variable} ${playfair.variable} font-serif font-light antialiased notranslate bg-[#0A0A08]`}
        suppressHydrationWarning
      >
        {/* 애드센스 로더 — 🔴 반드시 lazyOnload(하이드레이션 끝난 뒤).
            2026-08-30 사고: ads.txt 게재 다음 날 자동 광고(앵커)가 실제 송출을 시작했는데,
            <head> 의 async 스크립트라 **하이드레이션 도중** <body> 직계에 <ins> 를 꽂았다.
            App Router 는 문서 전체를 하이드레이션하므로 React 가 «서버에 없던 노드»를 만나
            #418 로 죽고, 스트리밍된 본문이 끝내 커밋되지 않았다 — 상점이 «불러오는 중...» 에
            갇히고 결제 버튼이 전부 죽었다(구매 경로 전멸).
            🔴 window.load 이후에 로더를 실행하면 광고가 하이드레이션과 경주하지 않는다.
               사이트 확인은 이미 통과했다(광고 송출 중) — 초기 HTML 요건은 확인 단계에만 필요했다.
               재확인이 필요해지면 애드센스의 「메타 태그」 확인 방식을 쓸 것(스크립트를 head 로
               되돌리면 이 사고가 그대로 재발한다).
            🔴 진짜 서비스에서만 — 프리뷰·로컬에서 실리면 QA 노출이 무효 트래픽이 된다. */}
        {isLiveAdEnvironment(process.env.VERCEL_ENV, process.env.NODE_ENV) && (
          <Script
            id="adsbygoogle-loader"
            strategy="lazyOnload"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <QueryProvider>
              <div className="flex justify-center w-full min-h-screen">
                <div className="w-full max-w-[480px] min-h-screen bg-background relative shadow-2xl overflow-x-hidden border-x border-white/5 mx-auto">
                  {children}
                  <Toaster position="top-center" richColors />
                  <PWAInstallPrompt />
                  <SWRegister />
                  <AgentationWrapper />
                  <SpeedInsights />
                  {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
                  <PageViewTracker />
                </div>
              </div>
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
