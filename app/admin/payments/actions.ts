"use server";

import { createClient } from "@/lib/supabase/server";

export interface AdminPayment {
    id: string;
    user_id: string;
    order_id: string;
    amount: number;
    credits_purchased: number;
    status: string;
    created_at: string;
    profiles: {
        email: string | null;
        full_name: string | null;
    } | null;
}

export async function getPayments(page: number = 1, limit: number = 20, statusFilter: string = "all"): Promise<{ data: AdminPayment[], total: number }> {
    const supabase = await createClient();

    // Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") throw new Error("Forbidden");

    let query = supabase
        .from("payments")
        .select(`
            id, user_id, order_id, amount, credits_purchased, status, created_at,
            profiles ( email, full_name )
        `, { count: "exact" });

    if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching payments:", error);
        throw new Error("Failed to fetch payments");
    }

    return {
        data: data as any[], // Casting needed due to join typings
        total: count || 0
    };
}
