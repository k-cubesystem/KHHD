/**
 * 오늘의 운세 알림톡 «일괄 발송» 정본 — 크론과 어드민 수동 실행이 **같은 경로**를 쓴다.
 *
 * 2026-09-19 실측으로 드러난 원결함(전부 무음이었다):
 *  1. 발송 함수가 `profiles.phone` 을 읽었다 — 그런 칸은 없다. 전화번호는 notification_preferences.phone_number.
 *  2. notification_logs 에 없는 칸(`type`)을 insert 해 로그가 한 줄도 안 남았다.
 *  3. 세션 클라이언트로 명식을 읽어 RLS(profiles_select_own)에 막혀 전원 '생년월일 정보가 필요합니다.'
 *  4. pfId 를 KAKAO_PFID 로 읽었다 — 정본 환경변수는 SOLAPI_PFID.
 *
 * 🔴 수신 동의(notification_preferences.alimtalk_enabled·daily_fortune_enabled + 전화번호)가 없는 구독자에게는
 *    보내지 않는다. 구독은 «결제 상태»일 뿐 «광고성 정보 수신 동의»가 아니다.
 */

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { getSiteUrl } from '@/lib/utils/site-url'
import { ALIMTALK_TEMPLATES, preflightAlimtalk, sendAlimtalkMessage } from '@/lib/services/solapi'
import { generateDailyFortuneCore } from '@/lib/services/daily-fortune'
import {
  MEMBERSHIP_LIVE_STATUSES,
  MEMBERSHIP_PERIOD_COLUMNS,
  isLiveMembershipRow,
  type MembershipPeriodRow,
} from '@/lib/auth/subscription'

const SITE_URL = getSiteUrl()

/** Gemini 과부하 방지 — 한 번에 5명씩. */
const CONCURRENCY_LIMIT = 5

interface SubscriberRow extends MembershipPeriodRow {
  user_id: string
}

interface RecipientRow {
  user_id: string
  phone_number: string
}

export interface DailyFortuneDispatchResult {
  ok: boolean
  /** 한 통도 보낼 수 없던 이유(사전 점검). 보낼 수 있었으면 없음. */
  blocked?: string
  /** 활성 구독자 수(수신 동의 여부 무관). */
  subscribers: number
  /** 실제 발송 대상 = 활성 구독자 ∩ 수신 동의. */
  total: number
  generated: number
  sent: number
  errors: number
}

function emptyResult(over: Partial<DailyFortuneDispatchResult> = {}): DailyFortuneDispatchResult {
  return { ok: true, subscribers: 0, total: 0, generated: 0, sent: 0, errors: 0, ...over }
}

/**
 * 오늘의 운세 알림톡을 활성 구독자 중 **수신 동의자**에게 발송한다.
 * @param templateOverride system_settings.kakao_template_id — 승인 코드를 배포 없이 갈아끼우는 자리.
 */
export async function dispatchDailyFortuneAlimtalk(templateOverride?: string): Promise<DailyFortuneDispatchResult> {
  const supabase = createAdminClient()
  const templateCode = templateOverride?.trim() || ALIMTALK_TEMPLATES.DAILY_FORTUNE

  // 0. 사전 점검 — 보낼 수 없는 상태면 **운세 생성도 하지 않는다**(Gemini 비용을 버리지 않는다).
  const preflight = preflightAlimtalk(templateCode)
  if (!preflight.ok) {
    logger.warn('[DailyFortune] 발송 전 점검 실패:', preflight.reason)
    return emptyResult({ ok: false, blocked: preflight.reason })
  }

  // 1. 활성 구독자 — 멤버십 게이트와 같은 판정, 한 사람에 한 번.
  const { data: subs, error: subError } = await supabase
    .from('subscriptions')
    .select(`user_id, ${MEMBERSHIP_PERIOD_COLUMNS}`)
    .in('status', [...MEMBERSHIP_LIVE_STATUSES])

  if (subError) {
    logger.error('[DailyFortune] 구독자 조회 실패:', subError)
    return emptyResult({ ok: false, blocked: subError.message })
  }

  const subscriberIds = new Set(
    ((subs ?? []) as SubscriberRow[]).filter((row) => isLiveMembershipRow(row)).map((row) => row.user_id)
  )
  if (subscriberIds.size === 0) return emptyResult()

  // 2. 수신 동의자 — 동의한 사람 쪽이 늘 더 작으므로 이쪽을 통째로 읽어 교집합을 낸다.
  const { data: prefs, error: prefError } = await supabase
    .from('notification_preferences')
    .select('user_id, phone_number')
    .eq('alimtalk_enabled', true)
    .eq('daily_fortune_enabled', true)
    .not('phone_number', 'is', null)

  if (prefError) {
    logger.error('[DailyFortune] 알림 설정 조회 실패:', prefError)
    return emptyResult({ ok: false, blocked: prefError.message, subscribers: subscriberIds.size })
  }

  const recipients = ((prefs ?? []) as RecipientRow[]).filter((row) => subscriberIds.has(row.user_id))
  if (recipients.length === 0) return emptyResult({ subscribers: subscriberIds.size })

  // 3. 이름 — 템플릿의 #{이름}.
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in(
      'id',
      recipients.map((r) => r.user_id)
    )
  const nameById = new Map(
    ((profiles ?? []) as { id: string; full_name: string | null }[]).map((p) => [p.id, p.full_name])
  )

  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const result = emptyResult({ subscribers: subscriberIds.size, total: recipients.length })

  for (let i = 0; i < recipients.length; i += CONCURRENCY_LIMIT) {
    const chunk = recipients.slice(i, i + CONCURRENCY_LIMIT)

    await Promise.allSettled(
      chunk.map(async (recipient) => {
        const { user_id: userId, phone_number: phone } = recipient
        try {
          // 크론에는 세션이 없다 — admin 으로 읽고, 세션 전용인 analysis_history 기록은 건너뛴다.
          const gen = await generateDailyFortuneCore(userId, userId, 'USER', {
            reader: 'admin',
            saveHistory: false,
          })
          if (!gen.success) throw new Error(gen.error || '운세 생성 실패')
          result.generated++

          const send = await sendAlimtalkMessage(phone, templateCode, {
            '#{이름}': nameById.get(userId) || '회원',
            '#{날짜}': dateStr,
            '#{앱링크}': `${SITE_URL}/protected/fortune`,
          })
          if (!send.success) throw new Error(send.error || '알림톡 발송 실패')

          result.sent++
          await logNotification(supabase, userId, templateCode, 'SENT', null)
        } catch (err) {
          logger.error(`[DailyFortune] 발송 실패 user=${userId}:`, err)
          result.errors++
          // 실패도 한 줄 남긴다 — 어드민 화면에서 «누가 왜 못 받았는지»가 보여야 한다.
          // 운세 생성 단계에서 넘어진 것도 여기로 모인다(한 사람당 정확히 한 줄).
          await logNotification(
            supabase,
            userId,
            templateCode,
            'FAILED',
            err instanceof Error ? err.message : String(err)
          )
        }
      })
    )
  }

  return result
}

/**
 * notification_logs 한 줄. 🔴 실제 칸만 쓴다 — `type` 칸은 **없다**(있는 줄 알고 넣어서 로그가 통째로 비었다).
 * 로그 실패가 발송 결과를 뒤집지 않는다(부가 기록).
 */
async function logNotification(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  templateId: string,
  status: 'SENT' | 'FAILED',
  errorMessage: string | null
): Promise<void> {
  try {
    const { error } = await supabase.from('notification_logs').insert({
      user_id: userId,
      template_id: templateId,
      status,
      error_message: errorMessage,
    })
    if (error) logger.error('[DailyFortune] notification_logs 기록 실패:', error)
  } catch (e) {
    logger.error('[DailyFortune] notification_logs 기록 예외:', e)
  }
}
