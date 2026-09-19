/**
 * @jest-environment node
 */
/**
 * 오늘의 운세 크론 — 활성 구독자 조회 회귀선.
 *
 * 원결함: subscriptions.status 는 대문자(CHECK: PENDING/ACTIVE/PAUSED/CANCELLED/EXPIRED/PAYMENT_FAILED)인데
 *         크론이 .eq('status', 'active') 로 찾아 대상이 늘 0명이었다(2026-09-18 발견).
 * 계약: 멤버십 게이트(lib/auth/subscription)와 같은 판정 — ACTIVE·해지 예약(CANCELLED) + 기간 미만료, 한 사람에 한 번.
 */
import { generateDailyFortune } from '@/app/actions/fortune/daily'
import { sendKakaoNotification } from '@/app/actions/fortune/notification'

jest.mock('@/app/actions/fortune/daily', () => ({
  generateDailyFortune: jest.fn(async () => ({ success: true, content: '오늘은 물의 기운이 도와요.' })),
}))
jest.mock('@/app/actions/fortune/notification', () => ({
  sendKakaoNotification: jest.fn(async () => ({ success: true })),
}))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

type Row = Record<string, unknown>

const DAY = 86_400_000
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString()

const TABLES: Record<string, Row[]> = {
  system_settings: [
    { key: 'daily_fortune_enabled', value: 'true' },
    { key: 'kakao_template_id', value: 'TEMPLATE_X' },
  ],
  subscriptions: [
    { user_id: 'u-active', status: 'ACTIVE', current_period_end: inDays(5), end_date: null },
    { user_id: 'u-active', status: 'CANCELLED', current_period_end: inDays(2), end_date: null },
    { user_id: 'u-cancel-left', status: 'CANCELLED', current_period_end: inDays(3), end_date: null },
    { user_id: 'u-cancel-closed', status: 'CANCELLED', current_period_end: inDays(-0.01), end_date: null },
    { user_id: 'u-expired', status: 'ACTIVE', current_period_end: inDays(-1), end_date: null },
    { user_id: 'u-pending', status: 'PENDING', current_period_end: null, end_date: null },
  ],
}

function queryBuilder(table: string) {
  let rows = TABLES[table] ?? []
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] === value)
      return builder
    },
    in: (column: string, values: readonly unknown[]) => {
      rows = rows.filter((row) => values.includes(row[column]))
      return builder
    },
    single: async () => ({ data: rows[0] ?? null, error: rows[0] ? null : { message: 'no rows' } }),
    then: <T>(resolve: (value: { data: Row[]; error: null }) => T) => resolve({ data: rows, error: null }),
  }
  return builder
}

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: (table: string) => queryBuilder(table) }),
}))

type GetHandler = (typeof import('../route'))['GET']
let GET: GetHandler

beforeAll(async () => {
  process.env.CRON_SECRET = 'cron-test'
  ;({ GET } = await import('../route'))
})

const cronRequest = () =>
  new Request('https://k-haehwadang.com/api/cron/daily-fortune', {
    headers: { authorization: 'Bearer cron-test' },
  }) as unknown as Parameters<GetHandler>[0]

describe('오늘의 운세 크론 — 활성 구독자', () => {
  it('대문자 상태(ACTIVE·해지 예약)로 찾고, 기간이 닫힌 구독은 빼고, 한 사람에게 한 번만 보낸다', async () => {
    const response = await GET(cronRequest())
    const body = (await response.json()) as { stats?: { total: number; sent: number } }

    const targets = (generateDailyFortune as jest.Mock).mock.calls.map(([userId]) => userId)
    expect(targets.sort()).toEqual(['u-active', 'u-cancel-left'])
    expect(sendKakaoNotification).toHaveBeenCalledTimes(2)
    expect(body.stats).toMatchObject({ total: 2, sent: 2 })
  })
})
