'use client'

import { useMemo } from 'react'
import { StatStrip } from '@/components/admin/ui/stat-tile'
import Link from 'next/link'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  getAnalyticsAcquisition,
  getAnalyticsBehavior,
  getAnalyticsConversion,
  getAnalyticsOverview,
  getAnalyticsRealtime,
  RangeKey,
} from './actions'

/**
 * 분석 대시보드 — GA 의 5축(실시간·개요·유입·행동·전환)을 한 화면에.
 * 색은 데이터의 «일»로 배정한다(dataviz 검증기 통과 팔레트, 다크 서피스 #16140F 기준):
 *   세션 골드 · 방문자 청 · 가입 도장 · 매출 초록. 하나의 축, 얇은 마크, 직접 라벨은 선택적으로.
 */
const C = { sessions: '#B38C30', visitors: '#4A8FD0', signups: '#C84040', revenue: '#5FA86A' } as const
const GRID = 'rgba(232,228,220,0.08)'
const AXIS = '#8C8478'

type Overview = NonNullable<Extract<Awaited<ReturnType<typeof getAnalyticsOverview>>, { success: true }>>
type Acquisition = Extract<Awaited<ReturnType<typeof getAnalyticsAcquisition>>, { success: true }>
type Behavior = Extract<Awaited<ReturnType<typeof getAnalyticsBehavior>>, { success: true }>
type Conversion = Extract<Awaited<ReturnType<typeof getAnalyticsConversion>>, { success: true }>
type Realtime = Extract<Awaited<ReturnType<typeof getAnalyticsRealtime>>, { success: true }>

const nf = new Intl.NumberFormat('ko-KR')
const won = (v: number) => `₩${nf.format(Math.round(v))}`
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—')

export function AnalyticsClient({
  range,
  overview,
  acquisition,
  behavior,
  conversion,
  realtime,
}: {
  range: RangeKey
  overview: Overview | null
  acquisition: Acquisition | null
  behavior: Behavior | null
  conversion: Conversion | null
  realtime: Realtime | null
}) {
  const series = useMemo(
    () => (overview?.rows ?? []).map((r) => ({ ...r, label: r.day.slice(5).replace('-', '/') })),
    [overview]
  )
  const t = overview?.totals

  return (
    <div className="space-y-6">
      {/* 범위 + 실시간 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(['7d', '30d', '90d'] as const).map((k) => (
          <Link
            key={k}
            href={`/admin/analytics?range=${k}`}
            className={`rounded-md px-3 py-2 min-h-[36px] flex items-center ${range === k ? 'bg-gold-500/20 text-gold-300' : 'text-ink-light/60 hover:text-ink-light'}`}
          >
            {k === '7d' ? '7일' : k === '30d' ? '30일' : '90일'}
          </Link>
        ))}
        {realtime ? (
          <span className="ml-auto flex items-center gap-2 text-ink-light/70 basis-full sm:basis-auto">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            지금 {nf.format(realtime.activeVisitors)}명 · {nf.format(realtime.activeSessions)}세션 (30분)
          </span>
        ) : null}
      </div>

      {/* 스탯 타일 */}
      {t ? (
        <StatStrip>
          <Tile label="세션" value={nf.format(t.sessions)} color={C.sessions} />
          <Tile
            label="방문자"
            value={nf.format(t.visitors)}
            sub={`신규 ${nf.format(t.new_visitors)}`}
            color={C.visitors}
          />
          <Tile
            label="페이지뷰"
            value={nf.format(t.pageviews)}
            sub={t.sessions ? `${(t.pageviews / t.sessions).toFixed(1)}/세션` : undefined}
          />
          <Tile
            label="가입"
            value={nf.format(t.signups)}
            sub={`방문→가입 ${pct(t.signups, t.visitors)}`}
            color={C.signups}
          />
          <Tile label="매출" value={won(t.revenue)} color={C.revenue} />
          <Tile label="기간" value={`${t.days}일`} sub={`${overview?.start} ~`} />
        </StatStrip>
      ) : (
        <Empty>개요 집계를 못 읽었어요.</Empty>
      )}

      {/* 추세 — 한 축, 세션·방문자만(같은 단위). 가입·매출은 아래 별도 차트 */}
      <Panel
        title="세션 · 방문자 추세"
        legend={[
          ['세션', C.sessions],
          ['방문자', C.visitors],
        ]}
      >
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: AXIS, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<Tip />} cursor={{ stroke: GRID }} />
            <Area
              type="monotone"
              dataKey="sessions"
              name="세션"
              stroke={C.sessions}
              fill={C.sessions}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              name="방문자"
              stroke={C.visitors}
              fill={C.visitors}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel title="가입 (일별)" legend={[['가입', C.signups]]}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<Tip />} cursor={{ fill: GRID }} />
              <Bar dataKey="signups" name="가입" fill={C.signups} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="매출 (일별)" legend={[['매출', C.revenue]]}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={series} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => (v >= 10000 ? `${Math.round(v / 10000)}만` : String(v))}
              />
              <Tooltip content={<Tip money />} cursor={{ fill: GRID }} />
              <Bar dataKey="revenue" name="매출" fill={C.revenue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Tabs defaultValue="acq">
        <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
          <TabsTrigger value="acq">유입</TabsTrigger>
          <TabsTrigger value="beh">행동</TabsTrigger>
          <TabsTrigger value="conv">전환</TabsTrigger>
          <TabsTrigger value="tech">기기·국가</TabsTrigger>
        </TabsList>

        <TabsContent value="acq" className="space-y-4">
          <Table
            title="채널 (source / medium)"
            cols={['출처', '매체', '세션', '방문자', '가입', '가입률']}
            rows={(acquisition?.channels ?? []).map((c) => [
              c.source,
              c.medium,
              nf.format(c.sessions),
              nf.format(c.visitors),
              nf.format(c.signups),
              pct(c.signups, c.visitors),
            ])}
            empty="아직 유입 데이터가 없어요. 첫 페이지뷰가 들어오면 채워집니다."
          />
          <Table
            title="캠페인 (first-touch UTM → 가입 전환)"
            cols={['출처', '캠페인', '유입', '전환', '전환율']}
            rows={(acquisition?.campaigns ?? []).map((c) => [
              c.utm_source ?? '(direct)',
              c.utm_campaign ?? '—',
              nf.format(c.total_visits),
              nf.format(c.conversions),
              `${Number(c.conversion_rate ?? 0).toFixed(1)}%`,
            ])}
            empty="UTM 이 붙은 유입이 아직 없어요. 스레드·광고 링크에 utm_source 를 달면 여기 잡힙니다."
          />
        </TabsContent>

        <TabsContent value="beh" className="space-y-4">
          <Table
            title="페이지"
            cols={['경로', '페이지뷰', '세션', '진입']}
            rows={(behavior?.pages ?? []).map((p) => [
              p.path,
              nf.format(p.pageviews),
              nf.format(p.sessions),
              nf.format(p.entrances),
            ])}
            empty="페이지뷰가 아직 없어요."
          />
          <Table
            title="이벤트"
            cols={['이벤트', '카테고리', '횟수', '사용자']}
            rows={(behavior?.events ?? []).map((e) => [
              e.activity_type,
              e.activity_category ?? '—',
              nf.format(e.events),
              nf.format(e.users),
            ])}
            empty="이벤트가 아직 없어요. GA.* 호출이 자사 수집으로 동승됩니다."
          />
        </TabsContent>

        <TabsContent value="conv" className="space-y-4">
          <Panel title="퍼널 (랜딩 → 가입 → 첫 분석 → 상점 → 결제)">
            <FunnelBars steps={conversion?.funnel ?? []} />
          </Panel>
          {conversion?.retention ? (
            <div className="grid grid-cols-3 gap-3">
              <Tile
                label="D1 재방문"
                value={`${conversion.retention.d1Rate}%`}
                sub={`${conversion.retention.d1}/${conversion.retention.totalSignups}`}
              />
              <Tile
                label="D7 재방문"
                value={`${conversion.retention.d7Rate}%`}
                sub={`${conversion.retention.d7}/${conversion.retention.totalSignups}`}
              />
              <Tile
                label="D30 재방문"
                value={`${conversion.retention.d30Rate}%`}
                sub={`${conversion.retention.d30}/${conversion.retention.totalSignups}`}
              />
            </div>
          ) : null}
          <p className="text-[11px] text-ink-light/45">
            리텐션은 가입일 기준 코호트 — 활동 로그(activity_logs)가 있어야 «재방문»으로 셉니다. 수집 시작 전 가입자는
            0으로 보입니다.
          </p>
        </TabsContent>

        <TabsContent value="tech">
          <div className="grid gap-3 sm:grid-cols-2">
            <Table
              title="기기"
              cols={['기기', '세션']}
              rows={(behavior?.tech ?? [])
                .filter((r) => r.dimension === 'device')
                .map((r) => [r.value, nf.format(r.sessions)])}
              empty="—"
            />
            <Table
              title="국가"
              cols={['국가', '세션']}
              rows={(behavior?.tech ?? [])
                .filter((r) => r.dimension === 'country')
                .map((r) => [r.value, nf.format(r.sessions)])}
              empty="국가는 서버 지오 릴레이 후 채워집니다."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-surface/70 px-3.5 py-3">
      <p className="flex items-center gap-1.5 font-sans text-[11px] leading-none text-ink-primary/45">
        {color ? <span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} /> : null}
        {label}
      </p>
      <p className="mt-1.5 font-serif text-[19px] font-bold leading-none tabular-nums text-ink-primary">{value}</p>
      {sub ? (
        <p className="mt-1.5 font-sans text-[10.5px] leading-none tabular-nums text-ink-primary/35">{sub}</p>
      ) : null}
    </div>
  )
}

function Panel({
  title,
  legend,
  children,
}: {
  title: string
  legend?: Array<[string, string]>
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-surface/60 p-3">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-xs font-semibold text-ink-light">{title}</span>
        {legend && legend.length > 1 ? (
          <span className="ml-auto flex gap-3 text-[11px] text-ink-light/60">
            {legend.map(([n, c]) => (
              <span key={n} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c }} />
                {n}
              </span>
            ))}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function Tip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  money?: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border border-ink-light/15 bg-[#16140F] px-2.5 py-2 text-[11px] text-ink-light shadow-lg">
      <div className="mb-1 text-ink-light/60">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5 tabular-nums">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {p.name} <b className="ml-auto pl-3">{money ? won(p.value) : nf.format(p.value)}</b>
        </div>
      ))}
    </div>
  )
}

function Table({ title, cols, rows, empty }: { title: string; cols: string[]; rows: string[][]; empty: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-surface/60 p-3">
      <div className="mb-2 text-xs font-semibold text-ink-light">{title}</div>
      {rows.length === 0 ? (
        <p className="text-[11.5px] text-ink-light/45">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="text-left text-ink-light/50">
                {cols.map((c, i) => (
                  <th key={c} className={`pb-1.5 pr-3 font-normal ${i > 0 ? 'text-right' : ''}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-ink-light/5">
                  {r.map((v, j) => (
                    <td
                      key={j}
                      className={`py-1.5 pr-3 tabular-nums ${j > 0 ? 'text-right text-ink-light/85' : 'text-ink-light'}`}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FunnelBars({ steps }: { steps: Array<{ name: string; step: number; users: number }> }) {
  const max = Math.max(1, ...steps.map((s) => s.users))
  const label: Record<string, string> = {
    landing_view: '랜딩',
    signup_start: '가입 시작',
    signup_done: '가입 완료',
    first_analysis: '첫 분석',
    store_view: '상점',
    checkout_start: '결제 시작',
    purchase: '결제',
  }
  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].users : s.users
        return (
          <div key={s.name} className="flex items-center gap-2 text-[11.5px]">
            <span className="w-16 shrink-0 text-ink-light/70">{label[s.name] ?? s.name}</span>
            <div className="h-5 flex-1 rounded-sm bg-ink-light/5">
              <div
                className="h-full rounded-sm"
                style={{ width: `${(s.users / max) * 100}%`, background: C.sessions, minWidth: s.users ? 2 : 0 }}
              />
            </div>
            <span className="w-14 shrink-0 text-right tabular-nums text-ink-light">{nf.format(s.users)}</span>
            <span className="w-14 shrink-0 text-right tabular-nums text-ink-light/45">
              {i > 0 ? pct(s.users, prev) : ''}
            </span>
          </div>
        )
      })}
      {steps.every((s) => s.users === 0) ? (
        <p className="pt-1 text-[11px] text-ink-light/45">
          퍼널 이벤트가 아직 없어요. 랜딩·가입·분석·상점·결제 지점에 collectFunnel 이 배선되면 채워집니다.
        </p>
      ) : null}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-light/50">{children}</p>
}
