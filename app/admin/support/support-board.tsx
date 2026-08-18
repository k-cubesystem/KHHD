'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, CornerDownRight, Loader2, RotateCcw, Send } from 'lucide-react'
import { AdminCard } from '@/components/admin/ui/admin-card'
import { Button } from '@/components/ui/button'
import {
  TICKET_FILTERS,
  TICKET_FILTER_LABEL,
  describeTicketCategory,
  describeTicketStatus,
  type TicketFilter,
} from '@/lib/domain/support/ticket-status'
import { getTicketReplies, replyToTicket, setTicketResolved, type AdminTicket } from './actions'

type Reply = { id: string; body: string; is_admin: boolean; created_at: string }

/**
 * CS 게시판 — 목록은 훑고, 대화는 펼쳐서 본다.
 *
 * 🔴 답변 내용을 목록에 미리 다 깔지 않는다. 문의는 길고, 운영자는 «지금 손이 필요한 것» 부터
 *    고른다. 펼칠 때 그 글의 대화만 가져온다(목록 200건을 미리 다 끌면 느리고 안 읽힌다).
 */
export function SupportBoard({ tickets, activeFilter }: { tickets: AdminTicket[]; activeFilter: TicketFilter }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [threads, setThreads] = useState<Record<string, Reply[]>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const openThread = async (id: string) => {
    if (threads[id]) return
    setLoading(id)
    const replies = await getTicketReplies(id)
    setThreads((prev) => ({ ...prev, [id]: replies }))
    setLoading(null)
  }

  const send = (id: string) => {
    const body = (drafts[id] ?? '').trim()
    if (body.length < 2) {
      toast.error('답변 내용을 적어주세요.')
      return
    }
    startTransition(async () => {
      const result = await replyToTicket(id, body)
      if (!result.success) {
        toast.error(result.error ?? '답변을 등록하지 못했습니다.')
        return
      }
      setDrafts((prev) => ({ ...prev, [id]: '' }))
      setThreads((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.success('답변을 보냈습니다.')
      router.refresh()
    })
  }

  const toggleResolved = (id: string, resolved: boolean) => {
    startTransition(async () => {
      const result = await setTicketResolved(id, resolved)
      if (!result.success) {
        toast.error(result.error ?? '상태를 바꾸지 못했습니다.')
        return
      }
      toast.success(resolved ? '해결로 표시했습니다.' : '다시 열었습니다.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* 필터 — 「미해결」이 기본이다. 운영자가 가장 자주 보는 묶음이라서. */}
      <nav className="flex flex-wrap gap-1.5" aria-label="문의 상태 필터">
        {TICKET_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => router.push(`/admin/support?filter=${f}`)}
            aria-current={f === activeFilter ? 'page' : undefined}
            className={`min-h-[36px] rounded-lg border px-3 font-sans text-[12px] transition-colors ${
              f === activeFilter
                ? 'border-gold-500/40 bg-gold-500/[0.12] text-gold-500'
                : 'border-white/[0.08] bg-surface/60 text-ink-primary/50 hover:text-ink-primary/80'
            }`}
          >
            {TICKET_FILTER_LABEL[f]}
          </button>
        ))}
      </nav>

      {tickets.length === 0 ? (
        <AdminCard>
          <p className="py-8 text-center font-sans text-[12.5px] text-ink-primary/40">이 상태의 문의가 없습니다.</p>
        </AdminCard>
      ) : (
        tickets.map((t) => {
          const meta = describeTicketStatus(t.status)
          const thread = threads[t.id]
          return (
            <AdminCard
              key={t.id}
              title={t.subject}
              subtitle={`${describeTicketCategory(t.category)} · ${t.user_email ?? '알 수 없는 회원'} · ${new Date(
                t.created_at
              ).toLocaleString('ko-KR')}${t.reply_count > 0 ? ` · 답변 ${t.reply_count}` : ''}`}
              action={
                <span className={`rounded-full border px-2 py-0.5 font-sans text-[10.5px] font-bold ${meta.cls}`}>
                  {meta.label}
                </span>
              }
              detailsLabel={thread ? '대화 접기' : '대화 보기'}
              details={
                <div className="space-y-3" onFocus={() => openThread(t.id)}>
                  <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                    <p className="whitespace-pre-wrap break-words">{t.body}</p>
                  </div>

                  {loading === t.id && (
                    <p className="flex items-center gap-1.5 text-ink-primary/40">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> 불러오는 중
                    </p>
                  )}

                  {thread?.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-lg border p-3 ${
                        r.is_admin ? 'border-gold-500/20 bg-gold-500/[0.05]' : 'border-white/[0.06] bg-black/20'
                      }`}
                    >
                      <p className="mb-1 font-sans text-[10.5px] text-ink-primary/40">
                        {r.is_admin ? '해화당 답변' : '고객'} · {new Date(r.created_at).toLocaleString('ko-KR')}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{r.body}</p>
                    </div>
                  ))}

                  {!thread && loading !== t.id && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openThread(t.id)}
                      className="h-9 rounded-lg border-white/[0.08] font-sans text-[12px] text-ink-primary/70"
                    >
                      <CornerDownRight className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      이전 대화 불러오기
                    </Button>
                  )}

                  <div className="space-y-2 pt-1">
                    <label htmlFor={`reply-${t.id}`} className="sr-only">
                      답변 내용
                    </label>
                    <textarea
                      id={`reply-${t.id}`}
                      rows={3}
                      value={drafts[t.id] ?? ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      onFocus={() => openThread(t.id)}
                      placeholder="답변을 적어주세요. 보내면 고객 화면에 빨간 점이 켜집니다."
                      className="w-full rounded-lg border border-white/[0.08] bg-black/25 p-3 font-sans text-[12.5px] text-ink-primary placeholder:text-ink-primary/25 focus:border-gold-500/40 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => send(t.id)}
                        disabled={pending}
                        className="h-9 rounded-lg bg-primary font-sans text-[12px] font-bold text-background hover:bg-primary/90"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                        답변 보내기
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => toggleResolved(t.id, t.status !== 'RESOLVED')}
                        className="h-9 rounded-lg border-white/[0.08] font-sans text-[12px] text-ink-primary/70"
                      >
                        {t.status === 'RESOLVED' ? (
                          <>
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> 다시 열기
                          </>
                        ) : (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden /> 해결로 표시
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              }
            />
          )
        })
      )}
    </div>
  )
}
