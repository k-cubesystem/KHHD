'use client'

import { useCallback, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, ChevronLeft, ChevronRight, Frame, Loader2 } from 'lucide-react'
import { getPrayerPage, setFeaturedPrayer } from '@/app/actions/shrine/shrine-wishes'
import { PRAYER_PAGE_SIZE, prayerPageCount, prayerProgress, type FamilyPrayer } from '@/lib/domain/shrine/family-prayer'

/**
 * 올린 기도 목록 — 백일기도 v3 (CEO 2026-08-25 «하단 리스트 10개까지, 이전 기도는 쪽 번호로»).
 *
 * 하는 일 둘:
 *  · 올린 기도를 최신순 10편씩 보여 주고 쪽 번호로 넘긴다(100편 = 10쪽).
 *  · 한 편을 골라 **신당 벽 액자에 건다**. 고르지 않으면 최신 기도가 걸린다.
 *
 * 🔴 쪽 이동은 서버에서 그 쪽만 받아 온다(getPrayerPage) — 100편을 통째로 실어 나르지 않는다.
 * 🔴 액자에 건 뒤 router.refresh() 대신 낙관적으로 로컬 상태만 바꾼다 — 방(3D 무대)이 통째로
 *    다시 서면 카메라·연출이 처음으로 되돌아간다. 서버 정본은 다음 진입에 내려온다.
 */

interface PrayerListProps {
  shrineId: string
  initialPrayers: readonly FamilyPrayer[]
  initialTotal: number
  initialFeaturedId: string | null
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export function PrayerList({ shrineId, initialPrayers, initialTotal, initialFeaturedId }: PrayerListProps) {
  const [prayers, setPrayers] = useState<readonly FamilyPrayer[]>(initialPrayers)
  const [total] = useState(initialTotal)
  const [page, setPage] = useState(0)
  const [featuredId, setFeaturedId] = useState<string | null>(initialFeaturedId)
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  const pageCount = prayerPageCount(total)
  const progress = prayerProgress(total)
  /** 액자에 실제로 걸린 편 — 고른 적이 없으면 최신 한 편(첫 쪽의 첫 줄)이다. */
  const effectiveId = featuredId ?? (page === 0 ? (prayers[0]?.id ?? null) : null)

  const goPage = useCallback(
    async (next: number) => {
      if (next === page || next < 0 || next >= pageCount || loading) return
      setLoading(true)
      const data = await getPrayerPage(shrineId, next)
      setPrayers(data.prayers)
      setFeaturedId(data.featuredId)
      setPage(next)
      setLoading(false)
    },
    [page, pageCount, loading, shrineId]
  )

  const hang = useCallback(
    (prayer: FamilyPrayer) => {
      const prev = featuredId
      setFeaturedId(prayer.id) // 낙관적 — 실패하면 되돌린다
      startTransition(async () => {
        const res = await setFeaturedPrayer(shrineId, prayer.id)
        if (!res.success) {
          setFeaturedId(prev)
          toast.error('액자에 걸지 못했습니다. 다시 시도해 주세요.')
          return
        }
        toast.success('신당 벽 액자에 걸었습니다 🙏', { description: prayer.text })
      })
    },
    [featuredId, shrineId]
  )

  return (
    <section aria-labelledby="prayer-list-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 id="prayer-list-title" className="font-serif text-sm font-bold text-gold-300">
          올린 기도
        </h2>
        <span className="font-serif text-[11px] tabular-nums text-gold-500/70">
          {progress.count} / {progress.target}편
        </span>
      </div>

      {/* 백 일의 진행 — 편수 하나에서 파생한다(도메인 prayerProgress) */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gold-500" style={{ width: `${progress.percent}%` }} />
      </div>

      {prayers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center">
          <p className="font-sans text-sm font-light text-ink-light/40">아직 올린 기도가 없습니다</p>
          <p className="mt-1 font-sans text-xs font-light text-ink-light/25">
            첫 기도를 올리면 신당 벽 액자에 걸립니다
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {prayers.map((p) => {
            const hung = p.id === effectiveId
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  hung ? 'border-gold-500/50 bg-gold-500/[0.08]' : 'border-white/[0.07] bg-white/[0.02]'
                }`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-serif text-[13px] leading-snug text-ink-light">{p.text}</span>
                  <span className="font-sans text-[10px] text-ink-light/40">
                    {p.name} · {formatDay(p.createdAt)}
                  </span>
                </span>
                {hung ? (
                  <span className="flex shrink-0 items-center gap-1 font-serif text-[10px] font-bold text-gold-300">
                    <Check className="h-3 w-3" />
                    걸림
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => hang(p)}
                    aria-label={`이 기도를 액자에 걸기 — ${p.text}`}
                    className="flex shrink-0 items-center gap-1 rounded-lg border border-gold-500/30 px-2 py-1 font-sans text-[10px] text-gold-300/90 transition-colors hover:border-gold-500/60 hover:text-gold-200"
                  >
                    <Frame className="h-3 w-3" />
                    걸기
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* 쪽 번호 — 100편이면 10쪽. 한 쪽에 10편씩(PRAYER_PAGE_SIZE) */}
      {pageCount > 1 && (
        <nav aria-label="기도 목록 쪽 이동" className="flex items-center justify-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => void goPage(page - 1)}
            disabled={page === 0 || loading}
            aria-label="이전 쪽"
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-ink-light/50 disabled:opacity-25"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => void goPage(i)}
              disabled={loading}
              aria-label={`${i + 1}쪽`}
              aria-current={i === page ? 'page' : undefined}
              className={`h-7 min-w-[28px] rounded-lg border px-1.5 font-sans text-[11px] tabular-nums transition-colors ${
                i === page
                  ? 'border-gold-500/50 bg-gold-500/15 font-bold text-gold-200'
                  : 'border-white/10 text-ink-light/45 hover:border-white/25'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void goPage(page + 1)}
            disabled={page >= pageCount - 1 || loading}
            aria-label="다음 쪽"
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-ink-light/50 disabled:opacity-25"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </nav>
      )}

      <p className="text-center font-sans text-[10px] font-light text-ink-light/30">
        기도는 {PRAYER_PAGE_SIZE}편씩 보이고, 백 편이 넘으면 오래된 기도부터 물러납니다
      </p>
    </section>
  )
}
