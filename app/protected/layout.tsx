import { BottomNav } from '@/components/layout/bottom-nav'
import { SiteFooter } from '@/components/site-footer'
import { MobileHeader } from '@/components/mobile-header'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative flex flex-col overflow-x-hidden">
      {/* Manse Global Background (Inline Style Revived) */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[200px]" />
      </div>

      {/* Mobile Header (Fixed to top) */}
      <MobileHeader />

      {/* Content Container (Global Max Width) */}
      <main className="w-full max-w-4xl mx-auto pb-24 pt-14 flex-grow px-6">{children}</main>

      <SiteFooter />

      {/* Floating Action Button */}

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
