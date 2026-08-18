import { redirect } from 'next/navigation'
import { Headphones } from 'lucide-react'
import { getUserRole } from '@/lib/auth'
import { AdminPageHeader } from '@/components/admin/ui/page-header'
import { StatStrip, StatTile } from '@/components/admin/ui/stat-tile'
import { getAdminTickets, getTicketCounts } from './actions'
import { SupportBoard } from './support-board'
import { isTicketFilter } from '@/lib/domain/support/ticket-status'

export const dynamic = 'force-dynamic'

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  if ((await getUserRole()) !== 'admin') redirect('/protected')

  const { filter } = await searchParams
  const active = filter && isTicketFilter(filter) ? filter : 'unresolved'

  const [counts, tickets] = await Promise.all([getTicketCounts(), getAdminTickets(active)])

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="문의 관리"
        description="고객이 남긴 문의와 답변. 답변을 달면 고객 화면에 빨간 점이 켜집니다."
        icon={<Headphones className="h-4 w-4 text-gold-500" aria-hidden />}
      />

      <StatStrip>
        <StatTile label="새 문의" value={counts.open} unit="건" tone={counts.open > 0 ? 'warn' : 'default'} />
        <StatTile label="답변함" value={counts.answered} unit="건" />
        <StatTile label="미해결" value={counts.unresolved} unit="건" tone="accent" hint="새 문의 + 답변함" />
        <StatTile label="해결" value={counts.resolved} unit="건" />
      </StatStrip>

      <SupportBoard tickets={tickets} activeFilter={active} />
    </div>
  )
}
