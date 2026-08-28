import type { Metadata } from 'next'
import { Saju3Form } from './saju3-form'

/**
 * 「3초 사주」 — 비로그인 공개. 스레드 글의 «→ 링크» 가 전부 여기로 온다.
 *
 * `/ilgan`(일간 한 글자)을 대신한다 — 사람이 궁금한 건 일간이 아니라 «나는 어떤 사람이고 돈·인연·때는
 * 어떠냐»다. 저장 없음·로그인 없음·UTM 은 가입 CTA 까지 들고 간다.
 */

export const dynamic = 'force-dynamic'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://k-haehwadang.com'

export const metadata: Metadata = {
  title: '3초 사주 — 내 지도 펴보기 | 청담해화당',
  description:
    '생년월일만 넣으면 3초. 한 줄 칭호와 돈·인연·때를 짚어드립니다. 로그인 없음, 저장 없음. 우리 아이 결정적 시기도 함께.',
  alternates: { canonical: `${SITE}/saju3` },
  openGraph: {
    title: '네 지도는 이미 그려져 있어. 안 펴봤을 뿐이지',
    description: '생년월일만 넣으면 3초. 돈·인연·때를 짚어줄게.',
    url: `${SITE}/saju3`,
    images: [`${SITE}/api/og/saju3/late-bloom`],
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Saju3Page({ searchParams }: PageProps) {
  const sp = await searchParams
  const utm: Record<string, string> = {}
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = sp[k]
    if (typeof v === 'string' && v) utm[k] = v.slice(0, 80)
  }
  const mode = sp.mode === 'child' ? 'child' : 'me'

  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-4 pb-16 pt-10 text-ink-primary">
      <header className="mb-8 text-center">
        <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">청담해화당</p>
        <h1 className="mt-2 break-keep font-serif text-[26px] leading-tight text-ink-primary">
          네 지도는 이미 그려져 있어
        </h1>
        <p className="mt-3 break-keep font-sans text-[13.5px] leading-relaxed text-ink-light/75">
          안 펴봤을 뿐이지. 생년월일만 넣으면 3초, <b className="font-medium text-gold-300">돈·인연·때</b>를 짚어줄게.
        </p>
      </header>

      <Saju3Form siteUrl={SITE} utm={utm} initialMode={mode} />

      <footer className="mt-10 space-y-2 font-sans text-[11.5px] leading-relaxed text-ink-light/55">
        <p>
          · 만세력으로 세운 여덟 글자를 바탕으로 한 간이 풀이야. 계산은 정확하고, 읽기는 지금 상황에 맞춰 하는 거고.
        </p>
        <p>· 사주는 «이렇게 살아라»가 아니라 지금 방향을 보는 나침반이야. 정해진 답을 말하지 않아.</p>
      </footer>
    </main>
  )
}
