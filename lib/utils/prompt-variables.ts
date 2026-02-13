import { createClient } from '@/lib/supabase/server'

/**
 * DB에서 프롬프트를 가져와 변수를 치환
 * @param key - ai_prompts 테이블의 key
 * @param variables - 치환할 변수 맵 {변수명: 값}
 */
export async function getPromptWithVariables(
  key: string,
  variables: Record<string, string>
): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_prompts')
    .select('template')
    .eq('key', key)
    .single()

  if (error || !data?.template) {
    throw new Error(`프롬프트를 찾을 수 없습니다: ${key}`)
  }

  let prompt = data.template

  // 변수 치환 {{variable}} → value
  for (const [k, v] of Object.entries(variables)) {
    const regex = new RegExp(`{{${k}}}`, 'g')
    prompt = prompt.replace(regex, v || '정보 없음')
  }

  return prompt
}
