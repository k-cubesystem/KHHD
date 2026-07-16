'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addBokPoints } from '@/app/actions/payment/bok-points'

export interface CatalogItem {
  id: string
  name: string
  description: string | null
  type: string
  rarity: string
  price_bok_points: number
  price_krw: number
  emoji: string
  image_url: string | null
  season: string | null
}

export async function getCatalogItems(): Promise<CatalogItem[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('shrine_item_catalog').select('*').eq('is_active', true).order('sort_order')

  return data ?? []
}

export async function placeItem(input: {
  catalogItemId: string
  slotIndex: number
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  // 내 신당 ID 조회 (본인 신당 스코프)
  const { data: shrine } = await supabase
    .from('shrines')
    .select('id')
    .eq('user_id', user.id)
    .is('family_member_id', null)
    .single()

  if (!shrine) return { success: false, error: 'SHRINE_NOT_FOUND' }

  // 아이템 카탈로그에서 가격 확인
  const { data: catalogItem } = await supabase
    .from('shrine_item_catalog')
    .select('price_bok_points, name')
    .eq('id', input.catalogItemId)
    .single()

  if (!catalogItem) return { success: false, error: 'ITEM_NOT_FOUND' }

  // 복 포인트 결제 (무료 아이템은 0포인트)
  if (catalogItem.price_bok_points > 0) {
    const result = await addBokPoints(
      -catalogItem.price_bok_points,
      'SHRINE_ITEM_PURCHASE',
      undefined,
      `${catalogItem.name} 구매`
    )
    if (!result.success) return { success: false, error: 'INSUFFICIENT_POINTS' }
  }

  // 슬롯에 아이템 배치 (기존 슬롯 교체 포함)
  const { error } = await supabase.from('shrine_items').upsert(
    {
      shrine_id: shrine.id,
      catalog_item_id: input.catalogItemId,
      slot_index: input.slotIndex,
    },
    { onConflict: 'shrine_id,slot_index' }
  )

  if (error) {
    if (error.message?.includes('SLOT_FULL')) return { success: false, error: 'SLOT_FULL' }
    return { success: false, error: error.message }
  }

  revalidatePath('/protected/shrine')
  return { success: true }
}

export async function removeItem(slotIndex: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { data: shrine } = await supabase
    .from('shrines')
    .select('id')
    .eq('user_id', user.id)
    .is('family_member_id', null)
    .single()

  if (!shrine) return { success: false, error: 'SHRINE_NOT_FOUND' }

  const { error } = await supabase.from('shrine_items').delete().eq('shrine_id', shrine.id).eq('slot_index', slotIndex)

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/shrine')
  return { success: true }
}
