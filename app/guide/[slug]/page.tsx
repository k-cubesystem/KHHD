import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { getSiteUrl } from '@/lib/utils/site-url'
import {
  GUIDE_SLUGS,
  bodyLength,
  getGuideArticle,
  getGuideCategory,
  isGuideSlug,
  neighbors,
  readingMinutes,
} from '@/lib/content/guide'

/**
 * 명리 가이드 본문 — 정적 생성(generateStaticParams). 동적 API 를 쓰지 않아 크롤러가 첫 HTML 에서
 * 본문 전체를 읽는다. 32편 전부가 빌드 시 HTML 로 나온다.
 */

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getGuideArticle(slug)
  if (!article) return { title: '명리 가이드', robots: { index: false } }
  const category = getGuideCategory(article.category)
  const ogTitle = article.hanja ? `${article.title} ${article.hanja}` : article.title
  return {
    title: `${article.title} — 명리 가이드`,
    description: article.summary,
    keywords: [...article.keywords, '명리 가이드', '청담해화당'],
    alternates: { canonical: `/guide/${article.slug}` },
    openGraph: {
      type: 'article',
      locale: 'ko_KR',
      url: `/guide/${article.slug}`,
      siteName: '청담해화당',
      title: `${article.title} | 명리 가이드`,
      description: article.summary,
      section: category.name,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(ogTitle)}&desc=${encodeURIComponent(`명리 가이드 · ${category.name}`)}`,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
  }
}

function jsonLd(
  slug: string,
  title: string,
  summary: string,
  categoryName: string,
  keywords: readonly string[]
): string {
  const site = getSiteUrl()
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: summary,
    articleSection: categoryName,
    keywords: keywords.join(', '),
    inLanguage: 'ko-KR',
    mainEntityOfPage: `${site}/guide/${slug}`,
    isPartOf: { '@type': 'WebSite', name: '청담해화당', url: site },
    author: { '@type': 'Organization', name: '청담해화당' },
    publisher: { '@type': 'Organization', name: '큐브시스템', url: site },
  }
  // </script> 탈출 방지 — 본문에 '<' 가 들어와도 스크립트 블록이 닫히지 않게 한다
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export default async function GuideArticlePage({ params }: PageProps) {
  const { slug } = await params
  if (!isGuideSlug(slug)) notFound()
  const article = getGuideArticle(slug)
  if (!article) notFound()
  const category = getGuideCategory(article.category)
  const { prev, next } = neighbors(slug)
  const related = (article.related ?? []).map(getGuideArticle).filter((a): a is NonNullable<typeof a> => Boolean(a))

  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-4 pb-6 pt-8 text-ink-primary">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(article.slug, article.title, article.summary, category.name, article.keywords),
        }}
      />

      <nav
        aria-label="위치"
        className="mb-6 flex items-center gap-1.5 font-sans text-[11px] tracking-wide text-ink-light/55"
      >
        <Link href="/guide" className="hover:text-gold-300">
          명리 가이드
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/guide#cat-${category.id}`} className="hover:text-gold-300">
          {category.name}
        </Link>
      </nav>

      <article>
        <header className="mb-7">
          <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">
            {category.name} · {category.hanja}
          </p>
          <h1 className="mt-2 break-keep font-serif text-[25px] font-bold leading-tight text-ink-primary">
            {article.title}
          </h1>
          {article.hanja && <p className="mt-1 font-serif text-[14px] text-gold-500/70">{article.hanja}</p>}
          <p className="mt-4 break-keep border-l-2 border-gold-500/40 pl-3 font-sans text-[13.5px] leading-relaxed text-ink-light/75">
            {article.summary}
          </p>
          <p className="mt-3 font-sans text-[10.5px] tracking-wide text-ink-light/40">
            약 {readingMinutes(article)}분 · {bodyLength(article).toLocaleString('ko-KR')}자
          </p>
        </header>

        {article.sections.map((section) => (
          <section key={section.heading} className="mb-8">
            <h2 className="mb-3 break-keep border-b border-gold-500/15 pb-2 font-serif text-[18px] font-bold leading-snug text-ink-primary">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="mb-3 break-keep font-sans text-[14px] leading-[1.8] text-ink-light/85">
                {paragraph}
              </p>
            ))}
            {section.list && (
              <ul className="mt-1 space-y-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                {section.list.map((item) => (
                  <li key={item} className="break-keep font-sans text-[13px] leading-relaxed text-ink-light/80">
                    <span className="mr-1.5 text-gold-500/70">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      {related.length > 0 && (
        <section className="mb-8" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-2 font-sans text-[11px] tracking-[0.18em] text-gold-500/80">
            함께 읽기
          </h2>
          <ul className="space-y-1.5">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/guide/${r.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:border-gold-500/30"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-serif text-[14px] text-ink-light">{r.title}</span>
                    <span className="font-sans text-[10.5px] text-ink-light/45">
                      {getGuideCategory(r.category).name}
                    </span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gold-500 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="같은 갈래의 앞뒤 글" className="mb-8 grid grid-cols-2 gap-2">
        {prev ? (
          <Link
            href={`/guide/${prev.slug}`}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 font-sans text-[12px] text-ink-light/75 transition-colors hover:border-gold-500/30"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-gold-500" />
            <span className="truncate">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/guide/${next.slug}`}
            className="flex items-center justify-end gap-1.5 rounded-lg border border-white/10 px-3 py-2.5 text-right font-sans text-[12px] text-ink-light/75 transition-colors hover:border-gold-500/30"
          >
            <span className="truncate">{next.title}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gold-500" />
          </Link>
        )}
      </nav>

      <section className="hanji-card rounded-xl border border-gold-500/20 p-5 text-center">
        <p className="font-serif text-[16px] text-ink-primary">내 여덟 글자는 무엇일까</p>
        <p className="mt-1.5 break-keep font-sans text-[13px] leading-relaxed text-ink-light/70">
          생년월일만 넣으면 일간 한 글자를 3초에 확인합니다. 로그인 없음, 저장 없음.
        </p>
        <Link
          href="/ilgan?utm_source=guide&utm_medium=article"
          className="mt-4 block w-full rounded-xl border border-gold-500/30 bg-gold-500/20 py-3 text-center font-sans text-sm text-gold-500 transition-colors hover:bg-gold-500/30"
        >
          내 일간 3초 확인
        </Link>
        <Link
          href="/guide"
          className="mt-3 inline-block font-sans text-[12px] text-ink-light/60 underline underline-offset-4 hover:text-gold-300"
        >
          가이드 목록으로
        </Link>
      </section>

      <p className="mt-6 break-keep font-sans text-[11.5px] leading-relaxed text-ink-light/50">
        · 이 글은 전통 명리학의 개념을 설명합니다. 특정인의 운을 단정하거나 미래·효험을 약속하지 않으며, 유파에 따라
        읽기가 다를 수 있습니다.
      </p>

      <SiteFooter className="mt-6 pb-10" />
    </main>
  )
}
