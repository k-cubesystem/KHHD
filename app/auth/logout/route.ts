import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
    const supabase = await createClient();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        await supabase.auth.signOut();
    }

    // Redirect to home page after logout
    return redirect("/");
}
