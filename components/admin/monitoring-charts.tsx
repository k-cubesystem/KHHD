'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DailyActiveUsers } from '@/app/actions/admin/monitoring'

/**
 * 분석 화면의 「일별 활성 회원·분석 수」 그래프.
 *
 * ## 🔴 여기 있던 셋을 지웠다 (2026-08-19)
 * `RevenueChart` · `LatencyChart` · `CategoryPieChart` 는 링크 없는 `/admin/monitoring`
 * 에서만 쓰였고, 셋 다 다른 화면이 이미 같은 것을 그리고 있었다 —
 * 매출은 **분석**, 응답시간은 **Gemini 사용량**, 카테고리 분포는 옆 카드의 막대 목록.
 * 게다가 `CategoryPieChart` 는 라벨 표를 **따로 들고 있어** SAMHAP·THEME 가 영문으로 샜다
 * (이름의 단일 출처는 `lib/domain/analysis/category-labels.ts`).
 */

/** 축·격자 색 — 제품 팔레트(ink/gold). 예전엔 stone 계열 hex 를 직접 박아 두었다. */
const AXIS_TICK = { fill: 'rgba(226,213,181,0.45)', fontSize: 10 }
const GRID_STROKE = 'rgba(226,213,181,0.10)'

const tooltipStyle = {
  backgroundColor: '#16140F',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '8px',
  color: '#E2D5B5',
  fontSize: '12px',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function ActiveUsersChart({ data }: { data: DailyActiveUsers[] }) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    DAU: d.dau,
    분석수: d.analyses,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(226,213,181,0.55)' }} />
        <Line type="monotone" dataKey="DAU" stroke="#7c9eb0" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="분석수" stroke="#c9a96e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
