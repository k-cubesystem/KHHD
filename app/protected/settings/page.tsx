import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/profile/settings-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BrandQuote } from "@/components/ui/BrandQuote";
import { BRAND_QUOTES } from "@/lib/constants/brand-quotes";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    return (
        <div className="min-h-screen bg-background text-ink-light font-sans relative pb-20 overflow-x-hidden">
            <div className="hanji-overlay" />

            <header className="px-6 py-5 flex items-center gap-4 bg-background/90 backdrop-blur-md sticky top-0 z-50 border-b border-primary/20">
                <Link href="/protected/profile" className="p-1 -ml-1 hover:bg-surface/10 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-ink-light/80" strokeWidth={1} />
                </Link>
                <h1 className="text-lg font-serif font-light text-ink-light">내 정보 수정</h1>
            </header>

            <main className="px-6 py-8 relative z-10 max-w-lg mx-auto">
                <BrandQuote variant="section" className="text-center mb-6">
                    {BRAND_QUOTES.settings.hero}
                </BrandQuote>

                <div className="bg-surface/30 border border-primary/20 p-6 rounded-sm">
                    <p className="text-sm text-ink/60 mb-6 font-light">
                        정확한 사주 분석을 위해 올바른 정보를 입력해주세요.<br />
                        수정된 정보는 즉시 반영됩니다.
                    </p>

                    <SettingsForm user={user} profile={profile} />
                </div>
            </main>
        </div>
    );
}
