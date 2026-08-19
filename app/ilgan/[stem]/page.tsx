import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ILGAN, ILGAN_SLUGS, isIlganSlug } from '@/lib/domain/saju/ilgan'
import { SIGNUP_BONUS_TALISMANS, SIGNUP_BONUS_SAJU_COUNT } from '@/lib/domain/payment/feature-costs'
import { IlganCard } from '../ilgan-card'

/**
 * 일간별 공유 랜딩 — 「내 일간은 경금」을 스레드에 올리면 이 URL 이 붙는다.
 * URL 에 생년월일이 없다(일간 한 글자만) — 공유돼도 개인정보가 안 새는 이유.
 * 정적 10장. 검색(「경금 일간」)에도 잡히도록 색인 허용.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://k-haehwadang.com'

interface PageProps {
  params: Promise<{ stem: string }>
}

export function generateStaticParams() {
  return ILGAN_SLUGS.map((stem) => ({ stem }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { stem } = await params
  if (!isIlganSlug(stem)) return { title: '청담해화당', robots: { index: false } }
  const info = ILGAN[stem]
  const title = `${info.name}(${info.hanja}) 일간 — 「${info.image}」`
  return {
    title: `${title} | 청담해화당`,
    description: info.lines[0],
    alternates: { canonical: `${SITE}/ilgan/${stem}` },
    openGraph: {
      title,
      description: info.lines[0],
      url: `${SITE}/ilgan/${stem}`,
      images: [`${SITE}/api/og/ilgan/${stem}`],
    },
    twitter: { card: 'summary_large_image', title, description: info.lines[0] },
  }
}

export default async function IlganStemPage({ params }: PageProps) {
  const { stem } = await params
  if (!isIlganSlug(stem)) notFound()
  const info = ILGAN[stem]

  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-4 pb-16 pt-10 text-ink-primary">
      <header className="mb-6 text-center">
        <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">청담해화당 · 일간 열 글자</p>
      </header>

      <IlganCard info={info} />

      <section className="hanji-card mt-4 rounded-xl border border-gold-500/20 p-5 text-center">
        <p className="font-serif text-[16px] text-ink-primary">당신의 일간은 무엇일까요</p>
        <p className="mt-1.5 font-sans text-[13px] text-ink-light/70">생년월일만 넣으면 3초. 로그인 없음, 저장 없음.</p>
        <Button asChild className="mt-4 w-full">
          <Link href="/ilgan?utm_source=threads&utm_medium=stem_page">내 일간 3초 확인</Link>
        </Button>
      </section>

      <section className="mt-4 rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-5 text-center">
        <p className="break-keep font-sans text-[13px] leading-relaxed text-ink-light/75">
          일간은 여덟 글자 중 하나예요. 나머지 일곱 글자와 십성·대운까지 읽는 정식 풀이는 가입하면 복채{' '}
          {SIGNUP_BONUS_TALISMANS}만냥(사주 풀이 {SIGNUP_BONUS_SAJU_COUNT}회분)으로 바로 볼 수 있어요.
        </p>
        <Button asChild variant="outline" className="mt-3 w-full">
          <Link href={`/auth/sign-up?utm_source=threads&utm_medium=stem_page&utm_content=${stem}`}>
            복채 {SIGNUP_BONUS_TALISMANS}만냥 받고 시작하기
          </Link>
        </Button>
      </section>

      <nav className="mt-8">
        <p className="mb-2 text-center font-sans text-[11px] tracking-[0.18em] text-ink-light/50">다른 일간</p>
        <div className="grid grid-cols-5 gap-1.5">
          {ILGAN_SLUGS.filter((s) => s !== stem).map((s) => (
            <Link
              key={s}
              href={`/ilgan/${s}`}
              className="rounded-md border border-ink-light/10 py-2 text-center font-serif text-[15px] text-ink-light/75 hover:border-gold-500/40 hover:text-gold-300"
            >
              {ILGAN[s].han}
              <span className="block font-sans text-[10px] text-ink-light/50">{ILGAN[s].name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  )
}
