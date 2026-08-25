/**
 * 활성 멤버십 판정 · 기록 보관 정책 단일 기준 (서버 전용).
 *
 * 게이팅(신당·가족·고민상담)과 기록 보관(무료 30일 / 멤버십 무기한)이 모두 이 파일을 경유한다.
 * - 마스터(admin)는 privileges.ts(hasUnlimitedAccess) 기준으로 **항상 통과**한다(단일 기준 준수).
 * - 활성 멤버십 = subscriptions.status='ACTIVE' 이고 기간(current_period_end/end_date) 미만료.
 *
 * ⚠️ 보호파일 membership.ts 는 열지 않는다 — 필요한 판정 로직은 여기서 독립 구현한다(조회만).
 */

import { createClient } from '@/lib/supabase/server'
import { hasUnlimitedAccess } from '@/lib/auth/privileges'
import { FREE_RETENTION_DAYS } from '@/lib/domain/payment/membership-benefits'

// 보관 기간은 순수 도메인 모듈이 정본이다(클라이언트 문구도 같은 값을 읽어야 해서).
// 기존 소비자를 위해 여기서 그대로 통과시킨다.
export { FREE_RETENTION_DAYS }

export interface ActiveMembership {
  /** SINGLE | FAMILY | BUSINESS | MASTER (마스터) | MEMBER (tier 조회 실패 폴백). */
  tier: string
  planId: string | null
  status: string
  /** 만료 기준 시각 ISO. 마스터·무기한이면 null. */
  currentPeriodEnd: string | null
  /**
   * 현재 결제 주기 시작 시각 ISO. 마스터·미상이면 null.
   * 속풀이 «주 10회»의 7일 창이 여기에 앵커된다(lib/domain/chat/entitlements memberWeekWindow) —
   * 멤버십 판정과 창 계산이 갈라지지 않도록 같은 조회에서 함께 내놓는다.
   */
  currentPeriodStart: string | null
  /** 마스터(admin) 무제한 여부. */
  isMaster: boolean
}

interface ActiveSubscriptionCore {
  isMaster: boolean
  planId: string | null
  status: string
  currentPeriodEnd: string | null
  currentPeriodStart: string | null
}

interface SubscriptionRow {
  plan_id: string | null
  status: string | null
  current_period_end: string | null
  end_date: string | null
  current_period_start: string | null
  start_date: string | null
}

/**
 * 활성 구독 핵심 판정 — 마스터 우선, 없으면 ACTIVE + 미만료 구독을 찾는다(tier 미조회, 경량).
 * 어떤 이유로든 조회 실패 시 null(비회원 취급) — 게이트/보관은 안전 측 실패.
 */
async function resolveActiveSubscription(userId: string): Promise<ActiveSubscriptionCore | null> {
  const supabase = await createClient()

  // 1) 마스터(admin) 무제한 — privileges 단일 기준. 항상 통과.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (hasUnlimitedAccess((profile as { role?: string } | null)?.role)) {
    return { isMaster: true, planId: null, status: 'ACTIVE', currentPeriodEnd: null, currentPeriodStart: null }
  }

  // 2) 활성 구독 — 기간 미만료.
  //    🔴 CANCELLED 도 함께 본다. 약관 제6조 4항이 "해지 시 현재 결제 주기의 만료일까지 이용할 수 있다"고
  //    약속하는데 status='ACTIVE' 만 보면 해지 버튼을 누른 즉시 혜택이 끊겨 약관 위반이 된다.
  //    즉시 해지(일할 환불)는 current_period_end 를 지금으로 닫으므로 아래 만료 검사에서 저절로 빠진다.
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_id, status, current_period_end, end_date, current_period_start, start_date')
    .in('status', ['ACTIVE', 'CANCELLED'])
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const row = data as SubscriptionRow | null
  if (!row) return null

  const periodEnd = row.current_period_end ?? row.end_date ?? null
  // 해지된 구독은 «남은 기간»이 있을 때만 유효하다. 기간을 모르면 무기한 통과시키지 않는다.
  if (row.status === 'CANCELLED' && !periodEnd) return null
  if (periodEnd && new Date(periodEnd).getTime() < Date.now()) return null

  return {
    isMaster: false,
    planId: row.plan_id ?? null,
    status: row.status ?? 'ACTIVE',
    currentPeriodEnd: periodEnd,
    currentPeriodStart: row.current_period_start ?? row.start_date ?? null,
  }
}

/** 활성 멤버십 여부(boolean). 마스터 포함. 게이트 판정용. */
export async function hasActiveMembership(userId: string): Promise<boolean> {
  return (await resolveActiveSubscription(userId)) !== null
}

/** 활성 멤버십 상세(tier 포함) 또는 null. 카피/티어 표시용. */
export async function getActiveMembership(userId: string): Promise<ActiveMembership | null> {
  const core = await resolveActiveSubscription(userId)
  if (!core) return null
  if (core.isMaster) {
    return {
      tier: 'MASTER',
      planId: null,
      status: 'ACTIVE',
      currentPeriodEnd: null,
      currentPeriodStart: null,
      isMaster: true,
    }
  }

  let tier = 'MEMBER'
  if (core.planId) {
    const supabase = await createClient()
    const { data: plan } = await supabase.from('membership_plans').select('tier').eq('id', core.planId).maybeSingle()
    const planTier = (plan as { tier?: string } | null)?.tier
    if (planTier) tier = planTier
  }

  return {
    tier,
    planId: core.planId,
    status: core.status,
    currentPeriodEnd: core.currentPeriodEnd,
    currentPeriodStart: core.currentPeriodStart,
    isMaster: false,
  }
}

/** 로그인 사용자의 활성 멤버십. 미로그인/비회원이면 null. 페이지 게이트에서 사용. */
export async function getCurrentUserMembership(): Promise<ActiveMembership | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return getActiveMembership(user.id)
}

/** 기록 보관 제한 대상 여부 — 비회원(=멤버십 없음)이면 true(최근 30일만). 마스터/멤버는 false. */
export async function isRetentionLimited(userId: string): Promise<boolean> {
  return !(await hasActiveMembership(userId))
}

/**
 * 무료 보관 경계(ISO) — '오늘 - N일'의 UTC 자정으로 고정한다.
 * 일 단위 고정 → 무한 캐시 키 안정 + 경계 깜빡임 없음(밀리초 경계보다 UX·성능 우수).
 * gte(cutoff) 로 필터하면 이 시각 이후 기록만 노출되고, lt(cutoff) 로 잠긴 건수를 센다.
 */
export function retentionCutoffISO(days: number = FREE_RETENTION_DAYS): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString()
}
