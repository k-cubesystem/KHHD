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

    // Fetch existing profile data
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return (
        <div className="min-h-screen bg-zen-bg font-sans pb-20">
            <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
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
                        사주 정보 입력
                    </h1>
                    <p className="text-zen-muted">
                        정확한 사주 분석을 위해 생년월일시 정보를 입력해 주세요.
                    </p>
                </div>

                {/* Form Card */}
                <Card className="border-zen-border shadow-lg bg-white">
                    <ProfileEditForm
                        userId={user.id}
                        initialData={profile}
                    />
                </Card>
            </div>
        </div>
    );
}
