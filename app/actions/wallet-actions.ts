"use server";

import { createClient } from "@/lib/supabase/server";
import { canUseTalisman, incrementDailyUsage } from "./membership-limits";

/**
 * Get feature cost from database
 */
export async function getFeatureCost(featureKey: string): Promise<number> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("feature_costs")
        .select("cost")
        .eq("key", featureKey)
        .eq("is_active", true)
        .single();

    if (error || !data) {
        console.error(`Feature cost not found for ${featureKey}:`, error);
        return 1; // Fallback to 1
    }

    return data.cost;
}

/**
 * Get user's wallet balance
 */
export async function getWalletBalance(): Promise<number> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 0;

    // Check if admin/tester
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role === "admin" || profile?.role === "tester") {
        return 999; // Unlimited display
    }

    const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

    return wallet?.balance || 0;
}

/**
 * Deduct talismans from user wallet
 */
export async function deductTalisman(
    featureKey: string,
    customAmount?: number
): Promise<{ success: boolean; error?: string; remainingBalance?: number }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "로그인이 필요합니다." };

    // Check if admin/tester (unlimited)
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role === "admin" || profile?.role === "tester") {
        return { success: true, remainingBalance: 999 };
    }

    // Check daily talisman usage limit (멤버십 일일 한도 체크)
    const dailyCheck = await canUseTalisman();
    if (!dailyCheck.allowed) {
        return { success: false, error: dailyCheck.message };
    }

    // Get cost
    const cost = customAmount || await getFeatureCost(featureKey);

    // Get current balance
    const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

    if (walletError || !wallet) {
        return { success: false, error: "지갑 정보를 찾을 수 없습니다." };
    }

    if (wallet.balance < cost) {
        return { success: false, error: `부적이 부족합니다. (필요: ${cost}장, 보유: ${wallet.balance}장)` };
    }

    // Deduct balance
    const newBalance = wallet.balance - cost;
    const { error: updateError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

    if (updateError) {
        return { success: false, error: "부적 차감 중 오류가 발생했습니다." };
    }

    // Log transaction
    const { data: featureCost } = await supabase
        .from("feature_costs")
        .select("label")
        .eq("key", featureKey)
        .single();

    await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        amount: -cost,
        type: "USE",
        feature_key: featureKey,
        description: `${featureCost?.label || featureKey} 사용`
    });

    // Increment daily usage counter
    await incrementDailyUsage(cost);

    return { success: true, remainingBalance: newBalance };
}

/**
 * Add talismans to user wallet (for payments)
 */
export async function addTalismans(
    amount: number,
    type: "CHARGE" | "BONUS" | "SUBSCRIPTION" = "CHARGE",
    description?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "로그인이 필요합니다." };

    // Get current balance
    const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .single();

    const currentBalance = wallet?.balance || 0;
    const newBalance = currentBalance + amount;

    // Update balance
    const { error: updateError } = await supabase
        .from("wallets")
        .update({ balance: newBalance })
        .eq("user_id", user.id);

    if (updateError) {
        return { success: false, error: "부적 충전 중 오류가 발생했습니다." };
    }

    // Log transaction
    await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        amount: amount,
        type: type,
        description: description || `부적 ${amount}장 충전`
    });

    return { success: true };
}

/**
 * Get wallet transaction history
 */
export async function getWalletTransactions(limit: number = 50) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    return data || [];
}
