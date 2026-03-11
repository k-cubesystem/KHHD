'use server'

import { createClient } from '@/lib/supabase/server'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'

// Types
export interface MonthlyFortune {
  totalPossible: number
  currentFortune: number
  percentage: number
  completedCategories: string[]
}

export interface YearlyFortuneMonth {
  month: number
  fortune: number
  memberCount: number
}

export interface FamilyMemberFortune {
  memberId: string
  memberName: string
  relationship: string
  fortune: number
  missionsCompleted: number
}

/**
 * 이번 달 가족 전체 운세 조회 (월운)
 * Get current month's family fortune
 */
export async function getMonthlyFamilyFortune(): Promise<MonthlyFortune> {
  if (isEdgeEnabled('fortune')) {
    return invokeEdgeSafe('fortune', { action: 'getMonthlyFamilyFortune' })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      totalPossible: 800,
      currentFortune: 0,
      percentage: 0,
      completedCategories: [],
    }
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  try {
    // Get all family members count
    const { data: members } = await supabase.from('family_members').select('id').eq('user_id', user.id)

    if (!members || members.length === 0) {
      return {
        totalPossible: 800,
        currentFortune: 0,
        percentage: 0,
        completedCategories: [],
      }
    }

    // Get fortune entries for this month
    const { data: fortuneData } = await supabase
      .from('fortune_journal')
      .select('fortune_points, category')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)

    const currentFortune = fortuneData?.reduce((sum, f) => sum + (f.fortune_points || 0), 0) || 0
    const completedCategories = [...new Set(fortuneData?.map((f) => f.category) || [])]
    const totalPossible = members.length * 800 // 8 missions × 100 points per member

    return {
      totalPossible,
      currentFortune,
      percentage: Math.round((currentFortune / totalPossible) * 100 * 10) / 10,
      completedCategories,
    }
  } catch (error) {
    logger.error('Error fetching monthly fortune:', error)
    return {
      totalPossible: 800,
      currentFortune: 0,
      percentage: 0,
      completedCategories: [],
    }
  }
}

/**
 * 년운 추세 조회 (12개월)
 * Get yearly fortune trend
 */
export async function getYearlyFortuneTrend(year?: number): Promise<YearlyFortuneMonth[]> {
  if (isEdgeEnabled('fortune')) {
    return invokeEdgeSafe('fortune', { action: 'getYearlyFortuneTrend', year })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const targetYear = year || new Date().getFullYear()

  try {
    const { data, error } = await supabase.rpc('calculate_yearly_fortune', {
      user_id_param: user.id,
      year_param: targetYear,
    })

    if (error) {
      // If RPC function doesn't exist, use fallback
      if (error.code === '42883' || error.message.includes('function') || error.message.includes('does not exist')) {
        logger.log('RPC function not found, using fallback implementation for yearly trend')
        return getYearlyFortuneTrendFallback(user.id, targetYear)
      }
      logger.error('Error fetching yearly fortune:', error)
      return []
    }

    return data || []
  } catch (error) {
    logger.error('Error in getYearlyFortuneTrend:', error)
    return []
  }
}

/**
 * Fallback implementation for yearly fortune trend
 */
async function getYearlyFortuneTrendFallback(userId: string, year: number): Promise<YearlyFortuneMonth[]> {
  const supabase = await createClient()

  try {
    // 단일 쿼리로 전체 연도 데이터 + 가족 수 동시 조회
    const [{ data: fortuneData }, { data: members }] = await Promise.all([
      supabase.from('fortune_journal').select('month, fortune_points').eq('user_id', userId).eq('year', year),
      supabase.from('family_members').select('id').eq('user_id', userId),
    ])

    const memberCount = members?.length || 0

    // 월별 집계 (메모리에서 처리)
    const monthMap = new Map<number, number>()
    for (const row of fortuneData || []) {
      monthMap.set(row.month, (monthMap.get(row.month) || 0) + (row.fortune_points || 0))
    }

    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      fortune: monthMap.get(i + 1) || 0,
      memberCount,
    }))
  } catch (error) {
    logger.error('Error in yearly trend fallback:', error)
    return []
  }
}

/**
 * 가족 구성원별 운세 현황 조회
 * Get family fortune breakdown
 */
export async function getFamilyFortuneBreakdown(): Promise<FamilyMemberFortune[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc('calculate_family_fortune', {
      user_id_param: user.id,
      year_param: year,
      month_param: month,
    })

    if (error) {
      // If RPC function doesn't exist, use fallback
      if (error.code === '42883' || error.message.includes('function') || error.message.includes('does not exist')) {
        logger.log('RPC function not found, using fallback implementation')
        return getFamilyFortuneBreakdownFallback(user.id, year, month)
      }
      logger.error('Error fetching family fortune:', error)
      return []
    }

    return data || []
  } catch (error) {
    logger.error('Error in getFamilyFortuneBreakdown:', error)
    return []
  }
}

/**
 * Fallback implementation for family fortune breakdown
 */
async function getFamilyFortuneBreakdownFallback(
  userId: string,
  year: number,
  month: number
): Promise<FamilyMemberFortune[]> {
  const supabase = await createClient()

  try {
    // Get all family members
    const { data: members } = await supabase
      .from('family_members')
      .select('id, name, relationship')
      .eq('user_id', userId)

    if (!members || members.length === 0) return []

    // Get fortune data for all members in a single query
    const memberIds = members.map((m) => m.id)
    const { data: allFortuneData } = await supabase
      .from('fortune_journal')
      .select('family_member_id, fortune_points, category')
      .in('family_member_id', memberIds)
      .eq('year', year)
      .eq('month', month)

    // Aggregate in memory
    const fortuneByMember = new Map<string, { totalFortune: number; missionsCompleted: number }>()
    for (const row of allFortuneData || []) {
      const existing = fortuneByMember.get(row.family_member_id) ?? {
        totalFortune: 0,
        missionsCompleted: 0,
      }
      existing.totalFortune += row.fortune_points || 0
      existing.missionsCompleted += 1
      fortuneByMember.set(row.family_member_id, existing)
    }

    const results: FamilyMemberFortune[] = members.map((member) => {
      const agg = fortuneByMember.get(member.id) ?? { totalFortune: 0, missionsCompleted: 0 }
      return {
        memberId: member.id,
        memberName: member.name,
        relationship: member.relationship || '가족',
        fortune: agg.totalFortune,
        missionsCompleted: agg.missionsCompleted,
      }
    })

    return results
  } catch (error) {
    logger.error('Error in fallback implementation:', error)
    return []
  }
}

/**
 * 운세 기록하기 (분석 완료 시 호출)
 * Record fortune entry when analysis completes
 */
export async function recordFortuneEntry(
  familyMemberId: string,
  category: string,
  analysisId: string,
  fortunePoints: number = 100
): Promise<{ success: boolean; error?: string }> {
  if (isEdgeEnabled('fortune')) {
    return invokeEdgeSafe('fortune', {
      action: 'recordFortuneEntry',
      familyMemberId,
      category,
      analysisId,
      fortunePoints,
    })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  try {
    // Upsert: Only one entry per category per member per month
    const { error } = await supabase.from('fortune_journal').upsert(
      {
        user_id: user.id,
        family_member_id: familyMemberId,
        year,
        month,
        category,
        analysis_id: analysisId,
        fortune_points: fortunePoints,
      },
      {
        onConflict: 'family_member_id,year,month,category',
      }
    )

    if (error) {
      logger.error('Error recording fortune:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    logger.error('Error in recordFortuneEntry:', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: message }
  }
}

/**
 * 현재 로그인 유저의 '본인' family_member ID 반환
 * Used to record fortune entries for self-analysis
 */
export async function getSelfFamilyMemberId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('family_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('relationship', '본인')
    .maybeSingle()

  return data?.id || null
}

/**
 * 특정 구성원의 이번 달 운세 조회
 * Get specific member's monthly fortune
 */
export async function getMemberMonthlyFortune(memberId: string): Promise<MonthlyFortune> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      totalPossible: 800,
      currentFortune: 0,
      percentage: 0,
      completedCategories: [],
    }
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  try {
    const { data, error } = await supabase.rpc('calculate_monthly_fortune', {
      member_id_param: memberId,
      year_param: year,
      month_param: month,
    })

    if (error || !data || data.length === 0) {
      return {
        totalPossible: 800,
        currentFortune: 0,
        percentage: 0,
        completedCategories: [],
      }
    }

    const result = data[0]
    return {
      totalPossible: result.total_possible || 800,
      currentFortune: result.current_fortune || 0,
      percentage: result.percentage || 0,
      completedCategories: result.completed_categories || [],
    }
  } catch (error) {
    logger.error('Error fetching member fortune:', error)
    return {
      totalPossible: 800,
      currentFortune: 0,
      percentage: 0,
      completedCategories: [],
    }
  }
}
