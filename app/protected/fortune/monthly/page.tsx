import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BrandQuote } from "@/components/ui/BrandQuote";
import { BRAND_QUOTES } from "@/lib/constants/brand-quotes";

export const metadata: Metadata = {
  title: "월간 운세 | 해화당",
  description: "이번 달 전체 운세를 한눈에 확인하세요.",
};

export default function MonthlyFortunePage() {
  return (
    <div className="min-h-screen bg-background text-ink-light pb-20">
      <header className="px-6 pt-12 pb-6">
        <Link href="/protected" className="inline-flex items-center gap-2 text-ink-light/60 hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1} />
          <span className="text-sm font-light">돌아가기</span>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="w-6 h-6 text-primary" strokeWidth={1} />
          <h1 className="text-2xl font-serif font-light text-ink-light">월간 운세</h1>
        </div>
        <BrandQuote variant="section" className="mb-3">
          {BRAND_QUOTES.fortune.monthly}
        </BrandQuote>
        <p className="text-sm text-ink-light/60 font-light">{new Date().getFullYear()}년 {new Date().getMonth() + 1}월</p>
      </header>

      <section className="px-6">
        <Card className="bg-surface/30 border-primary/20">
          <CardContent className="p-12 text-center">
            <CalendarRange className="w-16 h-16 text-primary/50 mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-serif font-light text-ink-light mb-2">월간 운세 준비 중</h3>
            <p className="text-sm text-ink-light/60 font-light">곧 업데이트됩니다</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
