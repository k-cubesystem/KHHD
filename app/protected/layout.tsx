import { SiteHeader } from "@/components/site-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SiteFooter } from "@/components/site-footer";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative flex flex-col">
      {/* Desktop Header Only */}
      <div className="hidden lg:block">
        <SiteHeader />
      </div>

      {/* Mobile: No Top Header, rely on Page Headers */}
      <main className="w-full lg:pt-20 pb-20 lg:pb-0 flex-grow">
        {children}
      </main>

      {/* Footer (Added) */}
      <div className="hidden lg:block">
        <SiteFooter />
      </div>

      {/* Mobile Bottom Navigation (Component handles lg:hidden) */}
      <MobileBottomNav />
    </div>
  );
}
