"use server";

import { createClient } from "@/lib/supabase/server";

const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || "test_sk_z6OdyEPWpUpnLp90z608nM7XyVNb";

export async function confirmPayment(paymentKey: string, orderId: string, credits: number = 1) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("인증되지 않은 사용자입니다.");

    // 서버에서 금액 계산 (클라이언트 데이터 신뢰 안 함)
    const PRICE_MAP: Record<number, number> = {
        1: 9900,
        3: 24900,
        5: 39900
    };

    const expectedAmount = PRICE_MAP[credits];
    if (!expectedAmount) {
        throw new Error("잘못된 크레딧 수량입니다.");
    }

    const basicAuth = Buffer.from(`${secretKey}:`).toString("base64");

    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            paymentKey,
            orderId,
            amount: expectedAmount, // 서버에서 계산한 금액 사용
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "결제 승인에 실패했습니다.");
    }

    // 토스페이먼츠 응답 금액과 서버 계산 금액 비교
    if (result.totalAmount !== expectedAmount) {
        console.error("[Payment] Amount mismatch:", {
            expected: expectedAmount,
            actual: result.totalAmount
        });
        throw new Error("결제 금액이 일치하지 않습니다.");
    }

    // 결제 정보 저장 (크레딧 포함)
    console.log("[Payment] Attempting to save payment record:", {
        user_id: user.id,
        order_id: orderId,
        amount: expectedAmount,
        credits
    });

    const { data: insertedPayment, error } = await supabase.from("payments").insert({
        user_id: user.id,
        payment_key: paymentKey,
        order_id: orderId,
        amount: expectedAmount,
        credits_purchased: credits,
        credits_remaining: credits,
        status: "completed",
    }).select().single();

    if (error) {
        console.error("[Payment] DB Insert Error:", error);
        console.error("[Payment] Error details:", JSON.stringify(error, null, 2));
        throw new Error(`결제는 성공했으나 크레딧 저장 실패: ${error.message}`);
    }

    console.log("[Payment] Successfully saved payment:", insertedPayment);
    return result;
}

// 사용 가능한 크레딧 확인
export async function getAvailableCredits() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 0;

    // 관리자/테스터는 무제한 크레딧
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role === "admin" || profile?.role === "tester") {
        return 999; // 무제한 표시용
    }

    const { data, error } = await supabase
        .from("payments")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .in("status", ["completed", "test_charge"])
        .gt("credits_remaining", 0);

    if (error || !data) return 0;

    return data.reduce((sum, p) => sum + (p.credits_remaining || 0), 0);
}

// 크레딧 차감
export async function useCredit() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("인증되지 않은 사용자입니다.");

    // 관리자/테스터는 크레딧 차감 없이 바로 통과
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role === "admin" || profile?.role === "tester") {
        return 999; // 무제한
    }

    // 가장 오래된 결제 중 크레딧이 남은 것 찾기
    const { data: payment, error: findError } = await supabase
        .from("payments")
        .select("id, credits_remaining")
        .eq("user_id", user.id)
        .in("status", ["completed", "test_charge"])
        .gt("credits_remaining", 0)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

    if (findError || !payment) {
        throw new Error("사용 가능한 분석 크레딧이 없습니다.");
    }

    // 크레딧 차감
    const { error: updateError } = await supabase
        .from("payments")
        .update({ credits_remaining: payment.credits_remaining - 1 })
        .eq("id", payment.id);

    if (updateError) {
        throw new Error("크레딧 차감 중 오류가 발생했습니다.");
    }

    return payment.credits_remaining - 1;
}
