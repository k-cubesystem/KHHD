'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronDown, Loader2, MessageCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABEL,
  describeTicketCategory,
  describeTicketStatus,
} from '@/lib/domain/support/ticket-status'
import {
  addMyReply,
  createSupportTicket,
  getMyTicket,
  type SupportTicketDetail,
  type SupportTicketSummary,
} from '@/app/actions/support/tickets'

/**
 * 고객 문의 화면 — **본인 글과 그에 달린 답변만** 보인다(RLS 가 그렇게 돌려준다).
 *
 * 🔴 답변 알림은 **사이트 안 빨간 점**뿐이다. 메일·푸시를 약속하지 않는다 —
 *    SMTP·VAPID 가 지금 꺼져 있어서, 적어두면 지키지 못할 말이 된다.
 */
export function MySupport({ initialTickets }: { initialTickets: SupportTicketSummary[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [writing, setWriting] = useState(initialTickets.length === 0)
  const [form, setForm] = useState({ subject: '', body: '', category: 'ETC' })
  const [open, setOpen] = useState<Record<string, SupportTicketDetail | 'loading'>>({})
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})

  const submit = () => {
    startTransition(async () => {
      const result = await createSupportTicket(form)
      if (!result.success) {
        toast.error(result.error ?? '문의를 등록하지 못했습니다.')
        return
      }
      setForm({ subject: '', body: '', category: 'ETC' })
      setWriting(false)
      toast.success('문의를 남겼습니다. 답변이 달리면 여기에 표시됩니다.')
      router.refresh()
    })
  }

  const toggle = async (id: string) => {
    if (open[id]) {
      setOpen((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      return
    }
    setOpen((prev) => ({ ...prev, [id]: 'loading' }))
    const detail = await getMyTicket(id)
    if (!detail) {
      setOpen((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.error('문의를 불러오지 못했습니다.')
      return
    }
    setOpen((prev) => ({ ...prev, [id]: detail }))
    router.refresh() // 빨간 점 해제 반영
  }

  const sendReply = (id: string) => {
    startTransition(async () => {
      const result = await addMyReply(id, replyDraft[id] ?? '')
      if (!result.success) {
        toast.error(result.error ?? '등록하지 못했습니다.')
        return
      }
      setReplyDraft((prev) => ({ ...prev, [id]: '' }))
      setOpen((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.success('추가로 남겼습니다.')
      router.refresh()
    })
  }

  return (
    <div className="mx-auto w-full max-w-[480px] space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-serif text-lg font-bold text-ink-light">
          <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
          문의하기
        </h1>
        <p className="break-keep font-sans text-[12px] leading-relaxed text-ink-light/50">
          남기신 문의와 답변은 본인만 보실 수 있습니다. 답변이 달리면 이 화면에 표시됩니다.
        </p>
      </header>

      {writing ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-surface/60 p-4">
          <div className="flex flex-wrap gap-1.5">
            {TICKET_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: c }))}
                aria-pressed={form.category === c}
                className={`min-h-[36px] rounded-lg border px-3 font-sans text-[12px] transition-colors ${
                  form.category === c
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-white/10 text-ink-light/50 hover:text-ink-light/80'
                }`}
              >
                {TICKET_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="subject">
            제목
          </label>
          <input
            id="subject"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="제목"
            maxLength={120}
            className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 font-sans text-[13px] text-ink-light placeholder:text-ink-light/25 focus:border-primary/40 focus:outline-none"
          />

          <label className="sr-only" htmlFor="body">
            내용
          </label>
          <textarea
            id="body"
            rows={6}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="어떤 점이 불편하셨는지 편하게 적어주세요."
            maxLength={4000}
            className="w-full rounded-lg border border-white/10 bg-black/25 p-3 font-sans text-[13px] leading-relaxed text-ink-light placeholder:text-ink-light/25 focus:border-primary/40 focus:outline-none"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-11 flex-1 rounded-xl bg-primary font-serif font-bold text-background hover:bg-primary/90"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : '문의 남기기'}
            </Button>
            {initialTickets.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setWriting(false)}
                className="h-11 rounded-xl border-white/10 text-ink-light/70"
              >
                취소
              </Button>
            )}
          </div>
        </section>
      ) : (
        <Button
          type="button"
          onClick={() => setWriting(true)}
          className="h-11 w-full rounded-xl bg-primary font-serif font-bold text-background hover:bg-primary/90"
        >
          새 문의 남기기
        </Button>
      )}

      <div className="space-y-2">
        {initialTickets.length === 0 && !writing && (
          <p className="py-8 text-center font-sans text-[12.5px] text-ink-light/40">남기신 문의가 없습니다.</p>
        )}

        {initialTickets.map((t) => {
          const meta = describeTicketStatus(t.status)
          const detail = open[t.id]
          return (
            <section key={t.id} className="rounded-xl border border-white/10 bg-surface/50">
              <button
                type="button"
                onClick={() => toggle(t.id)}
                aria-expanded={Boolean(detail)}
                className="flex min-h-[56px] w-full items-center gap-2.5 px-4 py-3 text-left"
              >
                {t.has_unread_reply && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-seal" aria-label="새 답변" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-[13px] text-ink-light">{t.subject}</span>
                  <span className="mt-0.5 block font-sans text-[11px] text-ink-light/40">
                    {describeTicketCategory(t.category)} · {new Date(t.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 font-sans text-[10.5px] ${meta.cls}`}>
                  {meta.label}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-light/30 transition-transform ${detail ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {detail === 'loading' && (
                <p className="px-4 pb-4 font-sans text-[12px] text-ink-light/40">불러오는 중…</p>
              )}

              {detail && detail !== 'loading' && (
                <div className="space-y-2.5 border-t border-white/[0.06] px-4 py-3.5">
                  <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                    <p className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-relaxed text-ink-light/85">
                      {detail.body}
                    </p>
                  </div>

                  {detail.replies.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-lg border p-3 ${
                        r.is_admin ? 'border-primary/25 bg-primary/[0.06]' : 'border-white/[0.06] bg-black/20'
                      }`}
                    >
                      <p className="mb-1 font-sans text-[10.5px] text-ink-light/40">
                        {r.is_admin ? '해화당 답변' : '내가 남긴 말'} · {new Date(r.created_at).toLocaleString('ko-KR')}
                      </p>
                      <p className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-relaxed text-ink-light/85">
                        {r.body}
                      </p>
                    </div>
                  ))}

                  {detail.status !== 'RESOLVED' && (
                    <div className="space-y-2 pt-1">
                      <label className="sr-only" htmlFor={`myreply-${t.id}`}>
                        추가로 남길 말
                      </label>
                      <textarea
                        id={`myreply-${t.id}`}
                        rows={3}
                        value={replyDraft[t.id] ?? ''}
                        onChange={(e) => setReplyDraft((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        placeholder="더 하실 말씀이 있으면 적어주세요."
                        className="w-full rounded-lg border border-white/10 bg-black/25 p-3 font-sans text-[12.5px] text-ink-light placeholder:text-ink-light/25 focus:border-primary/40 focus:outline-none"
                      />
                      <Button
                        type="button"
                        onClick={() => sendReply(t.id)}
                        disabled={pending}
                        className="h-10 rounded-lg bg-primary/90 font-sans text-[12.5px] font-bold text-background hover:bg-primary"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                        남기기
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
