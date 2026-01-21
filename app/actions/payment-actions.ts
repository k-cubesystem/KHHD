"use server";

import { createClient } from "@/lib/supabase/server";

const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || "test_sk_z6OdyEPWpUpnLp90z608nM7XyVNb";

export async function confirmPayment(paymentKey: string, orderId: string, amount: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("인증되지 않은 사용자입니다.");

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
            amount,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "결제 승인에 실패했습니다.");
    }

    // 결제 정보 저장
    const { error } = await supabase.from("payments").insert({
        user_id: user.id,
        payment_key: paymentKey,
        order_id: orderId,
        amount,
        status: "completed",
    });

    if (error) {
        console.error("Payment Record Insert Error:", error);
    }

    return result;
}
