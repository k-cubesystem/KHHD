import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface AuditRow {
  id: string
  actor_email: string | null
  action: string
  target_user: string | null
  detail: Record<string, unknown>
  created_at: string
}

const ACTION_LABEL: Record<string, { label: string; cls: string }> = {
  balance_adjust: { label: '복채 조정', cls: 'bg-gold-500/10 text-gold-400 border-gold-500/20' },
  role_change: { label: '권한 변경', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  subscription_change: { label: '구독 변경', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  user_delete: { label: '회원 삭제', cls: 'bg-red-600/10 text-red-500 border-red-600/20' },
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
        <h1 className="text-xl md:text-2xl font-black text-stone-100 font-serif flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-gold-500" /> 감사 로그
        </h1>
        <p className="text-xs md:text-sm text-stone-500">
          관리자 조작(복채 조정·권한 변경·구독 변경·회원 삭제) 기록. 최근 100건.
        </p>
      </div>

      <Card className="relative p-0 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-center py-12 text-sm text-stone-500">기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-stone-700/30">
            {rows.map((r) => {
              const meta = ACTION_LABEL[r.action] ?? {
                label: r.action,
                cls: 'bg-stone-700/30 text-stone-400 border-stone-600/30',
              }
              return (
                <div key={r.id} className="p-3 md:p-4 flex items-start gap-3 hover:bg-stone-800/20 transition-colors">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap mt-0.5 ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-stone-200 break-words">{summarize(r.action, r.detail)}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
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
