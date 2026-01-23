"use server";

import { createClient } from "@/lib/supabase/server";
import { addTalismans } from "./wallet-actions";

const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || "test_sk_z6OdyEPWpUpnLp90z608nM7XyVNb";

export async function confirmPayment(paymentKey: string, orderId: string, talismans: number = 1) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("인증되지 않은 사용자입니다.");

    // 서버에서 금액 계산 (클라이언트 데이터 신뢰 안 함)
    const PRICE_MAP: Record<number, number> = {
        3: 9900,    // 소원 성취 팩
        10: 29900,  // 만사 형통 팩
        30: 79000   // 운수 대통 팩
    };

    const expectedAmount = PRICE_MAP[talismans];
    if (!expectedAmount) {
        throw new Error("잘못된 부적 수량입니다.");
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
            amount: expectedAmount,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "결제 승인에 실패했습니다.");
    }

    if (result.totalAmount !== expectedAmount) {
        console.error("[Payment] Amount mismatch:", {
            expected: expectedAmount,
            actual: result.totalAmount
        });
        throw new Error("결제 금액이 일치하지 않습니다.");
    }

    // 결제 정보 저장 (Log 목적)
    const { data: insertedPayment, error } = await supabase.from("payments").insert({
        user_id: user.id,
        payment_key: paymentKey,
        order_id: orderId,
        amount: expectedAmount,
        credits_purchased: talismans,
        credits_remaining: talismans, // Legacy field
        status: "completed",
    }).select().single();

    if (error) {
        console.error("[Payment] DB Insert Error:", error);
        throw new Error(`결제는 성공했으나 기록 저장 실패: ${error.message}`);
    }

    // Wallet에 부적 충전
    const walletResult = await addTalismans(
        talismans,
        "CHARGE",
        `부적 ${talismans}장 구매 (주문번호: ${orderId})`
    );

    if (!walletResult.success) {
        console.error("[Payment] Wallet charge failed:", walletResult.error);
        throw new Error("부적 충전에 실패했습니다.");
    }

    console.log("[Payment] Successfully completed:", insertedPayment);
    return result;
}
