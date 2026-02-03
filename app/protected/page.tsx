import { createClient } from "@/lib/supabase/server";
import { MobileView } from "@/components/dashboard/mobile-view";
import { getWalletBalance } from "@/app/actions/wallet-actions";
import { getUserTierLimits } from "@/app/actions/membership-limits";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Handle Guest Logic
  const masterName = user?.email?.split('@')[0] || "Guest";
  const isGuest = !user;

  // Fetch User Data for Header
  const [walletBalance, limits] = await Promise.all([
    getWalletBalance(),
    getUserTierLimits()
  ]);

  const userData = {
    avatarUrl: user?.user_metadata?.avatar_url,
    email: user?.email,
    balance: walletBalance,
    tier: limits?.tier || 'Free'
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <MobileView isGuest={isGuest} masterName={masterName} userData={userData} />
    </div>
  );
}