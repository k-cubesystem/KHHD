import { AdminCard } from '@/components/admin/ui/admin-card'
import { StatStrip, StatTile } from '@/components/admin/ui/stat-tile'
import { ActiveUsersChart } from '@/components/admin/monitoring-charts'
import { analysisCategoryLabel } from '@/lib/domain/analysis/category-labels'
import type { MonitoringStats } from '@/app/actions/admin/monitoring'
import { Users, PieChart } from 'lucide-react'

/**
 * 「서비스 지표」 — 분석 화면의 한 구획.
 *
 * ## 🔴 왜 여기로 옮겼나
 * `/admin/monitoring` 이라는 화면이 따로 있었는데 **메뉴에 없었다**(app/admin/layout.tsx 의
 * menuItems 에 링크가 없다). 링크 없는 화면에 매출·AI 호출·에러율이 또 그려져 있었고,
 * 그 셋은 각각 **분석**과 **Gemini 사용량** 화면이 이미 보여 준다. 같은 숫자를 두 곳에서
 * 계산하면 값이 갈릴 때 어느 쪽이 맞는지 아무도 모른다.
 *
 * 그래서 겹치는 것은 버리고, **거기에만 있던 둘**을 여기로 들여왔다 —
 *   · DAU/WAU/MAU (풀이를 **실제로 돌린** 사람 수. 방문자·세션과 다른 숫자다)
 *   · 분석 카테고리 분포 (무엇이 팔리는가)
 */
export function ServiceMetrics({ stats }: { stats: MonitoringStats }) {
  const { activeUsers, topCategories, dailyUsers } = stats
  const totalAnalyses = topCategories.reduce((s, c) => s + c.count, 0)

  return (
    <div className="space-y-3">
      <StatStrip>
        <StatTile label="DAU (오늘)" value={activeUsers.dau} unit="명" tone="accent" hint="오늘 풀이를 본 사람" />
        <StatTile label="WAU (7일)" value={activeUsers.wau} unit="명" />
        <StatTile label="MAU (30일)" value={activeUsers.mau} unit="명" />
        <StatTile label="분석 건수 (30일)" value={totalAnalyses} unit="건" hint="카테고리 합계" />
      </StatStrip>

      <AdminCard
        title="일별 활성 회원 · 분석 수"
        subtitle="최근 30일. 방문자 추세와 달리 «풀이를 돌린» 사람만 센다."
        icon={<Users className="h-4 w-4 text-gold-500" aria-hidden />}
      >
        <ActiveUsersChart data={dailyUsers} />
      </AdminCard>

      <AdminCard
        title="분석 카테고리 분포"
        subtitle="최근 30일 · 무엇이 팔리는가"
        icon={<PieChart className="h-4 w-4 text-gold-500" aria-hidden />}
      >
        {topCategories.length === 0 ? (
          <p className="py-8 text-center font-sans text-sm text-ink-primary/40">아직 분석 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {topCategories.map((cat, idx) => {
              const pct = totalAnalyses > 0 ? Math.round((cat.count / totalAnalyses) * 100) : 0
              return (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="w-4 text-right font-sans text-[11px] text-ink-primary/40 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      {/* 🔴 이름은 lib/domain/analysis/category-labels.ts 단일 출처.
                          화면이 직접 표를 들고 있으면 새 카테고리가 «SAMHAP» 처럼 영문으로 샌다. */}
                      <span className="font-sans text-[11.5px] text-ink-primary/70">
                        {analysisCategoryLabel(cat.category)}
                      </span>
                      <span className="font-mono text-[11px] text-ink-primary/55 tabular-nums">
                        {cat.count.toLocaleString('ko-KR')}건 ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full bg-gold-500/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </AdminCard>
    </div>
  )
}
