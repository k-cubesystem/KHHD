'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  approveAndSendReply,
  approveDraft,
  createPost,
  createRound,
  drawNow,
  hideReplyAction,
  listWinners,
  publishWinnerResult,
  regenerateDraft,
  rejectDraft,
  rejectReply,
  setAutomationEnabled,
  setReplyClassification,
  setRoundStatus,
} from './actions'

type Status = Awaited<ReturnType<typeof import('./actions').getThreadsStatus>>
type Rounds = Extract<Awaited<ReturnType<typeof import('./actions').listRounds>>, { success: true }>['items']
type Queue = Extract<Awaited<ReturnType<typeof import('./actions').listReplyQueue>>, { success: true }>['items']
type Replies = Extract<Awaited<ReturnType<typeof import('./actions').listRecentReplies>>, { success: true }>['items']
type Posts = Extract<Awaited<ReturnType<typeof import('./actions').listPosts>>, { success: true }>['items']
type Winners = Extract<Awaited<ReturnType<typeof listWinners>>, { success: true }>['items']

const TOPICS = [
  ['saju', '사주 총운'],
  ['compatibility', '궁합'],
  ['wealth', '재물운'],
  ['career', '직장·이직'],
  ['love', '연애'],
  ['family', '가족'],
] as const

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

export function ThreadsAdminClient({
  status,
  rounds,
  queue,
  replies,
  posts,
}: {
  status: Status
  rounds: Rounds
  queue: Queue
  replies: Replies
  posts: Posts
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    setBusy(key)
    const r = await fn()
    setBusy(null)
    if (r.success) {
      toast.success(okMsg)
      router.refresh()
    } else toast.error(r.error ?? '실패')
  }

  return (
    <div className="space-y-6">
      {/* 상태 바 */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gold-500/20 bg-ink-primary/40 p-3 text-xs">
        <span className={status.connected ? 'text-emerald-400' : 'text-red-400'}>
          {status.connected ? `● 연결됨 @${status.username ?? ''}` : '○ Threads 미연결 — S1 인증 필요'}
        </span>
        {status.tokenExpiresAt ? (
          <span className="text-ink-light/60">
            토큰 만료 {new Date(status.tokenExpiresAt).toLocaleDateString('ko-KR')}
          </span>
        ) : null}
        <span className="text-ink-light/60">|</span>
        <span className={status.automationEnabled ? 'text-emerald-400' : 'text-amber-400'}>
          자동화 {status.automationEnabled ? 'ON' : 'OFF'}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={busy === 'auto'}
          onClick={() =>
            run(
              'auto',
              () => setAutomationEnabled(!status.automationEnabled),
              status.automationEnabled ? '자동화 껐어요' : '자동화 켰어요'
            )
          }
        >
          {status.automationEnabled ? '끄기(킬스위치)' : '켜기'}
        </Button>
        {status.publishingLimit ? (
          <span className="ml-auto text-ink-light/50">
            게시 {String((status.publishingLimit as { quota_usage?: number }).quota_usage ?? '?')}/250 · 답글{' '}
            {String((status.publishingLimit as { reply_quota_usage?: number }).reply_quota_usage ?? '?')}/1000
          </span>
        ) : null}
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">답글 큐 ({queue.length})</TabsTrigger>
          <TabsTrigger value="rounds">라운드 ({rounds.length})</TabsTrigger>
          <TabsTrigger value="replies">댓글 ({replies.length})</TabsTrigger>
          <TabsTrigger value="posts">글 ({posts.length})</TabsTrigger>
        </TabsList>

        {/* 답글 큐 — 반자동 1클릭 */}
        <TabsContent value="queue" className="space-y-3">
          {queue.length === 0 ? <p className="text-sm text-ink-light/50">대기 중인 답글이 없어요.</p> : null}
          {queue.map((q) => {
            const r = one(q.threads_replies)
            return <QueueItem key={q.id} q={q} reply={r} busy={busy} run={run} />
          })}
        </TabsContent>

        {/* 라운드 */}
        <TabsContent value="rounds" className="space-y-4">
          <NewRoundForm busy={busy} run={run} />
          {rounds.map((r) => (
            <RoundCard key={r.id} r={r} busy={busy} run={run} />
          ))}
        </TabsContent>

        {/* 댓글 */}
        <TabsContent value="replies" className="space-y-2">
          {replies.map((r) => {
            const post = one(r.threads_posts)
            return (
              <div key={r.id} className="rounded border border-ink-light/10 p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-light">@{r.username ?? '(비공개)'}</span>
                  <span className={`rounded px-1.5 py-0.5 ${cls(r.classification)}`}>{r.classification}</span>
                  <span className="text-ink-light/40">{r.classified_by}</span>
                  <span className="text-ink-light/40">
                    {r.replied_at ? new Date(r.replied_at).toLocaleString('ko-KR') : ''}
                  </span>
                  {r.our_reply_id ? <span className="text-emerald-400">답글함</span> : null}
                  {r.hide_status === 'HIDDEN' ? <span className="text-amber-400">숨김</span> : null}
                  <span className="ml-auto flex gap-1">
                    {(['apply', 'question', 'chat', 'spam'] as const).map((c) => (
                      <button
                        key={c}
                        className="rounded border border-ink-light/15 px-1.5 text-[10px] hover:bg-ink-light/10"
                        onClick={() => run(`c-${r.id}`, () => setReplyClassification(r.id, c), '분류 변경')}
                      >
                        {c}
                      </button>
                    ))}
                    <button
                      className="rounded border border-amber-500/40 px-1.5 text-[10px] text-amber-300 hover:bg-amber-500/10"
                      onClick={() =>
                        run(
                          `h-${r.id}`,
                          () => hideReplyAction(r.id, r.hide_status !== 'HIDDEN'),
                          r.hide_status === 'HIDDEN' ? '숨김 해제' : '숨김'
                        )
                      }
                    >
                      {r.hide_status === 'HIDDEN' ? '해제' : '숨김'}
                    </button>
                  </span>
                </div>
                <p className="mt-1 text-ink-light/85">{r.text}</p>
                {post ? (
                  <p className="mt-0.5 text-ink-light/40">
                    ↳ {post.kind} · {String(post.body).slice(0, 60)}
                  </p>
                ) : null}
              </div>
            )
          })}
        </TabsContent>

        {/* 글 */}
        <TabsContent value="posts" className="space-y-4">
          <NewPostForm rounds={rounds} busy={busy} run={run} />
          {posts.map((p) => (
            <div key={p.id} className="rounded border border-ink-light/10 p-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-ink-light/10 px-1.5">{p.kind}</span>
                <span
                  className={
                    p.status === 'published'
                      ? 'text-emerald-400'
                      : p.status === 'failed'
                        ? 'text-red-400'
                        : 'text-amber-400'
                  }
                >
                  {p.status}
                </span>
                <span className="text-ink-light/40">
                  {p.published_at
                    ? new Date(p.published_at).toLocaleString('ko-KR')
                    : p.scheduled_at
                      ? `예약 ${new Date(p.scheduled_at).toLocaleString('ko-KR')}`
                      : ''}
                </span>
                {p.insights ? (
                  <span className="ml-auto text-ink-light/60">
                    👁 {(p.insights as { views?: number }).views ?? '-'} · ♥{' '}
                    {(p.insights as { likes?: number }).likes ?? '-'} · 💬{' '}
                    {(p.insights as { replies?: number }).replies ?? '-'} · ↻{' '}
                    {(p.insights as { reposts?: number }).reposts ?? '-'}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-ink-light/85">{p.body}</p>
              {p.error ? <p className="mt-1 text-red-400">{p.error}</p> : null}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function cls(c: string) {
  return c === 'apply'
    ? 'bg-emerald-500/20 text-emerald-300'
    : c === 'spam'
      ? 'bg-red-500/20 text-red-300'
      : c === 'question'
        ? 'bg-blue-500/20 text-blue-300'
        : 'bg-ink-light/10 text-ink-light/70'
}

function QueueItem({
  q,
  reply,
  busy,
  run,
}: {
  q: Queue[number]
  reply: { username: string | null; text: string | null } | null
  busy: string | null
  run: (k: string, f: () => Promise<{ success: boolean; error?: string }>, m: string) => Promise<void>
}) {
  const [text, setText] = useState(q.draft_text)
  return (
    <div className="rounded-lg border border-gold-500/20 p-3 text-xs">
      <p className="text-ink-light/60">
        @{reply?.username ?? '(비공개)'} 님의 댓글: <span className="text-ink-light/85">{reply?.text}</span>
      </p>
      <Textarea
        className="mt-2 text-xs"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
      />
      <div className="mt-2 flex items-center gap-2">
        <span className="text-ink-light/40">
          {q.variant_key} · {text.length}/500
        </span>
        {q.error ? <span className="text-red-400">{q.error}</span> : null}
        <span className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy === q.id}
            onClick={() => run(q.id, () => rejectReply(q.id), '거절')}
          >
            거절
          </Button>
          <Button
            size="sm"
            disabled={busy === q.id}
            onClick={() => run(q.id, () => approveAndSendReply(q.id, text), '발송 완료')}
          >
            {busy === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '승인 + 발송'}
          </Button>
        </span>
      </div>
    </div>
  )
}

function NewRoundForm({
  busy,
  run,
}: {
  busy: string | null
  run: (k: string, f: () => Promise<{ success: boolean; error?: string }>, m: string) => Promise<void>
}) {
  const [f, setF] = useState({
    slug: '',
    title: '',
    topic: 'compatibility',
    description: '',
    opensAt: '',
    closesAt: '',
    winnerCount: 5,
  })
  return (
    <div className="rounded-lg border border-gold-500/20 p-3">
      <p className="mb-2 text-xs font-semibold text-ink-light">새 라운드</p>
      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <Input
          placeholder="slug (예: w1-compat)"
          value={f.slug}
          onChange={(e) => setF({ ...f, slug: e.target.value })}
        />
        <Input placeholder="제목" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <select
          className="rounded border border-ink-light/20 bg-transparent px-2 py-1.5"
          value={f.topic}
          onChange={(e) => setF({ ...f, topic: e.target.value })}
        >
          {TOPICS.map(([v, l]) => (
            <option key={v} value={v} className="bg-ink-primary">
              {l}
            </option>
          ))}
        </select>
        <Input
          type="number"
          min={1}
          max={100}
          value={f.winnerCount}
          onChange={(e) => setF({ ...f, winnerCount: Number(e.target.value) })}
        />
        <Input type="datetime-local" value={f.opensAt} onChange={(e) => setF({ ...f, opensAt: e.target.value })} />
        <Input type="datetime-local" value={f.closesAt} onChange={(e) => setF({ ...f, closesAt: e.target.value })} />
        <Input
          className="col-span-2"
          placeholder="설명(선택)"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </div>
      <Button
        size="sm"
        className="mt-2"
        disabled={busy === 'newround'}
        onClick={() =>
          run(
            'newround',
            () =>
              createRound({
                ...f,
                opensAt: new Date(f.opensAt).toISOString(),
                closesAt: new Date(f.closesAt).toISOString(),
              }),
            '라운드 생성(초안)'
          )
        }
      >
        만들기
      </Button>
    </div>
  )
}

function RoundCard({
  r,
  busy,
  run,
}: {
  r: Rounds[number]
  busy: string | null
  run: (k: string, f: () => Promise<{ success: boolean; error?: string }>, m: string) => Promise<void>
}) {
  const [winners, setWinners] = useState<Winners | null>(null)
  const load = async () => {
    const res = await listWinners(r.id)
    if (res.success) setWinners(res.items)
    else toast.error(res.error)
  }
  return (
    <div className="rounded-lg border border-ink-light/15 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink-light">{r.title}</span>
        <span className="text-ink-light/50">/event/{r.slug}</span>
        <span className="rounded bg-ink-light/10 px-1.5">{r.topic}</span>
        <span
          className={
            r.status === 'open' ? 'text-emerald-400' : r.status === 'drawn' ? 'text-gold-300' : 'text-ink-light/60'
          }
        >
          {r.status}
        </span>
        <span className="text-ink-light/40">
          {new Date(r.opens_at).toLocaleString('ko-KR')} ~ {new Date(r.closes_at).toLocaleString('ko-KR')} ·{' '}
          {r.winner_count}명
        </span>
        <span className="ml-auto flex gap-1.5">
          {r.status === 'draft' ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy === r.id}
              onClick={() => run(r.id, () => setRoundStatus(r.id, 'open'), '오픈')}
            >
              오픈
            </Button>
          ) : null}
          {r.status === 'open' ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy === r.id}
              onClick={() => {
                if (window.confirm('지금 마감하고 추첨할까요?')) void run(r.id, () => drawNow(r.id), '추첨 완료')
              }}
            >
              지금 추첨
            </Button>
          ) : null}
          {r.status === 'drawn' || r.status === 'published' ? (
            <Button size="sm" variant="outline" onClick={load}>
              당첨자 보기
            </Button>
          ) : null}
        </span>
      </div>
      {r.draw_seed ? <p className="mt-1 text-ink-light/40">seed {r.draw_seed}</p> : null}
      {winners ? (
        <div className="mt-3 space-y-2">
          {winners.map((w) => (
            <WinnerRow key={w.id} w={w} busy={busy} run={run} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function WinnerRow({
  w,
  busy,
  run,
}: {
  w: Winners[number]
  busy: string | null
  run: (k: string, f: () => Promise<{ success: boolean; error?: string }>, m: string) => Promise<void>
}) {
  const e = one(w.event_entries)
  const [text, setText] = useState(w.draft_reading ?? '')
  const dj = (w.draft_json ?? {}) as { headline?: string; pillars?: Record<string, string> }
  return (
    <div className="rounded border border-gold-500/15 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink-light">
          #{w.rank} @{e?.threads_username}
        </span>
        <span
          className={
            w.draft_status === 'approved'
              ? 'text-emerald-400'
              : w.draft_status === 'ready'
                ? 'text-gold-300'
                : w.draft_status === 'failed'
                  ? 'text-red-400'
                  : 'text-ink-light/60'
          }
        >
          {w.draft_status}
        </span>
        {e?.consent_public ? (
          <span className="text-ink-light/50">공개 동의</span>
        ) : (
          <span className="text-amber-400">비공개</span>
        )}
        {w.published_post_id ? <span className="text-emerald-400">발표됨</span> : null}
        <span className="ml-auto flex gap-1.5">
          {w.draft_status === 'pending' || w.draft_status === 'failed' || w.draft_status === 'rejected' ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy === w.id}
              onClick={() => run(w.id, () => regenerateDraft(w.id), '초안 생성')}
            >
              초안 생성
            </Button>
          ) : null}
          {w.draft_status === 'ready' || w.draft_status === 'rejected' ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === w.id}
                onClick={() => run(w.id, () => rejectDraft(w.id), '반려')}
              >
                반려
              </Button>
              <Button
                size="sm"
                disabled={busy === w.id}
                onClick={() => run(w.id, () => approveDraft(w.id, text), '승인')}
              >
                승인
              </Button>
            </>
          ) : null}
          {w.draft_status === 'approved' && !w.published_post_id ? (
            <Button
              size="sm"
              disabled={busy === w.id}
              onClick={() => {
                if (window.confirm('스레드에 결과를 발표합니다. 되돌릴 수 없어요.'))
                  void run(w.id, () => publishWinnerResult(w.id), '스레드 발표 완료')
              }}
            >
              스레드 발표
            </Button>
          ) : null}
        </span>
      </div>
      <p className="mt-1 text-ink-light/60">질문: {e?.question}</p>
      {dj.headline ? <p className="mt-1 text-gold-300">「{dj.headline}」</p> : null}
      {w.draft_status === 'ready' || w.draft_status === 'rejected' ? (
        <Textarea className="mt-2 text-xs" rows={7} value={text} onChange={(ev) => setText(ev.target.value)} />
      ) : w.draft_reading ? (
        <p className="mt-2 whitespace-pre-wrap text-ink-light/80">{w.draft_reading}</p>
      ) : null}
    </div>
  )
}

function NewPostForm({
  rounds,
  busy,
  run,
}: {
  rounds: Rounds
  busy: string | null
  run: (k: string, f: () => Promise<{ success: boolean; error?: string }>, m: string) => Promise<void>
}) {
  const [f, setF] = useState({
    kind: 'content' as 'campaign' | 'content' | 'announce',
    body: '',
    mediaUrl: '',
    roundId: '',
    scheduledAt: '',
  })
  return (
    <div className="rounded-lg border border-gold-500/20 p-3">
      <p className="mb-2 text-xs font-semibold text-ink-light">새 글 (즉시 또는 예약)</p>
      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <select
          className="rounded border border-ink-light/20 bg-transparent px-2 py-1.5"
          value={f.kind}
          onChange={(e) => setF({ ...f, kind: e.target.value as typeof f.kind })}
        >
          <option value="content" className="bg-ink-primary">
            콘텐츠
          </option>
          <option value="campaign" className="bg-ink-primary">
            라운드 오픈
          </option>
          <option value="announce" className="bg-ink-primary">
            공지·발표
          </option>
        </select>
        <select
          className="rounded border border-ink-light/20 bg-transparent px-2 py-1.5"
          value={f.roundId}
          onChange={(e) => setF({ ...f, roundId: e.target.value })}
        >
          <option value="" className="bg-ink-primary">
            (라운드 없음)
          </option>
          {rounds.map((r) => (
            <option key={r.id} value={r.id} className="bg-ink-primary">
              {r.title}
            </option>
          ))}
        </select>
        <Input
          placeholder="이미지 공개 URL(선택)"
          value={f.mediaUrl}
          onChange={(e) => setF({ ...f, mediaUrl: e.target.value })}
        />
        <Input
          type="datetime-local"
          value={f.scheduledAt}
          onChange={(e) => setF({ ...f, scheduledAt: e.target.value })}
        />
        <Textarea
          className="col-span-2 md:col-span-4"
          rows={4}
          maxLength={500}
          placeholder="본문(500자) — 링크는 5개까지"
          value={f.body}
          onChange={(e) => setF({ ...f, body: e.target.value })}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-ink-light/40">{f.body.length}/500</span>
        <Button
          size="sm"
          className="ml-auto"
          disabled={busy === 'newpost'}
          onClick={() =>
            run(
              'newpost',
              () => createPost({ ...f, scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : '' }),
              f.scheduledAt ? '예약됨' : '발행 완료'
            )
          }
        >
          {f.scheduledAt ? '예약' : '지금 발행'}
        </Button>
      </div>
    </div>
  )
}
