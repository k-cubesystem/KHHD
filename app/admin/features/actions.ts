"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getFeatureCosts() {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
        .from("feature_costs")
        .select("*")
        .order("key");

    if (error) throw error;
    return data;
}

export async function updateFeatureCost(key: string, cost: number, isActive: boolean) {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // TEMPORARY: Use admin client to bypass RLS
    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from("feature_costs")
        .update({ cost, is_active: isActive })
        .eq("key", key);

    if (error) throw error;
    return { success: true };
}
