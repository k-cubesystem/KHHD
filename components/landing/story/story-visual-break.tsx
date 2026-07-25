import Image from 'next/image'
import type { ReactNode } from 'react'
import { BLUR_DATA_URL } from '@/lib/utils/image'
import { StoryReveal } from './story-reveal'

interface StoryVisualBreakProps {
  /** public/ 기준 실존 이미지 경로만 전달할 것. */
  src: string
  quote: ReactNode
  caption: string
}

/** 섹션 사이 호흡용 풀블리드 이미지 밴드. 이미지는 장식이므로 alt=""·aria-hidden. */
export function StoryVisualBreak({ src, quote, caption }: StoryVisualBreakProps) {
  return (
    <section className="relative w-full h-[300px] overflow-hidden">
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        loading="lazy"
        quality={70}
        sizes="480px"
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      <div className="hanji-overlay" />

      <StoryReveal className="relative z-20 h-full flex flex-col items-center justify-center gap-3.5 px-8 text-center">
        <div className="dancheong-divider w-16" />
        <blockquote className="m-0">
          <p className="font-serif text-[18px] leading-[1.65] font-bold text-ink-light break-keep m-0">{quote}</p>
        </blockquote>
        <p className="font-sans text-[12px] leading-relaxed text-ink-light/70 break-keep max-w-[17rem] m-0">
          {caption}
        </p>
        <div className="dancheong-divider w-16" />
      </StoryReveal>
    </section>
  )
}
