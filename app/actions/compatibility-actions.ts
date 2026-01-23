"use server";

import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

interface InviteData {
    inviterId: string;
    inviterName: string;
    inviterBirthDate: string;
    inviterBirthTime?: string;
    inviterGender: string;
}

// 1. Create Invite Link
export async function createCompatibilityInvite(): Promise<{ success: boolean; inviteCode?: string; error?: string }> {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "로그인이 필요합니다." };
    }

    // Get user's profile data
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        return { success: false, error: "프로필 정보를 찾을 수 없습니다." };
    }

    // Check if user has birth data in family_members
    const { data: familyMember } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", user.id)
        .eq("relationship", "본인")
        .single();

    if (!familyMember) {
        return { success: false, error: "먼저 '인연 관리'에서 본인 정보를 등록해주세요." };
    }

    // Generate unique invite code
    const inviteCode = nanoid(10);

    // Store invite data (you might want to create a 'compatibility_invites' table)
    // For now, we'll use a simple approach with localStorage on client side
    // In production, store this in database with expiry

    return {
        success: true,
        inviteCode,
    };
}

// 2. Get Invite Data
export async function getInviteData(inviteCode: string): Promise<{ success: boolean; data?: InviteData; error?: string }> {
    // In production, fetch from database
    // For now, this is a placeholder
    return {
        success: false,
        error: "초대 코드를 찾을 수 없습니다.",
    };
}

// 3. Calculate Compatibility
export async function calculateCompatibility(
    person1: { birthDate: string; birthTime?: string; gender: string },
    person2: { birthDate: string; birthTime?: string; gender: string }
): Promise<{ success: boolean; score?: number; analysis?: string; error?: string }> {
    // This would integrate with your existing Saju analysis
    // For now, return a placeholder

    const score = Math.floor(Math.random() * 30) + 70; // 70-100

    const analysis = `
## 궁합 분석 결과

두 분의 사주를 분석한 결과, **${score}점**의 궁합을 보이고 있습니다.

### 종합 평가
${score >= 90 ? "매우 좋은 궁합입니다! 서로를 보완하며 발전할 수 있는 관계입니다." :
            score >= 80 ? "좋은 궁합입니다. 서로 이해하고 노력한다면 행복한 관계를 유지할 수 있습니다." :
                "평범한 궁합입니다. 서로의 차이를 인정하고 존중하는 것이 중요합니다."}

### 강점
- 서로의 부족한 오행을 보완해줍니다
- 성격적으로 조화를 이룰 수 있습니다
- 함께 성장할 수 있는 잠재력이 있습니다

### 주의사항
- 의사소통을 충분히 하세요
- 서로의 개성을 존중하세요
- 작은 갈등도 대화로 풀어가세요

전체 분석을 보시려면 회원가입 후 '천지인 분석'을 이용해주세요.
    `;

    return {
        success: true,
        score,
        analysis,
    };
}
