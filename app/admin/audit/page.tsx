import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'
import { describeAuditAction } from '@/lib/admin/audit-labels'

export const dynamic = 'force-dynamic'

interface AuditRow {
  id: string
  actor_email: string | null
  action: string
  target_user: string | null
  detail: Record<string, unknown>
  created_at: string
}

function summarize(action: string, detail: Record<string, unknown>): string {
  switch (action) {
    case 'balance_adjust': {
      const d = Number(detail.delta) || 0
      return `${Number(detail.before) ?? '?'} → ${Number(detail.after) ?? '?'}만냥 (${d > 0 ? '+' : ''}${d.toLocaleString()}) · 사유: ${detail.reason ?? '-'}`
    }
    case 'role_change':
      return `${detail.before ?? '?'} → ${detail.after ?? '?'}`
    case 'subscription_change':
      return `등급: ${detail.tier ?? '-'}`
    case 'user_delete':
      return `${detail.email ?? detail.fullName ?? '알 수 없음'} (${detail.role ?? 'user'})`
    case 'talisman_grant':
      return `+${Number(detail.amount) || 0}만냥 · 사유: ${detail.reason ?? '-'}`
    case 'subscription_status_change':
      return `${detail.before ?? '?'} → ${detail.after ?? '?'}`
    case 'plan_toggle':
      return detail.after === true ? '판매 시작' : '판매 중지'
    case 'plan_update':
    case 'product_update': {
      const changed = (detail.changed ?? {}) as Record<string, { before?: unknown; after?: unknown }>
      const keys = Object.keys(changed)
      if (keys.length === 0) return JSON.stringify(detail.after ?? detail)
      return keys
        .map((k) => `${k}: ${String(changed[k]?.before ?? '-')} → ${String(changed[k]?.after ?? '-')}`)
        .join(' · ')
    }
    case 'notification_setting_change':
      return `${detail.key ?? '-'}: ${String(detail.before ?? '-')} → ${String(detail.after ?? '-')}`
    case 'service_toggle':
      return `${detail.key ?? '-'} ${detail.after === 'true' || detail.after === true ? '켬' : '끔'}`
    default:
      return JSON.stringify(detail)
  }
}

export default async function AdminAuditPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  if ((await getUserRole()) !== 'admin') redirect('/protected')

  const admin = createAdminClient()
  const { data } = await admin
    .from('admin_audit_log')
    .select('id, actor_email, action, target_user, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  const rows = (data ?? []) as AuditRow[]

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-black text-ink-primary font-serif flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-gold-500" /> 감사 로그
        </h1>
        <p className="text-xs md:text-sm text-ink-primary/40">
          관리자 조작 기록 — 복채·권한·구독·가격·알림 발송·서비스 스위치. 최근 100건.
        </p>
      </div>

      <Card className="relative p-0 bg-gradient-to-br from-surface/30 to-surface/20 border border-white/30 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-center py-12 text-sm text-ink-primary/40">기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-white/30">
            {rows.map((r) => {
              // 🔴 라벨은 lib/admin/audit-labels.ts 단일 출처 — 화면에서 다시 만들면 즉시 뒤처진다.
              const meta = describeAuditAction(r.action)
              return (
                <div key={r.id} className="p-3 md:p-4 flex items-start gap-3 hover:bg-surface/20 transition-colors">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap mt-0.5 ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-ink-primary/85 break-words">
                      {summarize(r.action, r.detail)}
                    </p>
                    <p className="text-[10px] text-ink-primary/40 mt-0.5">
                      {r.actor_email ?? '알 수 없는 관리자'}
                      {r.target_user ? ` · 대상 ${r.target_user.slice(0, 8)}…` : ''} ·{' '}
                      {new Date(r.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
