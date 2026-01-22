import { BookOpen, Layers, Hexagon } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SajuDetailPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                    <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Four Pillars</span>
                </div>
                <h1 className="text-4xl font-black">
                    <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                        사주 풀이
                    </span>
                </h1>
                <p className="text-muted-foreground">년·월·일·시의 네 기둥으로 읽는 당신의 운명</p>
            </div>

            {/* Main Card */}
            <Card className="p-8 bg-white/5 border-white/10">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                        <Layers className="w-10 h-10 text-[#D4AF37]" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold">사주팔자 분석</h2>
                        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                            태어난 연도, 월, 일, 시간의 천간(天干)과 지지(地支)를 분석하여
                            타고난 성격, 재능, 운세의 흐름을 파악합니다.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link href="/protected/profile/manse">
                            <Button className="bg-[#D4AF37] text-black hover:bg-[#F4E4BA] font-bold px-8">
                                <Hexagon className="w-4 h-4 mr-2" />
                                내 사주 보러가기
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-5 bg-white/5 border-white/10">
                    <p className="text-xs text-muted-foreground mb-1">천간 (天干)</p>
                    <p className="font-bold">갑·을·병·정·무·기·경·신·임·계</p>
                </Card>
                <Card className="p-5 bg-white/5 border-white/10">
                    <p className="text-xs text-muted-foreground mb-1">지지 (地支)</p>
                    <p className="font-bold">자·축·인·묘·진·사·오·미·신·유·술·해</p>
                </Card>
            </div>
        </div>
    );
}
