import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

// 일일 헬스체크 — 코드/DB 계약이 깨졌는지 매일 대조하고, 깨졌으면 Sentry 경보를 울린다.
//
// 왜 필요한가: 7/4 DB 재구축 때 RPC 8종이 사라졌는데 호출부가 에러를 무시해 **무음 실패**로
// 오래 방치됐다(출석·추천·운세저널·분석통계). 유저 제보로야 발견되던 사고를 24시간 안에 잡는 게 목적.
// logger.error 가 Sentry.captureException 으로 이어지므로 별도 알림 배선 불필요.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 코드가 .rpc() 로 호출하는 필수 함수 — 새 RPC 추가 시 여기도 추가할 것 */
const REQUIRED_RPCS = [
  // 재화 (가장 치명적 — 무음 실패 시 지급 누락)
  'add_wallet_balance',
  'deduct_wallet_balance',
  'add_bokchae',
  'add_bok_points',
  'deduct_bok_points',
  'add_shaman_credits',
  'consume_shaman_credit',
  'record_ai_chat_turn',
  'get_charge_exempt_remaining',
  // 신당
  'award_deity_bond',
  'grant_shrine_item',
  'increment_shrine_visitor',
  'get_family_hall_presence',
  // 채팅 보존
  'purge_expired_chat_messages',
  'notify_expiring_chat_sessions',
  // 추천·운세저널·통계 (7/4 소실 이력)
  'get_or_create_referral_code',
  'process_referral_bonus',
  'calculate_monthly_fortune',
  'calculate_yearly_fortune',
  'calculate_family_fortune',
  'get_analysis_stats',
  // 어드민
  'get_admin_dashboard_stats',
  'check_missing_rpcs',
] as const

/** 스모크 호출용 더미 대상 — 실제 유저를 건드리지 않으려고 nil UUID 를 쓴다. */
const NIL_UUID = '00000000-0000-0000-0000-000000000000'

/** 존재해야 하는 핵심 테이블 (재구축 소실 감지) */
const REQUIRED_TABLES = [
  'profiles',
  'wallets',
  'wallet_transactions',
  'shrines',
  'shrine_deities',
  'shrine_item_catalog',
  'shrine_theme_packs',
  'chat_sessions',
  'notifications',
  'announcements',
  'admin_audit_log',
  'membership_plans',
] as const

/**
 * 실제로 **호출해 보는** 읽기 전용 RPC — 부작용이 없는 것만.
 *
 * 왜 실재 확인만으로 부족한가: get_family_with_missions·get_recent_activities·get_hourly_traffic 은
 * 함수가 멀쩡히 존재했는데도 RETURNS TABLE 선언 타입이 실제 컬럼과 어긋나 호출할 때마다
 * 42804 로 죽고 있었다(2026-07-19 발견, 가족 미션·어드민 대시보드 무음 실패).
 * 존재 검사는 이걸 절대 못 잡는다 — 그래서 한 번씩 실행해 본다.
 * 행이 0건이어도 반환 타입 불일치는 그대로 드러난다.
 */
const SMOKE_RPCS: ReadonlyArray<{ name: string; args: Record<string, unknown> }> = [
  { name: 'get_family_with_missions', args: { user_id_param: NIL_UUID } },
  { name: 'get_family_with_analysis_summary', args: { user_id_param: NIL_UUID } },
  { name: 'get_analysis_stats', args: { user_id_param: NIL_UUID } },
  { name: 'calculate_family_fortune', args: { user_id_param: NIL_UUID, year_param: 2026, month_param: 1 } },
  { name: 'calculate_yearly_fortune', args: { user_id_param: NIL_UUID, year_param: 2026 } },
  { name: 'get_today_fortune', args: { p_user_id: NIL_UUID } },
  { name: 'get_recent_activities', args: { p_limit: 1 } },
  { name: 'get_hourly_traffic', args: { p_hours: 24 } },
  { name: 'get_gemini_daily_stats', args: { days_back: 1 } },
  { name: 'get_gemini_action_stats', args: { days_back: 1 } },
  { name: 'get_gemini_recent_logs', args: { log_limit: 1 } },
]

interface HealthIssue {
  kind: 'missing_rpc' | 'broken_rpc' | 'unreachable_table' | 'stale_cron' | 'config'
  detail: string
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    logger.warn('[Health Cron] Skipping auth in development mode')
  }

  const supabase = createAdminClient()
  const issues: HealthIssue[] = []

  // 1) 필수 RPC 실재 여부 — 재구축 소실 감지의 핵심
  const { data: missing, error: rpcError } = await supabase.rpc('check_missing_rpcs', {
    p_names: [...REQUIRED_RPCS],
  })
  if (rpcError) {
    issues.push({ kind: 'missing_rpc', detail: `check_missing_rpcs 자체 실패: ${rpcError.message}` })
  } else if (Array.isArray(missing) && missing.length > 0) {
    issues.push({ kind: 'missing_rpc', detail: `소실된 RPC ${missing.length}종: ${missing.join(', ')}` })
  }

  // 1-b) 읽기 전용 RPC 실제 호출 — "존재하지만 호출하면 터지는" 계약 파손 감지
  await Promise.all(
    SMOKE_RPCS.map(async ({ name, args }) => {
      const { error } = await supabase.rpc(name, args)
      if (error) issues.push({ kind: 'broken_rpc', detail: `${name}: ${error.message}` })
    })
  )

  // 2) 핵심 테이블 접근성 (RLS 우회 admin 기준 — 존재/권한 문제만 잡는다)
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) issues.push({ kind: 'unreachable_table', detail: `${table}: ${error.message}` })
  }

  // 3) 필수 환경변수
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
    issues.push({ kind: 'config', detail: 'Gemini API 키 미설정 — AI 기능 전면 실패' })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push({ kind: 'config', detail: 'SERVICE_ROLE 키 미설정 — 재화 지급·어드민 경로 실패' })
  }

  const healthy = issues.length === 0
  const summary = { healthy, issueCount: issues.length, issues, checkedAt: new Date().toISOString() }

  if (!healthy) {
    // ⚠️ logger.error 는 **첫 인자가 Error 일 때만** captureException 을 쓴다(문자열이면 captureMessage).
    //    이슈 그룹핑·알림이 제대로 걸리도록 Error 를 먼저 넘긴다.
    const err = new Error(`Health check failed (${issues.length}): ${issues.map((i) => i.kind).join(', ')}`)
    logger.error(err, { issues })
    return NextResponse.json(summary, { status: 500 })
  }

  logger.log('[Health Cron] 정상:', {
    rpcs: REQUIRED_RPCS.length,
    smoked: SMOKE_RPCS.length,
    tables: REQUIRED_TABLES.length,
  })
  return NextResponse.json(summary)
}
