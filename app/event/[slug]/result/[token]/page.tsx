import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskUsername, EVENT_TOPICS, type EventTopic } from '@/lib/domain/event/reading'
import { SIGNUP_BONUS_TALISMANS, SIGNUP_BONUS_SAJU_COUNT } from '@/lib/domain/payment/feature-costs'

/**
 * 당첨자 결과 페이지 — 스레드 발표 글의 링크가 여기로 온다. 이 페이지가 «가입 전환 지점»이다.
 * 승인된 초안만 보인다. 카드 토큰(24hex)이 곧 접근키 — 추측 불가하지만 공유되면 누구나 본다(공개 동의 여부와
 * 무관하게 본문은 링크를 아는 사람만 본다는 설계 — 당첨자가 링크를 받는 경로가 공개 답글뿐이라 그렇다).
 */

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string; token: string }>
}

async function loadWinner(slug: string, token: string) {
  if (!/^[a-f0-9]{24}$/.test(token)) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('event_winners')
    .select(
      'draft_status, draft_reading, draft_json, published_at, event_entries(threads_username, consent_public), event_rounds(slug, title, topic)'
    )
    .eq('card_token', token)
    .maybeSingle()
  if (!data || data.draft_status !== 'approved') return null
  const round = Array.isArray(data.event_rounds) ? data.event_rounds[0] : data.event_rounds
  if (!round || round.slug !== slug) return null
  const entry = Array.isArray(data.event_entries) ? data.event_entries[0] : data.event_entries
  return { ...data, round, entry }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, token } = await params
  const w = await loadWinner(slug, token)
  if (!w) return { title: '청담해화당', robots: { index: false } }
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://k-haehwadang.com'
  const dj = (w.draft_json ?? {}) as { headline?: string }
  return {
    title: `${w.round.title} 결과 — 청담해화당`,
    description: dj.headline ?? '만세력으로 세운 명식, 간이 풀이',
    robots: { index: false },
    openGraph: w.entry?.consent_public ? { images: [`${site}/api/og/event/${token}`] } : undefined,
  }
}

export default async function EventResultPage({ params }: PageProps) {
  const { slug, token } = await params
  const w = await loadWinner(slug, token)
  if (!w) notFound()
  const dj = (w.draft_json ?? {}) as { pillars?: Record<string, string>; dayMaster?: string; headline?: string }
  const topic = EVENT_TOPICS[w.round.topic as EventTopic] ?? EVENT_TOPICS.saju
  const masked = maskUsername(String(w.entry?.threads_username ?? ''))
  const paragraphs = String(w.draft_reading ?? '')
    .split(/\n{2,}|\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-4 pb-16 pt-10 text-ink-primary">
      <header className="text-center">
        <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">청담해화당 · {w.round.title}</p>
        <h1 className="mt-2 font-serif text-2xl">
          @{masked} 님의 {topic.label}
        </h1>
        {dj.headline ? (
          <p className="mt-3 break-keep font-serif text-[17px] leading-relaxed text-gold-300">「{dj.headline}」</p>
        ) : null}
      </header>

      {dj.pillars ? (
        <section className="hanji-card mt-7 rounded-xl border border-gold-500/20 p-4">
          <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">명식</p>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center font-serif">
            {(['year', 'month', 'day', 'time'] as const).map((k) => (
              <div key={k}>
                <div className="font-sans text-[10.5px] text-ink-light/55">
                  {{ year: '년', month: '월', day: '일', time: '시' }[k]}
                </div>
                <div className="mt-0.5 text-[15px] text-ink-primary">
                  {(dj.pillars?.[k] ?? '').replace(/\(.*?\)/, '')}
                </div>
              </div>
            ))}
          </div>
          {dj.dayMaster ? (
            <p className="mt-2 text-center font-sans text-[12px] text-ink-light/70">일간 {dj.dayMaster}</p>
          ) : null}
        </section>
      ) : null}

      <article className="mt-7 space-y-4 break-keep font-sans text-[15px] leading-[1.85] text-ink-light/90">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>

      <section className="mt-10 rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-5 text-center">
        <p className="font-serif text-[15px] text-ink-primary">이건 간이 풀이예요</p>
        <p className="mt-1.5 break-keep font-sans text-[13px] leading-relaxed text-ink-light/75">
          정식 사주 풀이는 십성·대운·용신까지 읽어 드립니다. 가입하시면 복채 {SIGNUP_BONUS_TALISMANS}만냥(사주 풀이
          {SIGNUP_BONUS_SAJU_COUNT}회분)을 드리고, 오늘의 운세와 신년운세는 원래 무료예요.
        </p>
        <Link
          href={`/auth/sign-up?utm_source=threads&utm_medium=result&utm_campaign=${encodeURIComponent(w.round.slug)}`}
          className="mt-4 inline-block rounded-[3px] bg-seal-700 px-5 py-2.5 font-sans text-[14px] font-semibold text-white shadow-[2px_2px_0_rgba(0,0,0,0.35)]"
        >
          복채 {SIGNUP_BONUS_TALISMANS}만냥 받고 정식 풀이 보기
        </Link>
      </section>

      <footer className="mt-8 font-sans text-[11.5px] leading-relaxed text-ink-light/55">
        <p>· 만세력으로 세운 명식을 바탕으로 한 간이 풀이이며, 미래를 단정하거나 결과를 약속하지 않습니다.</p>
      </footer>
    </main>
  )
}
