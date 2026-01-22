import { Compass, MapPin, Home, Wind } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function FengshuiPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                    <Compass className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Feng Shui</span>
                </div>
                <h1 className="text-4xl font-black">
                    <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                        풍수
                    </span>
                </h1>
                <p className="text-muted-foreground">땅의 기운이 삶에 미치는 영향</p>
            </div>

            {/* Address Input */}
            <Card className="p-8 bg-white/5 border-white/10">
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-[#D4AF37]/10">
                            <Home className="w-6 h-6 text-[#D4AF37]" />
                        </div>
                        <div>
                            <h2 className="font-bold">거주지 풍수 분석</h2>
                            <p className="text-sm text-muted-foreground">현재 거주하시는 곳의 지기(地氣)를 분석합니다</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="address" className="text-xs text-muted-foreground uppercase">주소 입력</Label>
                        <div className="flex gap-3">
                            <Input
                                id="address"
                                placeholder="예: 서울시 강남구 청담동..."
                                className="bg-black/30 border-white/10 flex-1"
                                disabled
                            />
                            <Button disabled className="bg-white/10 text-muted-foreground">
                                <MapPin className="w-4 h-4 mr-2" />
                                분석
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">* 서비스 준비 중입니다</p>
                    </div>
                </div>
            </Card>

            {/* Fengshui Elements */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "좌청룡", desc: "동쪽", color: "text-blue-400" },
                    { label: "우백호", desc: "서쪽", color: "text-white" },
                    { label: "전주작", desc: "남쪽", color: "text-red-400" },
                    { label: "후현무", desc: "북쪽", color: "text-gray-400" },
                ].map((item, i) => (
                    <Card key={i} className="p-4 bg-white/5 border-white/10 text-center">
                        <Wind className={`w-5 h-5 ${item.color} mx-auto mb-2`} />
                        <p className="font-bold text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
}
