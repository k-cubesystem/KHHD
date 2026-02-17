'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { calculateManse } from '@/lib/domain/saju/manse'
import { saveAnalysisHistory } from '@/app/actions/analysis-history'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export type TargetType = 'USER' | 'FAMILY'

export async function generateDailyFortune(
  userId: string,
  targetId: string,
  type: TargetType = 'USER',
  dateStr?: string,
  force: boolean = false
) {
  // Rate limiting: 1분에 20회 (일운은 자주 조회될 수 있으므로 여유있게)
  const rateLimitResult = await rateLimit(`daily-fortune:${userId}`, {
    interval: 60 * 1000,
    uniqueTokenPerInterval: 20,
  })

  if (!rateLimitResult.success) {
    const waitTime = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
    return {
      success: false,
      error: `요청 제한을 초과했습니다. ${waitTime}초 후에 다시 시도해주세요.`,
    }
  }

  const supabase = await createClient()
  const targetDate = dateStr || new Date().toISOString().split('T')[0]

  // 1. Check Cache / Handle Force
  // We filter by user_id AND metadata->target_id (if we use JSONB) or just assume one fortune per user per day?
  // No, user can view multiple fortunes (self + family).
  // So we need unique constraint on (user_id, target_id, date).
  // I will try to query based on JSON metadata or new columns if I add them.
  // For now, I'll store `target_id` in a generic way or assume `daily_fortunes` needs update.
  // Let's assume I updated the schema to have `target_id`.

  // Note: Migration 20260127_daily_fortune_target.sql will be created to add target_id
  const query = supabase
    .from('daily_fortunes')
    .select('*')
    .eq('user_id', userId)
    .eq('target_id', targetId) // migration needed
    .eq('date', targetDate)
    .single()

  const { data: existing } = await query

  if (force && existing) {
    // Delete existing fortune to regenerate
    await supabase.from('daily_fortunes').delete().eq('id', existing.id)
  } else if (existing) {
    return { success: true, content: existing.content, cached: true }
  }

  // 2. Fetch Target Profile Data
  let name, gender, birthDate, birthTime

  if (type === 'USER') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single()
    if (!profile || !profile.birth_date)
      return { success: false, error: '생년월일 정보가 필요합니다.' }
    name = profile.name
    gender = profile.gender
    birthDate = profile.birth_date
    birthTime = profile.birth_time
  } else {
    const { data: member } = await supabase
      .from('family_members')
      .select('*')
      .eq('id', targetId)
      .single()
    if (!member || !member.birth_date)
      return { success: false, error: '가족의 생년월일 정보가 필요합니다.' }
    name = member.name
    gender = member.gender
    birthDate = member.birth_date
    birthTime = member.birth_time
  }

  // 3. Calculate Manse
  const manseElement = calculateManse(birthDate, birthTime || '00:00')
  const sajuStr = `${manseElement.year.gan}${manseElement.year.ji}년 ${manseElement.month.gan}${manseElement.month.ji}월 ${manseElement.day.gan}${manseElement.day.ji}일 ${manseElement.time.gan}${manseElement.time.ji}시`

  // 4. Get Prompt
  let promptData = null
  let fetchError = null

  // Strategy 1: Attempt Admin Client (Bypassing RLS)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('ai_prompts')
        .select('template') // Corrected column name
        .ilike('key', 'daily_fortune') // Case-insensitive match
        .limit(1)

      if (error) throw error
      if (data && data.length > 0) promptData = data[0]
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      logger.error('Admin Client Fetch Error:', e)
      fetchError = 'Admin Error: ' + message
    }
  } else {
    fetchError = 'Server Config Error: Missing Service Role Key'
  }

  // Strategy 2: Attempt standard client (If RLS permitted)
  if (!promptData) {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('template') // Corrected column name
        .ilike('key', 'daily_fortune')
        .maybeSingle()

      if (data) promptData = data
      if (error) fetchError += ' | Standard Error: ' + error.message
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      fetchError += ' | Standard Exception: ' + message
    }
  }

  // STRICT ENFORCEMENT: No Fallback
  if (!promptData || !promptData.template) {
    logger.error('CRITICAL: Daily Fortune Prompt NOT FOUND in DB.')
    return {
      success: false,
      error: `시스템 설정 오류: 관리자 프롬프트를 불러올 수 없습니다. (관리자에게 문의하세요) \nDebug: ${fetchError}`,
    }
  }

  const promptTemplate = promptData.template

  // 5. Generate
  const prompt = promptTemplate
    .replace('{{date}}', targetDate)
    .replace('{{name}}', name || '사용자')
    .replace('{{gender}}', gender === 'male' ? '남성' : '여성')
    .replace('{{birthDate}}', birthDate)
    .replace('{{birthTime}}', birthTime || '알 수 없음')
    .replace('{{saju}}', sajuStr)

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
      userId: userId,
      model: 'gemini-2.0-flash',
      actionType: 'daily_fortune',
    })
    const text = result.response.text()

    // 6. Save
    // We will save with target_id.
    // If DB strictly doesn't have target_id yet, this insert might fail if I use it.
    // MUST RUN MIGRATION FIRST.
    const { error: saveError } = await supabase.from('daily_fortunes').insert({
      user_id: userId,
      target_id: targetId,
      date: targetDate,
      content: text,
    })

    if (saveError) {
      logger.error('Failed to save fortune:', saveError)
    }

    // 7. Save to Unified History
    try {
      await saveAnalysisHistory({
        target_id: targetId,
        target_name: name || '사용자',
        target_relation: type === 'USER' ? '본인' : '가족/지인',
        category: 'TODAY',
        context_mode: 'GENERAL',
        result_json: { content: text },
        summary: text.substring(0, 30) + '...',
        talisman_cost: 0,
      })
    } catch (e) {
      logger.error('Failed to save history:', e)
    }

    return { success: true, content: text, cached: false }
  } catch (error) {
    logger.error('AI Generation Error:', error)
    const message = error instanceof Error ? error.message : 'AI generation failed'
    return { success: false, error: message }
  }
}
