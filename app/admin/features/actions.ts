"use server";

import { createClient } from "@/lib/supabase/server";

export async function getFeatureCosts() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("feature_costs")
        .select("*")
        .order("key");

    if (error) throw error;
    return data;
}

export async function updateFeatureCost(key: string, cost: number, isActive: boolean) {
    const supabase = await createClient();

    // Check admin permission
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        throw new Error("Admin permission required");
    }

    const { error } = await supabase
        .from("feature_costs")
        .update({ cost, is_active: isActive })
        .eq("key", key);

    if (error) throw error;
    return { success: true };
}
