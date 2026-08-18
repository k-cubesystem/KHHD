'use client'

import { useCallback, useEffect, useState } from 'react'
import { GOLD_500 } from '@/lib/config/design-tokens'
import { getDailyTraffic, getHourlyTraffic } from '@/app/actions/admin/dashboard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format } from 'date-fns'

/**
 * 트래픽 추이 — **시간대별**과 **일별**을 한 화면에서 오간다.
 *
 * 🔴 두 눈금은 **같은 원천**(activity_logs · payments)을 다른 단위로 묶은 것이다.
 *    표를 따로 읽으면 「어제 방문수」가 두 값으로 갈린다.
 * 🔴 일별은 **KST 로 자른다**. UTC 로 자르면 0~9시 방문이 전날로 밀린다
 *    (출석 도장이 정확히 그렇게 하루 어긋난 전례가 있다).
 *
 * ⚠️ 시간대별만 1분마다 자동 갱신한다. 일별은 하루 단위라 자동 갱신이 의미 없고,
 *    30일치를 1분마다 다시 읽으면 낭비다.
 */
type Scale = 'hourly' | 'daily'

interface Point {
  time: string
  방문수: number
  신규가입: number
  매출: number
}

const SCALE_LABEL: Record<Scale, string> = { hourly: '시간대별 (24시간)', daily: '일별 (30일)' }

export function TrafficChart() {
  const [scale, setScale] = useState<Scale>('hourly')
  const [data, setData] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (target: Scale) => {
    const result = target === 'hourly' ? await getHourlyTraffic(24) : await getDailyTraffic(30)

    if (!result.success || !result.data) {
      setData([])
      setLoading(false)
      return
    }

    const rows = result.data as Array<{
      hour_timestamp?: string
      day?: string
      total_visits?: number
      new_signups?: number
      total_revenue?: number
    }>

    setData(
      rows.map((item) => ({
        time:
          target === 'hourly'
            ? format(new Date(item.hour_timestamp ?? ''), 'HH:mm')
            : format(new Date(`${item.day}T00:00:00`), 'M/d'),
        방문수: item.total_visits ?? 0,
        신규가입: item.new_signups ?? 0,
        매출: Math.round(item.total_revenue ?? 0),
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    loadData(scale)
    if (scale !== 'hourly') return
    const interval = setInterval(() => loadData('hourly'), 60000)
    return () => clearInterval(interval)
  }, [scale, loadData])

  return (
    <div className="space-y-3">
      <nav className="flex gap-1.5" aria-label="트래픽 눈금">
        {(['hourly', 'daily'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScale(s)}
            aria-current={s === scale ? 'true' : undefined}
            className={`min-h-[36px] rounded-lg border px-3 font-sans text-[12px] transition-colors ${
              s === scale
                ? 'border-gold-500/40 bg-gold-500/[0.12] text-gold-500'
                : 'border-white/[0.08] bg-surface/60 text-ink-primary/50 hover:text-ink-primary/80'
            }`}
          >
            {SCALE_LABEL[s]}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="flex h-[300px] items-center justify-center font-sans text-[12.5px] text-ink-primary/40">
          불러오는 중…
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center font-sans text-[12.5px] text-ink-primary/40">
          {scale === 'hourly' ? '최근 24시간 활동 데이터가 없습니다.' : '최근 30일 활동 데이터가 없습니다.'}
        </div>
      ) : (
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
            <Line type="monotone" dataKey="방문수" stroke="#82ca9d" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="신규가입" stroke="#8884d8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="매출" stroke={GOLD_500} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
