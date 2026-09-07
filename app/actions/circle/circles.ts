'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { logger } from '@/lib/utils/logger'
import { toMemberCategory, type MemberCategory } from '@/lib/domain/family/member-category'
import {
  CIRCLE_CREATE_DAILY_LIMIT,
  CIRCLE_KIND_META,
  FAMILY_CIRCLE_ID,
  circleLimits,
  isCircleKind,
  isCreatableCircleKind,
  nextTierForCircles,
  normalizeCircleName,
  type CircleKind,
  type CircleLimits,
} from '@/lib/domain/circle/circle'

/**
 * 그룹 관리 액션 — 목록·만들기·사람 넣기/빼기·지우기.
 *
 * 🔴 상한은 전부 서버가 판정한다(티어별 그룹 수·구성원 수·하루 생성 수). UI 는 결과를 보일 뿐이다.
 * 🔴 소유 검증 두 겹: 그룹(circles.user_id) + 사람(family_members.user_id). RLS 가 한 번 더 막는다.
 * 🔴 직장 그룹은 등록 동의(consent) 없이는 사람을 넣지 못한다 — 제3자 생년월일이다.
 */

const FAMILY_PATH = '/protected/family'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type CircleError =
  | 'UNAUTHORIZED'
  | 'MEMBERSHIP_REQUIRED'
  | 'LIMIT_CIRCLES'
  | 'LIMIT_MEMBERS'
  | 'DAILY_LIMIT'
  | 'INVALID_NAME'
  | 'INVALID_KIND'
  | 'INVALID_ID'
  | 'CONSENT_REQUIRED'
  | 'NOT_FOUND'
  | 'DB_ERROR'

export type CircleActionResult = { success: true; id?: string } | { success: false; error: CircleError }

export interface CircleMemberRow {
  memberId: string
  name: string
  relationship: string
  role: string | null
  consentAt: string | null
}

export interface CircleDetail {
  id: string
  name: string
  kind: CircleKind
  createdAt: string
  members: CircleMemberRow[]
}

export interface CirclePerson {
  id: string
  name: string
  relationship: string
  category: MemberCategory
}

export interface CirclesOverview {
  /** 가상 가족 그룹 — 본인 + 가족 갈래. 행이 없다. */
  family: { id: typeof FAMILY_CIRCLE_ID; name: string; kind: 'family'; memberCount: number }
  circles: CircleDetail[]
  /** 그룹에 넣을 수 있는 내 인연 전체(가족·지인). */
  people: CirclePerson[]
  limits: CircleLimits
  tier: string | null
  nextTier: 'SINGLE' | 'FAMILY' | 'BUSINESS' | null
}

interface CircleRow {
  id: string
  name: string
  kind: string
  created_at: string
}

interface CircleMemberDbRow {
  circle_id: string
  member_id: string
  role: string | null
  consent_at: string | null
}

async function currentUser(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** 내 그룹 하나 — 소유 검증 포함. 없으면 null. */
async function ownCircle(supabase: SupabaseClient, userId: string, circleId: string) {
  if (!UUID.test(circleId)) return null
  const { data } = await supabase
    .from('circles')
    .select('id, name, kind, created_at')
    .eq('id', circleId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data || !isCircleKind(data.kind)) return null
  return { id: data.id as string, name: data.name as string, kind: data.kind, createdAt: data.created_at as string }
}

export async function getCirclesOverview(): Promise<CirclesOverview | null> {
  const supabase = await createClient()
  const userId = await currentUser(supabase)
  if (!userId) return null

  const [membership, { data: people }, { data: circleRows }, { data: memberRows }] = await Promise.all([
    getCurrentUserMembership(),
    supabase
      .from('family_members')
      .select('id, name, relationship, member_category')
      .eq('user_id', userId)
      .order('created_at'),
    supabase.from('circles').select('id, name, kind, created_at').eq('user_id', userId).order('created_at'),
    supabase.from('circle_members').select('circle_id, member_id, role, consent_at'),
  ])

  const persons: CirclePerson[] = (people ?? [])
    .filter((p) => p.relationship !== '본인')
    .map((p) => ({
      id: p.id as string,
      name: (p.name as string) || '이름 없음',
      relationship: (p.relationship as string) || '가족',
      category: toMemberCategory(p.member_category as string | null),
    }))
  const personById = new Map(persons.map((p) => [p.id, p]))

  const membersByCircle = new Map<string, CircleMemberRow[]>()
  for (const row of (memberRows ?? []) as CircleMemberDbRow[]) {
    const person = personById.get(row.member_id)
    if (!person) continue
    const list = membersByCircle.get(row.circle_id) ?? []
    list.push({
      memberId: row.member_id,
      name: person.name,
      relationship: person.relationship,
      role: row.role,
      consentAt: row.consent_at,
    })
    membersByCircle.set(row.circle_id, list)
  }

  const circles: CircleDetail[] = ((circleRows ?? []) as CircleRow[])
    .filter((c) => isCircleKind(c.kind))
    .map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind as CircleKind,
      createdAt: c.created_at,
      members: membersByCircle.get(c.id) ?? [],
    }))

  const tier = membership?.tier ?? null
  return {
    family: {
      id: FAMILY_CIRCLE_ID,
      name: CIRCLE_KIND_META.family.label,
      kind: 'family',
      memberCount: persons.filter((p) => p.category === 'family').length + 1,
    },
    circles,
    people: persons,
    limits: circleLimits(tier),
    tier,
    nextTier: nextTierForCircles(tier),
  }
}

export async function createCircle(input: { name: string; kind: string }): Promise<CircleActionResult> {
  const supabase = await createClient()
  const userId = await currentUser(supabase)
  if (!userId) return { success: false, error: 'UNAUTHORIZED' }

  const name = normalizeCircleName(input.name ?? '')
  if (!name) return { success: false, error: 'INVALID_NAME' }
  if (!isCreatableCircleKind(input.kind)) return { success: false, error: 'INVALID_KIND' }

  const membership = await getCurrentUserMembership()
  if (!membership) return { success: false, error: 'MEMBERSHIP_REQUIRED' }
  const limits = circleLimits(membership.tier)

  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const [{ count: total }, { count: today }] = await Promise.all([
    supabase.from('circles').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('circles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', dayStart.toISOString()),
  ])
  if ((total ?? 0) >= limits.maxCircles) return { success: false, error: 'LIMIT_CIRCLES' }
  if ((today ?? 0) >= CIRCLE_CREATE_DAILY_LIMIT) return { success: false, error: 'DAILY_LIMIT' }

  const { data, error } = await supabase
    .from('circles')
    .insert({ user_id: userId, name, kind: input.kind })
    .select('id')
    .single()
  if (error || !data) {
    logger.error('[circles] 만들기 실패:', error?.message)
    return { success: false, error: 'DB_ERROR' }
  }

  revalidatePath(FAMILY_PATH)
  return { success: true, id: data.id as string }
}

export async function addCircleMember(input: {
  circleId: string
  memberId: string
  consent: boolean
  role?: string
}): Promise<CircleActionResult> {
  const supabase = await createClient()
  const userId = await currentUser(supabase)
  if (!userId) return { success: false, error: 'UNAUTHORIZED' }
  if (!UUID.test(input.memberId)) return { success: false, error: 'INVALID_ID' }

  const [membership, circle, { data: person }] = await Promise.all([
    getCurrentUserMembership(),
    ownCircle(supabase, userId, input.circleId),
    supabase.from('family_members').select('id').eq('id', input.memberId).eq('user_id', userId).maybeSingle(),
  ])
  if (!membership) return { success: false, error: 'MEMBERSHIP_REQUIRED' }
  if (!circle || !person) return { success: false, error: 'NOT_FOUND' }
  if (CIRCLE_KIND_META[circle.kind].consentRequired && !input.consent) {
    return { success: false, error: 'CONSENT_REQUIRED' }
  }

  const { count } = await supabase
    .from('circle_members')
    .select('member_id', { count: 'exact', head: true })
    .eq('circle_id', circle.id)
  if ((count ?? 0) >= circleLimits(membership.tier).maxMembers) return { success: false, error: 'LIMIT_MEMBERS' }

  const role = input.role?.replace(/\s+/g, ' ').trim().slice(0, 20) || null
  const { error } = await supabase.from('circle_members').upsert(
    {
      circle_id: circle.id,
      member_id: input.memberId,
      role,
      consent_at: input.consent ? new Date().toISOString() : null,
    },
    { onConflict: 'circle_id,member_id' }
  )
  if (error) {
    logger.error('[circles] 사람 넣기 실패:', error.message)
    return { success: false, error: 'DB_ERROR' }
  }

  revalidatePath(FAMILY_PATH)
  return { success: true }
}

export async function removeCircleMember(input: { circleId: string; memberId: string }): Promise<CircleActionResult> {
  const supabase = await createClient()
  const userId = await currentUser(supabase)
  if (!userId) return { success: false, error: 'UNAUTHORIZED' }
  if (!UUID.test(input.memberId)) return { success: false, error: 'INVALID_ID' }

  const circle = await ownCircle(supabase, userId, input.circleId)
  if (!circle) return { success: false, error: 'NOT_FOUND' }

  const { error } = await supabase
    .from('circle_members')
    .delete()
    .eq('circle_id', circle.id)
    .eq('member_id', input.memberId)
  if (error) {
    logger.error('[circles] 사람 빼기 실패:', error.message)
    return { success: false, error: 'DB_ERROR' }
  }

  revalidatePath(FAMILY_PATH)
  return { success: true }
}

export async function deleteCircle(circleId: string): Promise<CircleActionResult> {
  const supabase = await createClient()
  const userId = await currentUser(supabase)
  if (!userId) return { success: false, error: 'UNAUTHORIZED' }

  const circle = await ownCircle(supabase, userId, circleId)
  if (!circle) return { success: false, error: 'NOT_FOUND' }

  const { error } = await supabase.from('circles').delete().eq('id', circle.id).eq('user_id', userId)
  if (error) {
    logger.error('[circles] 지우기 실패:', error.message)
    return { success: false, error: 'DB_ERROR' }
  }

  revalidatePath(FAMILY_PATH)
  return { success: true }
}
