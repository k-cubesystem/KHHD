'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { trackEvent } from '@/lib/analytics/ga4'
import { parseMatters } from '@/lib/domain/shrine/item-matters'
import {
  parseBehavior,
  parseUnlockEffect,
  isElement,
  isLayer,
  type CatalogItem,
  type SizeGrade,
} from '@/lib/domain/shrine/types'
import { SHOP_CLAIM_MAX_QTY, isRewardOnlyItem } from '@/lib/domain/shrine/shop-sections'

interface CatalogRow {
  id: string
  name: string
  description: string | null
  type: string
  rarity: string
  emoji: string
  sprite_url: string | null
  element: string | null
  energy_power: number
  placement_layer: string
  size_grade: string
  behavior: unknown
  unlock_effect: unknown
  matters: unknown
  origin_note: string | null
}

function toCatalogItem(r: CatalogRow): CatalogItem {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type,
    rarity: r.rarity,
    emoji: r.emoji,
    spriteUrl: r.sprite_url,
    element: isElement(r.element) ? r.element : null,
    energyPower: r.energy_power,
    layer: isLayer(r.placement_layer) ? r.placement_layer : 'floor',
    size: (['sm', 'md', 'lg'].includes(r.size_grade) ? r.size_grade : 'md') as SizeGrade,
    behavior: parseBehavior(r.behavior),
    unlockEffect: parseUnlockEffect(r.unlock_effect),
    matters: parseMatters(r.matters),
    originNote: r.origin_note,
  }
}

export interface ShopData {
  catalog: CatalogItem[]
  owned: Record<string, number>
}

/** 상점 데이터: 전체 카탈로그 + 보유 수량 */
export async function getShopData(): Promise<ShopData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { catalog: [], owned: {} }

  const [{ data: catRows }, { data: invRows }] = await Promise.all([
    supabase.from('shrine_item_catalog').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('user_shrine_inventory').select('catalog_item_id, qty').eq('user_id', user.id),
  ])

  const owned: Record<string, number> = {}
  for (const r of invRows ?? []) owned[r.catalog_item_id] = r.qty

  return {
    catalog: (catRows ?? []).map((r) => toCatalogItem(r as CatalogRow)),
    owned,
  }
}

/**
 * 신물 받기 → 보관함(인벤토리)에 담기. 배치는 신당 꾸미기에서.
 *
 * 2026-09-18 이용권 전환: 신물·신수·세간은 **무료**다(값을 받지 않는다). 그래서 이 함수가 지키는 것은
 * 값이 아니라 두 가지다 — 보상 전용 품목은 내주지 않는다, 한 가지를 끝없이 쌓지 않는다.
 * 이름은 purchaseToInventory 그대로 둔다(신수 탭 purchaseGuardian 이 이 함수를 재사용한다).
 */
export async function purchaseToInventory(
  catalogItemId: string
): Promise<{ success: boolean; error?: string; newQty?: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const [{ data: item }, { data: invRow }] = await Promise.all([
    supabase.from('shrine_item_catalog').select('name, is_active').eq('id', catalogItemId).maybeSingle(),
    supabase
      .from('user_shrine_inventory')
      .select('qty')
      .eq('user_id', user.id)
      .eq('catalog_item_id', catalogItemId)
      .maybeSingle(),
  ])
  if (!item || !item.is_active) return { success: false, error: 'ITEM_NOT_FOUND' }

  /**
   * 완주 보상 전용 품목은 내주지 않는다.
   *
   * 「백일 소원끈」은 설명 자체가 "백일기도를 마친 이가 처마에 매다는" 이라, 받을 수 있으면
   * 그 설명이 거짓말이 된다. 무료 전환 뒤로는 값이 막이가 아니므로 이 검사가 유일한 막이다.
   */
  if (isRewardOnlyItem(item.name)) return { success: false, error: 'REWARD_ONLY' }
  if ((invRow?.qty ?? 0) >= SHOP_CLAIM_MAX_QTY) return { success: false, error: 'MAX_QTY' }

  // 아이템 지급은 service_role 전용 RPC — 인증·보상 전용 검사(위)를 통과한 본인 계정에만.
  const admin = createAdminClient()
  const { data: qty, error } = await admin.rpc('grant_shrine_item', {
    p_user_id: user.id,
    p_item_id: catalogItemId,
    p_qty: 1,
  })
  if (error) {
    logger.error('[shrine/inventory] grant failed:', error)
    return { success: false, error: 'GRANT_FAILED' }
  }

  trackEvent({ action: 'shrine_item_claim', category: 'shrine', label: item.name })
  revalidatePath('/protected/shrine/shop')
  revalidatePath('/protected/shrine')
  return { success: true, newQty: typeof qty === 'number' ? qty : undefined }
}
