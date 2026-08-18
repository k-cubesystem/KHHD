import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

// 🔴 액션 목록·우리말 라벨은 lib/admin/audit-labels.ts 단일 출처. 여기서 다시 정의하지 않는다.
import type { AdminAuditAction } from '@/lib/admin/audit-labels'
export type { AdminAuditAction }

interface LogAdminActionInput {
  actorId: string
  actorEmail?: string | null
  action: AdminAuditAction
  targetUser?: string | null
  detail?: Record<string, unknown>
}

/**
 * 관리자 조작 감사 기록 — 서버 내부 전용(재화·권한 변경 후 호출).
 * 실패해도 본 작업은 성공 처리(감사 기록은 부가) — 다만 반드시 로깅한다.
 */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('admin_audit_log').insert({
      actor_id: input.actorId,
      actor_email: input.actorEmail ?? null,
      action: input.action,
      target_user: input.targetUser ?? null,
      detail: input.detail ?? {},
    })
    if (error) logger.error('[audit] log failed:', error)
  } catch (e) {
    logger.error('[audit] log exception:', e)
  }
}
