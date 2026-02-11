import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WeeklyFortuneClient } from "./weekly-fortune-client";

export const metadata: Metadata = {
  title: "주간 운세 | 해화당",
  description: "이번 주 당신의 운세를 확인하세요. 매일 달라지는 운명의 흐름을 놓치지 마세요.",
};

// 임시 주간 운세 데이터 생성
function generateWeeklyFortune() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const score = Math.floor(Math.random() * 50) + 50;
    days.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: i,
      score,
      summary: score >= 70 ? "행운의 날입니다" : score >= 40 ? "평온한 하루" : "주의가 필요한 날",
      keyword: score >= 70 ? "길(吉)" : score >= 40 ? "중(中)" : "흉(凶)",
      advice: "긍정적인 마음가짐을 유지하세요."
    });
  }

  const overallScore = Math.round(days.reduce((acc, d) => acc + d.score, 0) / 7);

  return {
    weekStart: days[0].date,
    weekEnd: days[6].date,
    overallScore,
    days
  };
}

export default async function WeeklyFortunePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const weeklyData = generateWeeklyFortune();

  return <WeeklyFortuneClient data={weeklyData} />;
}
