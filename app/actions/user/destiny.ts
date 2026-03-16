'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'

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
  if (isEdgeEnabled('user')) {
    return invokeEdgeSafe('user', { action: 'getDestinyTargets' })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logger.warn('No authenticated user found')
    return []
  }

  // View를 직접 쿼리 (RPC 함수 우회) — 필요 컬럼만 선택
  const { data, error } = await supabase
    .from('v_destiny_targets')
    .select('id, owner_id, name, relation_type, birth_date, birth_time, calendar_type, gender, avatar_url, face_image_url, hand_image_url, home_address, target_type, created_at, updated_at')
    .eq('owner_id', user.id)
    .order('target_type', { ascending: false }) // self가 먼저 (descending으로 'self' > 'family')
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('Error fetching destiny targets:', error.message)
    return []
  }

  return (data || []) as DestinyTarget[]
}

/**
 * 특정 Destiny Target 조회
 * @param targetId - Target ID
 */
export async function getDestinyTarget(targetId: string): Promise<DestinyTarget | null> {
  if (isEdgeEnabled('user')) {
    return invokeEdgeSafe('user', { action: 'getDestinyTarget', targetId })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logger.warn('No authenticated user found')
    return null
  }

  // View에서 직접 조회 — 필요 컬럼만 선택
  const { data, error } = await supabase
    .from('v_destiny_targets')
    .select('id, owner_id, name, relation_type, birth_date, birth_time, calendar_type, gender, avatar_url, face_image_url, hand_image_url, home_address, target_type, created_at, updated_at')
    .eq('id', targetId)
    .eq('owner_id', user.id)
    .single()

  if (error) {
    logger.error('Error fetching destiny target:', error.message)
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
  if (isEdgeEnabled('user')) {
    return invokeEdgeSafe('user', { action: 'getDestinyTargetsCount' })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { total: 0, family: 0 }
  }

  // 두 카운트 쿼리를 병렬 실행 (전체 목록 로드 대신 head: true 카운트)
  const [totalResult, familyResult] = await Promise.all([
    supabase
      .from('v_destiny_targets')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id),
    supabase
      .from('v_destiny_targets')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('target_type', 'family'),
  ])

  return {
    total: totalResult.count ?? 0,
    family: familyResult.count ?? 0,
  }
}

/**
 * Helper 함수들은 lib/destiny-utils.ts로 이동했습니다.
 * - hasValidBirthData()
 * - getTargetImageUrl()
 * - getTargetColor()
 * - formatBirthData()
 */
