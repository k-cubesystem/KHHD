/**
 * 해화지기 마스터 프롬프트 빌더 (서버 전용 - 서버 액션에서 dynamic import로 사용)
 * buildSajuContext() + DB 마스터 프롬프트 → 완성된 AI 프롬프트
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { buildSajuContext, getAnalysisTypeGuide, type PersonInfo, type AnalysisType } from './context-builder'

/**
 * DB에서 haehwajigi_master 프롬프트 로드
 */
async function loadMasterPrompt(): Promise<string> {
  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase.from('ai_prompts').select('template').eq('key', 'haehwajigi_master').single()
    if (data?.template) return data.template
  } catch (e) {
    console.warn('[MasterPromptBuilder] DB load failed, using fallback:', e)
  }
  // Fallback
  return `당신은 청담해화당의 수석 명리 상담가 '해화지기'입니다.
[분석 유형: {{analysisType}}]
{{sajuContext}}
{{userContext}}
{{additionalContext}}
{{analysisGuide}}`
}

/**
 * 사용자 프로필 컨텍스트 텍스트 생성
 */
export function buildUserContextText(profile: Record<string, string | null> | null): string {
  if (!profile) return '[사용자 프로필: 미입력]'
  const activityGuide: Record<string, string> = {
    active: '적극적 실행형 - 구체적 행동 지침 위주',
    passive: '소극적 관망형 - 심리적 위로와 단계적 접근',
    moderate: '보통 - 균형잡힌 조언',
  }
  return `[내담자 프로필]
직업: ${profile.job || '미입력'}
관심사/고민: ${profile.focus_areas || '미입력'}
활동 성향: ${activityGuide[profile.activity_status as string] || '보통'}
결혼 상태: ${profile.marital_status || '미입력'}
인생 철학: ${profile.life_philosophy || '미입력'}`
}

export interface MasterPromptResult {
  prompt: string
  sajuContext: ReturnType<typeof buildSajuContext>
}

/**
 * 메인: 완성된 AI 프롬프트 조립
 * @param person 대상 인물 정보
 * @param analysisType 분석 유형
 * @param userContext 사용자 프로필 텍스트
 * @param additionalContext 추가 컨텍스트 (궁합 상대방 정보 등)
 * @param outputFormatGuide JSON 출력 형식 지시문 (JSON 파싱이 필요한 경우)
 */
export async function buildMasterPromptForAction(
  person: PersonInfo,
  analysisType: AnalysisType,
  userContext: string = '',
  additionalContext: string = '',
  outputFormatGuide: string = ''
): Promise<MasterPromptResult> {
  const [masterTemplate, sajuCtx] = await Promise.all([loadMasterPrompt(), Promise.resolve(buildSajuContext(person))])

  const analysisGuide = getAnalysisTypeGuide(analysisType) + '\n\n' + outputFormatGuide

  const prompt = masterTemplate
    .replace(/{{analysisType}}/g, analysisType)
    .replace(/{{sajuContext}}/g, sajuCtx.promptContext)
    .replace(/{{userContext}}/g, userContext || '[프로필 없음]')
    .replace(/{{additionalContext}}/g, additionalContext || '')
    .replace(/{{analysisGuide}}/g, analysisGuide)

  return { prompt, sajuContext: sajuCtx }
}
