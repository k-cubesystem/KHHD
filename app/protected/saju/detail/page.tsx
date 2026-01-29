import { BookOpen, Layers, Hexagon } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SajuDetailPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 backdrop-blur-sm">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Four Pillars</span>
                </div>
                <h1 className="text-4xl font-serif font-bold text-ink-light italic">
                    <span className="text-ink-light">사주 풀이</span>
                </h1>
                <p className="text-ink-light/60">년·월·일·시의 네 기둥으로 읽는 당신의 운명</p>
            </div>

            {/* Main Card */}
            <Card className="p-8 bg-surface/30 border-primary/20 backdrop-blur-md rounded-none shadow-xl">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Layers className="w-10 h-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-serif font-bold text-ink-light">사주팔자 분석</h2>
                        <p className="text-ink-light/60 text-sm max-w-lg mx-auto font-sans leading-relaxed">
                            태어난 연도, 월, 일, 시간의 천간(天干)과 지지(地支)를 분석하여
                            타고난 성격, 재능, 운세의 흐름을 파악합니다.
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link href="/protected/profile/manse">
                            <Button className="bg-primary text-background hover:bg-primary-light font-serif font-bold px-8 rounded-none shadow-lg transition-all h-12">
                                <Hexagon className="w-4 h-4 mr-2" />
                                내 사주 보러가기
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-5 bg-surface/20 border-primary/20 rounded-none hover:bg-surface/30 transition-colors">
                    <p className="text-xs text-primary font-bold mb-1 uppercase tracking-widest">천간 (天干)</p>
                    <p className="font-bold text-ink-light font-serif text-lg">갑·을·병·정·무·기·경·신·임·계</p>
                </Card>
                <Card className="p-5 bg-surface/20 border-primary/20 rounded-none hover:bg-surface/30 transition-colors">
                    <p className="text-xs text-primary font-bold mb-1 uppercase tracking-widest">지지 (地支)</p>
                    <p className="font-bold text-ink-light font-serif text-lg">자·축·인·묘·진·사·오·미·신·유·술·해</p>
                </Card>
            </div>
        </div>
    );
}
