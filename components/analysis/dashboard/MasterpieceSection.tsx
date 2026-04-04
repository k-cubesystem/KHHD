'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MasterpieceSection() {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push('/protected/analysis/cheonjiin')}
      className="relative overflow-hidden rounded-xl cursor-pointer group hanji-card dancheong-border-top"
      style={{
        background: 'linear-gradient(160deg, #0e0b07 0%, #16140F 50%, #0a0807 100%)',
        boxShadow: '0 12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.07)',
      }}
    >
      {/* 命 워터마크 */}
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 select-none pointer-events-none font-serif"
        style={{
          fontSize: '16rem',
          lineHeight: 1,
          opacity: 0.03,
          color: '#C9A84C',
          fontWeight: 700,
          transform: 'translate(15%, 15%)',
        }}
      >
        命
      </div>

      {/* 앰비언트 글로우 (도장 레드) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: '-40%',
          right: '-20%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(158,43,43,0.08) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />

      {/* 콘텐츠 */}
      <div className="relative z-10 px-6 py-7 flex flex-col gap-4">
        {/* 한자 라벨 */}
        <p className="text-[10px] font-serif tracking-[0.5em] text-gold-500/50">
          天 地 人 · 四 柱 八 字
        </p>

        {/* 헤드라인 */}
        <h2
          className="text-[1.4rem] font-serif font-bold leading-[1.4] text-ink-light tracking-tight"
          style={{ wordBreak: 'keep-all' }}
        >
          태어난 순간 새겨진
          <br />
          당신만의{' '}
          <span className="text-gold-500">운명의 지도</span>를
          <br />
          펼쳐드립니다
        </h2>

        {/* 명언 */}
        <p className="text-[11px] italic font-serif text-gold-500/40 leading-relaxed">
          &ldquo;하늘의 뜻을 알면, 땅 위의 길이 보인다&rdquo;
        </p>

        {/* 단청 구분선 */}
        <div className="dancheong-divider" />

        {/* 서브 카피 */}
        <p
          className="text-[12.5px] leading-[1.8] font-light text-ink-light/50"
          style={{ wordBreak: 'keep-all' }}
        >
          천간·지지·오행의 흐름을 읽고,
          <br />
          <span className="text-ink-light/70">대운과 세운이 알려주는 인생의 전환점</span>을
          <br />
          청담해화당이 짚어드립니다.
        </p>

        {/* CTA 버튼 (도장 스타일) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push('/protected/analysis/cheonjiin')
          }}
          className="relative overflow-hidden w-full h-13 rounded-sm group/btn hover:scale-[1.01] active:scale-[0.97] transition-transform duration-200"
          style={{
            background: '#9E2B2B',
            border: '1px solid rgba(158,43,43,0.5)',
            boxShadow: '3px 3px 0 0 rgba(158,43,43,0.3)',
          }}
        >
          {/* 시머 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out"
            style={{
              background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)',
            }}
          />

          <span className="relative z-10 flex items-center justify-center gap-2.5 py-3.5">
            <span className="text-[14px] font-serif font-bold tracking-[0.15em] text-white">
              나의 사주 · 운명 풀어보기
            </span>
            <ArrowRight
              className="w-4 h-4 text-white/80 group-hover/btn:translate-x-0.5 transition-transform duration-300"
              strokeWidth={2}
            />
          </span>
        </button>
      </div>
    </div>
  )
}
