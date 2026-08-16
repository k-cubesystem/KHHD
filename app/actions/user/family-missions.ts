'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { countFamilyMissions, FAMILY_MISSION_TOTAL } from '@/lib/domain/analysis/family-missions'

export interface FamilyMemberWithMissions {
  id: string
  name: string
  relationship: string
  birth_date: string
  birth_time: string | null
  calendar_type: string
  is_leap_month?: boolean
  gender: string
  job?: string
  hobby?: string
  avatar_id?: string
  /** 인연 갈래 — 가족/지인(2026-08-16). 값이 없으면 화면이 가족으로 떨어뜨린다. */
  member_category?: string
  face_image_url: string | null
  last_analysis_date: string | null
  last_analysis_summary: string | null
  last_analysis_score: number | null
  mission_completed: number
  mission_total: number
  completed_categories: string[]
}

/**
 * 미션 카운트를 TS에서 재계산한다(정예화: 5종 = 사주·관상·손금·풍수·궁합).
 * RPC(DB)는 건드리지 않고 반환값만 보정 — 배포 리스크 0. completed_categories 원본은 유지.
 */
function withFamilyMissionCount(member: FamilyMemberWithMissions): FamilyMemberWithMissions {
  const categories = Array.isArray(member.completed_categories) ? member.completed_categories : []
  return {
    ...member,
    mission_completed: countFamilyMissions(categories),
    mission_total: FAMILY_MISSION_TOTAL,
  }
}

export async function getFamilyWithMissions(): Promise<FamilyMemberWithMissions[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  try {
    // Try RPC function first (if migration is applied)
    const { data, error } = await supabase.rpc('get_family_with_missions', {
      user_id_param: user.id,
    })

    if (!error && data) {
      const rows = (data as FamilyMemberWithMissions[]).map(withFamilyMissionCount)

      // RPC 반환 컬럼에 is_leap_month·member_category 가 없다 — 원본 테이블에서 보강한다.
      // 윤달이 없으면 수정 폼이 항상 해제로 프리필해 저장 시 값이 지워지고(월주 오계산),
      // 갈래가 없으면 지인이 가족 탭에 섞인다.
      const { data: extraRows } = await supabase
        .from('family_members')
        .select('id, is_leap_month, member_category')
        .eq('user_id', user.id)

      if (!extraRows) return rows

      const extraById = new Map(
        extraRows.map((row) => [
          row.id as string,
          { leap: row.is_leap_month === true, category: (row.member_category as string | null) ?? 'family' },
        ])
      )
      return rows.map((member) => ({
        ...member,
        is_leap_month: extraById.get(member.id)?.leap ?? false,
        member_category: extraById.get(member.id)?.category ?? 'family',
      }))
    }

    // If RPC fails, use fallback query
    logger.warn('RPC not available, using fallback query')
    throw error
  } catch {
    // Fallback: Manual query without RPC
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (membersError || !members) {
      logger.error('Failed to fetch family members:', membersError)
      return []
    }

    // For each member, get their analysis history
    const membersWithMissions = await Promise.all(
      members.map(async (member) => {
        // Get all analysis categories for this member
        const { data: analyses } = await supabase
          .from('analysis_history')
          .select('category, summary, score, created_at')
          .eq('target_id', member.id)
          .order('created_at', { ascending: false })

        // Get unique categories
        const completedCategories = analyses ? Array.from(new Set(analyses.map((a) => a.category).filter(Boolean))) : []

        // Get last analysis
        const lastAnalysis = analyses && analyses.length > 0 ? analyses[0] : null

        return {
          id: member.id,
          name: member.name,
          relationship: member.relationship,
          birth_date: member.birth_date,
          birth_time: member.birth_time,
          calendar_type: member.calendar_type,
          is_leap_month: member.is_leap_month === true,
          gender: member.gender,
          job: member.job,
          hobby: member.hobby,
          avatar_id: member.avatar_id,
          face_image_url: member.face_image_url,
          last_analysis_date: lastAnalysis?.created_at || null,
          last_analysis_summary: lastAnalysis?.summary || null,
          last_analysis_score: lastAnalysis?.score || null,
          mission_completed: countFamilyMissions(completedCategories as string[]),
          mission_total: FAMILY_MISSION_TOTAL,
          completed_categories: completedCategories as string[],
        }
      })
    )

    return membersWithMissions
  }
}
