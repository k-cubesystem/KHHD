import type { Metadata } from "next";
import { Inter, Noto_Serif_KR } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif_KR({
  variable: "--font-serif",
  display: "swap",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";


export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "청담해화당 - Premium 운명 공학 SaaS",
  description: "전통 명리학과 현대 데이터 사이언스의 결합, 해화당 마스터의 정교한 운명 분석 리포트",
  manifest: "/manifest.json",
  icons: {
    icon: "/app-icon.png",
    apple: "/app-icon.png",
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
      <body className={`${inter.variable} ${notoSerif.variable} font-sans antialiased notranslate`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
