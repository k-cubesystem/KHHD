import { createClient } from '@/lib/supabase/server'

/**
 * Edge Function 호출 공통 헬퍼
 * 서버 액션에서 Supabase Edge Function을 호출할 때 사용
 *
 * @param functionName - Edge Function 이름 (e.g., 'user', 'payment', 'ai-analysis')
 * @param body - 요청 바디 (action 필드 포함)
 * @returns Edge Function 응답 데이터
 */
export async function invokeEdge<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  const supabase = await createClient()

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  })

  if (error) {
    console.error(`[invokeEdge] ${functionName} error:`, error)
    throw new Error(error.message || `Edge Function ${functionName} 호출 실패`)
  }

  return data as T
}

/**
 * Edge Function 호출 (에러를 throw하지 않고 result 객체 반환)
 * 반환 타입은 any로 설정하여 기존 서버 액션의 반환 타입과 호환
 * Edge가 활성화되면 Edge Function이 동일한 형태의 응답을 반환함
 */

export async function invokeEdgeSafe(functionName: string, body: Record<string, unknown>): Promise<any> {
  try {
    const result = await invokeEdge(functionName, body)
    return result
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}
