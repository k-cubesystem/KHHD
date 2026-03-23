/* V11-SAJU-DESTINY */
'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { GOLD_500, GOLD_300 } from '@/lib/config/design-tokens'

export function MasterpieceSection() {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push('/protected/analysis/cheonjiin')}
      className="relative overflow-hidden rounded-2xl cursor-pointer group anim-fade-in-up"
      style={{
        '--fade-y': '20px',
        animation: 'fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        background: 'linear-gradient(160deg, #0e0b07 0%, #17130d 50%, #0a0807 100%)',
        border: '1px solid rgba(212,175,55,0.18)',
        boxShadow: '0 12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.07)',
      } as React.CSSProperties}
    >
      {/* 運 워터마크 */}
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 select-none pointer-events-none"
        style={{
          fontSize: '18rem',
          lineHeight: 1,
          opacity: 0.035,
          color: GOLD_500,
          fontFamily: 'serif',
          fontWeight: 700,
          transform: 'translate(20%, 20%)',
        }}
      >
        運
      </div>

      {/* 앰비언트 글로우 */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: '-40%',
          right: '-20%',
          width: '360px',
          height: '360px',
          background: 'radial-gradient(circle, rgba(212,175,55,0.14) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          bottom: '-30%',
          left: '-10%',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }}
      />

      {/* 한지 노이즈 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* 콘텐츠 */}
      <div className="relative z-10 px-7 py-8 flex flex-col gap-5">
        {/* 헤드라인 */}
        <div
          className="space-y-2.5 anim-fade-in-up"
          style={{
            '--fade-y': '12px',
            animation: 'fade-in-up 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both',
          } as React.CSSProperties}
        >
          <h2
            className="text-[1.6rem] font-serif font-medium leading-[1.35] text-white tracking-tight"
            style={{ wordBreak: 'keep-all' }}
          >
            내{' '}
            <span
              style={{
                background: `linear-gradient(90deg, ${GOLD_300}, ${GOLD_500})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              사주
            </span>
            와{' '}
            <span
              style={{
                background: `linear-gradient(90deg, ${GOLD_300}, ${GOLD_500})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              대운
            </span>
            이<br />
            지금 이 순간에도
            <br />
            말을 걸고 있습니다
          </h2>

          {/* 이탤릭 명언 */}
          <p
            className="text-[11.5px] italic font-serif leading-relaxed"
            style={{ color: 'rgba(212,175,55,0.55)' }}
          >
            &ldquo;운명(運命)은 읽는 자만이 바꿀 수 있다&rdquo;
          </p>
        </div>

        {/* 골드 구분선 */}
        <div
          className="h-px w-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.35), transparent)',
          }}
        />

        {/* 서브 카피 */}
        <p
          className="text-[13px] leading-[1.75] font-light anim-fade-in-up"
          style={{
            color: 'rgba(255,255,255,0.55)',
            wordBreak: 'keep-all',
            '--fade-y': '0px',
            animation: 'fade-in-up 0.6s ease-out 0.3s both',
          } as React.CSSProperties}
        >
          사주 만세력부터 관상·풍수·손금까지 —{' '}
          <span style={{ color: 'rgba(255,255,255,0.8)' }}>청담해화당 통합분석으로 </span>
          당신의 진짜 <span style={{ color: 'rgba(244,228,186,0.75)' }}>운명</span>을 읽어드립니다.
        </p>

        {/* CTA 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push('/protected/analysis/cheonjiin')
          }}
          className="relative overflow-hidden w-full h-14 rounded-xl group/btn hover:scale-[1.015] active:scale-[0.975] transition-transform duration-200 anim-fade-in-up"
          style={{
            '--fade-y': '8px',
            animation: 'fade-in-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both',
            background: `linear-gradient(105deg, #B8860B, ${GOLD_500} 45%, #E2C55A 75%, #C9A227)`,
            border: '1px solid rgba(244,228,186,0.2)',
            boxShadow: '0 4px 28px rgba(212,175,55,0.28)',
          } as React.CSSProperties}
        >
          {/* 시머 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out"
            style={{
              background:
                'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%)',
            }}
          />
          {/* 상단 하이라이트 */}
          <div
            aria-hidden="true"
            className="absolute top-0 inset-x-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
            }}
          />

          <span className="relative z-10 flex items-center justify-center gap-2.5">
            <span
              className="text-[15px] font-serif font-bold tracking-[0.1em]"
              style={{ color: '#0C0A07' }}
            >
              나의 사주·운명 풀어보기
            </span>
            <ArrowRight
              className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform duration-300"
              strokeWidth={2.5}
              style={{ color: '#0C0A07' }}
            />
          </span>
        </button>
      </div>
    </div>
  )
}
