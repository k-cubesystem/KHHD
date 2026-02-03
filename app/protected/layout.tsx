import { SiteHeader } from "@/components/site-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { FloatingActionButton } from "@/components/floating-action-button";
import { SiteFooter } from "@/components/site-footer";
import { MobileHeader } from "@/components/mobile-header";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative flex flex-col">
      {/* Mobile Header (Sticky, hidden on Home) */}
      <MobileHeader />

      <main className="w-full pb-20 flex-grow">
        {children}
      </main>

      <SiteFooter />

      {/* Mobile Bottom Navigation (Component handles lg:hidden) */}
      <FloatingActionButton />
      <MobileBottomNav />
    </div>
  );
}
