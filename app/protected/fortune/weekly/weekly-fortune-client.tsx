"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown, Minus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BrandQuote } from "@/components/ui/BrandQuote";
import { BRAND_QUOTES } from "@/lib/constants/brand-quotes";

const DAYS_KR = ["월", "화", "수", "목", "금", "토", "일"];

interface DayFortune {
  date: string;
  dayOfWeek: number;
  score: number;
  summary: string;
  keyword: string;
  advice: string;
}

interface WeeklyFortuneData {
  weekStart: string;
  weekEnd: string;
  overallScore: number;
  days: DayFortune[];
}

export function WeeklyFortuneClient({ data }: { data: WeeklyFortuneData }) {
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  const getTrendIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className="w-4 h-4 text-green-400" strokeWidth={1} />;
    if (score >= 40) return <Minus className="w-4 h-4 text-yellow-400" strokeWidth={1} />;
    return <TrendingDown className="w-4 h-4 text-seal-500" strokeWidth={1} />;
  };

  return (
    <div className="min-h-screen bg-background text-ink-light pb-20">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <Link href="/protected" className="inline-flex items-center gap-2 text-ink-light/60 hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1} />
          <span className="text-sm font-light">돌아가기</span>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-6 h-6 text-primary" strokeWidth={1} />
          <h1 className="text-2xl font-serif font-light text-ink-light">주간 운세</h1>
        </div>
        <BrandQuote variant="section" className="mb-3">
          {BRAND_QUOTES.fortune.weekly}
        </BrandQuote>
        <p className="text-sm text-ink-light/60 font-light">
          {data.weekStart} ~ {data.weekEnd}
        </p>
      </header>

      {/* Overall Score */}
      <section className="px-6 mb-6">
        <Card className="bg-surface/30 border-primary/20">
          <CardContent className="p-6">
            <h3 className="text-lg font-serif font-light text-primary mb-4">이번 주 평균 운세</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 bg-ink-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.overallScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-gold-600"
                  />
                </div>
              </div>
              <span className="text-2xl font-light text-primary">{data.overallScore}점</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily Timeline */}
      <section className="px-6 space-y-4">
        {data.days.map((day, idx) => {
          const isToday = idx === todayIndex;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                className={cn(
                  "border transition-all",
                  isToday
                    ? "bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(236,182,19,0.3)]"
                    : "bg-surface/20 border-white/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center min-w-[50px]">
                      <span className="text-xs text-ink-light/50 font-light">{DAYS_KR[day.dayOfWeek]}</span>
                      <span className="text-lg font-light text-ink-light">{day.date.split('-')[2]}</span>
                      {isToday && (
                        <Badge className="mt-1 bg-primary/20 text-primary border-primary/30 text-xs font-light">
                          오늘
                        </Badge>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={cn(
                            "font-serif font-light",
                            day.keyword === "길(吉)"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : day.keyword === "흉(凶)"
                              ? "bg-seal-500/20 text-seal-500 border-seal-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          )}
                        >
                          {day.keyword}
                        </Badge>
                        {getTrendIcon(day.score)}
                        <span className="text-sm text-primary font-light">{day.score}점</span>
                      </div>
                      <p className="text-sm text-ink-light/80 mb-1 font-light">{day.summary}</p>
                      <p className="text-xs text-ink-light/60 italic font-light">"{day.advice}"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
