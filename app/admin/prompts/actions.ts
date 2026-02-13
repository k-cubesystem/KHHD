'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface AIPrompt {
  key: string
  label: string
  category: string
  template: string
  description: string | null
  talisman_cost: number
  updated_at: string
}

export async function getPrompts(): Promise<AIPrompt[]> {
  const supabase = await createClient()

  // Check Auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // TEMPORARY: Use admin client to bypass RLS
  const dbClient = createAdminClient()

  // Fetch prompts
  const { data, error } = await dbClient
    .from('ai_prompts')
    .select('*')
    .order('category', { ascending: true })

  if (error) {
    console.error('Error fetching prompts:', error)
    throw new Error('Failed to fetch prompts')
  }

  return data as AIPrompt[]
}

export async function updatePrompt(
  key: string,
  data: { template?: string; talisman_cost?: number }
) {
  const supabase = await createClient()

  // Check Auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // TEMPORARY: Use admin client to bypass RLS
  const dbClient = createAdminClient()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.template !== undefined) updates.template = data.template
  if (data.talisman_cost !== undefined) updates.talisman_cost = data.talisman_cost

  const { error } = await dbClient.from('ai_prompts').update(updates).eq('key', key)

  if (error) {
    console.error('Error updating prompt:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/prompts')
  return { success: true }
}

export async function createPrompt(
  key: string,
  label: string,
  category: string,
  template: string,
  description?: string,
  talismanCost: number = 1
) {
  const supabase = await createClient()

  // Check Auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // TEMPORARY: Use admin client to bypass RLS
  const dbClient = createAdminClient()

  const { error } = await dbClient
    .from('ai_prompts')
    .insert({ key, label, category, template, description, talisman_cost: talismanCost })

  if (error) {
    console.error('Error creating prompt:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/prompts')
  return { success: true }
}

export async function getPromptByKey(key: string): Promise<string | null> {
  try {
    const dbClient = createAdminClient()
    const { data, error } = await dbClient
      .from('ai_prompts')
      .select('template')
      .eq('key', key)
      .single()

    if (error || !data) return null
    return data.template as string
  } catch {
    return null
  }
}

export async function deletePrompt(key: string) {
  const supabase = await createClient()

  // Check Auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // TEMPORARY: Use admin client to bypass RLS
  const dbClient = createAdminClient()

  const { error } = await dbClient.from('ai_prompts').delete().eq('key', key)

  if (error) {
    console.error('Error deleting prompt:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/prompts')
  return { success: true }
}
