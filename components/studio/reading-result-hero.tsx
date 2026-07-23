'use client'

import { motion } from 'framer-motion'
import { ScoreRing } from './score-ring'
import type { AnalysisTitle } from '@/lib/domain/analysis/titles'

interface ReadingResultHeroProps {
  category: 'face' | 'palm'
  /** 0~100 종합 점수 */
  score: number
  /** 상(相) 칭호 */
  title: AnalysisTitle
  /** 오버라인 라벨 (예: '관상 분석 결과') */
  subtitleLabel: string
  /** 관상 전용 첫인상 한줄 */
  firstImpression?: string
}

/** 점수 → 등급 문구(성장형은 부정 표현 없이). */
function gradeLabel(score: number, noun: string): string {
  if (score >= 80) return `빼어난 ${noun}`
  if (score >= 65) return `좋은 ${noun}`
  if (score >= 50) return `무난한 ${noun}`
  return `가꿀수록 좋아질 ${noun}`
}

/**
 * 결과 히어로 — "분석 완료" 텍스트를 대체.
 * 종합 점수 링 게이지 + 상 칭호(서예 느낌) + 등급 문구 + (관상) 첫인상 한줄.
 * 캡처 컨테이너 내부에 위치해 공유 이미지에 포함된다.
 */
export function ReadingResultHero({ category, score, title, subtitleLabel, firstImpression }: ReadingResultHeroProps) {
  const noun = category === 'palm' ? '손금' : '상'
  const grade = gradeLabel(score, noun)

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gold-500/30 p-7 text-center"
      style={{
        background:
          category === 'palm'
            ? 'linear-gradient(135deg, #000D06 0%, #001A0E 50%, #000A04 100%)'
            : 'linear-gradient(135deg, #0D0A00 0%, #1A1200 50%, #0A0800 100%)',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.15),transparent_70%)]" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />

      <p className="relative text-[10px] tracking-[0.3em] text-gold-500/50 uppercase mb-4 font-sans">{subtitleLabel}</p>

      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 0.15, stiffness: 140, damping: 16 }}
        className="relative flex justify-center mb-4"
      >
        <ScoreRing score={score} label={grade} />
      </motion.div>

      {/* 상 칭호 — 서예 느낌 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative"
      >
        <h2
          className="font-serif font-bold tracking-[0.12em] text-3xl leading-tight"
          style={{
            background: 'linear-gradient(180deg, #F4E4BA 0%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {title.hanja}
        </h2>
        <p className="mt-2 text-sm font-serif text-ink-primary/85">{title.ko}</p>
        <p className="mt-1 text-xs text-white/45 font-sans font-light">{title.desc}</p>
      </motion.div>

      {firstImpression && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="relative mt-5 pt-4 border-t border-gold-500/15"
        >
          <p className="text-[10px] text-gold-500/50 font-sans tracking-widest uppercase mb-1.5">첫인상</p>
          <p className="text-sm text-ink-primary/80 font-serif font-light leading-relaxed">“{firstImpression}”</p>
        </motion.div>
      )}
    </div>
  )
}
