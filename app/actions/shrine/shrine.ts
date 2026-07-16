'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Shrine {
  id: string
  user_id: string
  name: string
  description: string | null
  theme: 'traditional' | 'modern' | 'premium'
  visibility: 'public' | 'private'
  visitor_count: number
  wish_count: number
  created_at: string
  updated_at: string
}

export interface ShrineWithItems extends Shrine {
  shrine_items: Array<{
    id: string
    slot_index: number
    placed_at: string
    shrine_item_catalog: {
      id: string
      name: string
      type: string
      rarity: string
      emoji: string
      image_url: string | null
    }
  }>
}

export async function getMyShrine(): Promise<ShrineWithItems | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('shrines')
    .select(
      `
      *,
      shrine_items (
        id, slot_index, placed_at,
        shrine_item_catalog ( id, name, type, rarity, emoji, image_url )
      )
    `
    )
    .eq('user_id', user.id)
    .is('family_member_id', null)
    .single()

  return data ?? null
}

export async function getShrineByUserId(userId: string): Promise<ShrineWithItems | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('shrines')
    .select(
      `
      *,
      shrine_items (
        id, slot_index, placed_at,
        shrine_item_catalog ( id, name, type, rarity, emoji, image_url )
      )
    `
    )
    .eq('user_id', userId)
    .is('family_member_id', null)
    .eq('visibility', 'public')
    .single()

  return data ?? null
}

export async function createShrine(input: {
  name: string
  description?: string
  theme?: 'traditional' | 'modern' | 'premium'
  visibility?: 'public' | 'private'
}): Promise<{ success: boolean; shrine?: Shrine; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { data, error } = await supabase
    .from('shrines')
    .insert({
      user_id: user.id,
      name: input.name.trim().slice(0, 20),
      description: input.description?.trim().slice(0, 100) ?? null,
      theme: input.theme ?? 'traditional',
      visibility: input.visibility ?? 'public',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return { success: false, error: 'ALREADY_EXISTS' }
    return { success: false, error: error.message }
  }

  revalidatePath('/protected/shrine')
  return { success: true, shrine: data }
}

export async function updateShrine(input: {
  name?: string
  description?: string
  theme?: 'traditional' | 'modern' | 'premium'
  visibility?: 'public' | 'private'
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim().slice(0, 20)
  if (input.description !== undefined) updates.description = input.description.trim().slice(0, 100)
  if (input.theme !== undefined) updates.theme = input.theme
  if (input.visibility !== undefined) updates.visibility = input.visibility

  const { error } = await supabase.from('shrines').update(updates).eq('user_id', user.id).is('family_member_id', null)

  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/shrine')
  return { success: true }
}

export async function getPublicShrines(limit = 20): Promise<Shrine[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('shrines')
    .select('id, user_id, name, description, theme, visibility, visitor_count, wish_count, created_at, updated_at')
    .eq('visibility', 'public')
    .is('family_member_id', null)
    .order('visitor_count', { ascending: false })
    .limit(limit)

  return data ?? []
}
