'use client'

import { Star } from 'lucide-react'

interface Review {
  name: string
  age: string
  content: string
  score: number
}

const MAX_SCORE = 5

/** 노출 후기 10건 — 카드 1장당 한 줄 인용. 늘릴 경우 마퀴 밀도가 다시 높아지므로 12건을 넘기지 말 것. */
const REVIEWS: readonly Review[] = [
  { name: '김*진', age: '32세', content: '이직으로 반년을 앓았는데, 제 천직을 찾았습니다.', score: 5 },
  { name: '박*수', age: '28세', content: 'AI라 반신반의했는데, 소름 돋게 정확하네요.', score: 5 },
  { name: '이*영', age: '41세', content: '말 못 할 가정사, 비록함을 통해 위로받았습니다.', score: 5 },
  { name: '최*민', age: '35세', content: '운세가 아니라 인생의 나침반을 얻은 기분입니다.', score: 5 },
  { name: '정*우', age: '29세', content: '오늘의 운세가 제 출근길 루틴이 되었어요.', score: 5 },
  { name: '강*희', age: '38세', content: '불안했던 마음이 오행 분석을 보고 차분해졌습니다.', score: 5 },
  { name: '권*지', age: '34세', content: '부모님 사주도 등록해 매일 건강운을 봐드립니다.', score: 5 },
  { name: '황*호', age: '39세', content: '철학관 갈 시간이 없었는데, 여긴 진짜네요.', score: 5 },
  { name: '홍*표', age: '52세', content: '은퇴 후 막막했는데 제2의 전성기를 찾았습니다.', score: 5 },
  { name: '오*원', age: '30세', content: '부적을 폰 배경으로 해두니 든든함이 생겨요.', score: 4 },
] as const

/** 헤더 요약(평균 별점)은 노출 데이터에서 파생 — 수치가 따로 놀지 않도록 단일 소스 유지 */
export const REVIEW_AVERAGE = (REVIEWS.reduce((sum, review) => sum + review.score, 0) / REVIEWS.length).toFixed(1)

function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="mx-1.5 flex h-[126px] w-[268px] shrink-0 flex-col rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
      <div className="flex items-center gap-0.5" role="img" aria-label={`별점 ${review.score}점`}>
        {Array.from({ length: MAX_SCORE }, (_, i) => (
          <Star
            key={i}
            aria-hidden
            className={i < review.score ? 'h-3 w-3 fill-current text-gold-500' : 'h-3 w-3 text-gold-500/25'}
          />
        ))}
      </div>

      <blockquote className="mt-2.5 line-clamp-2 font-sans text-[13px] leading-[1.55] text-ink-primary/90">
        &ldquo;{review.content}&rdquo;
      </blockquote>

      <figcaption className="mt-auto flex items-center gap-2 pt-2.5">
        <span
          aria-hidden
          className="grid h-6 w-6 place-items-center rounded-full bg-white/[0.06] font-sans text-[10px] font-semibold text-gold-400/80"
        >
          {review.name[0]}
        </span>
        <span className="font-sans text-[11px] text-ink-primary/55">
          <span className="text-ink-primary/70">{review.name}</span> · {review.age}
        </span>
      </figcaption>
    </figure>
  )
}

export function ReviewMarquee() {
  return (
    <div className="relative w-full overflow-hidden py-1">
      <div className="review-marquee-track flex w-max">
        {[0, 1].map((duplicate) => (
          // 2배 복제 후 -50% 이동 = 이음매 없는 무한 루프. 복제본은 스크린리더에서 제외.
          <div key={duplicate} className="flex" aria-hidden={duplicate === 1}>
            {REVIEWS.map((review) => (
              <ReviewCard key={`${duplicate}-${review.name}`} review={review} />
            ))}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />

      <style jsx global>{`
        @keyframes review-marquee-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .review-marquee-track {
          animation: review-marquee-scroll 52s linear infinite;
          will-change: transform;
        }
        .review-marquee-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .review-marquee-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
