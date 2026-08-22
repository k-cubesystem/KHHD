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

      {/* 🔴 하단 상시 가이드 바는 내려갔다(CEO 지시 2026-08-24) — 화면을 가리고, 정작 봐야 할 것
          (카드·푸터)보다 먼저 눈에 들었다. 여기에 다시 무언가를 마운트하지 말 것.
          안내·공지는 상단 바의 종으로 옮겨갔다(components/guide/GuideBell.tsx, MobileHeader 안에
          마운트) — 상시 노출은 종 아이콘 + 미확인 점뿐이고, 누를 때만 펼쳐진다.
          개인 알림 전달 경로는 /protected/notifications 가 계속 진다. */}
    </div>
  )
}
