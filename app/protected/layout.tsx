import { ProtectedHeader } from "@/components/protected-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col bg-zen-bg bg-hanji text-zen-text selection:bg-zen-gold/30">
      {/* Desktop Header & Mobile Logo Bar */}
      <ProtectedHeader user={user} />

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col items-center relative z-10">
        <div className="w-full flex-1">
          {children}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
