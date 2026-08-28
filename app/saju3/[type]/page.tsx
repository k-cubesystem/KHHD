import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TYPE_SLUGS, isTypeSlug, typeBySlug, TYPE_NOTE } from '@/lib/domain/saju/saju3'
import { SIGNUP_BONUS_TALISMANS, SIGNUP_BONUS_SAJU_COUNT } from '@/lib/domain/payment/feature-costs'
import { TypeHeadline } from '../saju3-card'

/**
 * 유형별 공유 랜딩 — 「내 사주 한 줄: 늦게 피는 대기만성형」을 올리면 이 URL 이 붙는다.
 * URL 에 생년월일이 없다(유형 이름만) — 퍼져도 개인정보가 안 샌다. 정적 10장, 검색도 받는다.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://k-haehwadang.com'

interface PageProps {
  params: Promise<{ type: string }>
}

export function generateStaticParams() {
  return TYPE_SLUGS.map((type) => ({ type }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type } = await params
  if (!isTypeSlug(type)) return { title: '청담해화당', robots: { index: false } }
  const info = typeBySlug(type)
  const title = `「${info.title}」 — 3초 사주`
  return {
    title: `${title} | 청담해화당`,
    description: info.tagline,
    alternates: { canonical: `${SITE}/saju3/${type}` },
    openGraph: {
      title,
      description: info.tagline,
      url: `${SITE}/saju3/${type}`,
      images: [`${SITE}/api/og/saju3/${type}`],
    },
    twitter: { card: 'summary_large_image', title, description: info.tagline },
  }
}

export default async function Saju3TypePage({ params }: PageProps) {
  const { type } = await params
  if (!isTypeSlug(type)) notFound()
  const info = typeBySlug(type)

  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-4 pb-16 pt-10 text-ink-primary">
      <p className="mb-6 text-center font-sans text-[11px] tracking-[0.18em] text-gold-500/80">
        청담해화당 · 3초 사주 열 가지 유형
      </p>

      <section className="hanji-card rounded-xl border border-gold-500/25 p-6">
        <TypeHeadline type={info} />
        <p className="mt-6 break-keep font-sans text-[13px] leading-relaxed text-ink-light/70">{TYPE_NOTE}</p>
      </section>

      <section className="hanji-card mt-4 rounded-xl border border-gold-500/20 p-5 text-center">
        <p className="font-serif text-[16px] text-ink-primary">너는 어떤 형일까</p>
        <p className="mt-1.5 font-sans text-[13px] text-ink-light/70">생년월일만 넣으면 3초. 로그인 없음, 저장 없음.</p>
        <Button asChild className="mt-4 w-full">
          <Link href="/saju3?utm_source=threads&utm_medium=type_page">내 지도 펴보기</Link>
        </Button>
      </section>

      <section className="mt-4 rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-5 text-center">
        <p className="break-keep font-sans text-[13px] leading-relaxed text-ink-light/75">
          한 줄은 지도의 첫 장이야. 여덟 글자 전부랑 올해 흐름까지 보려면 가입하면 돼. 복채 {SIGNUP_BONUS_TALISMANS}
          만냥(사주 풀이 {SIGNUP_BONUS_SAJU_COUNT}회분) 주니까.
        </p>
        <Button asChild variant="outline" className="mt-3 w-full">
          <Link href={`/auth/sign-up?utm_source=threads&utm_medium=type_page&utm_content=${type}`}>
            복채 {SIGNUP_BONUS_TALISMANS}만냥 받고 시작하기
          </Link>
        </Button>
      </section>

      <nav className="mt-8">
        <p className="mb-2 text-center font-sans text-[11px] tracking-[0.18em] text-ink-light/50">다른 유형</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TYPE_SLUGS.filter((s) => s !== type).map((s) => (
            <Link
              key={s}
              href={`/saju3/${s}`}
              className="rounded-md border border-ink-light/10 px-2 py-2 text-center font-sans text-[12.5px] text-ink-light/75 hover:border-gold-500/40 hover:text-gold-300"
            >
              {typeBySlug(s).title}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  )
}
