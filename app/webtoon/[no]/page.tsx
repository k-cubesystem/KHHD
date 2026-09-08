import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { getEpisode, getEpisodePages, listEpisodes, listComments } from '@/app/actions/webtoon/webtoon'
import { EpisodeComments } from '@/components/webtoon/EpisodeComments'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { JinmaekWidget } from '@/components/webtoon/JinmaekWidget'
import { WebtoonTrack } from '@/components/webtoon/WebtoonTrack'
import { WebtoonCta } from '@/components/webtoon/WebtoonCta'
import { JINMAEK_SLOTS, WU_XING_ORDER, type WuXing } from '@/lib/domain/webtoon/jinmaek'
import { WU_XING_COLORS, WU_XING_TEXT_COLORS } from '@/lib/domain/saju/saju'
import { getSiteUrl } from '@/lib/utils/site-url'

/**
 * 회차 상세 — 공개 뷰어. 비로그인도 무료 회차를 읽는다(2026-09-08 결정①).
 *
 * ⚠️ 미공개 회차는 **RLS 가 이미 막는다**(published_at 조건). 여기서 다시 판정하지 않는다 —
 *    게이트가 두 곳으로 갈라지면 한쪽만 고쳐지는 사고가 난다. 못 읽으면 그냥 404 다.
 * ⚠️ 멤버십 게이트는 getEpisodePages **한 곳**이 판정한다. 이 화면은 locked 결과를 그릴 뿐,
 *    잠긴 유저에게는 본문 URL 이 애초에 내려오지 않는다.
 * ⚠️ 간이 진맥 슬롯(JINMAEK_SLOTS)은 잠기지 않은 본문에만 낀다 — 장면의 연장이지, 광고가 아니다.
 */

/** 공유·검색용 메타 — og:image 는 반드시 절대 URL(배포 호스트 상대경로가 미리보기를 전멸시킨 전례). */
export async function generateMetadata({ params }: { params: Promise<{ no: string }> }): Promise<Metadata> {
  const { no } = await params
  const episode = await getEpisode(Number(no))
  if (!episode) return { title: '웹툰' }
  const label = episode.no === 0 ? '예고편' : `${episode.no}화`
  // 레이아웃 템플릿(%s | 브랜드)이 접미사를 붙인다 — 여기 문자열에 브랜드를 다시 적지 않는다
  const title = `${label} — ${episode.title}`
  const description = episode.summary ?? '재앙을 풀어 맑은 물에 흘려보내는 집. 공식 웹툰 무료 연재.'
  const base = getSiteUrl()
  const url = `${base}/webtoon/${episode.no}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `해화당 웹툰 ${label} — ${episode.title}`,
      description,
      url,
      type: 'article',
      ...(episode.thumbUrl ? { images: [{ url: episode.thumbUrl }] } : {}),
    },
  }
}

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

  // 간이 진맥 슬롯 — 등재된 회차만. 팔레트는 서버에서 오행 정본 색을 떠서 넘긴다
  // (saju.ts 는 만세력 라이브러리를 끌므로 클라이언트에서 직접 import 하지 않는다).
  const slot = JINMAEK_SLOTS[episode.no]
  const palette = Object.fromEntries(
    WU_XING_ORDER.map((el: WuXing) => [el, { fill: WU_XING_COLORS[el], text: WU_XING_TEXT_COLORS[el] }])
  ) as Record<WuXing, { fill: string; text: string }>
  const jinmaekCta = `/protected/analysis?utm_source=webtoon&utm_medium=jinmaek&utm_campaign=ep${episode.no}`
  const episodeCta = `/protected/analysis?utm_source=webtoon&utm_medium=episode&utm_campaign=ep${episode.no}`

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
        <Link href="/webtoon" className="inline-flex items-center gap-1 font-serif text-[12px] text-ink-primary/50">
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
            <WebtoonTrack no={episode.no} kind="lock" />
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
          // 본문 — 컷 사이 틈 없이 이어 붙인다(어둠 여백도 연출의 일부).
          // 간이 진맥은 슬롯 페이지 «뒤»에 낀다 — 진맥 장면을 읽던 독자가 그 자리에서 진맥을 받는다.
          <div className="-mx-4 overflow-hidden bg-[#050508]">
            {pages.map((p, idx) => (
              <div key={p.url}>
                <Image
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
                {slot && slot.after === idx + 1 && (
                  <JinmaekWidget
                    no={episode.no}
                    hook={slot.hook}
                    speaker={slot.speaker}
                    palette={palette}
                    ctaHref={jinmaekCta}
                  />
                )}
              </div>
            ))}
            <WebtoonTrack no={episode.no} />
          </div>
        ) : (
          episode.thumbUrl && (
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black/30">
              <Image src={episode.thumbUrl} alt={episode.title} fill sizes="480px" className="object-cover" />
            </div>
          )
        )}

        {/* AI기본법 §31② — 컷 그림이 생성물이다. 공개 화면에서도 회차 단위 1회 표시 */}
        <ServiceDisclaimer tone="webtoon" />

        {!locked && pages.length > 0 && (
          <>
            {/* 조판 이미지 속 CTA 는 눌리지 않는다 — 실제 다리는 이 버튼 하나다 */}
            <WebtoonCta
              no={episode.no}
              href={episodeCta}
              label="내 팔자는 어떤가 — 풀이 받아 보기"
              sub="사주·궁합·관상 — 청담해화당 본채"
            />
            <p className="text-center font-sans text-[11.5px] text-ink-primary/40">
              다음 화는 <span className="font-bold text-gold-300/80">매주 화 · 금요일</span>에 이어집니다 ·{' '}
              <Link href="/protected/notifications" className="underline underline-offset-2 text-gold-300/70">
                🔔 새 회차 알림 받기
              </Link>
            </p>
          </>
        )}

        <nav className="flex items-center justify-between gap-2">
          {prevNo !== null ? (
            <Link
              href={`/webtoon/${prevNo}`}
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
              href={`/webtoon/${nextNo}`}
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
