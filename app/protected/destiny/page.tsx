import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Wand2, Home, Heart, Sparkles, ChevronRight,
    Crown, Sofa, Users, Zap
} from "lucide-react";

const SOLUTIONS = [
    {
        id: "face",
        title: "AI 관상 개운",
        subtitle: "Face Destiny Hacking",
        description: "당신의 관상을 분석하고, 원하는 운(재물/연애/권위)을 강화하는 방법을 알려드립니다.",
        icon: Crown,
        href: "/protected/destiny/face",
        gradient: "from-purple-500 to-pink-500",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
    },
    {
        id: "interior",
        title: "AI 풍수 인테리어",
        subtitle: "Space Butler",
        description: "방 사진을 분석하고, 원하는 기운(재물/사랑/건강)이 가득한 인테리어를 제안합니다.",
        icon: Sofa,
        href: "/protected/destiny/interior",
        gradient: "from-emerald-500 to-teal-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
    },
    {
        id: "invite",
        title: "궁합 초대",
        subtitle: "Viral Invite",
        description: "소중한 사람에게 초대 링크를 보내고, 즉석에서 두 사람의 궁합을 확인하세요.",
        icon: Heart,
        href: "/protected/invite",
        gradient: "from-pink-500 to-rose-500",
        bgColor: "bg-pink-500/10",
        borderColor: "border-pink-500/20",
    },
];

export default function DestinyPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-purple-500/20 border border-[#D4AF37]/30">
                    <Zap className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Destiny Solutions</span>
                </div>
                <h1 className="text-4xl font-black">
                    <span className="bg-gradient-to-r from-[#D4AF37] via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        AI 개운 솔루션
                    </span>
                </h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    읽는 운세를 넘어, 보여주는 솔루션으로.
                    <br />AI가 당신의 운명을 시각적으로 개선하는 방법을 제안합니다.
                </p>
            </div>

            {/* Solutions Grid */}
            <div className="grid gap-6">
                {SOLUTIONS.map((solution) => (
                    <Link key={solution.id} href={solution.href}>
                        <Card className={`p-6 ${solution.bgColor} ${solution.borderColor} hover:scale-[1.02] transition-all cursor-pointer group`}>
                            <div className="flex items-start gap-6">
                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${solution.gradient} flex-shrink-0`}>
                                    <solution.icon className="w-8 h-8 text-white" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                                {solution.subtitle}
                                            </p>
                                            <h3 className="text-xl font-bold">{solution.title}</h3>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {solution.description}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Premium Badge */}
            <Card className="p-6 bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Sparkles className="w-8 h-8 text-[#D4AF37]" />
                        <div>
                            <h3 className="font-bold">프리미엄 기능</h3>
                            <p className="text-sm text-muted-foreground">
                                AI 분석에는 크레딧이 사용됩니다
                            </p>
                        </div>
                    </div>
                    <Link href="/protected/profile">
                        <Button variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
                            크레딧 충전
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
}
