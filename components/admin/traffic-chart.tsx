'use client'

import { useEffect, useState } from 'react'
import { GOLD_500 } from '@/lib/config/design-tokens'
import { getHourlyTraffic } from '@/app/actions/admin/dashboard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format } from 'date-fns'

interface TrafficPoint {
  time: string
  방문수: number
  신규가입: number
  매출: number
}

interface HourlyTrafficRow {
  hour_timestamp: string
  total_visits?: number
  new_signups?: number
  total_revenue?: number
}

export function TrafficChart() {
  const [data, setData] = useState<TrafficPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // 1분마다 갱신
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    const result = await getHourlyTraffic(24)
    if (!result.success) {
      setError(result.error ?? '트래픽 조회에 실패했습니다.')
    } else {
      setError(null)
    }
    if (result.success && result.data) {
      const formatted = (result.data as HourlyTrafficRow[]).map((item) => ({
        time: format(new Date(item.hour_timestamp), 'HH:mm'),
        방문수: item.total_visits || 0,
        신규가입: item.new_signups || 0,
        매출: Math.round(item.total_revenue || 0),
      }))
      setData(formatted)
    }
    setLoading(false)
  }

  if (loading) return <div className="text-ink-light/50">Loading...</div>

  if (error) {
    return (
      <div className="h-[300px] flex items-center justify-center text-red-400/80 text-sm text-center px-4">
        <p>트래픽을 불러오지 못했습니다: {error}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-ink-light/50">
        <p>최근 24시간 내 활동 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="time" stroke="#8B6E58" />
        <YAxis stroke="#8B6E58" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#181611',
            border: `1px solid ${GOLD_500}`,
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="방문수" stroke="#82ca9d" strokeWidth={2} />
        <Line type="monotone" dataKey="신규가입" stroke="#8884d8" strokeWidth={2} />
        <Line type="monotone" dataKey="매출" stroke={GOLD_500} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
