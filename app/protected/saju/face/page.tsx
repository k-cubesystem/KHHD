import { Scan, Upload, Eye, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function FaceReadingPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                    <Scan className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Face Reading</span>
                </div>
                <h1 className="text-4xl font-black">
                    <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                        관상
                    </span>
                </h1>
                <p className="text-muted-foreground">얼굴에 새겨진 운명의 지도</p>
            </div>

            {/* Upload Area */}
            <Card className="p-8 bg-white/5 border-white/10 border-dashed border-2">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                        <Upload className="w-10 h-10 text-[#D4AF37]" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold">관상 사진 업로드</h2>
                        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                            정면 얼굴 사진을 업로드하시면 AI가 관상을 분석합니다.
                            <br />이마, 눈썹, 눈, 코, 입, 귀의 형태를 종합적으로 판단합니다.
                        </p>
                    </div>

                    <Button disabled className="bg-white/10 text-muted-foreground font-bold px-8">
                        <Sparkles className="w-4 h-4 mr-2" />
                        서비스 준비 중
                    </Button>
                </div>
            </Card>

            {/* Analysis Points */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { icon: Eye, label: "눈", desc: "지혜와 통찰력" },
                    { icon: Scan, label: "이마", desc: "초년운과 학업" },
                    { icon: Scan, label: "코", desc: "재물운과 건강" },
                ].map((item, i) => (
                    <Card key={i} className="p-5 bg-white/5 border-white/10 text-center">
                        <item.icon className="w-6 h-6 text-[#D4AF37] mx-auto mb-2" />
                        <p className="font-bold text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
}
