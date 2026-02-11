# PHASE 4: 세부 페이지 구현

## 🎯 목표
메인 페이지에서 연결되는 미구현 세부 페이지들을 완성하여 전체 사용자 여정 완성

## ✅ 완료 조건 (Definition of Done)
- [ ] 주간 운세 페이지 구현 및 작동
- [ ] 월간 운세 페이지 구현 및 작동
- [ ] 일일 출석 체크 페이지 구현
- [ ] 행운의 룰렛 페이지 구현
- [ ] 친구 초대 페이지 구현
- [ ] 모든 페이지 모바일 반응형 확인
- [ ] SEO 메타데이터 최적화
- [ ] 페이지 간 내비게이션 원활
- [ ] QA 테스트 전체 통과
- [ ] 코드 리뷰 완료

---

## 📄 페이지 우선순위 및 일정

| 순위 | 페이지 | 경로 | 예상 공수 | 의존성 |
|------|--------|------|-----------|--------|
| 1 | 주간 운세 | `/protected/fortune/weekly` | 2일 | PHASE 1 완료 |
| 2 | 월간 운세 | `/protected/fortune/monthly` | 2일 | 주간 운세 참고 |
| 3 | 일일 출석 | `/protected/events/daily-check` | 1일 | PHASE 1 액션 활용 |
| 4 | 행운의 룰렛 | `/protected/events/roulette` | 3일 | PHASE 1 액션 활용 |
| 5 | 친구 초대 | `/protected/referral` | 2일 | 독립적 |

**총 예상 공수**: 10일 (2주)

---

## 👥 에이전트 임무 할당

### 📄 PAGE 1: 주간 운세 (`/protected/fortune/weekly`)

#### 🎨 FE_VISUAL (Visual Director)
**임무**: 주간 운세 UI 디자인

**디자인 컨셉**:
- 7일 타임라인 형태
- 각 요일별 운세 카드 (오늘은 강조)
- 골드 그라데이션 프로그레스 바 (주간 평균 운)
- 일러스트: 7개 별자리 아이콘

**컴포넌트**: `app/protected/fortune/weekly/page.tsx`

```typescript
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyFortune } from "@/app/actions/fortune-actions";
import { WeeklyFortuneClient } from "./weekly-fortune-client";

export const metadata: Metadata = {
  title: "주간 운세 | 해화당",
  description: "이번 주 당신의 운세를 확인하세요. 매일 달라지는 운명의 흐름을 놓치지 마세요.",
};

export default async function WeeklyFortunePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const weeklyData = await getWeeklyFortune();

  return <WeeklyFortuneClient data={weeklyData} />;
}
```

**클라이언트 컴포넌트**: `app/protected/fortune/weekly/weekly-fortune-client.tsx`

```typescript
"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_KR = ["월", "화", "수", "목", "금", "토", "일"];

interface DayFortune {
  date: string;
  dayOfWeek: number; // 0=월요일, 6=일요일
  score: number; // 0-100
  summary: string;
  keyword: string; // "길(吉)", "흉(凶)", "중(中)"
  advice: string;
}

interface WeeklyFortuneData {
  weekStart: string;
  weekEnd: string;
  overallScore: number;
  days: DayFortune[];
}

export function WeeklyFortuneClient({ data }: { data: WeeklyFortuneData }) {
  const today = new Date().getDay(); // 0=일요일
  const todayIndex = today === 0 ? 6 : today - 1; // 월요일=0으로 변환

  const getTrendIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (score >= 40) return <Minus className="w-4 h-4 text-yellow-400" />;
    return <TrendingDown className="w-4 h-4 text-seal-500" />;
  };

  return (
    <div className="min-h-screen bg-background text-ink-light pb-20">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-ink-light">주간 운세</h1>
        </div>
        <p className="text-sm text-ink-light/60">
          {data.weekStart} ~ {data.weekEnd}
        </p>
      </header>

      {/* Overall Score */}
      <section className="px-6 mb-6">
        <Card className="bg-surface/30 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg font-serif text-primary">이번 주 평균 운세</CardTitle>
          </CardHeader>
          <CardContent>
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
              <span className="text-2xl font-bold text-primary">{data.overallScore}점</span>
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
                    {/* Day Label */}
                    <div className="flex flex-col items-center min-w-[50px]">
                      <span className="text-xs text-ink-light/50">{DAYS_KR[day.dayOfWeek]}</span>
                      <span className="text-lg font-bold text-ink-light">{day.date.split('-')[2]}</span>
                      {isToday && (
                        <Badge className="mt-1 bg-primary/20 text-primary border-primary/30 text-xs">
                          오늘
                        </Badge>
                      )}
                    </div>

                    {/* Fortune Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={cn(
                            "font-serif",
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
                        <span className="text-sm text-primary font-bold">{day.score}점</span>
                      </div>
                      <p className="text-sm text-ink-light/80 mb-1">{day.summary}</p>
                      <p className="text-xs text-ink-light/60 italic">"{day.advice}"</p>
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
```

#### 🛡️ BE_SYSTEM (System Core)
**임무**: 주간 운세 액션 구현

**파일**: `app/actions/fortune-actions.ts` (기존 파일에 추가)

```typescript
export async function getWeeklyFortune() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 이번 주 월요일 계산
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  // 주간 운세 7일 생성 (AI 또는 미리 계산된 데이터)
  const days: DayFortune[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    // TODO: AI 또는 DB에서 실제 운세 조회
    // 임시 더미 데이터
    const score = Math.floor(Math.random() * 50) + 50;
    days.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: i,
      score,
      summary: `오늘은 ${score >= 70 ? "행운의 날" : score >= 40 ? "평온한 날" : "주의가 필요한 날"}입니다.`,
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
```

---

### 📄 PAGE 2: 월간 운세 (`/protected/fortune/monthly`)

#### 🎨 FE_VISUAL (Visual Director)
**임무**: 월간 운세 UI 디자인

**디자인 컨셉**:
- 캘린더 형태 (4-5주)
- 각 날짜 셀에 운세 점수 표시 (히트맵)
- 월간 하이라이트 (최고/최저의 날)
- Recharts로 월간 운세 그래프

**컴포넌트**: `app/protected/fortune/monthly/page.tsx`

```typescript
import { Metadata } from "next";
import { getMonthlyFortune } from "@/app/actions/fortune-actions";
import { MonthlyFortuneClient } from "./monthly-fortune-client";

export const metadata: Metadata = {
  title: "월간 운세 | 해화당",
  description: "이번 달 전체 운세를 한눈에 확인하세요.",
};

export default async function MonthlyFortunePage() {
  const data = await getMonthlyFortune();
  return <MonthlyFortuneClient data={data} />;
}
```

**클라이언트**: `app/protected/fortune/monthly/monthly-fortune-client.tsx`

```typescript
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarRange, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

export function MonthlyFortuneClient({ data }: { data: any }) {
  return (
    <div className="min-h-screen bg-background text-ink-light pb-20">
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-ink-light">월간 운세</h1>
        </div>
        <p className="text-sm text-ink-light/60">{data.month}</p>
      </header>

      {/* Monthly Trend Chart */}
      <section className="px-6 mb-6">
        <Card className="bg-surface/30 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg font-serif text-primary">운세 흐름</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorFortune" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ECB613" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ECB613" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="day" stroke="#8B6E58" />
                <YAxis stroke="#8B6E58" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181611',
                    border: '1px solid #D4AF37',
                    borderRadius: '8px'
                  }}
                />
                <Area type="monotone" dataKey="score" stroke="#ECB613" fillOpacity={1} fill="url(#colorFortune)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Best & Worst Days */}
      <section className="px-6 grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 font-bold">최고의 날</span>
            </div>
            <p className="text-lg font-bold text-ink-light">{data.bestDay.date}일</p>
            <p className="text-xs text-ink-light/60">{data.bestDay.score}점</p>
          </CardContent>
        </Card>

        <Card className="bg-seal-500/10 border-seal-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-seal-500" />
              <span className="text-xs text-seal-500 font-bold">주의할 날</span>
            </div>
            <p className="text-lg font-bold text-ink-light">{data.worstDay.date}일</p>
            <p className="text-xs text-ink-light/60">{data.worstDay.score}점</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
```

---

### 📄 PAGE 3: 일일 출석 체크 (`/protected/events/daily-check`)

#### ⚙️ FE_LOGIC (Client Architect)
**임무**: 출석 체크 페이지 구현 (PHASE 1 액션 재사용)

**파일**: `app/protected/events/daily-check/page.tsx`

```typescript
import { Metadata } from "next";
import { checkDailyAttendance } from "@/app/actions/daily-check-actions";
import { DailyCheckClient } from "./daily-check-client";

export const metadata: Metadata = {
  title: "일일 출석 체크 | 해화당",
  description: "매일 출석하고 부적을 받아가세요!",
};

export default async function DailyCheckPage() {
  const attendanceData = await checkDailyAttendance();
  return <DailyCheckClient initialData={attendanceData} />;
}
```

**클라이언트**: `app/protected/events/daily-check/daily-check-client.tsx`

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift, Calendar, Zap } from "lucide-react";
import { recordDailyAttendance } from "@/app/actions/daily-check-actions";
import { toast } from "sonner";
import Confetti from "react-confetti";

const REWARDS = [
  { day: 1, talisman: 50 },
  { day: 2, talisman: 50 },
  { day: 3, talisman: 150 }, // +100 보너스
  { day: 4, talisman: 50 },
  { day: 5, talisman: 50 },
  { day: 6, talisman: 50 },
  { day: 7, talisman: 550 }, // +500 보너스
];

export function DailyCheckClient({ initialData }: { initialData: any }) {
  const [checked, setChecked] = useState(initialData.checked);
  const [consecutiveDays, setConsecutiveDays] = useState(initialData.consecutiveDays);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleCheckIn = async () => {
    const result = await recordDailyAttendance();

    if (result.success) {
      setChecked(true);
      setConsecutiveDays(result.consecutiveDays);
      setShowConfetti(true);
      toast.success(`출석 완료! 부적 ${result.reward}장 획득!`);

      setTimeout(() => setShowConfetti(false), 5000);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink-light pb-20">
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      <header className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-ink-light">일일 출석 체크</h1>
        </div>
        <p className="text-sm text-ink-light/60">매일 출석하고 부적을 모아보세요!</p>
      </header>

      {/* Consecutive Days */}
      <section className="px-6 mb-6">
        <Card className="bg-primary/10 border-primary/30 p-6 text-center">
          <Zap className="w-12 h-12 text-primary mx-auto mb-3" />
          <p className="text-sm text-ink-light/60 mb-2">연속 출석</p>
          <p className="text-4xl font-bold text-primary">{consecutiveDays}일</p>
        </Card>
      </section>

      {/* Check-In Button */}
      <section className="px-6 mb-6">
        <Button
          onClick={handleCheckIn}
          disabled={checked}
          className="w-full h-16 bg-primary hover:bg-primary/90 text-ink-900 font-bold text-lg"
        >
          {checked ? "오늘 출석 완료 ✓" : "출석 체크하기"}
        </Button>
      </section>

      {/* Reward Calendar */}
      <section className="px-6">
        <h2 className="text-lg font-serif font-bold text-ink-light mb-4">출석 보상 캘린더</h2>
        <div className="grid grid-cols-7 gap-2">
          {REWARDS.map((reward, idx) => {
            const isCompleted = consecutiveDays > idx;
            const isCurrent = consecutiveDays === idx && checked;

            return (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={`
                  aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                  ${isCompleted ? "bg-primary/20 border-primary" : "bg-surface/20 border-white/10"}
                  ${isCurrent ? "ring-2 ring-primary animate-pulse" : ""}
                `}
              >
                <span className="text-xs text-ink-light/60 mb-1">{reward.day}일</span>
                <Gift className={`w-4 h-4 ${isCompleted ? "text-primary" : "text-ink-light/30"}`} />
                <span className="text-xs font-bold text-primary mt-1">{reward.talisman}장</span>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
```

---

### 📄 PAGE 4: 행운의 룰렛 (`/protected/events/roulette`)

#### 🎨 FE_VISUAL (Visual Director)
**임무**: 룰렛 애니메이션 구현

**라이브러리**: `react-wheel-of-prizes` 또는 커스텀 CSS 애니메이션

**파일**: `app/protected/events/roulette/page.tsx`

```typescript
import { Metadata } from "next";
import { checkRouletteAvailability } from "@/app/actions/roulette-actions";
import { RouletteClient } from "./roulette-client";

export const metadata: Metadata = {
  title: "행운의 룰렛 | 해화당",
  description: "매일 1회 무료! 행운을 시험해보세요!",
};

export default async function RoulettePage() {
  const availability = await checkRouletteAvailability();
  return <RouletteClient initialAvailability={availability} />;
}
```

**클라이언트**: `app/protected/events/roulette/roulette-client.tsx`

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { spinRoulette } from "@/app/actions/roulette-actions";
import { toast } from "sonner";
import Confetti from "react-confetti";

export function RouletteClient({ initialAvailability }: { initialAvailability: any }) {
  const [canSpin, setCanSpin] = useState(initialAvailability.canSpin);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [rotation, setRotation] = useState(0);

  const handleSpin = async () => {
    setIsSpinning(true);

    // 회전 애니메이션 (5바퀴 + 랜덤)
    const spinDegrees = 360 * 5 + Math.random() * 360;
    setRotation(prev => prev + spinDegrees);

    // 서버에서 결과 받기
    const spinResult = await spinRoulette();

    setTimeout(() => {
      setIsSpinning(false);

      if (spinResult.success) {
        setResult(spinResult.reward);
        setCanSpin(false);
        toast.success(`축하합니다! ${spinResult.reward.type === 'talisman' ? `부적 ${spinResult.reward.value}장` : '프리미엄 30일'} 획득!`);
      } else {
        toast.error(spinResult.error);
      }
    }, 3000); // 3초 후 결과 표시
  };

  return (
    <div className="min-h-screen bg-background text-ink-light pb-20 flex flex-col items-center justify-center">
      {result && <Confetti recycle={false} numberOfPieces={300} />}

      <h1 className="text-3xl font-serif font-bold text-primary mb-8">행운의 룰렛</h1>

      {/* Roulette Wheel */}
      <motion.div
        animate={{ rotate: rotation }}
        transition={{ duration: 3, ease: "easeOut" }}
        className="w-80 h-80 rounded-full border-8 border-primary relative bg-gradient-to-r from-gold-500 via-gold-600 to-gold-500"
        style={{
          background: `conic-gradient(
            from 0deg,
            #ef4444 0deg 72deg,
            #f59e0b 72deg 144deg,
            #10b981 144deg 216deg,
            #3b82f6 216deg 288deg,
            #8b5cf6 288deg 360deg
          )`
        }}
      >
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-white z-10" />
      </motion.div>

      {/* Spin Button */}
      <Button
        onClick={handleSpin}
        disabled={!canSpin || isSpinning}
        className="mt-8 w-48 h-14 bg-primary hover:bg-primary/90 text-ink-900 font-bold text-lg"
      >
        {isSpinning ? "회전 중..." : canSpin ? "룰렛 돌리기" : "내일 다시 도전"}
      </Button>

      {!canSpin && !isSpinning && (
        <p className="text-sm text-ink-light/60 mt-4">
          다음 도전: {new Date(initialAvailability.nextAvailableTime).toLocaleString('ko-KR')}
        </p>
      )}
    </div>
  );
}
```

---

### 📄 PAGE 5: 친구 초대 (`/protected/referral`)

#### ⚙️ FE_LOGIC (Client Architect)
**임무**: 초대 시스템 구현

**파일**: `app/protected/referral/page.tsx`

```typescript
import { Metadata } from "next";
import { getReferralStats } from "@/app/actions/referral-actions";
import { ReferralClient } from "./referral-client";

export const metadata: Metadata = {
  title: "친구 초대 | 해화당",
  description: "친구를 초대하고 함께 부적을 받아가세요!",
};

export default async function ReferralPage() {
  const stats = await getReferralStats();
  return <ReferralClient stats={stats} />;
}
```

**Server Action**: `app/actions/referral-actions.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { addTalisman } from "./wallet-actions";

export async function getReferralStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "로그인 필요" };

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, referral_count')
    .eq('id', user.id)
    .single();

  return {
    success: true,
    referralCode: profile?.referral_code || user.id.substring(0, 8).toUpperCase(),
    referralCount: profile?.referral_count || 0,
    totalReward: (profile?.referral_count || 0) * 500
  };
}

export async function generateReferralLink() {
  const stats = await getReferralStats();
  if (!stats.success) return null;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://haehwadang.com";
  return `${baseUrl}/signup?ref=${stats.referralCode}`;
}
```

**클라이언트**: `app/protected/referral/referral-client.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Share2, Copy, Users, Gift } from "lucide-react";
import { toast } from "sonner";

export function ReferralClient({ stats }: { stats: any }) {
  const referralLink = `${window.location.origin}/signup?ref=${stats.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("초대 링크가 복사되었습니다!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "해화당 초대",
        text: "AI 운세 플랫폼 해화당에 함께 가입하고 부적 500장 받아가세요!",
        url: referralLink
      });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-background text-ink-light pb-20">
      <header className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-ink-light">친구 초대</h1>
        </div>
        <p className="text-sm text-ink-light/60">친구와 함께 부적 500장씩 받아가세요!</p>
      </header>

      {/* Stats */}
      <section className="px-6 mb-6 grid grid-cols-2 gap-3">
        <Card className="bg-surface/30 border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-ink-light/60">초대한 친구</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.referralCount}명</p>
        </Card>

        <Card className="bg-surface/30 border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-xs text-ink-light/60">획득 부적</span>
          </div>
          <p className="text-2xl font-bold text-primary">{stats.totalReward}장</p>
        </Card>
      </section>

      {/* Referral Link */}
      <section className="px-6 mb-6">
        <Card className="bg-primary/10 border-primary/30 p-6">
          <p className="text-sm text-ink-light/60 mb-3">내 초대 코드</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-surface border border-primary/30 rounded px-3 py-2 text-sm text-ink-light"
            />
            <Button onClick={handleCopy} size="sm" className="bg-primary hover:bg-primary/90">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </section>

      {/* Share Button */}
      <section className="px-6">
        <Button
          onClick={handleShare}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-ink-900 font-bold text-lg flex items-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          친구 초대하기
        </Button>
      </section>

      {/* How It Works */}
      <section className="px-6 mt-8">
        <h2 className="text-lg font-serif font-bold text-ink-light mb-4">초대 방법</h2>
        <ol className="space-y-3 text-sm text-ink-light/80">
          <li>1. 위 초대 링크를 친구에게 공유하세요</li>
          <li>2. 친구가 링크를 통해 가입하면 자동 인증됩니다</li>
          <li>3. 친구가 첫 운세를 체험하면 부적 500장씩 지급!</li>
          <li>4. 최대 20명까지 초대 가능 (총 10,000장)</li>
        </ol>
      </section>
    </div>
  );
}
```

---

## 🔧 구현 순서

### Week 1 (Day 1-2): 주간/월간 운세
1. FE_VISUAL + BE_SYSTEM: 주간 운세 구현
2. FE_VISUAL: 월간 운세 구현

### Week 1 (Day 3-4): 이벤트 페이지 (출석, 룰렛)
1. FE_LOGIC: 일일 출석 페이지
2. FE_VISUAL: 룰렛 페이지

### Week 2 (Day 1): 친구 초대
1. FE_LOGIC + BE_SYSTEM: 친구 초대 시스템

### Week 2 (Day 2-3): 통합 & 테스트
1. 전체 페이지 통합
2. SHERLOCK: QA 테스트

### Week 2 (Day 4): 디버깅 & 문서화
1. 버그 수정
2. LIBRARIAN: 문서 업데이트

---

## ✅ Phase 4 완료 승인 기준

- [ ] 5개 페이지 모두 구현 완료
- [ ] 모바일 반응형 확인
- [ ] 페이지 간 내비게이션 원활
- [ ] SEO 메타데이터 적용
- [ ] QA 테스트 통과
- [ ] 문서화 완료

**승인자**: 👑 CLAUDE (Project Lead)

---

**프로젝트 완료!** 🎉
모든 PHASE 완료 후 전체 통합 테스트 및 프로덕션 배포
