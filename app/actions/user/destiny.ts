'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

/**
 * Destiny Target 타입 정의
 * - self: 본인 (profiles 테이블)
 * - family: 가족/친구 (family_members 테이블)
 */
export type DestinyTargetType = 'self' | 'family'

/**
 * Destiny Target 인터페이스
 * 본인(profiles)과 가족/친구(family_members)를 통합한 데이터 구조
 */
export interface DestinyTarget {
  id: string
  owner_id: string
  name: string
  relation_type: string
  birth_date: string | null
  birth_time: string | null
  calendar_type: 'solar' | 'lunar' | null
  gender: 'male' | 'female' | null
  avatar_url: string | null
  face_image_url: string | null
  hand_image_url: string | null
  home_address: string | null
  target_type: DestinyTargetType
  created_at: string
  updated_at: string
}

/**
 * 현재 로그인한 사용자의 모든 Destiny Targets 조회
 * - 본인(profiles) + 가족/친구(family_members)를 통합하여 반환
 * - 본인이 항상 첫 번째로 정렬됨
 * - unstable_cache를 사용하여 DB 부하 최소화 (1분 캐시)
 */
export async function getDestinyTargets(): Promise<DestinyTarget[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('No authenticated user found')
    return []
  }

  // View를 직접 쿼리 (RPC 함수 우회)
  const { data, error } = await supabase
    .from('v_destiny_targets')
    .select('*')
    .eq('owner_id', user.id)
    .order('target_type', { ascending: false }) // self가 먼저 (descending으로 'self' > 'family')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching destiny targets:', error.message)
    return []
  }

  return (data || []) as DestinyTarget[]
}

/**
 * 특정 Destiny Target 조회
 * @param targetId - Target ID
 */
export async function getDestinyTarget(targetId: string): Promise<DestinyTarget | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('No authenticated user found')
    return null
  }

  // View에서 직접 조회
  const { data, error } = await supabase
    .from('v_destiny_targets')
    .select('*')
    .eq('id', targetId)
    .eq('owner_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching destiny target:', error.message)
    return null
  }

  return data as DestinyTarget
}

/**
 * Destiny Target 개수 조회 (본인 제외)
 * - 멤버십 제한 체크용
 */
export async function getDestinyTargetsCount(): Promise<{
  total: number
  family: number
}> {
  const targets = await getDestinyTargets()

  const familyTargets = targets.filter((t) => t.target_type === 'family')

  return {
    total: targets.length,
    family: familyTargets.length,
  }
}

/**
 * Helper 함수들은 lib/destiny-utils.ts로 이동했습니다.
 * - hasValidBirthData()
 * - getTargetImageUrl()
 * - getTargetColor()
 * - formatBirthData()
 */
