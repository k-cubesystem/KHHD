import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth'

/**
 * 어드민 조작의 **공통 관문** — 권한을 확인하고, 감사에 남길 «누가» 를 함께 돌려준다.
 *
 * ## 🔴 왜 공용으로 뺐나
 * 이 함수가 `app/admin/users/actions.ts` 안에만 있어서 다른 어드민 화면은 쓸 수가 없었다.
 * 그 결과 **감사 기록을 남기는 화면이 회원 관리 하나뿐**이었고, 복채 지급·가격 편집·전체 차단
 * 같은 조작이 흔적 없이 돌았다(2026-08-17 실측 — `admin_audit_log` 0행).
 *
 * 🔴 새 어드민 변경 조작은 이 관문을 지나고, 성공 뒤 `logAdminAction` 을 부른다.
 *    권한 검사만 하고 기록을 안 남기면 «누가 언제 무엇을 바꿨는지» 를 영원히 알 수 없다.
 *
 * 🔴 `role === 'admin'` 검사를 화면마다 새로 흩뿌리지 않는다 — 마스터 권한 기준이 갈라진다.
 */
export type AdminGuard =
  | { authorized: true; actorId: string; actorEmail: string | null }
  | { authorized: false; error: string }

export async function requireAdmin(): Promise<AdminGuard> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { authorized: false, error: '로그인이 필요합니다.' }

  const role = await getUserRole()
  if (role !== 'admin') {
    return { authorized: false, error: '관리자 권한이 필요합니다.' }
  }
  return { authorized: true, actorId: user.id, actorEmail: user.email ?? null }
}
