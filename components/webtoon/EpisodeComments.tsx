'use client'

/**
 * 회차 댓글 — **공개** 표다. 사연(StoryForm)과 규율이 정반대라 한 화면에 섞이지 않게 파일도 나눈다.
 *
 * ⚠️ 작성자는 **공개 이름 하나**로만 뜬다(서버가 user_id 를 내려보내지 않는다).
 * ⚠️ 지우기는 소프트 삭제이고 권한 판정은 서버가 다시 한다 — 여기 `mine` 은 버튼을 그릴지에만 쓴다.
 */

import { useCallback, useState } from 'react'
import { Loader2, MessageSquare, Trash2, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { addComment, removeComment, reportComment, type WebtoonComment } from '@/app/actions/webtoon/webtoon'
import {
  REPORT_DONE_LINE,
  REPORT_NOTICE,
  REPORT_REASONS,
  REPORT_REASON_INFO,
  type ReportReason,
} from '@/lib/domain/webtoon/report'
import {
  COMMENT_EMPTY_LINE,
  COMMENT_MAX,
  COMMENT_PUBLIC_NOTICE,
  displayName,
  timeAgo,
  validateComment,
} from '@/lib/domain/webtoon/comment'
import { trackEvent } from '@/lib/analytics/ga4'

const ERROR_MSG: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요합니다',
  RATE_LIMITED: '잠시 뒤 다시 남겨 주세요',
  TOO_MANY: '이 화에 남기실 수 있는 댓글을 다 쓰셨습니다',
  NOT_FOUND: '회차를 찾지 못했습니다',
  ALREADY: '이미 신고하신 댓글입니다',
  INVALID: '신고 사유를 골라 주세요',
  FAILED: '남기지 못했습니다 — 잠시 뒤 다시 시도해 주세요',
}

export function EpisodeComments({
  episodeId,
  initial,
  /** 서버가 렌더한 시각 — 'n분 전' 계산의 기준. 클라 시계를 쓰면 SSR 과 어긋난다 */
  nowMs,
}: {
  episodeId: string
  initial: WebtoonComment[]
  nowMs: number
}) {
  const [items, setItems] = useState<WebtoonComment[]>(initial)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  /** 신고 창을 연 댓글 id — 한 번에 하나만 연다 */
  const [reporting, setReporting] = useState<string | null>(null)

  const issue = validateComment(body)

  const onSend = useCallback(async () => {
    setBusy(true)
    const res = await addComment(episodeId, body)
    setBusy(false)
    if (!res.success) {
      toast.error(res.message ?? ERROR_MSG[res.error ?? 'FAILED'] ?? '남기지 못했습니다')
      return
    }
    trackEvent({ action: 'webtoon_comment', category: 'webtoon', label: episodeId })
    // 낙관 반영 — 서버가 이미 받았고, 새로고침하면 정본으로 맞춰진다
    setItems((prev) => [
      {
        id: `local-${prev.length}-${body.length}`,
        body: body.trim(),
        authorName: null,
        mine: true,
        createdAt: new Date(nowMs).toISOString(),
      },
      ...prev,
    ])
    setBody('')
  }, [episodeId, body, nowMs])

  const onReport = useCallback(async (id: string, reason: ReportReason) => {
    setBusy(true)
    const res = await reportComment(id, reason)
    setBusy(false)
    setReporting(null)
    if (!res.success) {
      toast.error(ERROR_MSG[res.error ?? 'FAILED'] ?? '신고하지 못했습니다')
      return
    }
    toast.success(REPORT_DONE_LINE)
  }, [])

  const onRemove = useCallback(async (id: string) => {
    setBusy(true)
    const res = await removeComment(id)
    setBusy(false)
    if (!res.success) {
      toast.error(ERROR_MSG[res.error ?? 'FAILED'] ?? '지우지 못했습니다')
      return
    }
    setItems((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return (
    <section className="rounded-2xl border border-white/10 p-4" style={{ background: '#16140F' }}>
      <div className="flex items-baseline gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-gold-300/70" />
        <p className="font-serif text-[13px] font-bold text-gold-200">댓글 {items.length}</p>
      </div>

      <div className="mt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, COMMENT_MAX))}
          maxLength={COMMENT_MAX}
          rows={3}
          aria-label="댓글 입력"
          placeholder="이 화를 보고 든 생각을 남겨 주세요"
          className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-sans text-[13px] leading-relaxed text-ink-primary placeholder:text-ink-primary/25 focus:border-gold-500/40 focus:outline-none"
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="font-sans text-[10.5px] text-gold-500/60">🔓 {COMMENT_PUBLIC_NOTICE}</p>
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={issue !== null || busy}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gold-500/45 bg-gold-500/15 px-4 py-2 font-serif text-[12px] font-bold text-gold-200 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            남기기
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 py-6 text-center font-sans text-[12px] text-ink-primary/35">{COMMENT_EMPTY_LINE}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/[0.06]">
          {items.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-[12px] font-bold text-ink-primary/75">
                  {displayName(c.authorName)}
                </span>
                <span className="font-sans text-[10.5px] text-ink-primary/35">
                  {timeAgo(Date.parse(c.createdAt), nowMs)}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {/* 신고 — 남의 댓글에만. 내 글을 신고할 일은 없고, 버튼이 있으면 오조작만 는다 */}
                  {!c.mine && (
                    <button
                      type="button"
                      onClick={() => setReporting((v) => (v === c.id ? null : c.id))}
                      aria-label="이 댓글 신고하기"
                      aria-expanded={reporting === c.id}
                      className="text-ink-primary/25 hover:text-ink-primary/60"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {c.mine && (
                    <button
                      type="button"
                      onClick={() => void onRemove(c.id)}
                      aria-label="내 댓글 지우기"
                      className="text-ink-primary/30 hover:text-ink-primary/60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed text-ink-primary/70">
                {c.body}
              </p>
              {reporting === c.id && (
                <div className="mt-2 rounded-xl border border-white/10 bg-black/25 p-2.5">
                  <p className="mb-2 font-sans text-[10.5px] text-ink-primary/40">{REPORT_NOTICE}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {REPORT_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => void onReport(c.id, r)}
                        disabled={busy}
                        title={REPORT_REASON_INFO[r].gloss}
                        className="rounded-full border border-white/10 bg-surface/50 px-2.5 py-1 font-sans text-[11px] text-ink-primary/60 disabled:opacity-40"
                      >
                        {REPORT_REASON_INFO[r].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
