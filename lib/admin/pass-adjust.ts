import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { logAdminAction } from '@/lib/admin/audit'
import type { AdminGuard } from '@/lib/admin/require-admin'
import { grantPasses } from '@/lib/services/entitlement'
import { PASS_VALID_DAYS } from '@/lib/domain/entitlement/pass'

/**
 * 관리자 이용권 조정 — 회원 상세(발급·회수)와 구독 관리(발급)가 같은 길을 쓴다.
 *
 * 🔴 `actor` 는 `requireAdmin()` 을 통과한 값만 받는다(타입이 강제한다).
 * 🔴 이 파일은 `'use server'` 가 아니다. 여기 함수를 `'use server'` 파일에서 그대로 re-export 하면
 *    로그인한 누구나 이용권을 스스로 발급하는 공개 엔드포인트가 된다.
 * 🔴 발급은 `grantPasses`(ent_grant) — 폼을 열 때 만든 요청 키를 멱등키로 써서, 두 번 누르거나 응답을 못 받고
 *    다시 보내도 한 번만 발급된다. 회수는 RPC `ent_admin_adjust`(음수).
 */

export const ADMIN_PASS_ADJUST_MAX = 100
export const ADMIN_PASS_VALID_DAYS_MAX = 365

const REQUEST_KEY_PATTERN = /^[A-Za-z0-9-]{8,64}$/

type AuthorizedAdmin = Extract<AdminGuard, { authorized: true }>

export interface AdminPassAdjustInput {
  actor: AuthorizedAdmin
  targetUserId: string
  /** 양수 = 발급, 음수 = 회수 */
  delta: number
  reason: string
  /** 발급분 유효기간(일). 비우면 PASS_VALID_DAYS. 회수에는 쓰지 않는다. */
  validDays?: number | null
  /** 화면이 폼을 열 때 한 번 만드는 키 — 같은 키로는 한 번만 발급된다. */
  requestKey: string
  via: 'user_detail' | 'subscriptions'
}

export type AdminPassAdjustResult =
  | { success: true; granted: number; revoked: number; heldBefore: number; heldAfter: number }
  | { success: false; error: string }

interface GrantRow {
  quantity: number
  consumed: number
  revoked: number
}

interface AdjustRpcPayload {
  ok?: boolean
  reason?: string
  granted?: number
  revoked?: number
  shortfall?: number
}

const fail = (error: string): AdminPassAdjustResult => ({ success: false, error })

/**
 * 지금 쓸 수 있는 보유 이용권 장수. 요약(getPassSummary)은 관리자·검수 계정을 역할로 우회해
 * 보유분을 비워 돌려주므로, 감사의 전·후 값은 발급 행에서 직접 센다.
 */
async function readHeldPasses(userId: string): Promise<number | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('entitlement_grants')
    .select('quantity, consumed, revoked')
    .eq('user_id', userId)
    .eq('scope', 'reading')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
  if (error) {
    logger.error('[AdminPassAdjust] 보유 이용권 조회 실패', { userId, message: error.message })
    return null
  }
  return ((data ?? []) as GrantRow[]).reduce((n, g) => n + Math.max(0, g.quantity - g.consumed - g.revoked), 0)
}

type AdjustOutcome = { ok: true; granted: number; revoked: number; shortfall: number } | { ok: false; error: string }

async function grantAsAdmin(
  userId: string,
  quantity: number,
  validDays: number,
  requestKey: string,
  note: string
): Promise<AdjustOutcome> {
  const result = await grantPasses({
    userId,
    source: 'admin',
    quantity,
    validDays,
    idempotencyKey: `ADMIN:${userId}:${requestKey}`,
    note,
  })
  if (result.granted) return { ok: true, granted: quantity, revoked: 0, shortfall: 0 }
  if (result.reason === 'ALREADY_GRANTED') {
    return { ok: false, error: '이미 처리된 발급 요청이에요. 화면을 새로 고쳐 보유 이용권을 확인하세요.' }
  }
  return {
    ok: false,
    error: result.reason === 'INVALID_INPUT' ? '조정 값이 올바르지 않아요.' : '이용권 조정에 실패했어요.',
  }
}

async function revokeAsAdmin(userId: string, delta: number, note: string): Promise<AdjustOutcome> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('ent_admin_adjust', {
    p_user_id: userId,
    p_delta: delta,
    p_expires_at: null,
    p_note: note,
  })
  if (error) {
    logger.error(new Error('[AdminPassAdjust] ent_admin_adjust 실패'), {
      targetUserId: userId,
      delta,
      message: error.message,
    })
    return { ok: false, error: '이용권 조정에 실패했어요.' }
  }
  const payload = (data ?? {}) as AdjustRpcPayload
  if (!payload.ok) {
    return {
      ok: false,
      error: payload.reason === 'INVALID_INPUT' ? '조정 값이 올바르지 않아요.' : '이용권 조정에 실패했어요.',
    }
  }
  const revoked = payload.revoked ?? 0
  const shortfall = payload.shortfall ?? 0
  if (shortfall > 0) {
    logger.warn('[AdminPassAdjust] 회수 요청보다 적게 회수됨 — 그 사이 사용된 듯', {
      targetUserId: userId,
      delta,
      revoked,
      shortfall,
    })
  }
  return { ok: true, granted: 0, revoked, shortfall }
}

export async function adjustPassesAsAdmin(input: AdminPassAdjustInput): Promise<AdminPassAdjustResult> {
  const delta = typeof input.delta === 'number' ? Math.trunc(input.delta) : Number.NaN
  if (!Number.isFinite(delta) || delta === 0) return fail('조정 장수는 0이 아닌 정수여야 해요.')
  if (Math.abs(delta) > ADMIN_PASS_ADJUST_MAX) return fail(`한 번에 ${ADMIN_PASS_ADJUST_MAX}장까지 조정할 수 있어요.`)

  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 200) : ''
  if (!reason) return fail('조정 사유를 입력하세요.')

  const requestKey = typeof input.requestKey === 'string' ? input.requestKey : ''
  if (!REQUEST_KEY_PATTERN.test(requestKey))
    return fail('요청 키가 올바르지 않아요. 화면을 새로 고친 뒤 다시 시도하세요.')

  const validDays = delta > 0 ? (input.validDays ?? PASS_VALID_DAYS) : null
  if (validDays !== null && (!Number.isInteger(validDays) || validDays < 1 || validDays > ADMIN_PASS_VALID_DAYS_MAX)) {
    return fail(`유효기간은 1~${ADMIN_PASS_VALID_DAYS_MAX}일 사이여야 해요.`)
  }

  const heldBefore = await readHeldPasses(input.targetUserId)
  if (heldBefore === null) return fail('보유 이용권을 확인하지 못했어요. 잠시 뒤 다시 시도하세요.')
  // RPC 는 모자라도 있는 만큼만 깎고 성공(shortfall)으로 돌려준다 — 보유분을 넘기는 회수는 여기서 먼저 막는다.
  if (delta < 0 && -delta > heldBefore) {
    return fail(`보유 이용권이 ${heldBefore}장이라 ${-delta}장을 회수할 수 없어요.`)
  }

  const note = `[관리자] ${reason}`
  const outcome =
    validDays !== null
      ? await grantAsAdmin(input.targetUserId, delta, validDays, requestKey, note)
      : await revokeAsAdmin(input.targetUserId, delta, note)
  if (!outcome.ok) return fail(outcome.error)
  const { granted, revoked, shortfall } = outcome
  const heldAfter = Math.max(0, heldBefore + granted - revoked)

  // 🔴 발급·회수는 돈이다 — «누가 왜 얼마나» 를 감사에 남긴다(전·후는 보유 이용권 장수).
  await logAdminAction({
    actorId: input.actor.actorId,
    actorEmail: input.actor.actorEmail,
    action: 'pass_adjust',
    targetUser: input.targetUserId,
    detail: {
      before: heldBefore,
      after: heldAfter,
      delta,
      granted,
      revoked,
      shortfall,
      validDays,
      reason,
      via: input.via,
      requestKey,
    },
  })

  return { success: true, granted, revoked, heldBefore, heldAfter }
}
