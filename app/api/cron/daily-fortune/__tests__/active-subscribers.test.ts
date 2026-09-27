/**
 * @jest-environment node
 */
/**
 * 오늘의 운세 크론 — 발송 경로 회귀선.
 *
 * 원결함(2026-09-18~19 실측, 전부 무음이었다):
 *  - subscriptions.status 는 대문자(CHECK)인데 크론이 .eq('status','active') 로 찾아 대상이 늘 0명.
 *  - 발송 함수가 없는 칸(profiles.phone)을 읽고, 없는 칸(notification_logs.type)을 insert.
 *  - 세션 클라이언트로 명식을 읽어 RLS 에 막혀 전원 실패.
 *
 * 계약:
 *  1. 멤버십 게이트와 같은 판정(ACTIVE·해지 예약 + 기간 미만료), 한 사람에 한 번.
 *  2. notification_preferences 로 **수신 동의한 사람에게만** 보낸다.
 *  3. 운세 생성은 admin 클라이언트(reader:'admin')로 — 세션 RLS 에 막히지 않는다.
 *  4. notification_logs 는 실제 칸(template_id·status)만 쓴다.
 */
import { generateDailyFortuneCore } from '@/lib/services/daily-fortune'
import { sendAlimtalkMessage } from '@/lib/services/solapi'

jest.mock('@/lib/services/daily-fortune', () => ({
  generateDailyFortuneCore: jest.fn(async () => ({ success: true, content: '오늘은 물의 기운이 도와요.' })),
}))
jest.mock('@/lib/services/solapi', () => ({
  ALIMTALK_TEMPLATES: { DAILY_FORTUNE: 'KA01TP000000000000000000000000001' },
  preflightAlimtalk: jest.fn(() => ({ ok: true })),
  sendAlimtalkMessage: jest.fn(async () => ({ success: true, messageId: 'm-1' })),
}))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

type Row = Record<string, unknown>

const DAY = 86_400_000
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString()

const inserted: { table: string; row: Row }[] = []

const TABLES: Record<string, Row[]> = {
  system_settings: [
    { key: 'daily_fortune_enabled', value: 'true' },
    { key: 'kakao_template_id', value: 'KA01TP221025072818052xMkTLBLCcmm' },
  ],
  subscriptions: [
    { user_id: 'u-active', status: 'ACTIVE', current_period_end: inDays(5), end_date: null },
    { user_id: 'u-active', status: 'CANCELLED', current_period_end: inDays(2), end_date: null },
    { user_id: 'u-cancel-left', status: 'CANCELLED', current_period_end: inDays(3), end_date: null },
    { user_id: 'u-cancel-closed', status: 'CANCELLED', current_period_end: inDays(-0.01), end_date: null },
    { user_id: 'u-expired', status: 'ACTIVE', current_period_end: inDays(-1), end_date: null },
    { user_id: 'u-pending', status: 'PENDING', current_period_end: null, end_date: null },
    // 구독은 살아 있으나 수신 동의가 없다 — 보내면 안 된다.
    { user_id: 'u-no-consent', status: 'ACTIVE', current_period_end: inDays(9), end_date: null },
  ],
  notification_preferences: [
    { user_id: 'u-active', phone_number: '01011112222', alimtalk_enabled: true, daily_fortune_enabled: true },
    { user_id: 'u-cancel-left', phone_number: '01033334444', alimtalk_enabled: true, daily_fortune_enabled: true },
    // 알림톡은 켰지만 «오늘의 운세»는 껐다.
    { user_id: 'u-no-consent', phone_number: '01055556666', alimtalk_enabled: true, daily_fortune_enabled: false },
    // 구독자가 아니다 — 동의만으로는 대상이 아니다.
    { user_id: 'u-free', phone_number: '01077778888', alimtalk_enabled: true, daily_fortune_enabled: true },
  ],
  profiles: [
    { id: 'u-active', full_name: '김해화' },
    { id: 'u-cancel-left', full_name: '이청담' },
  ],
  notification_logs: [],
}

function queryBuilder(table: string) {
  let rows = [...(TABLES[table] ?? [])]
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
    not: (column: string, _op: string, _value: unknown) => {
      rows = rows.filter((row) => row[column] != null)
      return builder
    },
    insert: async (row: Row) => {
      inserted.push({ table, row })
      return { data: null, error: null }
    },
    single: async () => ({ data: rows[0] ?? null, error: rows[0] ? null : { message: 'no rows' } }),
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
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

describe('오늘의 운세 크론 — 발송 경로', () => {
  it('대문자 상태로 찾고, 기간이 닫힌 구독은 빼고, 수신 동의자에게 한 번만 보낸다', async () => {
    const response = await GET(cronRequest())
    const body = (await response.json()) as { stats?: { total: number; sent: number; subscribers: number } }

    const targets = (generateDailyFortuneCore as jest.Mock).mock.calls.map(([userId]) => userId)
    expect(targets.sort()).toEqual(['u-active', 'u-cancel-left'])

    // 동의 없는 구독자(u-no-consent)·구독 없는 동의자(u-free)에게는 가지 않는다.
    const phones = (sendAlimtalkMessage as jest.Mock).mock.calls.map(([phone]) => phone)
    expect(phones.sort()).toEqual(['01011112222', '01033334444'])

    expect(body.stats).toMatchObject({ subscribers: 3, total: 2, sent: 2, errors: 0 })
  })

  it('운세 생성은 세션이 아니라 admin 클라이언트로 돈다(RLS 에 막히지 않게)', () => {
    for (const [, , , options] of (generateDailyFortuneCore as jest.Mock).mock.calls) {
      expect(options).toMatchObject({ reader: 'admin', saveHistory: false })
    }
  })

  it('notification_logs 는 실제 칸만 쓴다 — `type` 칸은 없다 · 한 사람당 한 줄', () => {
    const logs = inserted.filter((i) => i.table === 'notification_logs')
    expect(logs).toHaveLength(2)
    for (const { row } of logs) {
      expect(row).not.toHaveProperty('type')
      expect(Object.keys(row).sort()).toEqual(['error_message', 'status', 'template_id', 'user_id'])
      expect(row).toMatchObject({ status: 'SENT', template_id: 'KA01TP221025072818052xMkTLBLCcmm' })
    }
  })

  it('알림톡 날짜는 서울 날짜다 — 크론이 도는 UTC 22시는 한국의 다음 날 아침 7시', async () => {
    // Vercel 함수는 UTC 로 돈다. 개발 PC 는 서울 시간대라 결과 글자로는 결함이 안 보여서 포맷 옵션을 본다.
    const format = jest.spyOn(Date.prototype, 'toLocaleDateString')
    try {
      await GET(cronRequest())
      const zones = format.mock.calls.map(([, options]) => options?.timeZone)
      expect(zones).toContain('Asia/Seoul')
      expect(zones).not.toContain(undefined)
    } finally {
      format.mockRestore()
    }
  })
})
