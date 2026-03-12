import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { analyzeFortuneAction } from '@/app/actions/ai/fortune-analysis'
import { WeeklyFortuneClient } from './weekly-fortune-client'

export const metadata: Metadata = {
  title: '주간 운세 | 해화당',
  description: '이번 주 당신의 운세를 확인하세요. 매일 달라지는 운명의 흐름을 놓치지 마세요.',
}

export default async function WeeklyFortunePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // 본인 대상 조회
  const targets = await getDestinyTargets()
  const self = targets.find((t) => t.target_type === 'self') ?? targets[0] ?? null

  if (!self?.birth_date) {
    // 사주 정보 없으면 기본 UI만 표시
    return <WeeklyFortuneClient data={null} />
  }

  // AI 주간 운세 분석
  const result = await analyzeFortuneAction(self.id, 'weekly')

  if (!result.success || !result.data) {
    return <WeeklyFortuneClient data={null} />
  }

  const fortune = result.data

  // FortuneResult → WeeklyFortuneData 변환
  // 전체 점수 기반으로 7일 점수 생성 (각 영역 점수 활용)
  const outlookToScore = (outlook: string) => (outlook === '좋음' ? 80 : outlook === '주의' ? 45 : 65)
  const areaScores = fortune.areas.map((a) => outlookToScore(a.outlook))
  const avgArea = areaScores.length > 0 ? Math.round(areaScores.reduce((s, v) => s + v, 0) / areaScores.length) : 65

  // 7일 변동 패턴 (±15 범위)
  const variation = [0, +8, -5, +12, -3, +10, -8]

  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)

  const AREA_LABELS = ['재물운', '애정운', '건강운', '직업운']

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const score = Math.min(100, Math.max(30, avgArea + variation[i]))
    const area = fortune.areas[i % fortune.areas.length]
    return {
      date: date.toISOString().split('T')[0],
      dayOfWeek: i,
      score,
      summary: area?.content?.slice(0, 30) ?? (score >= 70 ? '좋은 기운이 흐릅니다' : '평온한 하루'),
      keyword: score >= 75 ? '길(吉)' : score >= 50 ? '중(中)' : '주의',
      advice: fortune.lucky.advice ?? '긍정적인 마음가짐을 유지하세요.',
      areaLabel: AREA_LABELS[i % AREA_LABELS.length],
    }
  })

  const weeklyData = {
    weekStart: days[0].date,
    weekEnd: days[6].date,
    overallScore: avgArea,
    summary: fortune.summary,
    overall: fortune.overall,
    caution: fortune.caution,
    lucky: fortune.lucky,
    days,
    cached: result.cached ?? false,
  }

  return <WeeklyFortuneClient data={weeklyData} />
}
