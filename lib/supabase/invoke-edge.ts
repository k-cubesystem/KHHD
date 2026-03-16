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
 * 제네릭 타입으로 호출 측에서 반환 타입을 지정할 수 있음
 * Edge가 활성화되면 Edge Function이 동일한 형태의 응답을 반환함
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function invokeEdgeSafe<T = any>(functionName: string, body: Record<string, unknown>): Promise<T> {
  try {
    const result = await invokeEdge<T>(functionName, body)
    return result
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.'
    return { success: false, error: message } as T
  }
}
