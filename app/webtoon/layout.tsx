import { BottomNav } from '@/components/layout/bottom-nav'
import { SiteFooter } from '@/components/site-footer'
import { MobileHeader } from '@/components/mobile-header'

/**
 * 웹툰 — 공개 라우트지만 **앱과 같은 머리글·하단 메뉴**를 쓴다(CEO 2026-09-13 「웹툰에 들어가면 상단·하단 메뉴가 안 나와」).
 * 비로그인 방문자에게도 같은 뼈대가 선다 — 머리글의 명식·종은 로그인이 없으면 조용히 비고, 하단 메뉴의
 * 보호 화면은 로그인으로 보낸다(웹툰 → 앱 유입 동선). 🔴 페이지 안에 머리글을 또 그리지 말 것.
 */
export default function WebtoonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative flex flex-col overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold-500/[0.03] rounded-full blur-[200px]" />
      </div>

      <MobileHeader />

      <main className="w-full max-w-4xl mx-auto pb-24 pt-14 flex-grow px-2">{children}</main>

      <SiteFooter />

      <BottomNav />
    </div>
  )
}
