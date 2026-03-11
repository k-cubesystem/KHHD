'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { DailyRevenue, DailyActiveUsers, CategoryStat, GeminiStats } from '@/app/actions/admin/monitoring'

const PASTEL_COLORS = ['#c9a96e', '#7c9eb0', '#9b8fc2', '#6eac89', '#c97c7c', '#c2a56e', '#7cb8c9', '#b09b8f']

const tooltipStyle = {
  backgroundColor: '#1c1917',
  border: '1px solid rgba(120,113,108,0.3)',
  borderRadius: '8px',
  color: '#e7e5e4',
  fontSize: '12px',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    매출: d.amount,
    건수: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.15)" />
        <XAxis dataKey="date" tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
        <YAxis
          tick={{ fill: '#78716c', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 10000)}만` : String(v))}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toLocaleString()}원`, '매출']} />
        <Bar dataKey="매출" fill="#c9a96e" radius={[3, 3, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.15)" />
        <XAxis dataKey="date" tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={{ fill: '#78716c', fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#a8a29e' }} />
        <Line type="monotone" dataKey="DAU" stroke="#7c9eb0" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="분석수" stroke="#c9a96e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  SAJU: '사주',
  FACE: '관상',
  HAND: '손금',
  FENGSHUI: '풍수',
  COMPATIBILITY: '궁합',
  TODAY: '오늘운세',
  WEALTH: '재물운',
  NEW_YEAR: '신년운세',
}

export function CategoryPieChart({ data }: { data: CategoryStat[] }) {
  const chartData = data.map((d) => ({
    name: CATEGORY_LABELS[d.category] || d.category,
    value: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={PASTEL_COLORS[idx % PASTEL_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`${Number(value).toLocaleString()}건`, '분석 수']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function LatencyChart({ data }: { data: GeminiStats['avgLatencyByType'] }) {
  const ACTION_LABELS: Record<string, string> = {
    saju: '사주',
    cheonjiin: '천지인',
    compatibility: '궁합',
    fortune_analysis: '운세분석',
    trend: '트렌드',
    year2026: '신년',
    wealth: '재물',
    shaman_chat: '무당채팅',
  }

  const chartData = data.map((d) => ({
    name: ACTION_LABELS[d.action_type] || d.action_type,
    ms: d.avg_ms,
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 40, left: 60, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.15)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#78716c', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}ms`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: '#a8a29e', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}ms`, '평균 응답시간']} />
        <Bar dataKey="ms" fill="#9b8fc2" radius={[0, 3, 3, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}
