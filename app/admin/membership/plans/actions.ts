'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { logAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/admin/require-admin'
import { findBannedPassTerms, PASS_MAX_ORDER_AMOUNT } from '@/lib/domain/entitlement/pass'
import type { MembershipPlanAdmin, MembershipPlanUpdate, PassProductAdmin, PassProductUpdate } from './types'

type Check = (value: unknown) => boolean
type Sanitized<T> = { ok: true; value: T } | { ok: false; error: string }

const isText =
  (max: number): Check =>
  (v) =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= max
const isOptionalText =
  (max: number): Check =>
  (v) =>
    v === null || (typeof v === 'string' && v.length <= max)
const isIntIn =
  (min: number, max: number): Check =>
  (v) =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
const isBool: Check = (v) => typeof v === 'boolean'
const isPlainObject: Check = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStringList: Check = (v) => v === null || (Array.isArray(v) && v.every((item) => typeof item === 'string'))

const PLAN_FIELDS: Record<keyof MembershipPlanUpdate, Check> = {
  name: isText(50),
  description: isOptionalText(500),
  price: isIntIn(1, 10_000_000),
  interval: (v) => v === 'MONTH' || v === 'YEAR',
  monthly_passes: isIntIn(0, 1000),
  relationship_limit: isIntIn(0, 100_000),
  storage_limit: isIntIn(0, 100_000),
  features: isPlainObject,
  is_active: isBool,
  sort_order: isIntIn(0, 10_000),
}

// 🔴 이용권 팩은 토스 일반결제 상품이다 — 유효기간은 1년, 1회 결제 금액은 상한(PASS_MAX_ORDER_AMOUNT)을 넘기지 않는다.
//    멤버십(빌링)은 이 상한의 대상이 아니다.
const PRODUCT_FIELDS: Record<keyof PassProductUpdate, Check> = {
  name: isText(50),
  description: isOptionalText(500),
  badge_text: isOptionalText(20),
  price: isIntIn(1, PASS_MAX_ORDER_AMOUNT),
  credits: isIntIn(1, 100),
  valid_days: isIntIn(1, 365),
  features: isStringList,
  is_active: isBool,
  sort_order: isIntIn(0, 10_000),
}

/** 화면에 나가는 문구에 잔액형 재화로 읽히는 말이 섞였는지 — 상품 카드 문구의 정본이 DB 라서 여기서 막는다. */
function bannedTermsIn(update: Record<string, unknown>): string[] {
  const texts: string[] = []
  for (const key of ['name', 'description', 'badge_text'] as const) {
    const v = update[key]
    if (typeof v === 'string') texts.push(v)
  }
  if (Array.isArray(update.features)) {
    for (const item of update.features) if (typeof item === 'string') texts.push(item)
  }
  return Array.from(new Set(texts.flatMap(findBannedPassTerms)))
}

function sanitizeUpdate<T>(raw: unknown, fields: Record<string, Check>): Sanitized<T> {
  if (!isPlainObject(raw)) return { ok: false, error: '변경할 값이 없습니다.' }
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const check = fields[key]
    if (!check) return { ok: false, error: `수정할 수 없는 항목입니다: ${key}` }
    if (!check(value)) return { ok: false, error: `값이 올바르지 않습니다: ${key}` }
    out[key] = value
  }
  if (Object.keys(out).length === 0) return { ok: false, error: '변경할 값이 없습니다.' }
  const banned = bannedTermsIn(out)
  if (banned.length > 0) return { ok: false, error: `화면 문구에 쓸 수 없는 말이 있습니다: ${banned.join(', ')}` }
  return { ok: true, value: out as T }
}

async function checkAdmin() {
  const role = await getUserRole()
  if (role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

/**
 * Get all membership plans
 */
export async function getAdminMembershipPlans(): Promise<MembershipPlanAdmin[]> {
  await checkAdmin()

  const adminSupabase = createAdminClient()

  const { data, error } = await adminSupabase
    .from('membership_plans')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    logger.error('Error fetching plans:', error)
    throw new Error('Failed to fetch plans')
  }

  return data as MembershipPlanAdmin[]
}

/**
 * Update membership plan
 */
export async function updateMembershipPlan(planId: string, rawUpdates: MembershipPlanUpdate) {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  const sanitized = sanitizeUpdate<MembershipPlanUpdate>(rawUpdates, PLAN_FIELDS)
  if (!sanitized.ok) return { success: false, error: sanitized.error }
  const updates = sanitized.value

  const adminSupabase = createAdminClient()

  const { data: before } = await adminSupabase.from('membership_plans').select('*').eq('id', planId).single()

  const { error } = await adminSupabase
    .from('membership_plans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)

  if (error) {
    logger.error('Error updating plan:', error)
    return { success: false, error: error.message }
  }

  // 가격·혜택 문구는 표시광고법 사안 — 바뀐 값만 추려 남긴다(전체 스냅샷은 잡음).
  await logAdminAction({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: 'plan_update',
    detail: {
      planId,
      changed: Object.fromEntries(
        Object.keys(updates).map((k) => [
          k,
          {
            before: (before as Record<string, unknown> | null)?.[k] ?? null,
            after: (updates as Record<string, unknown>)[k],
          },
        ])
      ),
    },
  })

  revalidatePath('/admin/membership/plans')
  revalidatePath('/protected/membership')

  return { success: true }
}

/**
 * Toggle plan active status
 */
export async function togglePlanStatus(planId: string) {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  const adminSupabase = createAdminClient()

  // Get current status
  const { data: plan } = await adminSupabase.from('membership_plans').select('is_active').eq('id', planId).single()

  if (!plan) {
    return { success: false, error: 'Plan not found' }
  }

  // Toggle status
  const { error } = await adminSupabase
    .from('membership_plans')
    .update({ is_active: !plan.is_active, updated_at: new Date().toISOString() })
    .eq('id', planId)

  if (error) {
    logger.error('Error toggling plan status:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: 'plan_toggle',
    detail: { planId, before: plan.is_active, after: !plan.is_active },
  })

  revalidatePath('/admin/membership/plans')
  revalidatePath('/protected/membership')

  return { success: true, newStatus: !plan.is_active }
}

// ── 개별 이용권 팩 (price_plans · product_kind='pass') ──────────────
// 🔴 옛 복채 팩(product_kind='bokchae')은 판매 종료 상품이다 — 목록에서 숨기고 서버에서도 못 고치게 한다.
//    화면에서 다시 켜면 옛 상품이 결제 화면에 되살아난다.

const PASS_PRODUCT_COLUMNS =
  'id, name, description, badge_text, price, credits, valid_days, features, is_active, sort_order'

export async function getAllProducts(): Promise<PassProductAdmin[]> {
  await checkAdmin()
  const dbClient = createAdminClient()
  const { data, error } = await dbClient
    .from('price_plans')
    .select(PASS_PRODUCT_COLUMNS)
    .eq('product_kind', 'pass')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('price', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as PassProductAdmin[]
}

export async function updateProduct(id: string, rawUpdates: PassProductUpdate) {
  const actor = await requireAdmin()
  if (!actor.authorized) return { success: false, error: actor.error }

  const sanitized = sanitizeUpdate<PassProductUpdate>(rawUpdates, PRODUCT_FIELDS)
  if (!sanitized.ok) return { success: false, error: sanitized.error }
  const updates = sanitized.value

  const dbClient = createAdminClient()
  const { data: before } = await dbClient
    .from('price_plans')
    .select(PASS_PRODUCT_COLUMNS)
    .eq('id', id)
    .eq('product_kind', 'pass')
    .maybeSingle()
  if (!before) return { success: false, error: '이용권 상품이 아닙니다.' }

  const { error } = await dbClient.from('price_plans').update(updates).eq('id', id).eq('product_kind', 'pass')
  if (error) return { success: false, error: error.message }

  await logAdminAction({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: 'product_update',
    detail: {
      productId: id,
      changed: Object.fromEntries(
        Object.keys(updates).map((k) => [
          k,
          {
            before: (before as Record<string, unknown> | null)?.[k] ?? null,
            after: (updates as Record<string, unknown>)[k],
          },
        ])
      ),
    },
  })
  revalidatePath('/admin/membership/plans')
  revalidatePath('/protected')
  revalidatePath('/protected/store')
  revalidatePath('/protected/membership')
  return { success: true }
}
