import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { GUIDE_CATEGORIES, GUIDE_ARTICLES, articlesInCategory, readingMinutes } from '@/lib/content/guide'

/**
 * 명리 가이드 목록 — 로그인 없이 읽는 공개 콘텐츠의 입구.
 *
 * 왜 있나: 서비스 본체가 전부 로그인 뒤에 있어 크롤러가 «읽을 것»을 못 봤다(2026-09-02 애드센스
 * 「가치가 별로 없는 콘텐츠」 반려). 이 목록과 32편은 그 공백을 메우는 독립 문서다 — 상품 설명이 아니다.
 * 정적 렌더(동적 API 없음) — 크롤러가 첫 HTML 에서 본문 전체를 본다.
 */

const TITLE = '명리 가이드 — 사주·오행·십성·용신을 우리 말로'
const DESCRIPTION =
  '사주팔자의 기초부터 십성·대운·격국·용신, 궁합·관상·손금·풍수까지. 전통 명리학의 개념을 단정 없이 정리한 32편의 공개 가이드. 로그인 없이 읽습니다.'

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | 청담해화당` },
  description: DESCRIPTION,
  keywords: ['명리학', '사주 기초', '오행', '십성', '용신', '대운', '궁합', '관상', '손금', '풍수', '사주 용어'],
  alternates: { canonical: '/guide' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/guide',
    siteName: '청담해화당',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent('명리 가이드')}&desc=${encodeURIComponent('사주·오행·십성·용신을 우리 말로')}`,
        width: 1200,
        height: 630,
        alt: '청담해화당 명리 가이드',
      },
    ],
  },
}

export default function GuideIndexPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-4 pb-6 pt-10 text-ink-primary">
      <header className="mb-8">
        <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">청담해화당 · 命理 가이드</p>
        <h1 className="mt-2 font-serif text-[26px] leading-tight text-ink-primary">명리 가이드</h1>
        <p className="mt-3 break-keep font-sans text-[14px] leading-[1.75] text-ink-light/80">
          사주팔자를 이루는 재료(음양·오행·천간·지지)에서 시작해 글자들의 관계, 십성, 운의 흐름, 격국과 용신, 그리고
          궁합·관상·손금·풍수까지 — 전통 명리학의 개념을 우리 말로 정리한 {GUIDE_ARTICLES.length}편입니다. 사람을
          단정하지 않고 전통이 어떻게 <b className="font-medium text-gold-300">읽어 왔는가</b>를 씁니다. 로그인 없이
          읽습니다.
        </p>
      </header>

      {GUIDE_CATEGORIES.map((category) => {
        const articles = articlesInCategory(category.id)
        return (
          <section key={category.id} className="mb-9" aria-labelledby={`cat-${category.id}`}>
            <div className="mb-3 flex items-baseline gap-2 border-b border-gold-500/15 pb-2">
              <h2 id={`cat-${category.id}`} className="font-serif text-[18px] text-ink-primary">
                {category.name}
              </h2>
              <span className="font-serif text-[12px] text-gold-500/60">{category.hanja}</span>
            </div>
            <p className="mb-3 break-keep font-sans text-[12.5px] text-ink-light/60">{category.blurb}</p>
            <ol className="space-y-2">
              {articles.map((article, i) => (
                <li key={article.slug}>
                  <Link
                    href={`/guide/${article.slug}`}
                    className="group block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-gold-500/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 flex-col">
                        <span className="font-serif text-[15px] font-bold leading-snug text-ink-light">
                          <span className="mr-1.5 font-sans text-[11px] font-normal text-gold-500/70">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          {article.title}
                        </span>
                        <span className="mt-1 break-keep font-sans text-[12px] leading-relaxed text-ink-light/65">
                          {article.summary}
                        </span>
                        <span className="mt-1.5 font-sans text-[10.5px] tracking-wide text-ink-light/40">
                          {article.hanja ? `${article.hanja} · ` : ''}약 {readingMinutes(article)}분
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gold-500 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )
      })}

      <section className="hanji-card mt-2 rounded-xl border border-gold-500/20 p-5">
        <p className="font-serif text-[16px] text-ink-primary">읽었으면 세워 보기</p>
        <p className="mt-1.5 break-keep font-sans text-[13px] leading-relaxed text-ink-light/70">
          생년월일만 넣으면 3초. 내 일간(日干) 한 글자와 전통이 붙여 온 상(象)을 확인할 수 있습니다. 로그인 없음, 저장
          없음.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/ilgan"
            className="block w-full rounded-xl border border-gold-500/30 bg-gold-500/20 py-3 text-center font-sans text-sm text-gold-500 transition-colors hover:bg-gold-500/30"
          >
            내 일간 3초 확인
          </Link>
          <Link
            href="/story"
            className="block w-full rounded-xl border border-white/10 py-3 text-center font-sans text-sm text-ink-light/80 transition-colors hover:border-gold-500/30"
          >
            해화당은 사주를 어떻게 읽나요
          </Link>
        </div>
      </section>

      <p className="mt-8 break-keep font-sans text-[11.5px] leading-relaxed text-ink-light/50">
        · 이 가이드는 전통 명리학의 개념을 설명하는 글이며 특정인의 운을 단정하거나 미래·효험을 약속하지 않습니다.
      </p>

      <SiteFooter className="mt-6 pb-10" />
    </main>
  )
}
