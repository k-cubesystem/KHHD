'use server'

import { createClient } from '@/lib/supabase/server'

export interface FamilyMemberWithMissions {
  id: string
  name: string
  relationship: string
  birth_date: string
  birth_time: string | null
  calendar_type: string
  gender: string
  face_image_url: string | null
  last_analysis_date: string | null
  last_analysis_summary: string | null
  last_analysis_score: number | null
  mission_completed: number
  mission_total: number
  completed_categories: string[]
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
      return data as FamilyMemberWithMissions[]
    }

    // If RPC fails, use fallback query
    console.warn('RPC not available, using fallback query')
    throw error
  } catch (e) {
    // Fallback: Manual query without RPC
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (membersError || !members) {
      console.error('Failed to fetch family members:', membersError)
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
        const completedCategories = analyses
          ? Array.from(new Set(analyses.map((a) => a.category).filter(Boolean)))
          : []

        // Get last analysis
        const lastAnalysis = analyses && analyses.length > 0 ? analyses[0] : null

        return {
          id: member.id,
          name: member.name,
          relationship: member.relationship,
          birth_date: member.birth_date,
          birth_time: member.birth_time,
          calendar_type: member.calendar_type,
          gender: member.gender,
          face_image_url: member.face_image_url,
          last_analysis_date: lastAnalysis?.created_at || null,
          last_analysis_summary: lastAnalysis?.summary || null,
          last_analysis_score: lastAnalysis?.score || null,
          mission_completed: completedCategories.length,
          mission_total: 8,
          completed_categories: completedCategories as string[],
        }
      })
    )

    return membersWithMissions
  }
}
