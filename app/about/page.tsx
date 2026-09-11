import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'

/**
 * 해화당 소개 — 누가, 무엇을, 어떻게, 어떤 원칙으로. 로그인 없이 읽는 공개 페이지.
 *
 * 왜 있나: 방문자와 심사자(애드센스 2026-09-02 반려)가 «이 사이트가 무엇이고 누가 운영하는가»를
 * 한 페이지에서 확인할 자리가 없었다. 사업자 정보의 정본은 SiteFooter — 여기서는 설명을 붙여 보여 준다.
 * 🔴 여기 적는 사실은 전부 약관·개인정보처리방침·화면에서 확인되는 것만 — 연혁·규모 같은 검증 안 되는 서술 금지.
 */

const TITLE = '해화당 소개 — 전통 명리학과 AI가 함께 읽는 사주'
const DESCRIPTION =
  '청담해화당은 만세력으로 명식을 세우고 AI가 해석을 얹는 사주·궁합·관상·손금·풍수 분석 서비스입니다. 운영자, 제공 내용, 읽는 방법, 지키는 원칙, 문의처를 정리했습니다.'

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | 청담해화당` },
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/about',
    siteName: '청담해화당',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent('해화당 소개')}&desc=${encodeURIComponent('전통 명리학 × AI')}`,
        width: 1200,
        height: 630,
        alt: '청담해화당 소개',
      },
    ],
  },
}

function Section({ title, hanja, children }: { title: string; hanja?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-2 border-b border-gold-500/15 pb-2">
        <h2 className="font-serif text-[18px] font-bold text-ink-primary">{title}</h2>
        {hanja && <span className="font-serif text-[12px] text-gold-500/60">{hanja}</span>}
      </div>
      <div className="space-y-3 break-keep font-sans text-[14px] leading-[1.8] text-ink-light/85">{children}</div>
    </section>
  )
}

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-4 pb-6 pt-10 text-ink-primary">
      <header className="mb-8">
        <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">청담해화당 · 海華堂</p>
        <h1 className="mt-2 font-serif text-[26px] leading-tight text-ink-primary">해화당 소개</h1>
        <p className="mt-3 break-keep font-sans text-[14px] leading-[1.75] text-ink-light/80">
          청담해화당은 전통 명리학의 계산 위에 AI의 해석을 얹어 사주·궁합·관상·손금·풍수를 읽어 드리는 온라인
          서비스입니다. 큐브시스템이 만들고 운영합니다.
        </p>
      </header>

      <Section title="무엇을 하는 곳인가" hanja="服務">
        <p>
          생년월일시를 만세력으로 여덟 글자(명식)로 세우고, 오행·십성·격국·용신 같은 명리의 구조를 계산한 뒤, 그 계산
          위에서 AI가 사람이 읽기 좋은 풀이를 씁니다. 사주 종합 풀이와 오늘·이달·올해의 운세, 두 사람 또는 가족 단위의
          궁합, 사진으로 보는 관상·손금·풍수 풀이를 제공합니다.
        </p>
        <p>
          풀이 결과는 계정에 저장되어 다시 열어볼 수 있고, 가족의 명식을 함께 등록해 관리할 수 있습니다. 풀이와 별도로
          「신당」이라는 공간을 두어, 하루의 마음을 두는 의례와 기록을 이어 갈 수 있게 했습니다.
        </p>
      </Section>

      <Section title="어떻게 읽는가" hanja="讀法">
        <p>
          계산과 해석을 나눕니다. 여덟 글자를 세우고 오행을 세고 십성을 붙이는 일은 규칙이 있는 계산이라 사람이 만든
          결정론적 엔진이 맡습니다. 같은 입력에는 늘 같은 결과가 나옵니다. AI는 그 계산 결과만을 재료로 삼아 해석을
          쓰며, 계산에 없는 글자를 지어내지 않습니다.
        </p>
        <p>
          해석은 천(天)·지(地)·인(人) 세 축으로 나눕니다. 타고난 결, 처한 환경, 지금의 시기를 따로 읽고 서로 견주어
          어디가 편하고 어디가 부딪히는지를 설명합니다. 자세한 순서는 가이드의{' '}
          <Link href="/guide/ai-myeongni" className="text-gold-300 underline underline-offset-4">
            「AI와 명리학」
          </Link>
          에 적어 두었습니다.
        </p>
      </Section>

      <Section title="지키는 원칙" hanja="原則">
        <p>
          사람을 단정하지 않습니다. 「당신은 이런 사람이다」 대신 「전통은 이 글자를 이렇게 읽는다」로 씁니다. 미래를
          약속하지 않고, 부적·물건·의례의 효험을 말하지 않으며, 「반드시」「절대」 같은 말을 풀이에서 걷어 냅니다.
          이것은 표시·광고에 관한 법률을 지키는 일이기도 하지만, 무엇보다 명리를 대하는 바른 태도라고 믿습니다.
        </p>
        <p>
          풀이는 참고 자료입니다. 건강·법률·재정·인간관계의 결정은 풀이가 아니라 본인과 전문가의 판단으로 하셔야 합니다.
          이용약관 제9조(AI 분석 결과에 대한 면책)에 같은 취지를 적어 두었습니다.
        </p>
      </Section>

      <Section title="개인정보와 데이터" hanja="資料">
        <p>
          회원 정보와 명식·풀이 기록은 국내(서울) 리전의 데이터베이스에 암호화하여 저장하며, 행 수준 보안(RLS)으로
          계정별 접근을 제한합니다. 관상·손금·풍수 풀이를 위해 올린 사진은 분석 목적으로만 처리합니다. 처리
          목적·항목·보유 기간·파기 절차는{' '}
          <Link href="/privacy" className="text-gold-300 underline underline-offset-4">
            개인정보처리방침
          </Link>
          에 조항별로 적혀 있습니다.
        </p>
        <p>
          결제는 토스페이먼츠를 통해 처리되며 카드번호 등 결제 정보를 직접 저장하지 않습니다. 유료 서비스의
          청약철회·환불 기준은{' '}
          <Link href="/terms" className="text-gold-300 underline underline-offset-4">
            이용약관 제7조
          </Link>
          에 있습니다.
        </p>
      </Section>

      <Section title="운영자 정보" hanja="事業者">
        <dl className="grid grid-cols-[6.5rem_1fr] gap-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 font-sans text-[13px]">
          <dt className="text-ink-light/55">상호</dt>
          <dd className="text-ink-light">큐브시스템</dd>
          <dt className="text-ink-light/55">대표</dt>
          <dd className="text-ink-light">박대건</dd>
          <dt className="text-ink-light/55">사업자등록번호</dt>
          <dd className="text-ink-light">205-16-69546</dd>
          <dt className="text-ink-light/55">통신판매업</dt>
          <dd className="text-ink-light">제 2024-의정부흥선-0264호</dd>
          <dt className="text-ink-light/55">주소</dt>
          <dd className="text-ink-light">경기도 의정부시 신촌로 39번길 50-20</dd>
          <dt className="text-ink-light/55">연락처</dt>
          <dd className="text-ink-light">010-2311-2010 · 평일 10:00–18:00 (주말·공휴일 휴무)</dd>
        </dl>
      </Section>

      <Section title="문의" hanja="問議">
        <p>
          서비스 이용 중 궁금한 점은 로그인 후 1:1 문의 게시판에 남겨 주시면 순서대로 답해 드립니다. 급한 일은 위
          연락처로 운영 시간 안에 전화 주세요. 기업·단체 도입은 별도 안내 페이지가 있습니다.
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <Link
            href="/protected/support"
            className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-gold-500/30"
          >
            <span className="font-sans text-[13.5px] text-ink-light">1:1 문의 게시판 (로그인 필요)</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gold-500 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/business"
            className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-gold-500/30"
          >
            <span className="font-sans text-[13.5px] text-ink-light">기업 도입 안내</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gold-500 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/guide"
            className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-gold-500/30"
          >
            <span className="font-sans text-[13.5px] text-ink-light">명리 가이드 읽기</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gold-500 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Section>

      <SiteFooter className="pb-10" />
    </main>
  )
}
