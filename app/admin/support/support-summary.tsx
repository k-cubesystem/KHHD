import Link from 'next/link'
import { ChevronRight, Headphones } from 'lucide-react'
import { AdminCard } from '@/components/admin/ui/admin-card'
import { getAdminTickets, getTicketCounts } from './actions'
import { describeTicketCategory, describeTicketStatus } from '@/lib/domain/support/ticket-status'

/**
 * 대시보드 첫 화면의 문의 요약 — **손이 필요한 것부터 보여준다.**
 *
 * 🔴 전체 목록을 여기 깔지 않는다. 대시보드는 «오늘 뭘 해야 하나» 를 묻는 화면이라
 *    미해결 몇 건인지와 최근 것 몇 줄이면 충분하다. 자세한 건 문의 관리로 넘긴다.
 */
export async function SupportSummary() {
  const [counts, recent] = await Promise.all([getTicketCounts(), getAdminTickets('unresolved')])
  const top = recent.slice(0, 4)

  return (
    <AdminCard
      title="문의"
      subtitle={
        counts.unresolved > 0
          ? `손이 필요한 문의 ${counts.unresolved}건 (새 문의 ${counts.open} · 답변함 ${counts.answered})`
          : '미해결 문의가 없습니다.'
      }
      icon={<Headphones className="h-3.5 w-3.5 text-gold-500" aria-hidden />}
      tone={counts.open > 0 ? 'accent' : 'default'}
      action={
        <Link
          href="/admin/support"
          className="inline-flex min-h-[36px] items-center gap-0.5 rounded-lg border border-white/[0.08] px-2.5 font-sans text-[11.5px] text-ink-primary/60 transition-colors hover:text-ink-primary"
        >
          전체 보기
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }
    >
      {top.length === 0 ? (
        <p className="py-3 font-sans text-[12px] text-ink-primary/35">지금은 답변할 문의가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {top.map((t) => {
            const meta = describeTicketStatus(t.status)
            return (
              <li key={t.id}>
                <Link
                  href="/admin/support"
                  className="flex min-h-[44px] items-center gap-2.5 py-2 transition-colors hover:opacity-80"
                >
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 font-sans text-[10px] ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-sans text-[12.5px] text-ink-primary/85">
                    {t.subject}
                  </span>
                  <span className="shrink-0 font-sans text-[10.5px] text-ink-primary/35">
                    {describeTicketCategory(t.category)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </AdminCard>
  )
}
