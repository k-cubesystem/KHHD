import { BottomNav } from '@/components/layout/bottom-nav'
import { SiteFooter } from '@/components/site-footer'
import { MobileHeader } from '@/components/mobile-header'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative flex flex-col overflow-x-hidden">
      {/* Manse Global Background (Inline Style Revived) */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold-500/[0.03] rounded-full blur-[200px]" />
      </div>

      {/* Mobile Header (Fixed to top) */}
      <MobileHeader />

      {/* Content Container (Global Max Width) */}
      <main className="w-full max-w-4xl mx-auto pb-24 pt-14 flex-grow px-2">{children}</main>

      <SiteFooter />

      {/* Floating Action Button */}

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* 🔴 전 페이지 신 가이드 바 — CEO 지시로 내림(2026-08-24). 하단에 상시 떠 있는 안내 줄이
          화면을 가리고, 정작 봐야 할 것(카드·푸터)보다 먼저 눈에 들었다.
          컴포넌트(components/guide/GlobalGuide.tsx)와 서버액션(getGuideData)은 그대로 두어 되살리기
          쉽게 남긴다 — 다시 켤 땐 import 와 이 자리만 복구하면 된다.
          공지·개인 알림 전달 경로는 /protected/notifications 가 계속 진다(사라지지 않는다). */}
    </div>
  )
}
