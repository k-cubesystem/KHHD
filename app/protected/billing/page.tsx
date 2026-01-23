import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PaymentWidget } from "@/components/payment/payment-widget";
import { Sparkles, Ticket, ShieldCheck, Zap } from "lucide-react";

export default async function BillingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    return (
        <div className="min-h-screen bg-zen-bg relative overflow-x-hidden pt-12 pb-24">

            {/* Background Ornament */}
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-zen-gold/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-zen-wood/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-5xl mx-auto px-6 space-y-12 relative z-10">

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-zen-border rounded-sm shadow-sm">
                        <Ticket className="w-4 h-4 text-zen-gold" />
                        <span className="text-[10px] font-bold text-zen-muted uppercase tracking-[0.2em]">Talisman Inventory</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-zen-text leading-tight">
                        운명을 여는 열쇠, <br />
                        <span className="text-zen-wood italic font-serif">부적 선택</span>
                    </h1>
                    <p className="text-zen-muted max-w-lg mx-auto font-sans leading-relaxed">
                        더 깊은 분석과 비록 소장을 위해 부적을 선택해 주세요. <br />
                        충전된 부적은 기간 제한 없이 사용하실 수 있습니다.
                    </p>
                </div>

                {/* Feature Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white border border-zen-border rounded-sm space-y-3">
                        <div className="w-10 h-10 bg-zen-bg flex items-center justify-center rounded-sm">
                            <ShieldCheck className="w-5 h-5 text-zen-gold" />
                        </div>
                        <h4 className="font-serif font-bold text-zen-text">안전한 결제</h4>
                        <p className="text-xs text-zen-muted leading-relaxed font-sans">
                            토스페이먼츠 보안 시스템을 통해 <br />정보를 안전하게 보호합니다.
                        </p>
                    </div>
                    <div className="p-6 bg-white border border-zen-border rounded-sm space-y-3">
                        <div className="w-10 h-10 bg-zen-bg flex items-center justify-center rounded-sm">
                            <Sparkles className="w-5 h-5 text-zen-gold" />
                        </div>
                        <h4 className="font-serif font-bold text-zen-text">영구 소장</h4>
                        <p className="text-xs text-zen-muted leading-relaxed font-sans">
                            한 번 충전한 부적은 소멸되지 않으며 <br />필요할 때 언제든 사용 가능합니다.
                        </p>
                    </div>
                    <div className="p-6 bg-white border border-zen-border rounded-sm space-y-3">
                        <div className="w-10 h-10 bg-zen-bg flex items-center justify-center rounded-sm">
                            <Zap className="w-5 h-5 text-zen-gold" />
                        </div>
                        <h4 className="font-serif font-bold text-zen-text">즉시 반영</h4>
                        <p className="text-xs text-zen-muted leading-relaxed font-sans">
                            결제 완료 즉시 계정에 반영되어 <br />바로 분석을 시작할 수 있습니다.
                        </p>
                    </div>
                </div>

                {/* Payment Widget Container */}
                <div className="bg-white border border-zen-border shadow-xl rounded-sm p-4 md:p-10">
                    <PaymentWidget memberId={user.id} />
                </div>

                {/* Footer info */}
                <div className="text-center">
                    <p className="text-[10px] text-zen-muted/60 leading-relaxed font-sans">
                        문의사항이 있으신가요? 카카오톡 '청담해화당' 채널을 통해 1:1 상담이 가능합니다. <br />
                        사업자등록번호: 247-86-02941 | 통신판매업신고: 제2024-서울청담-0123호
                    </p>
                </div>
            </div>
        </div>
    );
}
