'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { BookOpen, Images, Loader2, Lock, Plus, Trash2, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { resizeImageToWidth } from '@/lib/utils/compress-image'
import {
  EPISODE_CUT_MAX_WIDTH,
  EPISODE_CUT_QUALITY,
  EPISODE_PAGE_MAX,
  EPISODE_SIGNED_URL_TTL_SEC,
  EPISODE_SUMMARY_MAX,
  EPISODE_TITLE_MAX,
  episodeBucket,
  episodeCutPath,
  validateEpisode,
  type EpisodeAccess,
} from '@/lib/domain/webtoon/episode'
import {
  deleteEpisode,
  listEpisodeCuts,
  saveEpisode,
  saveEpisodePages,
  type AdminEpisodeRow,
  type EpisodeCutInput,
} from '@/app/actions/admin/webtoon'

/**
 * 회차 등록 화면.
 *
 * ⚠️ 컷 이미지는 **브라우저가 버킷에 직접 올린다**. 서버 액션으로 중계하면 한 화 분량이
 *    Vercel 페이로드 한도(4.5MB)에 걸려 통째로 실패한다. 서버에는 경로·크기만 넘긴다.
 * ⚠️ 올리기 전에 가로를 줄인다. 멤버십 회차는 이미지 최적화를 타지 않으므로(서명 주소)
 *    **여기서 줄이지 않으면 원본이 그대로 독자에게 간다**(ADR 001).
 */

const EMPTY_FORM = {
  no: 1,
  title: '',
  summary: '',
  access: 'free' as EpisodeAccess,
  thumbUrl: '',
  publishedAt: '',
}

/** ISO → `datetime-local` 이 읽는 모양(로컬 시각). 빈 값은 초안이다. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function WebtoonEpisodesClient({ initialEpisodes }: { initialEpisodes: AdminEpisodeRow[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({ ...EMPTY_FORM, no: (initialEpisodes[0]?.no ?? 0) + 1 })
  const [episodeId, setEpisodeId] = useState<string | null>(null)
  const [savedAccess, setSavedAccess] = useState<EpisodeAccess>('free')
  const [cuts, setCuts] = useState<EpisodeCutInput[]>([])
  const [cutUrls, setCutUrls] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  // 컷 미리보기 주소. 무료는 공개 주소 그대로, 멤버십은 운영자용 서명 주소를 받아 온다.
  useEffect(() => {
    let alive = true
    if (cuts.length === 0) {
      setCutUrls({})
      return
    }
    const bucket = episodeBucket(savedAccess)
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    if (bucket === 'webtoon') {
      const map: Record<string, string> = {}
      for (const c of cuts) map[c.path] = `${base}/storage/v1/object/public/webtoon/${c.path}`
      setCutUrls(map)
      return
    }
    void (async () => {
      const supabase = createClient()
      const { data } = await supabase.storage.from(bucket).createSignedUrls(
        cuts.map((c) => c.path),
        EPISODE_SIGNED_URL_TTL_SEC
      )
      if (!alive || !data) return
      const map: Record<string, string> = {}
      data.forEach((s, i) => {
        const cut = cuts[i]
        if (cut && typeof s?.signedUrl === 'string' && s.signedUrl) map[cut.path] = s.signedUrl
      })
      setCutUrls(map)
    })()
    return () => {
      alive = false
    }
  }, [cuts, savedAccess])

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM, no: (initialEpisodes[0]?.no ?? 0) + 1 })
    setEpisodeId(null)
    setSavedAccess('free')
    setCuts([])
  }, [initialEpisodes])

  const selectEpisode = async (row: AdminEpisodeRow) => {
    setForm({
      no: row.no,
      title: row.title,
      summary: row.summary ?? '',
      access: row.access,
      thumbUrl: row.thumbUrl ?? '',
      publishedAt: toLocalInput(row.publishedAt),
    })
    setEpisodeId(row.id)
    setSavedAccess(row.access)
    setCuts(await listEpisodeCuts(row.id))
  }

  const save = async () => {
    const issues = validateEpisode({
      no: form.no,
      title: form.title,
      summary: form.summary,
      access: form.access,
      publishedAt: form.publishedAt,
    })
    if (issues.length > 0) {
      toast.error(issues[0].message)
      return
    }
    setSaving(true)
    const res = await saveEpisode({
      no: form.no,
      title: form.title,
      summary: form.summary,
      access: form.access,
      thumbUrl: form.thumbUrl,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : '',
    })
    setSaving(false)
    if (!res.success || !res.episodeId) {
      toast.error(res.message ?? '저장하지 못했습니다')
      return
    }
    setEpisodeId(res.episodeId)
    setSavedAccess(form.access)
    toast.success(form.publishedAt ? '회차가 저장·공개되었습니다' : '초안으로 저장되었습니다')
    router.refresh()
  }

  /** 본문 통째로 교체 — 고른 파일의 순서가 곧 컷 순서다. */
  const uploadCuts = async (files: FileList) => {
    if (!episodeId) {
      toast.error('회차를 먼저 저장해 주세요')
      return
    }
    const list = Array.from(files)
    if (list.length === 0) return
    if (list.length > EPISODE_PAGE_MAX) {
      toast.error(`한 화는 ${EPISODE_PAGE_MAX}컷까지입니다`)
      return
    }

    const bucket = episodeBucket(savedAccess)
    const supabase = createClient()
    const next: EpisodeCutInput[] = []
    setUploading({ done: 0, total: list.length })

    for (let i = 0; i < list.length; i += 1) {
      const file = list[i]
      try {
        const { blob, width, height } = await resizeImageToWidth(file, EPISODE_CUT_MAX_WIDTH, EPISODE_CUT_QUALITY)
        const path = episodeCutPath(form.no, i)
        const { error } = await supabase.storage
          .from(bucket)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw new Error(error.message)
        next.push({ path, w: width, h: height })
        setUploading({ done: i + 1, total: list.length })
      } catch (e) {
        setUploading(null)
        const reason = e instanceof Error ? e.message : '알 수 없는 오류'
        toast.error(`${i + 1}번째 컷에서 멈췄습니다`, { description: reason })
        return
      }
    }

    setUploading(null)
    const res = await saveEpisodePages(episodeId, next)
    if (!res.success) {
      toast.error(res.message ?? '본문을 저장하지 못했습니다')
      return
    }
    setCuts(next)
    toast.success(`본문 ${next.length}컷을 올렸습니다`)
    if (fileRef.current) fileRef.current.value = ''
    router.refresh()
  }

  const removeCut = async (idx: number) => {
    if (!episodeId) return
    const next = cuts.filter((_, i) => i !== idx)
    const res = await saveEpisodePages(episodeId, next)
    if (!res.success) {
      toast.error('컷을 빼지 못했습니다')
      return
    }
    setCuts(next)
    router.refresh()
  }

  const remove = async (row: AdminEpisodeRow) => {
    if (!window.confirm(`${row.no === 0 ? '예고편' : `${row.no}화`} 「${row.title}」을(를) 삭제할까요?`)) return
    setBusyId(row.id)
    const res = await deleteEpisode(row.id)
    setBusyId(null)
    if (!res.success) {
      toast.error('삭제하지 못했습니다')
      return
    }
    if (episodeId === row.id) resetForm()
    toast.success('삭제되었습니다')
    router.refresh()
  }

  const accessChanged = episodeId !== null && form.access !== savedAccess

  return (
    <div className="space-y-6">
      {/* 편집 */}
      <div className="rounded-xl border border-primary/20 bg-surface/30 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold text-gold-300">
            <BookOpen className="w-4 h-4" />
            {episodeId ? `${form.no === 0 ? '예고편' : `${form.no}화`} 수정` : '새 회차'}
          </p>
          {episodeId && (
            <Button size="sm" variant="ghost" onClick={resetForm} className="h-7 px-2 text-[11px] text-ink-light/60">
              <Plus className="w-3.5 h-3.5 mr-1" />새 회차
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <label className="w-24 shrink-0">
            <span className="block text-[10px] text-ink-light/45 mb-1">회차 번호</span>
            <input
              type="number"
              min={0}
              value={form.no}
              onChange={(e) => setForm({ ...form, no: Number(e.target.value) })}
              className="w-full rounded-lg bg-background/60 border border-primary/20 px-3 py-2 text-sm text-ink-light outline-none focus:border-primary/50"
            />
          </label>
          <label className="flex-1 min-w-0">
            <span className="block text-[10px] text-ink-light/45 mb-1">제목</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={EPISODE_TITLE_MAX}
              placeholder="회차 제목"
              className="w-full rounded-lg bg-background/60 border border-primary/20 px-3 py-2 text-sm text-ink-light outline-none focus:border-primary/50"
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-[10px] text-ink-light/45 mb-1">줄거리 (선택)</span>
          <textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            maxLength={EPISODE_SUMMARY_MAX}
            rows={2}
            className="w-full rounded-lg bg-background/60 border border-primary/20 px-3 py-2 text-sm text-ink-light outline-none focus:border-primary/50 resize-none"
          />
        </label>

        <label className="block">
          <span className="block text-[10px] text-ink-light/45 mb-1">썸네일 주소 (선택)</span>
          <input
            value={form.thumbUrl}
            onChange={(e) => setForm({ ...form, thumbUrl: e.target.value })}
            placeholder="https://…"
            className="w-full rounded-lg bg-background/60 border border-primary/20 px-3 py-2 text-sm text-ink-light outline-none focus:border-primary/50"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <label className="flex-1 min-w-[180px]">
            <span className="block text-[10px] text-ink-light/45 mb-1">공개 시각 (비우면 초안)</span>
            <input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
              className="w-full rounded-lg bg-background/60 border border-primary/20 px-3 py-2 text-sm text-ink-light outline-none focus:border-primary/50"
            />
          </label>
          <div className="flex-1 min-w-[180px]">
            <span className="block text-[10px] text-ink-light/45 mb-1">접근 등급</span>
            <div className="flex gap-1.5">
              {(['free', 'membership'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setForm({ ...form, access: a })}
                  className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-[12px] ${
                    form.access === a
                      ? 'border-gold-500/45 bg-gold-500/[0.1] text-gold-200 font-bold'
                      : 'border-primary/20 text-ink-light/50'
                  }`}
                >
                  {a === 'membership' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {a === 'membership' ? '멤버십' : '무료'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {accessChanged && cuts.length > 0 && (
          <p className="rounded-lg border border-amber-500/35 bg-amber-900/15 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
            등급을 바꾸면 본문이 들어가는 버킷도 바뀝니다. 저장한 뒤 <b>본문을 다시 올려 주세요</b> — 지금 걸린{' '}
            {cuts.length}컷은 옛 버킷에 남아 독자에게 보이지 않습니다.
          </p>
        )}

        <Button onClick={save} disabled={saving} className="w-full bg-primary text-background">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : episodeId ? '회차 저장' : '회차 만들기'}
        </Button>
      </div>

      {/* 본문 */}
      <div className="rounded-xl border border-primary/20 bg-surface/30 p-4 space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-gold-300">
          <Images className="w-4 h-4" /> 본문{' '}
          {cuts.length > 0 && <span className="text-ink-light/45">{cuts.length}컷</span>}
        </p>
        <p className="text-[11px] leading-relaxed text-ink-light/45">
          고른 파일의 순서가 곧 컷 순서입니다. 올리기 전에 가로 {EPISODE_CUT_MAX_WIDTH}px 로 줄여 올립니다 — 멤버십
          회차는 이미지 최적화를 타지 않으므로 여기서 줄이지 않으면 원본이 그대로 나갑니다.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          disabled={!episodeId || uploading !== null}
          onChange={(e) => {
            if (e.target.files) void uploadCuts(e.target.files)
          }}
          className="block w-full text-[11px] text-ink-light/60 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-2 file:text-[11px] file:text-gold-200 disabled:opacity-40"
        />
        {!episodeId && <p className="text-[11px] text-amber-300/80">회차를 먼저 저장하면 본문을 올릴 수 있습니다.</p>}

        {uploading && (
          <p className="flex items-center gap-2 text-[11px] text-ink-light/60">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {uploading.done} / {uploading.total} 컷 올리는 중…
          </p>
        )}

        {cuts.length > 0 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {cuts.map((c, i) => (
              <div key={c.path} className="relative overflow-hidden rounded-lg border border-primary/15 bg-black/30">
                {cutUrls[c.path] ? (
                  // 운영 화면 미리보기 — next/image 최적화를 태울 이유가 없다(서명 주소는 매번 바뀐다)
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cutUrls[c.path]} alt={`${i + 1}컷`} className="block h-20 w-full object-cover" />
                ) : (
                  <div className="h-20 w-full" />
                )}
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] text-white">{i + 1}</span>
                <button
                  type="button"
                  onClick={() => void removeCut(i)}
                  className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-seal"
                  aria-label={`${i + 1}컷 빼기`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 목록 */}
      <div className="rounded-xl border border-primary/15 divide-y divide-primary/10 overflow-hidden">
        {initialEpisodes.length === 0 && (
          <p className="p-6 text-center text-xs text-ink-light/40">등록된 회차가 없습니다.</p>
        )}
        {initialEpisodes.map((row) => (
          <div key={row.id} className="flex items-start gap-3 p-4">
            <button type="button" onClick={() => void selectEpisode(row)} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="font-serif text-[10px] tracking-[0.2em] text-gold-500/60">
                  {row.no === 0 ? '예고편' : `${row.no}화`}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                    row.access === 'membership'
                      ? 'border-gold-500/40 text-gold-300 bg-gold-500/[0.08]'
                      : 'border-white/15 text-ink-light/40'
                  }`}
                >
                  {row.access === 'membership' ? '멤버십' : '무료'}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                    row.publishedAt
                      ? 'border-emerald-500/40 text-emerald-300 bg-emerald-900/20'
                      : 'border-white/15 text-ink-light/40'
                  }`}
                >
                  {row.publishedAt ? '공개' : '초안'}
                </span>
              </div>
              <p className="text-sm font-bold text-ink-light truncate mt-0.5">{row.title}</p>
              <p className="text-[10px] text-ink-light/35 mt-1">
                본문 {row.pageCount}컷 · 댓글 {row.commentCount}개
                {row.publishedAt && ` · ${new Date(row.publishedAt).toLocaleString('ko-KR')} 공개`}
              </p>
            </button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busyId === row.id}
              onClick={() => void remove(row)}
              className="h-7 px-2 shrink-0 text-seal hover:text-seal hover:bg-seal/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
