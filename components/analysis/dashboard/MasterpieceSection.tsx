/* V11-SAJU-DESTINY */
'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MasterpieceSection() {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => router.push('/protected/analysis/cheonjiin')}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      style={{
        background: 'linear-gradient(160deg, #0e0b07 0%, #17130d 50%, #0a0807 100%)',
        border: '1px solid rgba(212,175,55,0.18)',
        boxShadow: '0 12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.07)',
      }}
    >
      {/* 運 워터마크 */}
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 select-none pointer-events-none"
        style={{
          fontSize: '18rem',
          lineHeight: 1,
          opacity: 0.035,
          color: '#D4AF37',
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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-2.5"
        >
          <h2
            className="text-[1.6rem] font-serif font-medium leading-[1.35] text-white tracking-tight"
            style={{ wordBreak: 'keep-all' }}
          >
            내{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #F4E4BA, #D4AF37)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              사주
            </span>
            와{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #F4E4BA, #D4AF37)',
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
        </motion.div>

        {/* 골드 구분선 */}
        <div
          className="h-px w-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.35), transparent)',
          }}
        />

        {/* 서브 카피 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-[13px] leading-[1.75] font-light"
          style={{ color: 'rgba(255,255,255,0.55)', wordBreak: 'keep-all' }}
        >
          사주 만세력부터 관상·풍수·손금까지 —{' '}
          <span style={{ color: 'rgba(255,255,255,0.8)' }}>천지인(天地人) 통합 분석으로 </span>
          당신의 진짜 <span style={{ color: 'rgba(244,228,186,0.75)' }}>운명</span>을 읽어드립니다.
        </motion.p>

        {/* CTA 버튼 1개 */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.975 }}
          onClick={(e) => {
            e.stopPropagation()
            router.push('/protected/analysis/cheonjiin')
          }}
          className="relative overflow-hidden w-full h-14 rounded-xl group/btn"
          style={{
            background: 'linear-gradient(105deg, #B8860B, #D4AF37 45%, #E2C55A 75%, #C9A227)',
            border: '1px solid rgba(244,228,186,0.2)',
            boxShadow: '0 4px 28px rgba(212,175,55,0.28)',
          }}
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
        </motion.button>
      </div>
    </motion.div>
  )
}
