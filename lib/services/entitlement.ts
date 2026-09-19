import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveMembership } from '@/lib/auth/subscription'
import { hasPassBypass } from '@/lib/auth/privileges'
import { logger } from '@/lib/utils/logger'
import {
  EMPTY_PASS_SUMMARY,
  isPassSource,
  membershipWindow,
  passExpiryFrom,
  type PassHolding,
  type PassSource,
  type PassSummary,
  type PassWindow,
} from '@/lib/domain/entitlement/pass'

/**
 * 이용권 서버 서비스 — 사용·되돌림·발급·요약의 유일한 경로.
 *
 * 🔴 이 파일의 함수는 `userId` 를 인자로 받는다 = 인증 주체와 무관하다.
 *    그래서 절대 `'use server'` 파일에서 re-export 하지 않는다(그러면 로그인한 누구나 남의 이용권을
 *    쓰거나 스스로 발급할 수 있는 공개 엔드포인트가 된다). 호출자는 인증을 마친 서버 경로뿐이다.
 *
 * 쓰기는 전부 service_role RPC(ent_*) — 같은 사용자의 동시 요청은 DB 안에서 직렬화된다.
 */

interface PassContext {
  /** 관리자·검수 — 이용권 없이 통과 */
  bypass: boolean
  window: PassWindow | null
  quota: number
  /** 이번 창이 끝나면 월 몫이 다시 채워지는가 */
  renews: boolean
}

async function readRole(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) {
    logger.error('[Entitlement] 역할 조회 실패', { userId, message: error.message })
    return null
  }
  return (data as { role?: string | null } | null)?.role ?? null
}

/** 이 사용자의 이번 달 멤버십 몫 — 창과 장수. 비회원이면 window=null, quota=0. */
async function readMembershipQuota(
  userId: string,
  nowMs: number
): Promise<{ window: PassWindow | null; quota: number; renews: boolean }> {
  const membership = await getActiveMembership(userId, 'admin')
  if (!membership || membership.isMaster || !membership.planId) return { window: null, quota: 0, renews: false }

  const admin = createAdminClient()
  const { data: plan, error } = await admin
    .from('membership_plans')
    .select('monthly_passes')
    .eq('id', membership.planId)
    .maybeSingle()
  if (error) {
    logger.error('[Entitlement] 멤버십 월 장수 조회 실패', { userId, message: error.message })
    return { window: null, quota: 0, renews: false }
  }
  const quota = (plan as { monthly_passes?: number } | null)?.monthly_passes ?? 0
  if (quota <= 0 || !membership.currentPeriodStart) return { window: null, quota: 0, renews: false }

  const startMs = new Date(membership.currentPeriodStart).getTime()
  const endMs = membership.currentPeriodEnd ? new Date(membership.currentPeriodEnd).getTime() : null
  const window = membershipWindow(startMs, endMs, nowMs)
  // 창 끝이 기간 안의 월 경계면 구독이 어떻든 다시 채워진다. 기간 끝과 같으면 갱신 결제가 예정돼 있어야 한다.
  const endsInsidePeriod = !!window && (endMs === null || new Date(window.endIso).getTime() < endMs)
  return { window, quota, renews: endsInsidePeriod || membership.renews }
}

async function readPassContext(userId: string): Promise<PassContext> {
  const role = await readRole(userId)
  if (hasPassBypass(role)) return { bypass: true, window: null, quota: 0, renews: false }
  const { window, quota, renews } = await readMembershipQuota(userId, Date.now())
  return { bypass: false, window, quota, renews }
}

// ────────────────────────────────────────────────────────────
// 사용 · 되돌림
// ────────────────────────────────────────────────────────────

export type ConsumePassResult =
  | { ok: true; bypass: boolean; ledgerIds: string[]; fromMembership: number; fromPass: number }
  | { ok: false; reason: 'INSUFFICIENT' | 'INVALID_INPUT' | 'ERROR'; memberAvailable: number; passAvailable: number }

interface ConsumeRpcPayload {
  ok?: boolean
  reason?: string
  ledger_ids?: unknown
  from_membership?: number
  from_pass?: number
  member_available?: number
  pass_available?: number
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

/**
 * 이용권 사용 — 멤버십 이번 달 몫과 보유 이용권을 만료가 가까운 순으로 쓴다(DB 한 트랜잭션).
 * 모자라면 아무것도 쓰지 않고 INSUFFICIENT.
 */
export async function consumePass(params: {
  userId: string
  featureKey: string
  units: number
}): Promise<ConsumePassResult> {
  const { userId, featureKey, units } = params
  if (!Number.isInteger(units) || units <= 0) {
    logger.error('[Entitlement] 잘못된 사용 장수', { userId, featureKey, units })
    return { ok: false, reason: 'INVALID_INPUT', memberAvailable: 0, passAvailable: 0 }
  }

  const ctx = await readPassContext(userId)
  if (ctx.bypass) return { ok: true, bypass: true, ledgerIds: [], fromMembership: 0, fromPass: 0 }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('ent_consume', {
    p_user_id: userId,
    p_feature_key: featureKey,
    p_units: units,
    p_window_start: ctx.window?.startIso ?? null,
    p_window_end: ctx.window?.endIso ?? null,
    p_quota: ctx.quota,
  })

  if (error) {
    logger.error(new Error('[Entitlement] ent_consume 실패'), { userId, featureKey, units, message: error.message })
    return { ok: false, reason: 'ERROR', memberAvailable: 0, passAvailable: 0 }
  }

  const payload = (data ?? {}) as ConsumeRpcPayload
  if (payload.ok) {
    return {
      ok: true,
      bypass: false,
      ledgerIds: toStringArray(payload.ledger_ids),
      fromMembership: payload.from_membership ?? 0,
      fromPass: payload.from_pass ?? 0,
    }
  }
  return {
    ok: false,
    reason:
      payload.reason === 'INSUFFICIENT'
        ? 'INSUFFICIENT'
        : payload.reason === 'INVALID_INPUT'
          ? 'INVALID_INPUT'
          : 'ERROR',
    memberAvailable: payload.member_available ?? 0,
    passAvailable: payload.pass_available ?? 0,
  }
}

/**
 * 사용 되돌림 — 풀이가 실패했을 때. 🔴 만료 시각은 연장하지 않는다(DB 함수가 보장).
 * 실패해도 던지지 않는다 — 풀이 실패 응답을 이것 때문에 잃으면 안 된다. 대신 경보를 남긴다.
 */
export async function refundPass(userId: string, ledgerIds: string[]): Promise<number> {
  if (ledgerIds.length === 0) return 0
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('ent_refund', { p_user_id: userId, p_ledger_ids: ledgerIds })
  if (error) {
    logger.error(new Error('[Entitlement] 이용권 되돌림 실패 — 수동 확인 필요'), {
      userId,
      ledgerIds,
      message: error.message,
    })
    return 0
  }
  return typeof data === 'number' ? data : 0
}

// ────────────────────────────────────────────────────────────
// 발급 — 결제 승인·가입·추천·이관·관리자처럼 서버가 사실을 확인한 자리에서만
// ────────────────────────────────────────────────────────────

export interface GrantPassesInput {
  userId: string
  source: PassSource
  quantity: number
  /** 유효기간(일). null = 기한 없음(이관분 전용) */
  validDays: number | null
  paymentId?: string | null
  /** 같은 사실로 두 번 발급하지 않게 — 'PURCHASE:<paymentId>' · 'ONBOARDING:<userId>' 등 */
  idempotencyKey?: string | null
  note?: string | null
}

export interface GrantPassesResult {
  granted: boolean
  reason: 'OK' | 'ALREADY_GRANTED' | 'INVALID_INPUT' | 'ERROR'
  grantId?: string
}

export async function grantPasses(input: GrantPassesInput): Promise<GrantPassesResult> {
  const expires = passExpiryFrom(Date.now(), input.validDays)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('ent_grant', {
    p_user_id: input.userId,
    p_source: input.source,
    p_quantity: input.quantity,
    p_expires_at: expires ? expires.toISOString() : null,
    p_payment_id: input.paymentId ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_note: input.note ?? null,
  })
  if (error) {
    logger.error(new Error('[Entitlement] 이용권 발급 실패'), {
      userId: input.userId,
      source: input.source,
      quantity: input.quantity,
      message: error.message,
    })
    return { granted: false, reason: 'ERROR' }
  }
  const payload = (data ?? {}) as { granted?: boolean; reason?: string; grant_id?: string }
  const reason =
    payload.reason === 'OK' || payload.reason === 'ALREADY_GRANTED' || payload.reason === 'INVALID_INPUT'
      ? payload.reason
      : 'ERROR'
  return { granted: payload.granted === true, reason, grantId: payload.grant_id }
}

// ────────────────────────────────────────────────────────────
// 요약 — 🔴 주머니를 합치지 않는다
// ────────────────────────────────────────────────────────────

interface GrantRow {
  id: string
  source: string
  quantity: number
  consumed: number
  revoked: number
  expires_at: string | null
}

export async function getPassSummary(userId: string): Promise<PassSummary> {
  const ctx = await readPassContext(userId)
  if (ctx.bypass) return { unlimited: true, membership: null, holdings: [] }

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const [grantsRes, usageRes] = await Promise.all([
    admin
      .from('entitlement_grants')
      .select('id, source, quantity, consumed, revoked, expires_at')
      .eq('user_id', userId)
      .eq('scope', 'reading')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('expires_at', { ascending: true, nullsFirst: false }),
    ctx.window
      ? admin
          .from('subscription_usage')
          .select('used')
          .eq('user_id', userId)
          .eq('period_start', ctx.window.startIso)
          .eq('scope', 'reading')
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (grantsRes.error) {
    logger.error('[Entitlement] 보유 이용권 조회 실패', { userId, message: grantsRes.error.message })
  }
  if (usageRes.error) {
    logger.error('[Entitlement] 멤버십 사용량 조회 실패', { userId, message: usageRes.error.message })
  }

  const holdings: PassHolding[] = ((grantsRes.data ?? []) as GrantRow[])
    .map((g) => ({
      id: g.id,
      source: isPassSource(g.source) ? g.source : 'admin',
      remaining: Math.max(0, g.quantity - g.consumed - g.revoked),
      expiresAt: g.expires_at,
    }))
    .filter((h) => h.remaining > 0)

  let membership: PassSummary['membership'] = null
  if (ctx.window && ctx.quota > 0) {
    const used = (usageRes.data as { used?: number } | null)?.used ?? 0
    membership = {
      quota: ctx.quota,
      used,
      remaining: Math.max(0, ctx.quota - used),
      resetsAt: ctx.window.endIso,
      renews: ctx.renews,
    }
  }

  return { ...EMPTY_PASS_SUMMARY, membership, holdings }
}

// ────────────────────────────────────────────────────────────
// 내역
// ────────────────────────────────────────────────────────────

export interface PassLedgerEntry {
  id: string
  kind: 'grant' | 'consume' | 'refund' | 'revoke'
  pocket: 'membership' | 'pass'
  units: number
  featureKey: string | null
  note: string | null
  createdAt: string
}

export async function getPassLedger(userId: string, limit = 50): Promise<PassLedgerEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('entitlement_ledger')
    .select('id, kind, pocket, units, feature_key, note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200))
  if (error) {
    logger.error('[Entitlement] 이용권 내역 조회 실패', { userId, message: error.message })
    return []
  }
  return (
    (data ?? []) as Array<{
      id: string
      kind: PassLedgerEntry['kind']
      pocket: PassLedgerEntry['pocket']
      units: number
      feature_key: string | null
      note: string | null
      created_at: string
    }>
  ).map((r) => ({
    id: r.id,
    kind: r.kind,
    pocket: r.pocket,
    units: r.units,
    featureKey: r.feature_key,
    note: r.note,
    createdAt: r.created_at,
  }))
}
