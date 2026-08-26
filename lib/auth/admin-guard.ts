import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/supabase/helpers'

/**
 * 어드민 서버액션의 단일 관문.
 *
 * `'use server'` 파일에서 export된 함수는 전부 공개 HTTP 엔드포인트이고,
 * `createAdminClient()`는 service_role이라 RLS를 통째로 우회한다.
 * 즉 「권한 검사 없이 createAdminClient()를 부르는 것」 = 「그 기능을 전 세계에 공개하는 것」이다.
 *
 * 어드민 액션은 createAdminClient()를 직접 부르지 말고 반드시 이 파일을 경유한다.
 * 검사를 건너뛰려면 함수를 안 쓰는 수밖에 없도록, 관문이 클라이언트를 «돌려주는» 형태로 만들었다.
 */

export const ADMIN_FORBIDDEN = '관리자 권한이 필요합니다.'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  return (await getUserRole(supabase, user.id)) === 'admin'
}

/** 관리자면 service_role 클라이언트를 반환, 아니면 throw. (throw 기반 액션용) */
export async function requireAdminClient(): Promise<SupabaseClient> {
  if (!(await isAdmin())) throw new Error(ADMIN_FORBIDDEN)
  return createAdminClient()
}

/** 관리자면 클라이언트를, 아니면 에러 문자열을 반환. (`{ success, error }` 반환 액션용) */
export async function adminClientOrError(): Promise<
  { ok: true; client: SupabaseClient } | { ok: false; error: string }
> {
  if (!(await isAdmin())) return { ok: false, error: ADMIN_FORBIDDEN }
  return { ok: true, client: createAdminClient() }
}

/** service_role이 필요 없는 곳에서 권한만 확인할 때. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error(ADMIN_FORBIDDEN)
}
