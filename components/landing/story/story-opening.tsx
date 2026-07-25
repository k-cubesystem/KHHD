import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { BLUR_DATA_URL } from '@/lib/utils/image'

/**
 * 오프닝 — 감정 후킹 한 문장.
 * LCP 이미지이므로 priority. 이 페이지에서 유일하게 priority를 쓰는 이미지다.
 */
export function StoryOpening() {
  return (
    <section className="relative w-full min-h-[92dvh] flex flex-col justify-end overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/hanok-night-hero.jpg"
          alt=""
          aria-hidden="true"
          fill
          priority
          quality={75}
          sizes="480px"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          className="object-cover object-center"
        />
        {/* 텍스트 가독성용 딥 그라디언트 — 하단으로 갈수록 배경색과 완전히 융합 */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background" />
      </div>

      <div className="relative z-10 px-6 pb-20 pt-32 flex flex-col items-center text-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <span className="font-serif text-sm font-bold tracking-[0.45em] text-primary gold-glow pl-[0.45em]">
            청담해화당
          </span>
          <div className="dancheong-divider w-24" />
          <span className="font-sans text-[11px] font-semibold tracking-[0.22em] text-gold-500 uppercase">
            Since 命理 · AI Reading
          </span>
        </div>

        <h1 className="font-serif text-[27px] leading-[1.45] font-bold text-ink-light break-keep tracking-tight">
          애쓰는데도 자꾸
          <br />
          <span className="text-primary">한 박자씩 어긋나는 삶</span>
        </h1>

        <p className="font-sans text-[15px] leading-[1.85] text-ink-light/85 break-keep max-w-[19rem] font-light">
          부족해서가 아닙니다.
          <br />
          아직 <strong className="font-semibold text-gold-300">내 때(時)</strong>를 모르기 때문입니다.
        </p>

        <p className="font-sans text-[13px] leading-relaxed text-ink-light/65 break-keep max-w-[17rem]">
          사주는 정답지가 아니라 지도입니다.
          <br />
          해화당은 그 지도를 읽어드립니다.
        </p>

        <div className="pt-8 flex flex-col items-center gap-2 text-ink-light/60">
          <span className="font-sans text-[11px] tracking-[0.18em]">스크롤하여 계속</span>
          <ChevronDown className="w-4 h-4 animate-bounce motion-reduce:animate-none" strokeWidth={1.5} aria-hidden />
        </div>
      </div>
    </section>
  )
}
