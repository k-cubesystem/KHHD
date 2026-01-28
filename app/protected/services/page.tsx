import { Crown, Sparkles, BookOpen, Map, Cloud, Zap, ScrollText, User, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ServicesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isGuest = !user;

    const services = [
        {
            title: "사주풀이 (Saju)",
            description: "생년월일시를 기반으로 선천적인 운명의 지도를 그려냅니다. 당신의 기질, 잠재력, 그리고 다가올 흐름을 명쾌하게 해석해 드립니다.",
            icon: BookOpen,
            href: "/protected/analysis"
        },
        {
            title: "해화 AI (AI Shaman)",
            description: "고대 명리학 데이터와 최신 AI 기술이 결합된 신개념 신당입니다. 24시간 언제든 당신의 고민에 대한 즉각적인 통찰과 위로를 받아보세요.",
            icon: Zap,
            href: "/protected/ai-shaman"
        },
        {
            title: "천지인 (Cheonjiin)",
            description: "청담해화당의 대표 정밀 분석 서비스입니다. 하늘(시간), 땅(환경), 사람(노력)의 조화를 분석하여 인생의 결정적인 개운(開運) 포인트를 짚어드립니다.",
            icon: Cloud,
            href: "/protected/cheonjiin"
        },
        {
            title: "궁합 (Compatibility)",
            description: "연인, 비즈니스 파트너와의 에너지 조화를 분석합니다. 서로의 부족한 기운을 채워주는 최적의 관계 전략을 제안합니다.",
            icon: Sparkles,
            href: "/protected/relationships"
        },
        {
            title: "풍수 (Feng Shui)",
            description: "당신이 머무는 공간의 에너지를 분석합니다. 재물운과 건강운을 높이는 가구 배치와 인테리어 솔루션을 제공합니다.",
            icon: Map,
            href: "/protected/saju/fengshui"
        },
        {
            title: "관상 (Face Reading)",
            description: "얼굴에 드러난 운의 징조를 읽어냅니다. 현재의 심리 상태와 건강, 그리고 다가올 사회적 성공운을 예측합니다.",
            icon: User,
            href: "/protected/saju/face"
        }
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-300 pb-32 font-sans relative overflow-x-hidden">
            {/* Background Texture */}
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-5 pointer-events-none mix-blend-overlay z-0" />

            {/* Header */}
            <header className="relative pt-12 pb-6 px-6 z-10 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-4">
                    <Link href="/protected" className="p-2 -ml-2 text-white/50 hover:text-gold-metallic transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="font-serif text-xl text-white font-bold tracking-widest">청담해화당 서비스</h1>
                </div>
            </header>

            {/* Content */}
            <main className="px-6 py-8 max-w-lg mx-auto relative z-10 space-y-8">

                <div className="text-center space-y-4 mb-12">
                    <Crown className="w-12 h-12 text-gold-metallic mx-auto opacity-80" strokeWidth={1} />
                    <p className="text-sm text-white/60 leading-relaxed font-light">
                        청담해화당은 고전적 지혜와 현대적 기술을 잇는<br />
                        프리미엄 운세 컨설팅 부티크입니다.
                    </p>
                </div>

                <div className="grid gap-6">
                    {services.map((service, idx) => (
                        <Link
                            key={idx}
                            href={isGuest ? "/auth/sign-up" : service.href}
                            className="group bg-white/[0.03] border border-white/5 rounded-xl p-6 hover:bg-white/[0.06] hover:border-gold-metallic/30 transition-all duration-300"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-gold-metallic/10 rounded-full text-gold-metallic group-hover:bg-gold-metallic group-hover:text-[#0a0a0a] transition-colors duration-300">
                                    <service.icon className="w-6 h-6" strokeWidth={1.5} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-serif font-bold text-white group-hover:text-gold-metallic transition-colors">{service.title}</h3>
                                    <p className="text-xs text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
                                        {service.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

            </main>
        </div>
    );
}
