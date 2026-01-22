import { Hand, Upload, Heart, Brain, Coins } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PalmReadingPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                    <Hand className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Palm Reading</span>
                </div>
                <h1 className="text-4xl font-black">
                    <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                        손금
                    </span>
                </h1>
                <p className="text-muted-foreground">손바닥에 그려진 인생의 설계도</p>
            </div>

            {/* Upload Area */}
            <Card className="p-8 bg-white/5 border-white/10 border-dashed border-2">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                        <Upload className="w-10 h-10 text-[#D4AF37]" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold">손금 사진 업로드</h2>
                        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                            왼손 손바닥 전체가 보이는 사진을 업로드하세요.
                            <br />생명선, 두뇌선, 감정선, 운명선을 분석합니다.
                        </p>
                    </div>

                    <Button disabled className="bg-white/10 text-muted-foreground font-bold px-8">
                        서비스 준비 중
                    </Button>
                </div>
            </Card>

            {/* Palm Lines */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: Heart, label: "생명선", color: "text-red-400" },
                    { icon: Brain, label: "두뇌선", color: "text-blue-400" },
                    { icon: Heart, label: "감정선", color: "text-pink-400" },
                    { icon: Coins, label: "운명선", color: "text-yellow-400" },
                ].map((item, i) => (
                    <Card key={i} className="p-4 bg-white/5 border-white/10 text-center">
                        <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-2`} />
                        <p className="font-bold text-sm">{item.label}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
}
