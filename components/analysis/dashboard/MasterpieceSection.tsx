'use client'

import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'

/* V9-CINEMATIC-PREMIUM */
export function MasterpieceSection() {
  const router = useRouter()

  return (
    <div
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
      onClick={() => router.push('/protected/analysis/cheonjiin')}
    >
      {/* ── 배경 레이어 ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0e0c08] via-[#181410] to-[#0a0806]" />

      {/* 한지 노이즈 텍스처 */}
      <div className="absolute inset-0 opacity-[0.06] bg-[url('/texture/hanji_pattern.png')] bg-repeat mix-blend-overlay pointer-events-none" />

      {/* 앰비언트 글로우 */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#D4AF37]/12 rounded-full blur-[80px] pointer-events-none group-hover:bg-[#D4AF37]/20 transition-all duration-700" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#D4AF37]/6 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-32 bg-[#D4AF37]/4 rounded-full blur-[50px] pointer-events-none group-hover:bg-[#D4AF37]/8 transition-all duration-700" />

      {/* 테두리 */}
      <div className="absolute inset-0 rounded-2xl border border-[#D4AF37]/15 group-hover:border-[#D4AF37]/35 transition-all duration-500" />
      {/* 내부 밝은 테두리 (유리 효과) */}
      <div className="absolute inset-[1px] rounded-[calc(1rem-1px)] border border-white/[0.04] pointer-events-none" />

      {/* ── 콘텐츠 ── */}
      <div className="relative z-10 px-7 pt-7 pb-6 flex flex-col gap-6">
        {/* 상단 배지 + 별점 */}
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/25 backdrop-blur-sm"
          >
            <Sparkles className="w-3 h-3 text-[#F4E4BA]" strokeWidth={1.5} />
            <span className="text-[9px] font-bold text-[#F4E4BA] tracking-[0.25em] uppercase font-serif">
              The Masterpiece
            </span>
          </motion.div>

          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-2.5 h-2.5 fill-[#D4AF37]/60 text-[#D4AF37]/60" />
            ))}
          </div>
        </div>

        {/* 타이틀 영역 */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {/* 세로 장식선 + 제목 */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                <div className="w-px h-6 bg-gradient-to-b from-transparent via-[#D4AF37]/60 to-[#D4AF37]/20" />
                <div className="w-1 h-1 rounded-full bg-[#D4AF37]/50" />
              </div>
              <h2
                className="text-[1.85rem] md:text-[2.2rem] font-serif font-medium leading-[1.15] tracking-tight"
                style={{ wordBreak: 'keep-all' }}
              >
                <span className="bg-gradient-to-br from-[#F4E4BA] via-[#E8CC6A] to-[#C8A84B] bg-clip-text text-transparent italic">
                  인생
                </span>
                <span className="text-white/90">사주풀이</span>
              </h2>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-[13.5px] text-white/55 font-sans font-light leading-[1.7] break-keep pl-5"
          >
            사주·관상·풍수·손금을 아우르는{' '}
            <span className="text-white/80 font-normal">천지인 통합 분석</span>
            으로
            <br />
            <span className="text-[#F4E4BA]/70">태어난 시간</span>이 말하는 당신의 진짜 운명을
            만나세요.
          </motion.p>
        </div>

        {/* 天地人 세 기둥 태그 */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2"
        >
          {[
            { char: '天', label: '사주', sub: '팔자·대운' },
            { char: '地', label: '풍수', sub: '공간기운' },
            { char: '人', label: '관상·손금', sub: '삶의 흔적' },
          ].map(({ char, label, sub }) => (
            <div
              key={char}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] group-hover:border-[#D4AF37]/15 transition-all duration-300"
            >
              <span className="font-serif text-base text-[#D4AF37]/70 leading-none">{char}</span>
              <span className="text-[10px] font-medium text-white/60">{label}</span>
              <span className="text-[9px] text-white/25">{sub}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="relative overflow-hidden rounded-xl h-[56px] bg-gradient-to-r from-[#C8A84B] via-[#E2C45A] to-[#C8A84B] shadow-[0_4px_24px_rgba(212,175,55,0.25)] group-hover:shadow-[0_6px_32px_rgba(212,175,55,0.42)] transition-all duration-500">
            {/* 시머 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            {/* 상단 하이라이트 */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <div className="relative z-10 h-full flex items-center justify-center gap-2.5">
              <span className="text-[15px] font-serif font-bold tracking-[0.12em] text-[#0A0A0A]">
                지금 바로 풀이받기
              </span>
              <div className="w-5 h-5 rounded-full bg-[#0A0A0A]/15 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3 h-3 text-[#0A0A0A]" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 하단 사회적 증거 */}
        <div className="flex items-center justify-center gap-1.5 -mt-1">
          <div className="w-1 h-1 rounded-full bg-[#D4AF37]/30" />
          <span className="text-[10px] text-white/20 font-light tracking-wide">
            누적 분석 12,400+ · 재방문율 87%
          </span>
          <div className="w-1 h-1 rounded-full bg-[#D4AF37]/30" />
        </div>
      </div>
    </div>
  )
}
