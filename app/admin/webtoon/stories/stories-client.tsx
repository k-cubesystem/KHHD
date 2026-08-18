'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EyeOff, Loader2, Mail, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STORY_REPLY_MAX, STORY_STATUS_LABEL, type StoryStatus } from '@/lib/domain/webtoon/story'
import { setCommentHidden, updateStory, type AdminCommentRow, type AdminStoryRow } from '@/app/actions/admin/webtoon'

/**
 * 사연 운영 화면.
 *
 * ⚠️ 연락처는 **접어 둔다**. 이 표의 규율은 "접수 확인 화면조차 되보여 주지 않는다"인데,
 *    운영 화면이라고 목록에 전화번호를 늘어놓으면 어깨너머로 읽히는 건 똑같다. 펼치는 건 한 번에 하나.
 */

const STATUS_ORDER: readonly StoryStatus[] = ['received', 'reviewing', 'selected', 'declined']

const STATUS_TONE: Readonly<Record<StoryStatus, string>> = {
  received: 'border-white/[0.06] text-ink-light/45',
  reviewing: 'border-sky-500/40 text-sky-300 bg-sky-900/20',
  selected: 'border-emerald-500/40 text-emerald-300 bg-emerald-900/20',
  declined: 'border-white/[0.06] text-ink-light/35',
}

export function WebtoonStoriesClient({
  initialStories,
  initialHidden,
}: {
  initialStories: AdminStoryRow[]
  initialHidden: AdminCommentRow[]
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [showContact, setShowContact] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { status: StoryStatus; replyNote: string }>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const draftOf = (row: AdminStoryRow) => drafts[row.id] ?? { status: row.status, replyNote: row.replyNote ?? '' }

  const save = async (row: AdminStoryRow) => {
    const d = draftOf(row)
    setBusyId(row.id)
    const res = await updateStory({ id: row.id, status: d.status, replyNote: d.replyNote })
    setBusyId(null)
    if (!res.success) {
      toast.error(res.message ?? '저장하지 못했습니다')
      return
    }
    toast.success(d.replyNote.trim() ? '상태와 회신을 저장했습니다' : '상태를 저장했습니다')
    router.refresh()
  }

  const unhide = async (row: AdminCommentRow) => {
    setBusyId(row.id)
    const res = await setCommentHidden(row.id, false)
    setBusyId(null)
    if (!res.success) {
      toast.error('되돌리지 못했습니다')
      return
    }
    toast.success('다시 보이게 했습니다')
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-gold-300">
          <ScrollText className="w-4 h-4" /> 접수 {initialStories.length}건
        </p>
        <div className="rounded-xl border border-primary/15 divide-y divide-primary/10 overflow-hidden">
          {initialStories.length === 0 && (
            <p className="p-6 text-center text-xs text-ink-light/40">아직 접수된 사연이 없습니다.</p>
          )}
          {initialStories.map((row) => {
            const open = openId === row.id
            const d = draftOf(row)
            return (
              <div key={row.id} className="p-4">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : row.id)}
                  className="flex w-full items-start gap-2 text-left"
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${STATUS_TONE[row.status]}`}>
                        {STORY_STATUS_LABEL[row.status]}
                      </span>
                      {row.replyNote && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-gold-500/35 text-gold-300">
                          회신함
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-sm font-bold text-ink-light">{row.title}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-light/35">
                      {new Date(row.createdAt).toLocaleString('ko-KR')} 접수 · {row.body.length}자
                    </span>
                  </span>
                </button>

                {open && (
                  <div className="mt-3 space-y-3">
                    <p className="whitespace-pre-wrap rounded-lg border border-primary/15 bg-background/40 p-3 text-[12.5px] leading-relaxed text-ink-light/80">
                      {row.body}
                    </p>

                    <div className="rounded-lg border border-primary/15 bg-background/30 p-3">
                      {showContact === row.id ? (
                        <div className="space-y-1 text-[12px] text-ink-light/75">
                          <p>성함 : {row.contactName}</p>
                          <p>연락처 : {row.contactPhone}</p>
                          <p>카카오 : {row.contactKakao ?? '—'}</p>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowContact(row.id)}
                          className="h-7 px-2.5 text-[11px] border-primary/25"
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          연락처 보기
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_ORDER.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setDrafts({ ...drafts, [row.id]: { ...d, status: s } })}
                          className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
                            d.status === s
                              ? 'border-gold-500/45 bg-gold-500/[0.1] text-gold-200 font-bold'
                              : 'border-primary/20 text-ink-light/50'
                          }`}
                        >
                          {STORY_STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={d.replyNote}
                      onChange={(e) => setDrafts({ ...drafts, [row.id]: { ...d, replyNote: e.target.value } })}
                      maxLength={STORY_REPLY_MAX}
                      rows={3}
                      placeholder={`회신 한마디 (${STORY_REPLY_MAX}자 이내) — 접수하신 분의 화면에 그대로 보입니다`}
                      className="w-full resize-none rounded-lg border border-primary/20 bg-background/60 px-3 py-2 text-sm text-ink-light outline-none focus:border-primary/50"
                    />

                    <Button
                      onClick={() => void save(row)}
                      disabled={busyId === row.id}
                      className="w-full bg-primary text-background"
                    >
                      {busyId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '상태·회신 저장'}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-gold-300">
          <EyeOff className="w-4 h-4" /> 가려진 댓글 {initialHidden.length}건
        </p>
        <p className="text-[11px] text-ink-light/45">
          신고가 쌓이면 자동으로 가려집니다. 지워진 것이 아니라 가려진 것이라, 사람이 보고 되돌릴 수 있습니다.
        </p>
        <div className="rounded-xl border border-primary/15 divide-y divide-primary/10 overflow-hidden">
          {initialHidden.length === 0 && (
            <p className="p-6 text-center text-xs text-ink-light/40">가려진 댓글이 없습니다.</p>
          )}
          {initialHidden.map((row) => (
            <div key={row.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-ink-light/35">
                  {row.episodeNo < 0 ? '회차 미상' : row.episodeNo === 0 ? '예고편' : `${row.episodeNo}화`} · 신고{' '}
                  {row.reportCount}건
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[12.5px] text-ink-light/75">{row.body}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === row.id}
                onClick={() => void unhide(row)}
                className="h-7 shrink-0 px-2.5 text-[11px] border-primary/25"
              >
                되돌리기
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
