'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const REVIEWS_TOP = [
  {
    name: '김*진',
    age: '32세',
    content: '이직 문제로 6개월을 앓았는데, 시주를 보고 제 천직을 찾았습니다.',
    score: 5,
  },
  {
    name: '박*수',
    age: '28세',
    content: 'AI라고 해서 반신반의했는데, 소름 돋게 정확하네요.',
    score: 5,
  },
  {
    name: '이*영',
    age: '41세',
    content: '남들에겐 말 못 할 가정사, 비록함을 통해 위로받았습니다.',
    score: 5,
  },
  {
    name: '최*민',
    age: '35세',
    content: '단순한 운세가 아니라 인생의 나침반을 얻은 기분입니다.',
    score: 5,
  },
  {
    name: '정*우',
    age: '29세',
    content: '매일 아침 받아보는 오늘의 운세가 제 출근길 루틴이 되었어요.',
    score: 5,
  },
  {
    name: '강*희',
    age: '38세',
    content: '불안했던 마음이 오행 분석을 보고 차분해졌습니다. 감사합니다.',
    score: 5,
  },
  {
    name: '윤*아',
    age: '26세',
    content: '연애운이 꽉 막혀 있었는데, 인연 관리 팁 덕분에 좋은 사람 만났어요!',
    score: 5,
  },
  {
    name: '임*현',
    age: '45세',
    content: '사업 확장을 앞두고 풍수 조언이 결정적이었습니다.',
    score: 5,
  },
  {
    name: '한*성',
    age: '33세',
    content: '왜 이제야 알았을까요. 제 기질을 이해하니 세상이 다르게 보입니다.',
    score: 5,
  },
  {
    name: '오*원',
    age: '30세',
    content: '부적을 폰 배경으로 해두니 왠지 모를 든든함이 생겨요.',
    score: 4,
  },
]

const REVIEWS_BOTTOM = [
  {
    name: '서*준',
    age: '27세',
    content: '취업 준비생입니다. 막막했는데 때를 기다리라는 말이 큰 힘이 됐어요.',
    score: 5,
  },
  {
    name: '권*지',
    age: '34세',
    content: '부모님 사주도 등록해서 매일 건강운 체크해 드리고 있습니다.',
    score: 5,
  },
  {
    name: '황*호',
    age: '39세',
    content: '철학관 가기엔 시간이 없고, 앱은 가벼워 보였는데 여긴 진짜네요.',
    score: 5,
  },
  {
    name: '신*혜',
    age: '31세',
    content: '내 속은 타들어가는데... 라는 문구 보고 울컥해서 가입했습니다.',
    score: 5,
  },
  {
    name: '안*진',
    age: '29세',
    content: '디자인이 너무 예뻐서 굿즈 사는 기분으로 멤버십 구독함 ㅋㅋ',
    score: 5,
  },
  {
    name: '송*하',
    age: '36세',
    content: '결혼 날짜 잡을 때 참고 많이 했습니다. 양가 부모님도 좋아하시네요.',
    score: 5,
  },
  {
    name: '전*국',
    age: '43세',
    content: '관상 분석해보고 거울 보는 습관이 달라졌습니다. 웃으려 노력해요.',
    score: 5,
  },
  {
    name: '홍*표',
    age: '52세',
    content: '은퇴 후 삶이 막막했는데 제 2의 전성기를 찾은 것 같습니다.',
    score: 5,
  },
  { name: '류*미', age: '24세', content: '친구들끼리 궁합 보는 재미에 푹 빠졌습니다.', score: 5 },
  {
    name: '백*솔',
    age: '30세',
    content: '천지인 분석 리포트는 정말 한 편의 소설 같네요. 감동입니다.',
    score: 5,
  },
]

function ReviewCard({ review }: { review: any }) {
  return (
    <div className="flex-shrink-0 w-80 bg-white border border-zen-border rounded-sm p-5 shadow-sm mx-3 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex text-zen-gold">
            {Array(review.score)
              .fill(0)
              .map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-current" />
              ))}
          </div>
        </div>
        <p className="text-sm text-zen-text leading-relaxed font-sans mb-4">
          &quot;{review.content}&quot;
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-zen-bg flex items-center justify-center text-xs font-bold text-zen-muted border border-zen-border">
          {review.name[0]}
        </div>
        <div>
          <p className="text-xs font-bold text-zen-text">{review.name}</p>
          <p className="text-[10px] text-zen-muted">{review.age}</p>
        </div>
      </div>
    </div>
  )
}

export function ReviewMarquee() {
  return (
    <div className="w-full overflow-hidden bg-zen-bg/50 py-12 space-y-8 relative">
      {/* Fade Edges */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-zen-bg to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-zen-bg to-transparent z-10" />

      {/* Top Row (Left) */}
      <div className="flex w-max animate-infinite-scroll">
        {[...REVIEWS_TOP, ...REVIEWS_TOP].map(
          (
            review,
            i // Duplicate for seamless loop
          ) => (
            <ReviewCard key={`top-${i}`} review={review} />
          )
        )}
      </div>

      {/* Bottom Row (Right - Reverse logic needed or different animation) */}
      {/* Tailwind doesn't have reverse infinite scroll by default easily without config. 
                Using same direction for stability or inline style for reverse. */}
      <div
        className="flex w-max animate-infinite-scroll-reverse"
        style={{ animationDirection: 'reverse' }}
      >
        {[...REVIEWS_BOTTOM, ...REVIEWS_BOTTOM].map((review, i) => (
          <ReviewCard key={`bottom-${i}`} review={review} />
        ))}
      </div>

      <style jsx global>{`
        @keyframes infinite-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-infinite-scroll {
          animation: infinite-scroll 40s linear infinite;
        }
        .animate-infinite-scroll-reverse {
          animation: infinite-scroll 45s linear infinite reverse;
        }
      `}</style>
    </div>
  )
}
