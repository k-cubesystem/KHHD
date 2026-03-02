import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getSajuData } from '@/lib/domain/saju/saju'
import { KnowledgeGraphClient } from './knowledge-graph-client'

export const metadata = {
  title: '명리학 관계도 | 해화당',
  description: '오행·천간·지지·십성의 상호 관계를 인터랙티브 그래프로 탐색합니다.',
}

async function getUserSajuNodes(): Promise<Set<string> | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('birth_date, birth_time, calendar_type')
      .eq('id', user.id)
      .single()

    if (!profile?.birth_date) return null

    const saju = getSajuData(profile.birth_date, profile.birth_time || '12:00', profile.calendar_type === 'solar')

    const nodes = new Set<string>()

    // 천간 추가
    const pillars = saju.pillars
    nodes.add(pillars.year.gan)
    nodes.add(pillars.month.gan)
    nodes.add(pillars.day.gan)
    nodes.add(pillars.hour.gan)
    // 지지 추가
    nodes.add(pillars.year.zhi)
    nodes.add(pillars.month.zhi)
    nodes.add(pillars.day.zhi)
    nodes.add(pillars.hour.zhi)
    // 오행 추가
    Object.keys(saju.elementsDistribution).forEach((e) => {
      if (saju.elementsDistribution[e] > 0) nodes.add(e)
    })

    return nodes
  } catch {
    return null
  }
}

export default async function KnowledgeGraphPage() {
  const userNodes = await getUserSajuNodes()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 헤더 */}
      <div className="border-b border-amber-900/30 bg-gray-900/50 backdrop-blur-sm px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-amber-300">명리학 관계도</h1>
            <p className="text-gray-500 text-sm mt-0.5">오행 · 천간 · 지지의 상생상극, 합충형파해 관계를 탐색합니다</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {userNodes ? (
              <span className="flex items-center gap-1.5 text-amber-400/80 bg-amber-900/20 border border-amber-800/30 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />내 사주 하이라이트 활성
              </span>
            ) : (
              <span className="text-gray-600">프로필 설정 시 내 사주 하이라이트</span>
            )}
          </div>
        </div>
      </div>

      {/* 메인 그래프 영역 */}
      <div className="max-w-screen-2xl mx-auto px-4 py-4" style={{ height: 'calc(100vh - 85px)' }}>
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
              <div className="text-amber-400/60 text-sm animate-pulse">관계도 로딩 중...</div>
            </div>
          }
        >
          <KnowledgeGraphClient userNodes={userNodes} />
        </Suspense>
      </div>
    </div>
  )
}
