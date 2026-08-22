'use server'

/**
 * 속풀이 P1-A — 「광고 보고 향 올리기」 쿠팡 방문형 서버 액션.
 *
 * 흐름: startCoupangVisit(논스 발급+딥링크) → 사용자가 새 탭에서 쿠팡 방문 →
 *       claimCoupangVisit(최소 체류 검증 후 지급). 지급·소비·환급·일일 상한(KST)은 전부
 *       service_role RPC(20260822_ad_reward_ledger.sql)가 정본 — 여기선 조회·조립만 한다.
 *
 * 폭주 방지: ①일일 세트/시작 한도(RPC) ②AI 일일 예산 브레이커(발급만 중단, 유료 경로 무관)
 *           ③rate limit ④키·링크 부재 시 기능 자동 숨김(no_inventory).
 */

import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { createCoupangDeeplink, hasCoupangApiKeys } from '@/lib/services/coupang-partners'
import { COUPANG_VISIT_TARGET, sanitizeSubId } from '@/lib/domain/ads/coupang'
import { kstDayStartUtcIso, type AdRewardAvailability } from '@/lib/domain/ads/rewarded'

const PROVIDER = 'coupang_visit'

interface AdSettings {
  enabled: boolean
  dailySets: number
  dailyStarts: number
  reward: number
  minDwellSeconds: number
  expireHours: number
  budgetUsd: number
  fallbackUrl: string
}

const SETTING_KEYS = [
  'chat_ad_reward_enabled',
  'chat_ad_daily_sets',
  'chat_ad_daily_starts',
  'chat_ad_visit_reward',
  'chat_ad_min_dwell_seconds',
  'chat_ad_credit_expire_hours',
  'ai_daily_budget_usd',
  'coupang_partners_url',
] as const

/**
 * 🔴 system_settings 의 RLS 는 admin 전용(SELECT 포함) — 유저 클라이언트로 읽으면 0행이 돌아와
 *    스위치가 꺼진 것으로 오판, 광고 기능이 전 사용자에게 숨는다(2026-08-22 실사고 — 관리자만
 *    버튼이 보일 뻔한 게 아니라, 판정 자체가 조용히 죽었다). 반드시 service_role 로 읽는다.
 *    서버 액션 내부 읽기이고 클라이언트에는 파생값(가용성)만 나가므로 노출 없음.
 */
async function loadAdSettings(): Promise<AdSettings> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('system_settings')
    .select('key, value')
    .in('key', [...SETTING_KEYS])
  const map = new Map((data ?? []).map((r) => [r.key as string, r.value as string]))
  const num = (key: string, fallback: number) => {
    const parsed = Number(map.get(key))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
  }
  return {
    enabled: map.get('chat_ad_reward_enabled') === 'true',
    dailySets: num('chat_ad_daily_sets', 1),
    dailyStarts: num('chat_ad_daily_starts', 5),
    reward: num('chat_ad_visit_reward', 2),
    minDwellSeconds: num('chat_ad_min_dwell_seconds', 15),
    expireHours: num('chat_ad_credit_expire_hours', 48),
    budgetUsd: num('ai_daily_budget_usd', 30),
    fallbackUrl: (map.get('coupang_partners_url') ?? '').trim(),
  }
}

/** AI 일일(KST) 지출이 예산에 닿았는지 — 닿으면 광고 «발급»만 멈춘다(유료 경로는 그대로). */
async function isBudgetExhausted(budgetUsd: number): Promise<boolean> {
  if (budgetUsd <= 0) return false
  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('gemini_api_logs')
      .select('estimated_cost_usd')
      .gte('created_at', kstDayStartUtcIso(new Date()))
    const spent = (data ?? []).reduce((sum, r) => sum + Number(r.estimated_cost_usd ?? 0), 0)
    return spent >= budgetUsd
  } catch (e) {
    logger.warn('[isBudgetExhausted] 비용 집계 실패 — 보수적으로 발급 중단:', e)
    return true
  }
}

/**
 * 광고 리워드 가용성 — 버튼 노출·문구 분기용. 키도 링크도 없으면 조용히 숨긴다.
 */
export async function getAdRewardAvailability(): Promise<AdRewardAvailability> {
  const off: AdRewardAvailability = { enabled: false, reason: 'disabled', setsLeftToday: 0, reward: 0 }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return off

    const settings = await loadAdSettings()
    if (!settings.enabled) return off
    if (!hasCoupangApiKeys() && !settings.fallbackUrl) {
      return { enabled: false, reason: 'no_inventory', setsLeftToday: 0, reward: settings.reward }
    }
    if (await isBudgetExhausted(settings.budgetUsd)) {
      return { enabled: false, reason: 'budget', setsLeftToday: 0, reward: settings.reward }
    }

    const adminClient = createAdminClient()
    const { data: usedToday, error } = await adminClient.rpc('get_ad_reward_today', {
      p_user_id: user.id,
      p_provider: PROVIDER,
    })
    if (error) {
      logger.warn('[getAdRewardAvailability] get_ad_reward_today 실패:', error)
      return off
    }
    const setsLeftToday = Math.max(0, settings.dailySets - (typeof usedToday === 'number' ? usedToday : 0))
    if (setsLeftToday <= 0) {
      return { enabled: false, reason: 'daily_limit', setsLeftToday: 0, reward: settings.reward }
    }
    return { enabled: true, setsLeftToday, reward: settings.reward }
  } catch (e) {
    logger.warn('[getAdRewardAvailability] 실패:', e)
    return off
  }
}

/** 유효 광고 질문권 잔량 — 입장 게이트·상태 표시용 (RLS 본인 SELECT). */
export async function getAdCreditBalance(): Promise<number> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 0
    const { data } = await supabase
      .from('ad_reward_ledger')
      .select('remaining, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'granted')
      .gt('remaining', 0)
    const now = Date.now()
    return (data ?? [])
      .filter((r) => r.expires_at && new Date(r.expires_at as string).getTime() > now)
      .reduce((sum, r) => sum + (r.remaining ?? 0), 0)
  } catch (e) {
    logger.warn('[getAdCreditBalance] 실패:', e)
    return 0
  }
}

/**
 * 방문 시작 — 논스 발급 + 추적 딥링크 생성. 반환 url 을 새 탭으로 연다.
 */
export async function startCoupangVisit(): Promise<{
  success: boolean
  url?: string
  nonce?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    const rl = await rateLimit(`ad-reward:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 10 })
    if (!rl.success) return { success: false, error: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }

    const settings = await loadAdSettings()
    if (!settings.enabled) return { success: false, error: '지금은 광고 보상이 닫혀 있습니다.' }
    if (await isBudgetExhausted(settings.budgetUsd)) {
      return { success: false, error: '오늘 향로가 가득 찼습니다. 내일 다시 열립니다.' }
    }

    const nonce = randomUUID().replace(/-/g, '')
    const adminClient = createAdminClient()
    const { data: startResult, error: startError } = await adminClient.rpc('start_ad_reward', {
      p_user_id: user.id,
      p_provider: PROVIDER,
      p_nonce: nonce,
      p_daily_sets: settings.dailySets,
      p_daily_starts: settings.dailyStarts,
    })
    if (startError) {
      // PostgrestError 는 Error 하위 클래스 — 그대로 넘기면 logger 가 Sentry captureException 으로 잇는다.
      logger.error(startError, '[startCoupangVisit]')
      return { success: false, error: '광고 준비 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.' }
    }
    if (startResult === 'DAILY_LIMIT') {
      return { success: false, error: '오늘 향은 이미 올리셨습니다. 내일 다시 올릴 수 있어요.' }
    }
    if (startResult === 'START_LIMIT') {
      return { success: false, error: '오늘은 더 시도할 수 없습니다. 내일 다시 열립니다.' }
    }

    // 추적 딥링크(subId=논스) — 실패 시 수동 폴백 링크. 그마저 없으면 시작 자체를 거절.
    const url =
      (await createCoupangDeeplink(COUPANG_VISIT_TARGET, sanitizeSubId(nonce))) || settings.fallbackUrl || null
    if (!url) return { success: false, error: '광고 준비가 아직 되지 않았습니다.' }

    return { success: true, url, nonce }
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error(String(e)), '[startCoupangVisit]')
    return { success: false, error: '광고 준비 중 문제가 생겼습니다.' }
  }
}

/**
 * 방문 복귀 후 지급 — 최소 체류(서버 시각 기준)는 RPC 가 강제. 멱등(ALREADY 는 성공 취급).
 */
export async function claimCoupangVisit(nonce: string): Promise<{
  success: boolean
  granted?: boolean
  reward?: number
  adCredits?: number
  error?: string
  tooFast?: boolean
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    const safeNonce = sanitizeSubId(nonce)
    if (!safeNonce) return { success: false, error: '잘못된 요청입니다.' }

    const settings = await loadAdSettings()
    const adminClient = createAdminClient()
    const { data: grantResult, error: grantError } = await adminClient.rpc('grant_ad_reward', {
      p_user_id: user.id,
      p_nonce: safeNonce,
      p_qty: settings.reward,
      p_min_dwell_seconds: settings.minDwellSeconds,
      p_expire_hours: settings.expireHours,
    })
    if (grantError) {
      logger.error(grantError, '[claimCoupangVisit]')
      return { success: false, error: '향이 오르지 못했습니다. 잠시 후 다시 시도해주세요.' }
    }

    if (grantResult === 'TOO_FAST') {
      return {
        success: false,
        tooFast: true,
        error: '너무 빨리 돌아오셨어요. 잠시 둘러보고 오시면 향이 올라갑니다.',
      }
    }
    if (grantResult === 'NOT_FOUND') {
      return { success: false, error: '진행 중인 향이 없습니다. 처음부터 다시 올려주세요.' }
    }

    const adCredits = await getAdCreditBalance()
    return { success: true, granted: grantResult === 'GRANTED', reward: settings.reward, adCredits }
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error(String(e)), '[claimCoupangVisit]')
    return { success: false, error: '향이 오르지 못했습니다.' }
  }
}
