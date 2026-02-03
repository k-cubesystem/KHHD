import { createClient } from "@/lib/supabase/server";
import { AnalysisHubClient } from "./analysis-hub-client";

export default async function AnalysisHubPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isGuest = !user;

    // Fetch user profile for personalized greeting
    let userName: string | undefined;
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

        userName = profile?.full_name || undefined;
    }

    return <AnalysisHubClient isGuest={isGuest} userName={userName} />;
}
