"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getFamilyMembers() {
    // Demo Mode check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        console.warn("Supabase credentials missing. Running in Demo Mode.");
        return [
            {
                id: "demo-1",
                name: "권지용 (데모)",
                relationship: "본인",
                birth_date: "1988-08-18",
                birth_time: "08:18",
                calendar_type: "solar",
                gender: "male",
            },
            {
                id: "demo-2",
                name: "이효리 (데모)",
                relationship: "배우자",
                birth_date: "1979-05-10",
                birth_time: "12:00",
                calendar_type: "solar",
                gender: "female",
            },
        ];
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // If no user, but we want the user to experience it, we could return demo data here too
        // but for now let's just return empty or error if we really need auth
        return [];
    }

    const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching family members:", error.message);
        return [];
    }

    return data || [];
}

export async function addFamilyMember(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("인증된 사용자가 아닙니다.");
    }

    const rawData = {
        user_id: user.id,
        name: formData.get("name") as string,
        relationship: formData.get("relationship") as string,
        birth_date: formData.get("birth_date") as string,
        birth_time: formData.get("birth_time") as string,
        calendar_type: formData.get("calendar_type") as string, // 'solar' | 'lunar'
        gender: formData.get("gender") as string,
    };

    const { error } = await supabase.from("family_members").insert([rawData]);

    if (error) {
        console.error("Error adding family member:", error.message);
        throw new Error("가족 정보 등록 중 오류가 발생했습니다.");
    }

    revalidatePath("/protected/family");
}

export async function updateFamilyMember(id: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("인증된 사용자가 아닙니다.");
    }

    const rawData = {
        name: formData.get("name") as string,
        relationship: formData.get("relationship") as string,
        birth_date: formData.get("birth_date") as string,
        birth_time: formData.get("birth_time") as string,
        calendar_type: formData.get("calendar_type") as string,
        gender: formData.get("gender") as string,
    };

    const { error } = await supabase
        .from("family_members")
        .update(rawData)
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) {
        console.error("Error updating family member:", error.message);
        throw new Error("가족 정보 수정 중 오류가 발생했습니다.");
    }

    revalidatePath("/protected/family");
}

export async function deleteFamilyMember(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("인증된 사용자가 아닙니다.");
    }

    const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) {
        console.error("Error deleting family member:", error.message);
        throw new Error("가족 정보 삭제 중 오류가 발생했습니다.");
    }

    revalidatePath("/protected/family");
}
