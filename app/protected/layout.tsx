import { SiteHeader } from "@/components/site-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { MobileHeader } from "@/components/mobile-header";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative flex flex-col">
      {/* Mobile Header (Fixed to top) */}
      <MobileHeader />

      <main className="w-full pb-20 pt-14 flex-grow">
        {children}
      </main>

      <SiteFooter />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
