import type { Metadata } from "next";
import { Inter, Noto_Serif_KR, Nanum_Myeongjo, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { AgentationWrapper } from "@/components/agentation-wrapper";
import StitchesRegistry from "./stitches-registry";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif_KR({
  variable: "--font-noto-serif",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

const nanumMyeongjo = Nanum_Myeongjo({
  variable: "--font-gungseo",
  display: "swap",
  weight: ["400", "700", "800"], // 400, 700, 800 available for Nanum Myeongjo typically
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  display: "swap",
  subsets: ["latin"],
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";


export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "청담해화당 - Premium 운명 공학 SaaS",
    template: "%s | 청담해화당"
  },
  description: "전통 명리학과 현대 데이터 사이언스의 결합, AI 마스터의 정교한 운명 분석 리포트",
  keywords: ["사주", "운세", "신년운세", "토정비결", "궁합", "관상", "손금", "AI 점술", "해화당", "청담해화당"],
  authors: [{ name: "Haehwadang Team" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: defaultUrl,
    title: "청담해화당 - Premium 운명 공학 SaaS",
    description: "당신의 운명을 비춰주는 프리미엄 AI 사주 분석",
    siteName: "청담해화당",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "청담해화당 미리보기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "청담해화당 - Premium 운명 공학 SaaS",
    description: "당신의 운명을 비춰주는 프리미엄 AI 사주 분석",
    images: ["/api/og"],
    creator: "@haehwadang",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
    shortcut: "/app-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "청담해화당",
  },
};

export const viewport = {
  themeColor: "#0f0f10",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning translate="no">
      <body className={`${inter.variable} ${notoSerif.variable} ${nanumMyeongjo.variable} ${playfair.variable} font-sans antialiased notranslate`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <StitchesRegistry>
            {children}
            <Toaster position="top-center" richColors />
            <PWAInstallPrompt />
            <AgentationWrapper />
          </StitchesRegistry>
        </ThemeProvider>
      </body>
    </html>
  );
}
