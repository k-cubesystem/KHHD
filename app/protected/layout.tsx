import { ProtectedHeader } from "@/components/protected-header";
import { MobileNav } from "@/components/mobile-nav";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col bg-[#0A0A0A]">
      {/* Desktop Header & Mobile Logo Bar */}
      <ProtectedHeader user={user} />

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col items-center">
        <div className="w-full flex-1 pb-20 md:pb-0">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />

      {/* Desktop Footer (Hidden on mobile to save space, or simplify) */}
      <footer className="hidden md:flex w-full items-center justify-center border-t border-white/5 py-8 text-xs text-muted-foreground">
        <div className="text-center">
          <p className="mb-2">© 2026 Haehwadang AI. Premium Fate Engineering.</p>
          <div className="flex gap-4 justify-center opacity-50">
            <span>Terms</span>
            <span>Privacy</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
