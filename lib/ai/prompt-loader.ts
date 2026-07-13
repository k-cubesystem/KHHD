import { createAdminClient } from '@/lib/supabase/admin'

/**
 * ai_prompts 테이블에서 프롬프트 템플릿을 로드 (admin client — RLS 우회, 서버 전용).
 * 어드민 프롬프트 관리 UI 폐지(2026-07-13) 후 프로덕션 AI 액션들의 유일한 공용 로더.
 * 실패 시 null 반환 → 호출부의 하드코딩 폴백 프롬프트 사용.
 */
export async function getPromptByKey(key: string): Promise<string | null> {
  try {
    const dbClient = createAdminClient()
    const { data, error } = await dbClient.from('ai_prompts').select('template').eq('key', key).single()

    if (error || !data) return null
    return data.template as string
  } catch {
    return null
  }
}
