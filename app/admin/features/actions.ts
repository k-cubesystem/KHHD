'use server'

import { requireAdminClient } from '@/lib/auth/admin-guard'

export async function getFeatureCosts() {
  const adminClient = await requireAdminClient()

  const { data, error } = await adminClient.from('feature_costs').select('*').order('key')

  if (error) throw error
  return data
}

export async function updateFeatureCost(key: string, cost: number, isActive: boolean) {
  const adminClient = await requireAdminClient()

  if (!Number.isInteger(cost) || cost < 0) {
    throw new Error('복채 소모량은 0 이상의 정수여야 합니다.')
  }

  const { error } = await adminClient.from('feature_costs').update({ cost, is_active: isActive }).eq('key', key)

  if (error) throw error
  return { success: true }
}
