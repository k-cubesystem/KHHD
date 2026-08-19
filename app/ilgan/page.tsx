import type { Metadata } from 'next'
import { IlganForm } from './ilgan-form'

/**
 * 「3초 일간」 — 비로그인 공개. 스레드 이야기 글의 「당신의 일간은?」이 여기로 온다.
 *
 * 이벤트 폼(개인정보 7항목)보다 압도적으로 가벼운 퍼널 첫 칸. 생년월일 하나 → 일간 한 글자 + 세 줄.
 * 저장 없음(서버 액션이 계산만 하고 버린다) · 로그인 없음 · UTM 은 가입 CTA 까지 들고 간다.
 */

export const dynamic = 'force-dynamic'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://k-haehwadang.com'

export const metadata: Metadata = {
  title: '내 일간 3초 확인 — 청담해화당',
  description:
    '생년월일만 넣으면 3초. 만세력으로 세운 내 일간(日干) 한 글자와 그 상(象)을 읽어드립니다. 로그인 없음, 저장 없음.',
  alternates: { canonical: `${SITE}/ilgan` },
  openGraph: {
    title: '내 일간은 무엇일까 — 3초 확인',
    description: '생년월일만 넣으면 끝. 만세력으로 세운 일간 한 글자.',
    url: `${SITE}/ilgan`,
    images: [`${SITE}/api/og/ilgan/gyeong`],
  },
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function IlganPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const utm: Record<string, string> = {}
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = sp[k]
    if (typeof v === 'string' && v) utm[k] = v.slice(0, 80)
  }

  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-4 pb-16 pt-10 text-ink-primary">
      <header className="mb-8 text-center">
        <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">청담해화당</p>
        <h1 className="mt-2 font-serif text-[26px] leading-tight text-ink-primary">내 일간은 무엇일까</h1>
        <p className="mt-3 break-keep font-sans text-[13.5px] leading-relaxed text-ink-light/75">
          사주 여덟 글자 가운데 <b className="font-medium text-gold-300">「나」를 뜻하는 한 글자</b>가 일간(日干)입니다.
          생년월일만 넣으면 3초.
        </p>
      </header>

      <IlganForm siteUrl={SITE} utm={utm} />

      <footer className="mt-10 space-y-2 font-sans text-[11.5px] leading-relaxed text-ink-light/55">
        <p>· 만세력(萬歲曆)으로 세운 명식의 일간입니다. 계산이며 해석이 아닙니다.</p>
        <p>· 일간의 상(象)은 명리의 전통적 읽기이며 사람을 단정하거나 미래를 약속하지 않습니다.</p>
      </footer>
    </main>
  )
}
