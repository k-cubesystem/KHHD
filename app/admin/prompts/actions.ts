'use server'

import { requireAdminClient, adminClientOrError } from '@/lib/auth/admin-guard'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'

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
  const dbClient = await requireAdminClient()

  // Fetch prompts
  const { data, error } = await dbClient.from('ai_prompts').select('*').order('category', { ascending: true })

  if (error) {
    logger.error('Error fetching prompts:', error)
    throw new Error('Failed to fetch prompts')
  }

  return data as AIPrompt[]
}

export async function updatePrompt(key: string, data: { template?: string; talisman_cost?: number }) {
  const guard = await adminClientOrError()
  if (!guard.ok) return { success: false, error: guard.error }
  const dbClient = guard.client

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.template !== undefined) updates.template = data.template
  if (data.talisman_cost !== undefined) updates.talisman_cost = data.talisman_cost

  const { error } = await dbClient.from('ai_prompts').update(updates).eq('key', key)

  if (error) {
    logger.error('Error updating prompt:', error)
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
  const guard = await adminClientOrError()
  if (!guard.ok) return { success: false, error: guard.error }
  const dbClient = guard.client

  const { error } = await dbClient
    .from('ai_prompts')
    .insert({ key, label, category, template, description, talisman_cost: talismanCost })

  if (error) {
    logger.error('Error creating prompt:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/prompts')
  return { success: true }
}

export async function deletePrompt(key: string) {
  const guard = await adminClientOrError()
  if (!guard.ok) return { success: false, error: guard.error }
  const dbClient = guard.client

  const { error } = await dbClient.from('ai_prompts').delete().eq('key', key)

  if (error) {
    logger.error('Error deleting prompt:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/prompts')
  return { success: true }
}
