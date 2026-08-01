import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getEpisode, listComments } from '@/app/actions/webtoon/webtoon'
import { EpisodeComments } from '@/components/webtoon/EpisodeComments'

/**
 * 회차 상세 — 그림과 댓글.
 *
 * ⚠️ 미공개 회차는 **RLS 가 이미 막는다**(published_at 조건). 여기서 다시 판정하지 않는다 —
 *    게이트가 두 곳으로 갈라지면 한쪽만 고쳐지는 사고가 난다. 못 읽으면 그냥 404 다.
 */
export default async function EpisodePage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params
  const episode = await getEpisode(Number(no))
  if (!episode) notFound()

  // 'n분 전'의 기준 시각도 액션이 함께 준다 — 렌더 중에 시계를 읽지 않는다(purity)
  const { items: comments, nowMs } = await listComments(episode.id)

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-[480px] space-y-4">
        <Link
          href="/protected/webtoon"
          className="inline-flex items-center gap-1 font-serif text-[12px] text-ink-primary/50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          목록으로
        </Link>

        <header>
          <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">{episode.no} 화</p>
          <h1 className="mt-1 font-serif text-xl font-bold text-ink-primary">{episode.title}</h1>
          {episode.summary && (
            <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-ink-primary/50">{episode.summary}</p>
          )}
        </header>

        {episode.thumbUrl && (
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black/30">
            <Image src={episode.thumbUrl} alt={episode.title} fill sizes="480px" className="object-cover" />
          </div>
        )}

        <EpisodeComments episodeId={episode.id} initial={comments} nowMs={nowMs} />
      </div>
    </div>
  )
}
