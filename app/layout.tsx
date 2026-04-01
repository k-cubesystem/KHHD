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
    default: '청담해화당 - Premium 운명 공학 SaaS',
    template: '%s | 청담해화당',
  },
  description: '전통 명리학과 현대 데이터 사이언스의 결합, AI 마스터의 정교한 운명 분석 리포트',
  keywords: ['사주', '운세', '신년운세', '토정비결', '궁합', '관상', '손금', 'AI 점술', '해화당', '청담해화당'],
  authors: [{ name: 'Haehwadang Team' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: defaultUrl,
    title: '청담해화당 - Premium 운명 공학 SaaS',
    description: '당신의 운명을 비춰주는 프리미엄 AI 사주 분석',
    siteName: '청담해화당',
    images: [
      {
        url: '/api/og?title=청담해화당&desc=당신의 운명을 비춰주는 프리미엄 AI 사주 분석',
        width: 1200,
        height: 630,
        alt: '청담해화당 - Premium 운명 공학 SaaS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '청담해화당 - Premium 운명 공학 SaaS',
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
        className={`${notoSans.variable} ${notoSerif.variable} ${nanumMyeongjo.variable} ${playfair.variable} font-serif font-light antialiased notranslate bg-[#050505]`}
        suppressHydrationWarning
      >
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
                </div>
              </div>
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
