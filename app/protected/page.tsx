import { createClient } from "@/lib/supabase/server";
import { MobileView } from "@/components/dashboard/mobile-view";
import { DesktopView } from "@/components/dashboard/desktop-view";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Handle Guest Logic
  const masterName = user?.email?.split('@')[0] || "Guest";
  const isGuest = !user;

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Mobile Layout (Visible on < md) */}
      <div className="block md:hidden">
        <MobileView isGuest={isGuest} masterName={masterName} />
      </div>

      {/* Desktop Layout (Visible on >= md) */}
      <div className="hidden md:block">
        <DesktopView isGuest={isGuest} masterName={masterName} />
      </div>
    </div>
  );
}