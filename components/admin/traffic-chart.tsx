'use client'

import { useEffect, useState } from 'react'
import { getHourlyTraffic } from '@/app/actions/admin-dashboard-actions'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format } from 'date-fns'

export function TrafficChart() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // 1분마다 갱신
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    const result = await getHourlyTraffic(24)
    if (result.success && result.data) {
      const formatted = result.data.map((item: any) => ({
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
            border: '1px solid #D4AF37',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="방문수" stroke="#82ca9d" strokeWidth={2} />
        <Line type="monotone" dataKey="신규가입" stroke="#8884d8" strokeWidth={2} />
        <Line type="monotone" dataKey="매출" stroke="#D4AF37" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
