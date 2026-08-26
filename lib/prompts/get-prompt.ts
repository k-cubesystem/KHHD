import { createAdminClient } from '@/lib/supabase/admin'

/**
 * ai_prompts에서 템플릿 하나를 읽는다.
 *
 * 일반 유저의 풀이 생성 경로(app/actions/ai/image.ts 등)에서 호출되므로 관리자 관문을 두지 않는다.
 * 대신 `'use server'` 파일 밖에 둔다 — 어드민 액션 파일에 있던 시절에는 export 자체가
 * 공개 엔드포인트라 누구나 프롬프트 원문을 조회할 수 있었다.
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
