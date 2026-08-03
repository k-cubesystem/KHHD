import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { getEpisode, getEpisodePages, listEpisodes, listComments } from '@/app/actions/webtoon/webtoon'
import { EpisodeComments } from '@/components/webtoon/EpisodeComments'

/**
 * 회차 상세 — 세로 스크롤 본문과 댓글.
 *
 * ⚠️ 미공개 회차는 **RLS 가 이미 막는다**(published_at 조건). 여기서 다시 판정하지 않는다 —
 *    게이트가 두 곳으로 갈라지면 한쪽만 고쳐지는 사고가 난다. 못 읽으면 그냥 404 다.
 * ⚠️ 멤버십 게이트는 getEpisodePages **한 곳**이 판정한다. 이 화면은 locked 결과를 그릴 뿐,
 *    잠긴 유저에게는 본문 URL 이 애초에 내려오지 않는다.
 */
export default async function EpisodePage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params
  const episode = await getEpisode(Number(no))
  if (!episode) notFound()

  const [{ locked, signed, pages }, all, { items: comments, nowMs }] = await Promise.all([
    getEpisodePages(episode.id),
    listEpisodes(),
    listComments(episode.id),
  ])

  // 이전/다음 — 공개된 회차 번호 기준
  const nos = all.map((e) => e.no).sort((a, b) => a - b)
  const i = nos.indexOf(episode.no)
  const prevNo = i > 0 ? nos[i - 1] : null
  const nextNo = i >= 0 && i < nos.length - 1 ? nos[i + 1] : null
  const label = episode.no === 0 ? '예고편' : `${episode.no} 화`

  return (
    <div className="min-h-screen px-4 py-6">
      {/* 읽기 진행 막대 — 컷 수십 장짜리 회차에서 남은 분량을 알린다.
          순수 CSS(animation-timeline: scroll())라 JS 가 없고, 미지원 브라우저에서는 아예 안 뜬다 */}
      {pages.length > 0 && (
        <div aria-hidden className="scroll-progress-track fixed inset-x-0 top-0 z-50 h-[2px] bg-white/[0.06]">
          <div className="scroll-progress h-full w-full bg-gold-500/80" />
        </div>
      )}
      <div className="mx-auto w-full max-w-[480px] space-y-4">
        <Link
          href="/protected/webtoon"
          className="inline-flex items-center gap-1 font-serif text-[12px] text-ink-primary/50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          목록으로
        </Link>

        <header>
          <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">{label}</p>
          <h1 className="mt-1 font-serif text-xl font-bold text-ink-primary">{episode.title}</h1>
          {episode.summary && (
            <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-ink-primary/50">{episode.summary}</p>
          )}
        </header>

        {locked ? (
          <div className="hanji-card rounded-2xl border border-gold-500/25 p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-gold-500/40 bg-gold-500/[0.1]">
              <Lock className="h-5 w-5 text-gold-200" />
            </span>
            <p className="mt-4 font-serif text-[15px] font-bold text-ink-primary">멤버십 전용 회차입니다</p>
            <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-ink-primary/55">
              예고편과 1~10화는 무료로 보실 수 있습니다.
              <br />
              11화부터는 멤버십과 함께 이어집니다.
            </p>
            <Link
              href="/protected/store"
              className="mt-4 inline-block rounded-xl bg-gold-500/90 px-5 py-2.5 font-sans text-[13px] font-bold text-black"
            >
              멤버십 알아보기
            </Link>
          </div>
        ) : pages.length > 0 ? (
          // 본문 — 컷 사이 틈 없이 이어 붙인다(어둠 여백도 연출의 일부)
          <div className="-mx-4 overflow-hidden bg-[#050508]">
            {pages.map((p, idx) => (
              <Image
                key={p.url}
                src={p.url}
                alt={`${label} ${idx + 1}`}
                width={p.w}
                height={p.h}
                sizes="(max-width: 512px) 100vw, 480px"
                className="block h-auto w-full"
                priority={idx === 0}
                // ⚠️ 서명 주소는 요청마다 달라 최적화 캐시가 **한 번도 맞지 않는다** — 100명이 5컷을
                //    보면 최적화가 500번 돈다(무료 한도 월 5,000). 원본을 그대로 내보낸다.
                //    대신 **올릴 때 줄여서 올려야 한다** — 여기서 줄여 주는 사람은 이제 없다.
                unoptimized={signed}
              />
            ))}
          </div>
        ) : (
          episode.thumbUrl && (
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black/30">
              <Image src={episode.thumbUrl} alt={episode.title} fill sizes="480px" className="object-cover" />
            </div>
          )
        )}

        <nav className="flex items-center justify-between gap-2">
          {prevNo !== null ? (
            <Link
              href={`/protected/webtoon/${prevNo}`}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-surface/50 px-3.5 py-2 font-serif text-[12.5px] text-ink-primary/70"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {prevNo === 0 ? '예고편' : `${prevNo}화`}
            </Link>
          ) : (
            <span />
          )}
          {nextNo !== null ? (
            <Link
              href={`/protected/webtoon/${nextNo}`}
              className="inline-flex items-center gap-1 rounded-xl border border-gold-500/35 bg-gold-500/[0.08] px-3.5 py-2 font-serif text-[12.5px] font-bold text-gold-200"
            >
              {nextNo === 0 ? '예고편' : `${nextNo}화`}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <EpisodeComments episodeId={episode.id} initial={comments} nowMs={nowMs} />
      </div>
    </div>
  )
}
