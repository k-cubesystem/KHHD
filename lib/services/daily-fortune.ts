/**
 * 오늘의 운세 생성 — 서버 내부 정본.
 *
 * 🔴 이 로직이 `'use server'` 파일에 있으면 안 되는 이유: 거기 export 는 전부 공개 엔드포인트라
 *    «어느 클라이언트로 읽을지»(reader)를 인자로 받는 순간 남의 명식을 읽는 문이 된다.
 *    그래서 reader 를 받는 본체는 여기(서버 내부 모듈)에 두고,
 *    공개 액션(app/actions/fortune/daily.ts)은 **항상 세션 클라이언트로만** 이 함수를 부른다.
 *    세션 경로의 보호막은 RLS(profiles_select_own·daily_fortunes_select_own) 그대로다.
 */

import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { calculateManse } from '@/lib/domain/saju/manse'
import { saveAnalysisHistoryObserved } from '@/app/actions/user/history'
import { logger } from '@/lib/utils/logger'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { getShrineEffects } from '@/lib/services/shrine-effects'
import { MODEL_FLASH } from '@/lib/config/ai-models'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export type TargetType = 'USER' | 'FAMILY'

/**
 * 어느 권한으로 읽고 쓸지.
 * - 'session': 로그인한 본인 요청. RLS 가 본인 것만 통과시킨다.
 * - 'admin'  : 세션이 없는 서버 맥락(크론·어드민 일괄). RLS 를 우회하므로 **대상 선정은 호출자 책임**이다.
 */
export type FortuneReader = 'session' | 'admin'

export interface DailyFortuneResult {
  success: boolean
  content?: string
  cached?: boolean
  error?: string
}

export interface GenerateDailyFortuneOptions {
  reader?: FortuneReader
  dateStr?: string
  force?: boolean
  /**
   * analysis_history 에도 남길지. 기본 true(사용자 요청).
   * 🔴 크론은 false — 기록 저장은 `auth.getUser()` 로 본인을 찾는 세션 전용 경로다.
   *    세션 없이 부르면 매 건 실패 로그만 쌓인다.
   */
  saveHistory?: boolean
}

async function readerClient(reader: FortuneReader) {
  return reader === 'admin' ? createAdminClient() : await createClient()
}

export async function generateDailyFortuneCore(
  userId: string,
  targetId: string,
  type: TargetType = 'USER',
  options: GenerateDailyFortuneOptions = {}
): Promise<DailyFortuneResult> {
  const { reader = 'session', dateStr, force = false, saveHistory = true } = options

  const supabase = await readerClient(reader)
  const targetDate = dateStr || new Date().toISOString().split('T')[0]

  // 1. 캐시 — (user_id, target_id, date) 하루 한 건
  const { data: existing } = await supabase
    .from('daily_fortunes')
    .select('*')
    .eq('user_id', userId)
    .eq('target_id', targetId)
    .eq('date', targetDate)
    .maybeSingle()

  if (force && existing) {
    await supabase.from('daily_fortunes').delete().eq('id', existing.id)
  } else if (existing) {
    return { success: true, content: existing.content, cached: true }
  }

  // 2. 대상 명식 정보
  let name, gender, birthDate, birthTime

  if (type === 'USER') {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetId).single()
    if (!profile || !profile.birth_date) return { success: false, error: '생년월일 정보가 필요합니다.' }
    name = profile.full_name
    gender = profile.gender
    birthDate = profile.birth_date
    birthTime = profile.birth_time
  } else {
    const { data: member } = await supabase.from('family_members').select('*').eq('id', targetId).single()
    if (!member || !member.birth_date) return { success: false, error: '가족의 생년월일 정보가 필요합니다.' }
    name = member.name
    gender = member.gender
    birthDate = member.birth_date
    birthTime = member.birth_time
  }

  // 3. 만세력
  const manseElement = calculateManse(birthDate, birthTime || '00:00')
  const sajuStr = `${manseElement.year.gan}${manseElement.year.ji}년 ${manseElement.month.gan}${manseElement.month.ji}월 ${manseElement.day.gan}${manseElement.day.ji}일 ${manseElement.time.gan}${manseElement.time.ji}시`

  // 4. 프롬프트 — 폴백 없음(정본은 DB)
  let promptData = null
  let fetchError = null

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('ai_prompts')
        .select('template')
        .ilike('key', 'daily_fortune')
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

  if (!promptData) {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('template')
        .ilike('key', 'daily_fortune')
        .maybeSingle()

      if (data) promptData = data
      if (error) fetchError += ' | Standard Error: ' + error.message
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      fetchError += ' | Standard Exception: ' + message
    }
  }

  if (!promptData || !promptData.template) {
    logger.error('CRITICAL: Daily Fortune Prompt NOT FOUND in DB.')
    return {
      success: false,
      error: `시스템 설정 오류: 관리자 프롬프트를 불러올 수 없습니다. (관리자에게 문의하세요) \nDebug: ${fetchError}`,
    }
  }

  let prompt = promptData.template
    .replace('{{date}}', targetDate)
    .replace('{{name}}', name || '사용자')
    .replace('{{gender}}', gender === 'male' ? '남성' : '여성')
    .replace('{{birthDate}}', birthDate)
    .replace('{{birthTime}}', birthTime || '알 수 없음')
    .replace('{{saju}}', sajuStr)

  // ⚡ 배치 효험: 초롱(lucky_hour)을 신당에 모시면 '행운의 시간' 한 줄이 더해진다.
  const effects = await getShrineEffects(userId)
  if (effects.luckyHour) {
    prompt +=
      '\n\n[초롱의 효험] 마지막에 "🏮 행운의 시간: HH시~HH시" 형식으로 오늘 가장 길한 시간대 한 줄을 덧붙이십시오. 사주의 용신·일진과 어울리는 시간대로 고르고, 왜 그 시간인지 짧게 한 문장 덧붙이십시오.'
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_FLASH })
    const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
      userId: userId,
      model: MODEL_FLASH,
      actionType: 'daily_fortune',
    })
    const text = result.response.text()

    const { error: saveError } = await supabase.from('daily_fortunes').insert({
      user_id: userId,
      target_id: targetId,
      date: targetDate,
      content: text,
    })

    if (saveError) {
      logger.error('Failed to save fortune:', saveError)
    }

    if (saveHistory) {
      try {
        await saveAnalysisHistoryObserved({
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
    }

    return { success: true, content: text, cached: false }
  } catch (error) {
    logger.error('AI Generation Error:', error)
    const message = error instanceof Error ? error.message : 'AI generation failed'
    return { success: false, error: message }
  }
}
