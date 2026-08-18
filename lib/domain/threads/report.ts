/**
 * Threads 주간 보고서 — 순수 집계.
 *
 * DB 접근·API 호출을 하지 않는다(크론이 행을 읽어 넣어준다). 그래야 «지난주 숫자가 왜 이런가»를
 * 테스트로 고정할 수 있다. 주 경계는 **KST 월~일**이며, 크론이 언제 돌든 `now` 하나로 결정된다.
 */

const KST_OFFSET_MS = 9 * 3_600_000
const DAY_MS = 86_400_000

export interface WeekBounds {
  /** YYYY-MM-DD (KST) — 월요일 */
  startDate: string
  /** YYYY-MM-DD (KST) — 일요일(포함) */
  endDate: string
  /** 집계 하한(포함) — 월요일 00:00 KST 의 UTC 순간 */
  startUtc: Date
  /** 집계 상한(**미포함**) — 다음 월요일 00:00 KST */
  endUtc: Date
}

function ymd(ms: number): string {
  const d = new Date(ms)
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${m}-${day}`
}

/** `now` 가 속한 KST 주의 **직전 주**(월~일). 월요일 아침 크론이 지난주를 집계하기 위한 것. */
export function previousWeekKst(now: Date): WeekBounds {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  const daysSinceMonday = (kst.getUTCDay() + 6) % 7 // 0=일 → 6
  const thisMonday = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - daysSinceMonday * DAY_MS
  const start = thisMonday - 7 * DAY_MS
  return {
    startDate: ymd(start),
    endDate: ymd(thisMonday - DAY_MS),
    startUtc: new Date(start - KST_OFFSET_MS),
    endUtc: new Date(thisMonday - KST_OFFSET_MS),
  }
}

// ─────────────────────────────────────────────────────────────────
// 입력 행 — 크론이 select 한 모양 그대로. 필요한 필드만 좁게 받는다.
// ─────────────────────────────────────────────────────────────────

export interface PostRow {
  kind: string | null
  body: string | null
  permalink: string | null
  published_at: string | null
  insights: Record<string, unknown> | null
}

export interface ReplyRow {
  classification: string | null
}

export interface QueueRow {
  status: string | null
  created_at: string | null
  approved_at: string | null
}

export interface EntryRow {
  round_id: string | null
}

export interface RoundRow {
  id: string
  slug: string
  status: string | null
}

export interface WinnerRow {
  published_at: string | null
  converted_user_id: string | null
}

export interface AcquisitionRow {
  medium: string | null
  visitors: number | null
  sessions: number | null
  signups: number | null
}

export interface ThreadsWeeklyMetrics {
  period: { start: string; end: string }
  posts: {
    published: number
    byKind: Record<string, number>
    views: number
    likes: number
    replies: number
    reposts: number
    quotes: number
    insightsMissing: number
    top: { excerpt: string; permalink: string | null; views: number } | null
  }
  replies: { collected: number; byClass: Record<string, number> }
  queue: { created: number; sent: number; rejected: number; pending: number; medianApprovalMin: number | null }
  event: { roundsClosed: number; entries: number; winners: number; resultsPublished: number; converted: number }
  acquisition: { visitors: number; sessions: number; signups: number; byMedium: Record<string, number> }
  token: { expiresAt: string | null; daysLeft: number | null }
}

const INSIGHT_KEYS = ['views', 'likes', 'replies', 'reposts', 'quotes'] as const
type InsightKey = (typeof INSIGHT_KEYS)[number]

function insightValue(insights: Record<string, unknown> | null, key: InsightKey): number {
  if (!insights) return 0
  const v = insights[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

function tally<T>(rows: T[], key: (row: T) => string | null): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = key(r) ?? 'unknown'
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

export interface ReportInput {
  bounds: WeekBounds
  posts: PostRow[]
  replies: ReplyRow[]
  queue: QueueRow[]
  entries: EntryRow[]
  rounds: RoundRow[]
  winners: WinnerRow[]
  acquisition: AcquisitionRow[]
  tokenExpiresAt: Date | null
}

export function buildWeeklyReport(input: ReportInput): ThreadsWeeklyMetrics {
  const { bounds, posts, replies, queue, entries, rounds, winners, acquisition, tokenExpiresAt } = input

  const totals: Record<InsightKey, number> = { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0 }
  let insightsMissing = 0
  let top: ThreadsWeeklyMetrics['posts']['top'] = null

  for (const p of posts) {
    if (!p.insights) insightsMissing += 1
    for (const k of INSIGHT_KEYS) totals[k] += insightValue(p.insights, k)
    const views = insightValue(p.insights, 'views')
    if (!top || views > top.views) {
      top = { excerpt: (p.body ?? '').slice(0, 60), permalink: p.permalink, views }
    }
  }
  // 전부 0회 조회면 «최고 글»이랍시고 아무거나 내세우지 않는다.
  if (top && top.views === 0) top = null

  const approvalLags = queue
    .filter((q) => q.created_at && q.approved_at)
    .map((q) => (new Date(q.approved_at as string).getTime() - new Date(q.created_at as string).getTime()) / 60_000)
    .filter((m) => Number.isFinite(m) && m >= 0)

  const queueByStatus = tally(queue, (q) => q.status)

  const acq = { visitors: 0, sessions: 0, signups: 0, byMedium: {} as Record<string, number> }
  for (const a of acquisition) {
    acq.visitors += a.visitors ?? 0
    acq.sessions += a.sessions ?? 0
    acq.signups += a.signups ?? 0
    const m = a.medium ?? 'unknown'
    acq.byMedium[m] = (acq.byMedium[m] ?? 0) + (a.signups ?? 0)
  }

  return {
    period: { start: bounds.startDate, end: bounds.endDate },
    posts: {
      published: posts.length,
      byKind: tally(posts, (p) => p.kind),
      views: totals.views,
      likes: totals.likes,
      replies: totals.replies,
      reposts: totals.reposts,
      quotes: totals.quotes,
      insightsMissing,
      top,
    },
    replies: { collected: replies.length, byClass: tally(replies, (r) => r.classification) },
    queue: {
      created: queue.length,
      sent: queueByStatus.sent ?? 0,
      rejected: queueByStatus.rejected ?? 0,
      pending: queueByStatus.pending ?? 0,
      medianApprovalMin: median(approvalLags),
    },
    event: {
      roundsClosed: rounds.filter((r) => r.status === 'closed' || r.status === 'drawn' || r.status === 'published')
        .length,
      entries: entries.length,
      winners: winners.length,
      resultsPublished: winners.filter((w) => w.published_at).length,
      converted: winners.filter((w) => w.converted_user_id).length,
    },
    acquisition: acq,
    token: {
      expiresAt: tokenExpiresAt ? tokenExpiresAt.toISOString() : null,
      daysLeft: tokenExpiresAt ? Math.floor((tokenExpiresAt.getTime() - bounds.endUtc.getTime()) / DAY_MS) : null,
    },
  }
}

/** 전주 대비 증감(%) — 전주가 0이면 «비교 불가»(null). 0으로 나눠 Infinity 를 뿌리지 않는다. */
export function deltaPct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}
