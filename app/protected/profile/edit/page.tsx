import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ProfileEditPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    // Fetch existing profile data (Basic Info & Extra Fields)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Fetch existing Saju data (from family_members)
    const { data: sajuRecord } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('relationship', '본인')
        .maybeSingle();

    return (
        <div className="min-h-screen bg-[#0A192F] relative overflow-hidden">
            {/* Manse Background Glow */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[200px]" />
            </div>

            <div className="relative container max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
                {/* Back Button */}
                <Link
                    href="/protected/profile"
                    className="inline-flex items-center gap-2 text-[#D4AF37]/80 hover:text-[#D4AF37] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    프로필로 돌아가기
                </Link>

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                        내 정보 수정
                    </h1>
                    <p className="text-[#D4AF37]/60 text-sm">
                        정확한 사주 분석과 맞춤형 서비스를 위해 상세 정보를 입력해 주세요.
                    </p>
                </div>

                {/* Form Component (Interior Card) */}
                <ProfileEditForm
                    userId={user.id}
                    initialData={sajuRecord}
                    profileData={profile}
                />
            </div>
        </div>
    );
}
