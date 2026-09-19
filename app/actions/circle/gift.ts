'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { sendPushToUser } from '@/lib/services/webpush'
import { isElement, type Element } from '@/lib/domain/shrine/types'
import { EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import { SHOP_CLAIM_MAX_QTY } from '@/lib/domain/shrine/shop-sections'
import {
  GIFT_DAILY_LIMIT,
  giftDelivery,
  giftIdempotencyKey,
  giftPushText,
  giftRefusal,
  normalizeGiftMessage,
  type GiftDelivery,
} from '@/lib/domain/circle/gift'

/**
 * 기운 선물 — 처방전 ④「신당 살림」에서 상대에게 필요한 오행의 살림을 놓아 준다. **무료**다
 * (2026-09-18 이용권 전환 — 신물이 무료가 되면서 선물도 값을 받지 않는다).
 *
 * 순서: 소유·품목 검증 → 멱등 키(같은 분 안 재요청은 같은 선물) → 하루 상한 → 기록 행(service_role)
 *       → 지급(grant_shrine_item RPC) → 알림. 지급이 실패하면 기록 행을 지운다(상한을 헛되이 쓰지 않게).
 *
 * 🔴 받는 쪽은 재화를 얻지 않는다. 연결된 실사용자면 그 사람 보관함에 살림 한 점, 아니면 내 보관함
 *    (내 신당의 그 사람 선반에 내가 놓아 준다).
 * 🔴 여기 말고 다른 «선물» 경로를 만들지 않는다 — 지급·기록이 한 자리에 있어야 감사가 된다.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type GiftError =
  | 'UNAUTHORIZED'
  | 'INVALID_ID'
  | 'NOT_FOUND'
  | 'SELF'
  | 'ITEM_NOT_GIFTABLE'
  | 'DAILY_LIMIT'
  | 'MAX_QTY'
  | 'GRANT_FAILED'
  | 'DB_ERROR'

export type GiftResult =
  | {
      success: true
      delivery: GiftDelivery
      recipientName: string
      itemName: string
      duplicate: boolean
    }
  | { success: false; error: GiftError }

interface CatalogRow {
  id: string
  name: string
  element: string | null
  is_active: boolean
}

export async function giftItem(input: {
  recipientMemberId: string
  catalogItemId: string
  message?: string | null
  circleId?: string | null
}): Promise<GiftResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }
  if (!UUID.test(input.recipientMemberId) || !UUID.test(input.catalogItemId))
    return { success: false, error: 'INVALID_ID' }
  if (input.circleId && !UUID.test(input.circleId)) return { success: false, error: 'INVALID_ID' }

  const [{ data: member }, { data: itemRow }, { data: giverProfile }] = await Promise.all([
    supabase
      .from('family_members')
      .select('id, name, linked_user_id, relationship')
      .eq('id', input.recipientMemberId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('shrine_item_catalog')
      .select('id, name, element, is_active')
      .eq('id', input.catalogItemId)
      .maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ])
  if (!member) return { success: false, error: 'NOT_FOUND' }
  if (member.relationship === '본인') return { success: false, error: 'SELF' }
  const item = itemRow as CatalogRow | null
  if (!item) return { success: false, error: 'NOT_FOUND' }

  const element: Element | null = isElement(item.element) ? item.element : null
  const refusal = giftRefusal({
    id: item.id,
    name: item.name,
    element,
    isActive: item.is_active,
  })
  if (refusal || !element) return { success: false, error: 'ITEM_NOT_GIFTABLE' }

  const recipientName = (member.name as string) || '가족'
  const linkedUserId = (member.linked_user_id as string | null) ?? null
  // 자기 자신에게 연결된 자리(본인 계정을 가족으로 등록한 경우)는 선물이 아니라 상점 받기다.
  if (linkedUserId === user.id) return { success: false, error: 'SELF' }

  const now = new Date()
  const key = giftIdempotencyKey(user.id, member.id as string, item.id, now)
  const admin = createAdminClient()

  // 멱등 — 같은 분 안의 재요청은 같은 선물이다(더블 탭·재전송).
  const { data: existing } = await admin
    .from('energy_gifts')
    .select('id, delivery')
    .eq('idempotency_key', key)
    .maybeSingle()
  if (existing) {
    return {
      success: true,
      delivery: existing.delivery as GiftDelivery,
      recipientName,
      itemName: item.name,
      duplicate: true,
    }
  }

  const dayStart = new Date(now)
  dayStart.setUTCHours(0, 0, 0, 0)
  const { count } = await admin
    .from('energy_gifts')
    .select('id', { count: 'exact', head: true })
    .eq('giver_user_id', user.id)
    .gte('created_at', dayStart.toISOString())
  if ((count ?? 0) >= GIFT_DAILY_LIMIT) return { success: false, error: 'DAILY_LIMIT' }

  const delivery = giftDelivery(linkedUserId)
  const message = normalizeGiftMessage(input.message)
  const grantTo = delivery === 'inventory_recipient' && linkedUserId ? linkedUserId : user.id

  // 받는 사람이 계정이 없으면 살림은 보낸 사람의 신당에 놓인다. 선물이 무료가 된 뒤로는 값이 막이가 아니라서,
  // 이 길로 상점의 보유 상한을 넘겨 쌓을 수 있다 — 상점 받기와 같은 상한을 건다.
  if (grantTo === user.id) {
    const { data: owned } = await admin
      .from('user_shrine_inventory')
      .select('qty')
      .eq('user_id', user.id)
      .eq('catalog_item_id', item.id)
      .maybeSingle()
    if (((owned as { qty?: number } | null)?.qty ?? 0) >= SHOP_CLAIM_MAX_QTY) {
      return { success: false, error: 'MAX_QTY' }
    }
  }

  const { data: giftRow, error: insertError } = await admin
    .from('energy_gifts')
    .insert({
      giver_user_id: user.id,
      recipient_member_id: member.id,
      recipient_user_id: linkedUserId,
      circle_id: input.circleId ?? null,
      catalog_item_id: item.id,
      element,
      delivery,
      // 선물은 값을 받지 않는다 — 열은 옛 기록과 모양을 맞추려 남기고 0 으로 적는다.
      price_bokchae: 0,
      message,
      idempotency_key: key,
    })
    .select('id')
    .single()
  if (insertError || !giftRow) {
    // unique 충돌 = 경합한 동일 요청이 먼저 들어갔다 → 그 선물로 친다.
    if (insertError?.code === '23505') {
      return { success: true, delivery, recipientName, itemName: item.name, duplicate: true }
    }
    logger.error('[gift] 기록 실패:', insertError?.message)
    return { success: false, error: 'DB_ERROR' }
  }

  const { error: grantError } = await admin.rpc('grant_shrine_item', {
    p_user_id: grantTo,
    p_item_id: item.id,
    p_qty: 1,
  })
  if (grantError) {
    logger.error('[gift] 지급 실패:', grantError.message)
    await admin.from('energy_gifts').delete().eq('id', giftRow.id)
    return { success: false, error: 'GRANT_FAILED' }
  }

  if (delivery === 'inventory_recipient' && linkedUserId) {
    const giverName = (giverProfile?.full_name as string | null) || '가족'
    const text = giftPushText(giverName, item.name, `${EL_LABEL[element]}(${EL_KO[element]})`)
    // 알림은 «있으면 보내고 없으면 조용히» — 실패가 선물을 되돌리지 않는다.
    sendPushToUser(linkedUserId, { ...text, url: '/protected/shrine', tag: 'energy-gift' }).catch((e) =>
      logger.warn('[gift] 알림 실패:', e)
    )
  }

  revalidatePath('/protected/shrine')
  revalidatePath('/protected/prescription')
  return { success: true, delivery, recipientName, itemName: item.name, duplicate: false }
}

export interface GiftSummary {
  count: number
  /** 가장 최근 선물 — 품목·오행·언제. 없으면 null. */
  last: { itemName: string; element: Element; createdAt: string } | null
}

/** 내가 그 사람에게 보낸 기운 선물 요약 — 처방전 ④ 아래 한 줄. */
export async function getGiftSummary(recipientMemberId: string): Promise<GiftSummary> {
  const empty: GiftSummary = { count: 0, last: null }
  if (!UUID.test(recipientMemberId)) return empty
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty

  const { data, count } = await supabase
    .from('energy_gifts')
    .select('element, created_at, shrine_item_catalog(name)', { count: 'exact' })
    .eq('giver_user_id', user.id)
    .eq('recipient_member_id', recipientMemberId)
    .order('created_at', { ascending: false })
    .limit(1)

  const row = data?.[0] as
    | { element: string; created_at: string; shrine_item_catalog: { name: string } | { name: string }[] | null }
    | undefined
  if (!row || !isElement(row.element)) return { count: count ?? 0, last: null }
  const cat = Array.isArray(row.shrine_item_catalog) ? row.shrine_item_catalog[0] : row.shrine_item_catalog
  return {
    count: count ?? 0,
    last: { itemName: cat?.name ?? '신물', element: row.element, createdAt: row.created_at },
  }
}
