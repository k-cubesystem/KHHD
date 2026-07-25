import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { BLUR_DATA_URL } from '@/lib/utils/image'
import { StoryReveal } from './story-reveal'

const STARTERS = [
  '가입 즉시 오늘의 운세와 2026 신년운세를 무료로',
  '정밀 분석은 필요할 때 복채로 하나씩',
  '본 분석은 계정에 저장되어 다시 열람 가능',
] as const

/** 07 — 마무리 CTA. 주 CTA는 무료 가입, 보조는 로그인. */
export function StoryClosing() {
  return (
    <section className="relative w-full overflow-hidden pt-16 pb-14">
      <div className="absolute inset-0">
        <Image
          src="/images/intro-wealth-v2.jpg"
          alt=""
          aria-hidden="true"
          fill
          loading="lazy"
          quality={70}
          sizes="480px"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background" />
      </div>

      <div className="relative z-10 px-6 flex flex-col items-center text-center gap-5">
        <StoryReveal className="flex flex-col items-center gap-5">
          <div className="dancheong-divider w-24" />

          <h2 className="font-serif text-[24px] leading-[1.45] font-bold text-ink-light break-keep m-0">
            바꿀 수 없는 것은 명(命)이고,
            <br />
            <span className="text-primary">고를 수 있는 것은 때입니다</span>
          </h2>

          <p className="font-sans text-[13.5px] leading-[1.8] text-ink-light/80 break-keep max-w-[19rem] font-light m-0">
            생년월일시 하나면 시작할 수 있습니다.
            <br />
            오늘의 운세부터 조용히 열어보세요.
          </p>
        </StoryReveal>

        <StoryReveal index={1} className="w-full max-w-[22rem] flex flex-col gap-3">
          <ul className="flex flex-col gap-1.5 list-none p-0 m-0 text-left">
            {STARTERS.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 mt-[3px] text-gold-300 shrink-0" strokeWidth={2.5} aria-hidden />
                <span className="font-sans text-[12.5px] leading-[1.65] text-ink-light/85 break-keep">{s}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/auth/sign-up"
            className="group mt-2 w-full py-4 rounded-xl bg-seal border border-seal hover:bg-[#B33636] shadow-dojang flex items-center justify-center gap-2.5 transition-colors duration-medium"
          >
            <span className="font-serif text-[15px] font-bold tracking-[0.06em] text-ink-light">무료로 시작하기</span>
            <ArrowRight
              className="w-4 h-4 text-ink-light transition-transform duration-medium group-hover:translate-x-1"
              strokeWidth={2}
              aria-hidden
            />
          </Link>

          <p className="font-sans text-[12px] text-ink-light/75 m-0">
            이미 회원이신가요?{' '}
            <Link
              href="/auth/login"
              className="font-semibold text-gold-300 underline underline-offset-4 decoration-gold-500/50 hover:text-primary"
            >
              로그인
            </Link>
          </p>
        </StoryReveal>
      </div>
    </section>
  )
}
