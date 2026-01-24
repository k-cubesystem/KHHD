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
        <div className="min-h-screen bg-zen-bg font-sans pb-20">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
                {/* Back Button */}
                <Link
                    href="/protected/profile"
                    className="inline-flex items-center gap-2 text-sm text-zen-muted hover:text-zen-wood transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    프로필로 돌아가기
                </Link>

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-serif font-bold text-zen-text">
                        내 정보 수정
                    </h1>
                    <p className="text-zen-muted">
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
