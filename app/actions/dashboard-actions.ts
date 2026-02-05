"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDashboardContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // 1. Fetch User Profile (Job, Hobbies, etc.)
    const { data: profile } = await supabase
        .from('profiles')
        .select('job, hobbies, life_philosophy, full_name, plan_id')
        .eq('id', user.id)
        .single();

    if (!profile) return null;

    // 2. Determine "Iljin" (Daily Fortune Context)
    // In a real app, this would calculate based on Manse. 
    // For now, we simulate a simple daily vibe based on random or fixed logic for MVP.
    // Or we could fetch from `daily_usage_logs` if we had daily fortune pre-calculated.
    // Let's create a simple deterministic vibe based on date + user id length (mock).

    // Determine welcome message based on Job
    let welcomeMessage = "오늘도 평안한 하루 되세요.";
    const job = profile.job ? profile.job.trim() : "";

    if (job.includes("사업") || job.includes("대표") || job.includes("CEO")) {
        welcomeMessage = "귀인의 도움이 깃드는 하루입니다. 중요한 결정을 내리기에 좋습니다.";
    } else if (job.includes("마케터") || job.includes("기획")) {
        welcomeMessage = "반짝이는 영감이 샘솟는 날입니다. 새로운 아이디어를 기록해보세요.";
    } else if (job.includes("개발") || job.includes("엔지니어")) {
        welcomeMessage = "몰입하기 좋은 날입니다. 복잡한 문제를 해결할 실마리가 보입니다.";
    } else if (job.includes("디자이너") || job.includes("예술")) {
        welcomeMessage = "미적 감각이 극대화되는 시기입니다. 당신의 감성을 믿으세요.";
    } else if (job.includes("학생")) {
        welcomeMessage = "학업운이 따르는 날입니다. 작은 노력으로 큰 성취를 얻을 수 있습니다.";
    } else {
        // General fallback based on time of day?
        const hour = new Date().getHours();
        if (hour < 12) welcomeMessage = "활기찬 아침의 기운이 당신과 함께합니다.";
        else if (hour < 18) welcomeMessage = "오후의 햇살처럼 따뜻한 인복이 찾아옵니다.";
        else welcomeMessage = "하루를 차분히 정리하며 내일을 준비할 귀한 시간입니다.";
    }

    // 3. Today's Iljin Summary (Mock for now, or fetch from real logic)
    // We can say "GabJa Day" etc.
    // For MVP transparency, we just return the personalized message.

    return {
        profile,
        welcomeMessage
    };
}
