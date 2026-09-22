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
import { createAdminClient } from '@/lib/supabase/admin'
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
  /** 이 기간이 끝나면 정기결제로 이어지는가 — 해지했거나 결제 수단 없이 부여된 멤버십이면 false. */
  renews: boolean
}

interface ActiveSubscriptionCore {
  isMaster: boolean
  planId: string | null
  status: string
  currentPeriodEnd: string | null
  currentPeriodStart: string | null
  renews: boolean
}

interface SubscriptionRow {
  plan_id: string | null
  status: string | null
  current_period_end: string | null
  end_date: string | null
  current_period_start: string | null
  start_date: string | null
  next_billing_date: string | null
  retry_count: number | null
}

/**
 * 갱신 유예 — 기간 끝과 갱신 크론(10분 간격) 사이의 틈을 메운다.
 *
 * 기간은 가입한 «그 시각»에 끝나는데 갱신 결제는 그 뒤 크론이 돌아야 일어난다. 그 사이에 멤버십이 끊긴 것으로 보면
 * 돈을 내고 있는 회원이 매달 같은 시각에 게이트와 월 몫을 잃는다. 갱신이 예정돼 있고 아직 실패한 적 없는 구독만
 * 유예한다 — 결제가 한 번이라도 실패하면(retry_count > 0) 바로 끊긴다.
 * 🔴 크론 주기(vercel.json `/api/cron/billing`)보다 길어야 한다.
 * 🔴 유예는 «옛 기간을 잠깐 늘리는 것»이다. 새 주기를 미리 열지 않는다 — 열면 결제도 하기 전에 새 달 몫이 통째로 열려,
 *    그 몫을 다 쓰고 해지하면(해지하면 크론이 청구하지 않는다) 한 달치가 무료가 된다. 새 달 몫은 갱신 결제가 성공해
 *    크론이 current_period_start 를 옮긴 뒤에만 열린다.
 */
export const RENEWAL_GRACE_MS = 30 * 60_000

/**
 * 활성 구독 핵심 판정 — 마스터 우선, 없으면 ACTIVE + 미만료 구독을 찾는다(tier 미조회, 경량).
 * 어떤 이유로든 조회 실패 시 null(비회원 취급) — 게이트/보관은 안전 측 실패.
 */
/**
 * 판정에 쓸 클라이언트 — 기본은 로그인 사용자 세션(RLS: 본인 것만).
 * 웹훅·크론·관리자 화면처럼 «남의» 멤버십을 읽어야 하는 서버 경로는 'admin' 을 넘긴다.
 * 판정 규칙은 이 파일 한 곳에만 둔다(이용권 월 몫 계산도 이것을 쓴다).
 */
export type MembershipReader = 'session' | 'admin'

async function readerClient(reader: MembershipReader) {
  return reader === 'admin' ? createAdminClient() : await createClient()
}

async function resolveActiveSubscription(
  userId: string,
  reader: MembershipReader = 'session'
): Promise<ActiveSubscriptionCore | null> {
  const supabase = await readerClient(reader)

  // 1) 마스터(admin) 무제한 — privileges 단일 기준. 항상 통과.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (hasUnlimitedAccess((profile as { role?: string } | null)?.role)) {
    return {
      isMaster: true,
      planId: null,
      status: 'ACTIVE',
      currentPeriodEnd: null,
      currentPeriodStart: null,
      renews: false,
    }
  }

  // 2) 활성 구독 — 기간 미만료.
  //    🔴 CANCELLED 도 함께 본다. 약관 제6조 제5항이 "해지 시 현재 결제 주기의 만료일까지 이용할 수 있다"고
  //    약속하는데 status='ACTIVE' 만 보면 해지 버튼을 누른 즉시 혜택이 끊겨 약관 위반이 된다.
  //    즉시 해지(일할 환불)는 current_period_end 를 지금으로 닫으므로 아래 만료 검사에서 저절로 빠진다.
  const { data } = await supabase
    .from('subscriptions')
    .select(
      'plan_id, status, current_period_end, end_date, current_period_start, start_date, next_billing_date, retry_count'
    )
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

  const renews = row.status === 'ACTIVE' && !!row.next_billing_date
  const nowMs = Date.now()
  const periodEndMs = periodEnd ? new Date(periodEnd).getTime() : null

  if (periodEnd && periodEndMs !== null && periodEndMs < nowMs) {
    const graceEndMs = periodEndMs + RENEWAL_GRACE_MS
    if (!renews || (row.retry_count ?? 0) > 0 || nowMs >= graceEndMs) return null
    // 유예 중 — 옛 기간의 끝만 잠깐 늘린다. 월 몫 창은 꼬리 병합(membershipWindow) 덕에 옛 창이 그대로 이어져
    // 남아 있던 몫만 쓸 수 있다.
    return {
      isMaster: false,
      planId: row.plan_id ?? null,
      status: 'ACTIVE',
      currentPeriodEnd: new Date(graceEndMs).toISOString(),
      currentPeriodStart: row.current_period_start ?? row.start_date ?? null,
      renews,
    }
  }

  return {
    isMaster: false,
    planId: row.plan_id ?? null,
    status: row.status ?? 'ACTIVE',
    currentPeriodEnd: periodEnd,
    currentPeriodStart: row.current_period_start ?? row.start_date ?? null,
    renews,
  }
}

/** 활성 멤버십 여부(boolean). 마스터 포함. 게이트 판정용. */
export async function hasActiveMembership(userId: string): Promise<boolean> {
  return (await resolveActiveSubscription(userId)) !== null
}

/** 활성 멤버십 상세(tier 포함) 또는 null. 카피/티어 표시용. */
export async function getActiveMembership(
  userId: string,
  reader: MembershipReader = 'session'
): Promise<ActiveMembership | null> {
  const core = await resolveActiveSubscription(userId, reader)
  if (!core) return null
  if (core.isMaster) {
    return {
      tier: 'MASTER',
      planId: null,
      status: 'ACTIVE',
      currentPeriodEnd: null,
      currentPeriodStart: null,
      isMaster: true,
      renews: false,
    }
  }

  let tier = 'MEMBER'
  if (core.planId) {
    // 🔴 플랜은 서비스 권한으로 읽는다. membership_plans 의 RLS 는 «판매 중(is_active)» 행만 보여 줘서,
    //    판매를 내린 플랜의 구독자는 세션으로 읽으면 등급이 MEMBER 로 떨어진다(등급 기능이 닫힌다).
    const { data: plan } = await createAdminClient()
      .from('membership_plans')
      .select('tier')
      .eq('id', core.planId)
      .maybeSingle()
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
    renews: core.renews,
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
