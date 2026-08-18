'use client'

import { useState, useTransition } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Zap, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Save, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getActionLabel } from '@/lib/domain/gemini/actions'
import { KRW_PER_TALISMAN } from '@/lib/constants'
import {
  getGeminiDailyStats,
  getGeminiActionStats,
  getGeminiTodaySummary,
  getGeminiRecentLogs,
  getGeminiCostVsPrice,
  updateGeminiRpm,
  type GeminiDailyStat,
  type GeminiActionStat,
  type GeminiTodaySummary,
  type GeminiRecentLog,
  type GeminiRpmConfig,
  type GeminiCostVsPrice,
} from '@/app/actions/admin/gemini-usage'

// ─────────────────────────────────────────
// 비용 포맷 유틸
// ─────────────────────────────────────────

function formatCostShort(usd: number, krwRate: number): string {
  if (usd === 0) return '₩0'
  const krw = Math.round(usd * krwRate)
  if (krw < 1) return `$${usd.toFixed(6)}`
  return `₩${krw.toLocaleString()}`
}

// 기능 레이블 매핑은 lib/domain/gemini/actions 의 getActionLabel 단일 소스 사용
// (방출 action_type ↔ 라벨 정합성은 actions.test.ts 로 게이팅)

// ─────────────────────────────────────────
// 상태별 배지
// ─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: 'bg-primary-dim/20 text-primary-dim border-primary-dim/30',
    rate_limited: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    '429': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    '400': 'bg-red-500/20 text-red-400 border-red-500/30',
    timeout: 'bg-primary-dark/20 text-primary-dark border-primary-dark/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  const cls = map[status] ?? 'bg-white/20 text-ink-primary/55 border-white/30'
  return <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border', cls)}>{status.toUpperCase()}</span>
}

// ─────────────────────────────────────────
// 기간별 일별 차트 데이터 집계
// ─────────────────────────────────────────
function aggregateDailyData(stats: GeminiDailyStat[]) {
  const map: Record<string, Record<string, number>> = {}
  const models = new Set<string>()

  for (const s of stats) {
    const date = s.stat_date
    if (!map[date]) map[date] = { date: date as unknown as number }
    map[date][s.model] = (map[date][s.model] ?? 0) + Number(s.call_count)
    models.add(s.model)
  }

  const rows = Object.values(map).sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1))
  return { rows, models: Array.from(models) }
}

// ─────────────────────────────────────────
// 모델 색상
// ─────────────────────────────────────────
const MODEL_COLORS: Record<string, string> = {
  'gemini-3.5-flash': '#f59e0b',
  'gemini-2.0-flash': '#60a5fa',
  'gemini-2.0-flash-lite': '#a78bfa',
  'gemini-3-flash-preview': '#eab308',
  'gemini-2.5-flash-preview': '#34d399',
  'gemini-1.5-flash': '#f472b6',
  'gemini-1.5-pro': '#fb923c',
}
function modelColor(model: string) {
  return MODEL_COLORS[model] ?? '#94a3b8'
}

// ─────────────────────────────────────────
// Props
// ─────────────────────────────────────────
interface Props {
  initialSummary: GeminiTodaySummary
  initialDailyStats: GeminiDailyStat[]
  initialActionStats: GeminiActionStat[]
  initialLogs: GeminiRecentLog[]
  initialRpmConfig: GeminiRpmConfig | null
  initialCostVsPrice: GeminiCostVsPrice[]
  usdKrwRate: number
}

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
export function GeminiUsageDashboard({
  initialSummary,
  initialDailyStats,
  initialActionStats,
  initialLogs,
  initialRpmConfig,
  initialCostVsPrice,
  usdKrwRate,
}: Props) {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const [summary, setSummary] = useState(initialSummary)
  const [dailyStats, setDailyStats] = useState(initialDailyStats)
  const [actionStats, setActionStats] = useState(initialActionStats)
  const [costVsPrice, setCostVsPrice] = useState(initialCostVsPrice)
  const [logs, setLogs] = useState(initialLogs)
  const [rpmConfig, setRpmConfig] = useState(initialRpmConfig)
  const [rpmInput, setRpmInput] = useState(String(initialRpmConfig?.max_tokens ?? 15))
  const [modelInput, setModelInput] = useState(initialRpmConfig?.model ?? 'gemini-2.0-flash')
  const [rpmMsg, setRpmMsg] = useState<string | null>(null)

  const [isRefreshing, startRefresh] = useTransition()
  const [isSavingRpm, startSaveRpm] = useTransition()

  // ── 데이터 새로고침 ──────────────────────
  function refresh() {
    startRefresh(async () => {
      const [newSummary, newDaily, newAction, newLogs, newCvp] = await Promise.all([
        getGeminiTodaySummary(),
        getGeminiDailyStats(period),
        getGeminiActionStats(period),
        getGeminiRecentLogs(50),
        getGeminiCostVsPrice(period),
      ])
      setSummary(newSummary)
      setDailyStats(newDaily)
      setActionStats(newAction)
      setLogs(newLogs)
      setCostVsPrice(newCvp)
    })
  }

  // ── 기간 변경 ────────────────────────────
  function changePeriod(p: 7 | 30 | 90) {
    setPeriod(p)
    startRefresh(async () => {
      const [newDaily, newAction, newCvp] = await Promise.all([
        getGeminiDailyStats(p),
        getGeminiActionStats(p),
        getGeminiCostVsPrice(p),
      ])
      setDailyStats(newDaily)
      setActionStats(newAction)
      setCostVsPrice(newCvp)
    })
  }

  // ── RPM 저장 ─────────────────────────────
  function saveRpm() {
    const rpm = parseInt(rpmInput)
    if (isNaN(rpm) || rpm < 1 || rpm > 10000) {
      setRpmMsg('1 ~ 10000 사이의 값을 입력하세요.')
      return
    }
    setRpmMsg(null)
    startSaveRpm(async () => {
      const res = await updateGeminiRpm(rpm, modelInput)
      if (res.success) {
        setRpmConfig(res.data ?? rpmConfig)
        setRpmMsg(`✓ RPM ${rpm}으로 변경 완료`)
      } else {
        setRpmMsg(`오류: ${res.error}`)
      }
    })
  }

  // ── 차트 데이터 ───────────────────────────
  const { rows: dailyRows, models } = aggregateDailyData(dailyStats)

  const actionChartData = actionStats.slice(0, 10).map((s) => ({
    name: getActionLabel(s.action_type),
    calls: Number(s.call_count),
    tokens: Number(s.total_tokens),
    costKrw: Math.round(Number(s.total_cost_usd) * usdKrwRate),
  }))

  // 원가 큰 순 정렬(비용 차트·테이블용)
  const costRows = [...costVsPrice].sort((a, b) => b.total_cost_usd - a.total_cost_usd)
  const costChartData = costRows
    .slice(0, 10)
    .map((s) => ({ name: getActionLabel(s.action_type), costKrw: Math.round(s.total_cost_usd * usdKrwRate) }))
    .filter((r) => r.costKrw > 0)

  // ── 요약 카드 데이터 ──────────────────────
  const errorRate = summary.total_calls > 0 ? ((summary.error_calls / summary.total_calls) * 100).toFixed(1) : '0.0'

  const PERIOD_LABELS = { 7: '7일', 30: '30일', 90: '90일' }

  return (
    <div className="space-y-5">
      {/* ── 헤더 ───────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink-primary flex items-center gap-2">
            <Zap className="w-5 h-5 text-gold-400" />
            Gemini API 사용량
          </h2>
          <p className="text-xs text-ink-primary/40 mt-0.5">오늘 기준 · 환율 ₩{usdKrwRate.toLocaleString()}/USD</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 기간 선택 */}
          <div className="flex rounded-lg overflow-hidden border border-white/50">
            {([7, 30, 90] as const).map((p) => (
              <button
                key={p}
                onClick={() => changePeriod(p)}
                className={cn(
                  'px-3 py-1.5 text-[11px] font-bold transition-colors',
                  period === p ? 'bg-gold-500 text-ink-950' : 'bg-ink-900 text-ink-primary/55 hover:text-ink-primary/85'
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-ink-900 border border-white/50 text-ink-primary/55 hover:text-gold-400 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── 오늘 요약 카드 4개 ──────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* 총 API 호출 */}
        <div className="bg-ink-900/60 border border-white/40 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-ink-primary/40 font-bold uppercase tracking-wider">총 호출 (오늘)</span>
          </div>
          <div className="text-2xl font-black text-ink-primary">{summary.total_calls.toLocaleString()}</div>
          <div className="text-[10px] text-ink-primary/40 mt-1">
            성공 {summary.success_calls} · 캐시 {summary.cached_calls}
          </div>
        </div>

        {/* 총 토큰 */}
        <div className="bg-ink-900/60 border border-white/40 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary-dark" />
            <span className="text-[10px] text-ink-primary/40 font-bold uppercase tracking-wider">총 토큰 (오늘)</span>
          </div>
          <div className="text-2xl font-black text-ink-primary">
            {summary.total_tokens >= 1000
              ? `${(summary.total_tokens / 1000).toFixed(1)}K`
              : summary.total_tokens.toLocaleString()}
          </div>
          <div className="text-[10px] text-ink-primary/40 mt-1">
            입력 {summary.total_input_tokens.toLocaleString()} · 출력 {summary.total_output_tokens.toLocaleString()}
          </div>
        </div>

        {/* 예상 비용 */}
        <div className="bg-ink-900/60 border border-white/40 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-gold-400" />
            <span className="text-[10px] text-ink-primary/40 font-bold uppercase tracking-wider">예상 비용 (오늘)</span>
          </div>
          <div className="text-lg font-black text-gold-400 leading-tight">${summary.total_cost_usd.toFixed(4)}</div>
          <div className="text-[11px] text-ink-primary/55 mt-0.5 font-semibold">
            ₩{Math.round(summary.total_cost_usd * usdKrwRate).toLocaleString()}
          </div>
        </div>

        {/* 오류율 */}
        <div className="bg-ink-900/60 border border-white/40 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-primary-dark" />
            <span className="text-[10px] text-ink-primary/40 font-bold uppercase tracking-wider">오류율 (오늘)</span>
          </div>
          <div
            className={cn(
              'text-2xl font-black',
              Number(errorRate) > 10 ? 'text-red-400' : Number(errorRate) > 3 ? 'text-primary' : 'text-primary-dim'
            )}
          >
            {errorRate}%
          </div>
          <div className="text-[10px] text-ink-primary/40 mt-1">
            에러 {summary.error_calls} · 한도초과 {summary.rate_limited_calls}
          </div>
        </div>
      </div>

      {/* ── 일별 모델별 호출 차트 ─────────────── */}
      <div className="bg-ink-900/60 border border-white/40 rounded-xl p-4">
        <h3 className="text-xs font-bold text-ink-primary/70 mb-4">일별 모델별 API 호출 ({PERIOD_LABELS[period]})</h3>
        {dailyRows.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyRows} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: '#6b7280' }}
                tickFormatter={(v) => String(v).slice(5)} // MM-DD
              />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#9ca3af', fontSize: 10 }}
                itemStyle={{ fontSize: 10 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {models.map((m) => (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={m}
                  name={m.replace('gemini-', '').replace('-preview', ' preview')}
                  stroke={modelColor(m)}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-ink-primary/30">
            <Activity className="w-8 h-8 opacity-40" />
            <p className="text-xs">기간 내 API 호출 데이터가 없습니다.</p>
            <p className="text-[10px] text-ink-primary/20">DB: get_gemini_daily_stats RPC 확인 필요</p>
          </div>
        )}
      </div>

      {/* ── 기능별 사용량 차트 ────────────────── */}
      <div className="bg-ink-900/60 border border-white/40 rounded-xl p-4">
        <h3 className="text-xs font-bold text-ink-primary/70 mb-4">기능별 API 호출 ({PERIOD_LABELS[period]})</h3>
        {actionChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={actionChartData} margin={{ top: 0, right: 8, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#6b7280' }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#9ca3af', fontSize: 10 }}
                itemStyle={{ fontSize: 10 }}
              />
              <Bar dataKey="calls" name="호출 수" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-ink-primary/30">
            <Zap className="w-8 h-8 opacity-40" />
            <p className="text-xs">기간 내 기능별 사용 데이터가 없습니다.</p>
            <p className="text-[10px] text-ink-primary/20">DB: get_gemini_action_stats RPC 확인 필요</p>
          </div>
        )}
      </div>

      {/* ── 기능별 비용 차트 (₩) ──────────────── */}
      <div className="bg-ink-900/60 border border-white/40 rounded-xl p-4">
        <h3 className="text-xs font-bold text-ink-primary/70 mb-4">기능별 예상 비용 ({PERIOD_LABELS[period]}) · ₩</h3>
        {costChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={costChartData} margin={{ top: 0, right: 8, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#6b7280' }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(v) => `₩${Number(v).toLocaleString()}`} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af', fontSize: 10 }}
                itemStyle={{ fontSize: 10 }}
                formatter={(v) => [`₩${Number(v ?? 0).toLocaleString()}`, '예상 비용']}
              />
              <Bar dataKey="costKrw" name="예상 비용(₩)" fill="#fbbf24" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-ink-primary/30">
            <CheckCircle className="w-8 h-8 opacity-40" />
            <p className="text-xs">기간 내 비용 데이터가 없습니다.</p>
          </div>
        )}
      </div>

      {/* ── 원가 vs 복채 테이블 (가격 책정 근거) ── */}
      <div className="bg-ink-900/60 border border-white/40 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/40">
          <h3 className="text-xs font-bold text-ink-primary/70">원가 vs 복채 ({PERIOD_LABELS[period]})</h3>
          <p className="text-[10px] text-ink-primary/40 mt-0.5">
            호출당 AI 원가와 현재 복채 가격 대비 원가율 · 1만냥 ≈ ₩{KRW_PER_TALISMAN.toLocaleString()}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-white/40 text-ink-primary/40">
                <th className="text-left px-3 py-2 whitespace-nowrap">기능</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">호출 수</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">호출당 원가</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">복채</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">원가율</th>
              </tr>
            </thead>
            <tbody>
              {costRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-ink-primary/30">
                    데이터 없음
                  </td>
                </tr>
              )}
              {costRows.map((r) => (
                <tr key={r.action_type} className="border-b border-white/50 hover:bg-ink-800/30 transition-colors">
                  <td className="px-3 py-1.5 text-ink-primary/70 whitespace-nowrap">{getActionLabel(r.action_type)}</td>
                  <td className="px-3 py-1.5 text-right text-ink-primary/55">{r.call_count.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right text-gold-500">₩{r.avg_cost_krw.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right text-ink-primary/55 whitespace-nowrap">
                    {r.bokchae_cost === null ? '—' : r.bokchae_cost === 0 ? '무료' : `${r.bokchae_cost}만냥`}
                  </td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">
                    {r.cost_ratio_pct === null ? (
                      <span className="text-ink-primary/30">—</span>
                    ) : (
                      <span
                        className={cn(
                          'font-bold',
                          r.cost_ratio_pct > 50
                            ? 'text-red-400'
                            : r.cost_ratio_pct > 20
                              ? 'text-amber-400'
                              : 'text-primary-dim'
                        )}
                      >
                        {r.cost_ratio_pct}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RPM 관리 ─────────────────────────── */}
      <div className="bg-ink-900/60 border border-white/40 rounded-xl p-4">
        <h3 className="text-xs font-bold text-ink-primary/70 mb-3 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-gold-400" />
          Rate Limit 설정 (RPM)
        </h3>

        {rpmConfig && (
          <div className="text-[10px] text-ink-primary/40 mb-3 space-y-0.5">
            <div>
              현재: <span className="text-ink-primary/70 font-bold">{rpmConfig.model}</span> ·{' '}
              <span className="text-ink-primary/70 font-bold">{rpmConfig.max_tokens} RPM</span>
            </div>
            <div>
              남은 토큰:{' '}
              <span className={cn('font-bold', rpmConfig.tokens < 3 ? 'text-red-400' : 'text-primary-dim')}>
                {rpmConfig.tokens} / {rpmConfig.max_tokens}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <select
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
            className="flex-1 bg-ink-800 border border-white/50 text-ink-primary/85 text-xs rounded-lg px-2 py-2"
          >
            <option value="gemini-3.5-flash">gemini-3.5-flash</option>
            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
            <option value="gemini-2.5-flash-preview">gemini-2.5-flash-preview</option>
            <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
            <option value="gemini-1.5-flash">gemini-1.5-flash</option>
            <option value="gemini-1.5-pro">gemini-1.5-pro</option>
          </select>
          <input
            type="number"
            min={1}
            max={10000}
            value={rpmInput}
            onChange={(e) => setRpmInput(e.target.value)}
            className="w-24 bg-ink-800 border border-white/50 text-ink-primary/85 text-xs rounded-lg px-2 py-2 text-center"
            placeholder="RPM"
          />
          <button
            onClick={saveRpm}
            disabled={isSavingRpm}
            className="px-3 py-2 bg-gold-500 text-ink-950 text-xs font-bold rounded-lg hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            저장
          </button>
        </div>

        {/* 프리셋 버튼 */}
        <div className="flex gap-1.5 mb-2">
          {[
            { label: '무료 (15)', rpm: 15 },
            { label: 'Tier 1 (2000)', rpm: 2000 },
            { label: 'Tier 2 (4000)', rpm: 4000 },
            { label: '미리보기 (1)', rpm: 1 },
          ].map((p) => (
            <button
              key={p.rpm}
              onClick={() => setRpmInput(String(p.rpm))}
              className="flex-1 py-1 text-[9px] font-bold bg-ink-800 border border-white/50 text-ink-primary/55 hover:text-gold-400 hover:border-gold-500/30 rounded transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {rpmMsg && (
          <p className={cn('text-[10px] mt-1', rpmMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400')}>
            {rpmMsg}
          </p>
        )}
      </div>

      {/* ── 최근 API 로그 테이블 ──────────────── */}
      <div className="bg-ink-900/60 border border-white/40 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/40">
          <h3 className="text-xs font-bold text-ink-primary/70">최근 API 로그 (50건)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-white/40 text-ink-primary/40">
                <th className="text-left px-3 py-2 whitespace-nowrap">시간</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">모델</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">기능</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">토큰</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">비용</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">지연</th>
                <th className="text-center px-3 py-2 whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-ink-primary/30">
                    로그 없음
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/50 hover:bg-ink-800/30 transition-colors">
                  <td className="px-3 py-1.5 text-ink-primary/40 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('ko-KR', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-1.5 text-ink-primary/55 whitespace-nowrap">
                    {log.model.replace('gemini-', '').replace('-preview', ' ⚡')}
                  </td>
                  <td className="px-3 py-1.5 text-ink-primary/70 whitespace-nowrap">
                    {getActionLabel(log.action_type)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-ink-primary/55">
                    {log.total_tokens !== null ? log.total_tokens.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-1.5 text-right text-gold-500">
                    {log.estimated_cost_usd !== null
                      ? formatCostShort(Number(log.estimated_cost_usd), usdKrwRate)
                      : '-'}
                  </td>
                  <td className="px-3 py-1.5 text-right text-ink-primary/55">
                    {log.latency_ms !== null ? `${log.latency_ms}ms` : '-'}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <StatusBadge status={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
