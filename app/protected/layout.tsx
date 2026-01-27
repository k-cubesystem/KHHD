import { ProtectedHeader } from "@/components/protected-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/30 font-sans">

      {/* Background Texture (Global for Dashboard) */}
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-5 pointer-events-none mix-blend-overlay z-0" />

      {/* Desktop Header & Mobile Logo Bar */}
      <ProtectedHeader user={user} />

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col items-center relative z-10 pt-20">
        <div className="w-full flex-1 max-w-7xl px-4 md:px-8 py-8">
          {children}
        </div>
      </div>

      <SiteFooter />
      <MobileBottomNav />
    </main>
  );
}
