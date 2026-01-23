import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const webhookSecretKey = process.env.TOSS_WEBHOOK_SECRET_KEY;

// Supabase Admin Client (Service Role) - lazy initialization
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase environment variables");
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

// Toss Payments Webhook Events
type TossWebhookEvent = {
    eventType: string;
    createdAt: string;
    data: {
        paymentKey?: string;
        orderId?: string;
        status?: string;
        billingKey?: string;
        customerKey?: string;
        // ... other fields
    };
};

export async function POST(request: NextRequest) {
    try {
        // Webhook 검증 (선택사항 - Toss에서 제공하는 경우)
        const signature = request.headers.get("toss-signature");
        if (webhookSecretKey && signature) {
            // TODO: Signature verification if Toss provides it
        }

        const body: TossWebhookEvent = await request.json();
        console.log("[Toss Webhook] Received:", body.eventType);

        switch (body.eventType) {
            case "PAYMENT.DONE":
                await handlePaymentDone(body.data);
                break;

            case "PAYMENT.FAILED":
                await handlePaymentFailed(body.data);
                break;

            case "PAYMENT.CANCELED":
                await handlePaymentCanceled(body.data);
                break;

            case "BILLING_KEY.DELETED":
                await handleBillingKeyDeleted(body.data);
                break;

            case "CARD.EXPIRED":
                await handleCardExpired(body.data);
                break;

            default:
                console.log("[Toss Webhook] Unhandled event:", body.eventType);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Toss Webhook] Error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}

// 결제 완료 처리
async function handlePaymentDone(data: TossWebhookEvent["data"]) {
    const { paymentKey, orderId } = data;
    if (!orderId) return;

    // 구독 결제인지 확인 (orderId가 SUB_로 시작)
    if (orderId.startsWith("SUB_")) {
        await getSupabaseAdmin()
            .from("subscription_payments")
            .update({ status: "SUCCESS" })
            .eq("order_id", orderId);

        console.log("[Webhook] Subscription payment confirmed:", orderId);
    } else {
        // 일반 결제
        await getSupabaseAdmin()
            .from("payments")
            .update({ status: "completed" })
            .eq("order_id", orderId);

        console.log("[Webhook] Payment confirmed:", orderId);
    }
}

// 결제 실패 처리
async function handlePaymentFailed(data: TossWebhookEvent["data"]) {
    const { orderId } = data;
    if (!orderId) return;

    if (orderId.startsWith("SUB_")) {
        await getSupabaseAdmin()
            .from("subscription_payments")
            .update({ status: "FAILED" })
            .eq("order_id", orderId);

        // 구독 상태 업데이트 필요 시 추가
        console.log("[Webhook] Subscription payment failed:", orderId);
    } else {
        await getSupabaseAdmin()
            .from("payments")
            .update({ status: "failed" })
            .eq("order_id", orderId);

        console.log("[Webhook] Payment failed:", orderId);
    }
}

// 결제 취소 처리
async function handlePaymentCanceled(data: TossWebhookEvent["data"]) {
    const { orderId } = data;
    if (!orderId) return;

    if (orderId.startsWith("SUB_")) {
        await getSupabaseAdmin()
            .from("subscription_payments")
            .update({ status: "CANCELLED" })
            .eq("order_id", orderId);
    } else {
        await getSupabaseAdmin()
            .from("payments")
            .update({ status: "cancelled" })
            .eq("order_id", orderId);
    }

    console.log("[Webhook] Payment cancelled:", orderId);
}

// 빌링키 삭제 처리 (카드 해지 등)
async function handleBillingKeyDeleted(data: TossWebhookEvent["data"]) {
    const { customerKey } = data;
    if (!customerKey) return;

    // 해당 customerKey의 구독을 찾아 해지 처리
    const { data: subscription } = await getSupabaseAdmin()
        .from("subscriptions")
        .select("id")
        .eq("customer_key", customerKey)
        .single();

    if (subscription) {
        await getSupabaseAdmin()
            .from("subscriptions")
            .update({
                status: "CANCELLED",
                billing_key: null,
                cancelled_at: new Date().toISOString(),
                cancel_reason: "빌링키 삭제됨 (카드 해지)",
            })
            .eq("id", subscription.id);

        console.log("[Webhook] Subscription cancelled due to billing key deletion:", customerKey);
    }
}

// 카드 만료 처리
async function handleCardExpired(data: TossWebhookEvent["data"]) {
    const { customerKey } = data;
    if (!customerKey) return;

    // 해당 사용자에게 알림 발송 로직 추가 가능
    console.log("[Webhook] Card expired for customer:", customerKey);

    // 구독 상태 업데이트
    await getSupabaseAdmin()
        .from("subscriptions")
        .update({ status: "PAYMENT_FAILED" })
        .eq("customer_key", customerKey)
        .eq("status", "ACTIVE");
}

// Health check (GET)
export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "Toss Payments Webhook",
        timestamp: new Date().toISOString(),
    });
}
