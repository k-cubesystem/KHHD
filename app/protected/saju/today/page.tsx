import { Sun, Calendar, TrendingUp, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function TodayFortunePage() {
    const today = new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                    <Sun className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Daily Fortune</span>
                </div>
                <h1 className="text-4xl font-black">
                    <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
                        오늘의 운세
                    </span>
                </h1>
                <p className="text-muted-foreground">{today}</p>
            </div>

            {/* Coming Soon Notice */}
            <Card className="p-12 bg-white/5 border-white/10 text-center">
                <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-[#D4AF37]" />
                    </div>
                    <h2 className="text-xl font-bold">서비스 준비 중</h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        매일 새벽, 당신의 사주에 맞춘 오늘의 운세가 업데이트됩니다.
                        <br />곧 만나보실 수 있습니다.
                    </p>
                </div>
            </Card>

            {/* Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-white/5 border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <span className="text-sm font-bold">총운</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-3/4 h-full bg-gradient-to-r from-[#D4AF37] to-[#F4E4BA]" />
                    </div>
                    <p className="text-xs text-muted-foreground">75점</p>
                </Card>
                <Card className="p-6 bg-white/5 border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-pink-400" />
                        <span className="text-sm font-bold">연애운</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-4/5 h-full bg-gradient-to-r from-pink-400 to-pink-300" />
                    </div>
                    <p className="text-xs text-muted-foreground">80점</p>
                </Card>
                <Card className="p-6 bg-white/5 border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-bold">금전운</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-2/3 h-full bg-gradient-to-r from-blue-400 to-blue-300" />
                    </div>
                    <p className="text-xs text-muted-foreground">65점</p>
                </Card>
            </div>
        </div>
    );
}
