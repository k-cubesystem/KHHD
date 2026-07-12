'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { spendBokchae, refundBokchae } from '@/lib/services/bokchae'
import { trackEvent } from '@/lib/analytics/ga4'
import { parseBehavior, isElement, isLayer, type CatalogItem, type SizeGrade } from '@/lib/domain/shrine/types'

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
  price_bok_points: number
  price_krw: number
  price_bokchae: number
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
    priceBok: r.price_bok_points,
    priceKrw: r.price_krw,
    priceBokchae: r.price_bokchae,
  }
}

export interface ShopData {
  catalog: CatalogItem[]
  owned: Record<string, number>
  bokBalance: number
}

/** 상점 데이터: 전체 카탈로그 + 보유 수량 + 복 잔액 */
export async function getShopData(): Promise<ShopData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { catalog: [], owned: {}, bokBalance: 0 }

  const [{ data: catRows }, { data: invRows }, bokchae] = await Promise.all([
    supabase.from('shrine_item_catalog').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('user_shrine_inventory').select('catalog_item_id, qty').eq('user_id', user.id),
    getWalletBalance(),
  ])

  const owned: Record<string, number> = {}
  for (const r of invRows ?? []) owned[r.catalog_item_id] = r.qty

  return {
    catalog: (catRows ?? []).map((r) => toCatalogItem(r as CatalogRow)),
    owned,
    bokBalance: bokchae, // 단일 통화: 복채 잔액
  }
}

/** 아이템을 복 포인트로 구매 → 보관함(인벤토리)에 담기. 배치는 신당 꾸미기에서. */
export async function purchaseToInventory(
  catalogItemId: string
): Promise<{ success: boolean; error?: string; newQty?: number; newBalance?: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { data: item } = await supabase
    .from('shrine_item_catalog')
    .select('name, price_bokchae, is_active')
    .eq('id', catalogItemId)
    .maybeSingle()
  if (!item || !item.is_active) return { success: false, error: 'ITEM_NOT_FOUND' }

  const price = item.price_bokchae
  let newBalance: number | undefined
  if (price > 0) {
    // 단일 통화: 복채 원자 차감(잔액 가드).
    const res = await spendBokchae(price, `${item.name} 구매`)
    if (!res.success) return { success: false, error: res.error ?? 'INSUFFICIENT_BOKCHAE' }
    newBalance = res.balance
  }

  // 아이템 지급은 service_role 전용 RPC — 인증·차감(위)을 통과한 본인 계정에만.
  const admin = createAdminClient()
  const { data: qty, error } = await admin.rpc('grant_shrine_item', {
    p_user_id: user.id,
    p_item_id: catalogItemId,
    p_qty: 1,
  })
  if (error) {
    logger.error('[shrine/inventory] grant failed:', error)
    // 복채는 차감됐는데 지급 실패 → 롤백(best-effort)
    if (price > 0) await refundBokchae(user.id, price, `${item.name} 구매 취소 환불`)
    return { success: false, error: 'GRANT_FAILED' }
  }

  trackEvent({ action: 'shrine_item_purchase', category: 'shrine', label: item.name, value: price })
  revalidatePath('/protected/shrine/shop')
  revalidatePath('/protected/shrine')
  return { success: true, newQty: typeof qty === 'number' ? qty : undefined, newBalance }
}
