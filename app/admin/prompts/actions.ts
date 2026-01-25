"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface AIPrompt {
    key: string;
    label: string;
    category: string;
    template: string;
    description: string | null;
    updated_at: string;
}

export async function getPrompts(): Promise<AIPrompt[]> {
    const supabase = await createClient();

    // Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") throw new Error("Forbidden");

    // Use Admin Client if available
    let dbClient = supabase;
    try {
        dbClient = createAdminClient();
    } catch (e) {
        console.warn("getPrompts: Fallback to standard client");
    }

    // Fetch prompts
    const { data, error } = await dbClient
        .from("ai_prompts")
        .select("*")
        .order("category", { ascending: true }); // 카테고리별 정렬, 그 다음 key 등

    if (error) {
        console.error("Error fetching prompts:", error);
        throw new Error("Failed to fetch prompts");
    }

    return data as AIPrompt[];
}

export async function updatePrompt(key: string, newTemplate: string) {
    const supabase = await createClient();

    // Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Forbidden" };

    // Use Admin Client if available
    let dbClient = supabase;
    try {
        dbClient = createAdminClient();
    } catch (e) {
        console.warn("updatePrompt: Fallback to standard client");
    }

    const { error } = await dbClient
        .from("ai_prompts")
        .update({ template: newTemplate, updated_at: new Date().toISOString() })
        .eq("key", key);

    if (error) {
        console.error("Error updating prompt:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/prompts");
    return { success: true };
}
