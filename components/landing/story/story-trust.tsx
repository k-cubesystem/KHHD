import Link from 'next/link'
import { CreditCard, ImageOff, KeyRound, RotateCcw, ShieldCheck, type LucideIcon } from 'lucide-react'
import { StoryReveal } from './story-reveal'
import { StorySectionHeading } from './story-section-heading'

interface TrustItem {
  icon: LucideIcon
  title: string
  body: string
}

/**
 * 근거: app/privacy/page.tsx (안전성 확보 조치 · 보유 기간),
 *       app/terms/page.tsx (제7조 청약철회 및 환불).
 * 문서에 없는 인증·수상·보도는 넣지 않는다.
 */
const ITEMS: readonly TrustItem[] = [
  {
    icon: ShieldCheck,
    title: '전송과 접근을 모두 잠급니다',
    body: 'SSL/TLS 암호화 통신을 사용하고, 데이터베이스는 Row Level Security(RLS)로 접근을 통제합니다. 내 사주는 내 계정에서만 열립니다.',
  },
  {
    icon: KeyRound,
    title: '비밀번호는 저희도 못 봅니다',
    body: '비밀번호는 Supabase Auth의 bcrypt 해싱으로 저장됩니다. 원문 그대로 보관하지 않습니다.',
  },
  {
    icon: ImageOff,
    title: '얼굴·손 사진은 남기지 않습니다',
    body: '관상·손금·풍수 분석에 올린 이미지는 분석이 끝나는 즉시 삭제되며 서버에 보관하지 않습니다.',
  },
  {
    icon: CreditCard,
    title: '결제는 토스페이먼츠가 처리합니다',
    body: '카드 정보는 PCI-DSS를 준수하는 토스페이먼츠에 위탁해 처리합니다.',
  },
  {
    icon: RotateCcw,
    title: '안 쓴 복채는 돌려받습니다',
    body: '미사용 복채는 결제일로부터 7일 이내 전액 환불, 7일이 지나면 90%를 환불합니다(수수료 10%). 멤버십은 이용 일수만큼 일할 계산해 잔여 금액을 돌려드립니다.',
  },
]

/** 06 — 신뢰. 개인정보처리방침·이용약관에 실제로 적힌 내용만 옮긴다. */
export function StoryTrust() {
  return (
    <section className="relative w-full px-5 py-16">
      <StoryReveal>
        <StorySectionHeading
          step="05"
          overline="Trust"
          title={
            <>
              가장 사적인 정보를 맡기는 일입니다.
              <br />
              <span className="text-gold-300">그래서 약속을 문서로 둡니다</span>
            </>
          }
          description="아래 내용은 모두 개인정보처리방침과 이용약관에 명시된 사항입니다."
        />
      </StoryReveal>

      <ul className="mt-8 flex flex-col gap-2.5 list-none p-0 m-0">
        {ITEMS.map((item, i) => (
          <li key={item.title}>
            <StoryReveal index={i % 3}>
              <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex gap-3.5">
                <span
                  className="shrink-0 w-9 h-9 rounded-lg bg-[#2D5F8A]/25 border border-[#2D5F8A]/50 flex items-center justify-center"
                  aria-hidden
                >
                  <item.icon className="w-4 h-4 text-[#9EC5E8]" strokeWidth={1.5} />
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="font-serif text-[14.5px] font-bold text-ink-light break-keep m-0">{item.title}</h3>
                  <p className="font-sans text-[12.5px] leading-[1.7] text-ink-light/75 break-keep font-light m-0">
                    {item.body}
                  </p>
                </div>
              </article>
            </StoryReveal>
          </li>
        ))}
      </ul>

      <StoryReveal index={1}>
        <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/70 mb-2 m-0">
            반드시 알고 계셔야 할 것
          </h3>
          <p className="font-sans text-[12px] leading-[1.75] text-ink-light/80 break-keep font-light m-0">
            사주·궁합·관상·손금·풍수 분석 결과는{' '}
            <strong className="font-semibold text-ink-light">AI가 생성한 것</strong>
            으로, 과학적으로 검증된 사실이 아닙니다. 참고 자료로만 활용해 주세요. AI 특성상 같은 입력에도 표현이 달라질
            수 있습니다. 만 14세 미만은 가입하실 수 없습니다.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/privacy"
              className="font-sans text-[11.5px] font-semibold text-gold-300 underline underline-offset-4 decoration-gold-500/50 hover:text-primary"
            >
              개인정보처리방침
            </Link>
            <span className="w-px h-3 bg-white/20" aria-hidden />
            <Link
              href="/terms"
              className="font-sans text-[11.5px] font-semibold text-gold-300 underline underline-offset-4 decoration-gold-500/50 hover:text-primary"
            >
              이용약관
            </Link>
          </div>
        </div>
      </StoryReveal>
    </section>
  )
}
