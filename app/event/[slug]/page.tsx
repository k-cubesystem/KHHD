import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOpenRound } from '@/app/actions/event/apply'
import { EVENT_TOPICS, type EventTopic } from '@/lib/domain/event/reading'
import { EventApplyForm } from './apply-form'

/**
 * 이벤트 응모 페이지 — 비로그인 공개. 스레드 안내 글의 링크가 여기로 온다.
 * 개인정보(생년월일시)는 이 폼에서만 받는다(스레드 댓글로 받지 않는다 — DM API 부재·공개 지면).
 */

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const round = await getOpenRound(slug)
  // metadata 단계에서 notFound() 를 불러야 응답이 진짜 404 가 된다(페이지 본문에서만 부르면 200 + 404 화면).
  if (!round) notFound()
  const title = `${round.title} — 청담해화당 무료 이벤트`
  return {
    title,
    description: round.description ?? '만세력으로 세운 명식, 간이 풀이를 무료로 받아보세요.',
    robots: { index: false }, // 이벤트 페이지는 색인 제외(시즌성·개인정보 폼)
  }
}

export default async function EventPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams
  const round = await getOpenRound(slug)
  if (!round) notFound()

  const utm: Record<string, string> = {}
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = sp[k]
    if (typeof v === 'string' && v) utm[k] = v.slice(0, 80)
  }
  const topic = EVENT_TOPICS[round.topic as EventTopic] ?? EVENT_TOPICS.saju
  const isOpen = isRoundOpen(round.status, round.opens_at, round.closes_at)

  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-4 pb-16 pt-10 text-ink-primary">
      <header className="mb-8 text-center">
        <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">청담해화당 · 무료 이벤트</p>
        <h1 className="mt-2 font-serif text-2xl text-ink-primary">{round.title}</h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-light/70">
          {topic.label} — {topic.focus}
        </p>
        <p className="mt-3 font-sans text-[12px] text-ink-light/60">
          {formatKst(round.opens_at)} ~ {formatKst(round.closes_at)} · {round.winner_count}명 선정
        </p>
        {round.description ? (
          <p className="mt-4 break-keep font-sans text-[13.5px] leading-[1.7] text-ink-light/85">{round.description}</p>
        ) : null}
      </header>

      {isOpen ? (
        <EventApplyForm roundSlug={round.slug} utm={utm} />
      ) : (
        <div className="hanji-card rounded-xl border border-gold-500/20 p-6 text-center">
          <p className="font-serif text-base text-ink-primary">
            {round.status === 'drawn' || round.status === 'published'
              ? '선정이 끝난 라운드예요'
              : '지금은 신청 기간이 아니에요'}
          </p>
          <p className="mt-2 font-sans text-[13px] text-ink-light/70">다음 라운드 소식은 스레드에서 알려드릴게요.</p>
        </div>
      )}

      <footer className="mt-10 space-y-2 font-sans text-[11.5px] leading-relaxed text-ink-light/55">
        <p>· 결과는 만세력으로 세운 명식을 바탕으로 한 간이 풀이이며, 미래를 단정하거나 결과를 약속하지 않습니다.</p>
        <p>· 신청 시 입력한 생년월일시는 선정·풀이 목적에만 쓰이고, 라운드 종료 90일 후 파기됩니다.</p>
        <p>· 결과 공개에 동의한 분만 스레드에 카드가 올라가며, 아이디는 마스킹되고 생년월일은 공개되지 않습니다.</p>
      </footer>
    </main>
  )
}

/** 서버 컴포넌트는 요청마다 렌더되므로(force-dynamic) 함수 밖에서 시각을 읽어도 «지금»이다. 렌더 순수성 규칙 준수용 분리. */
function isRoundOpen(status: string, opensAt: string, closesAt: string): boolean {
  const now = Date.now()
  return status === 'open' && now >= Date.parse(opensAt) && now <= Date.parse(closesAt)
}

function formatKst(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}
