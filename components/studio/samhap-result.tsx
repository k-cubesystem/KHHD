'use client'

import { motion } from 'framer-motion'
import { Link2, Waves, Clock, Sparkles, Compass, Scale } from 'lucide-react'
import { ScoreRing } from './score-ring'
import { DetailAnalysisAccordion } from './detail-analysis-accordion'
import { cleanAnalysisText } from '@/lib/domain/analysis/clean-analysis-text'
import type { SamhapResult } from '@/app/actions/ai/samhap'

/** 합/반합/충 판정 뱃지 색 — 합=골드, 반합=청람, 충=단사(공포 아닌 표적의 색) */
function verdictStyle(verdict: string): { color: string; bg: string; border: string } {
  const v = verdict.trim()
  if (v.startsWith('합')) return { color: '#F4E4BA', bg: 'rgba(201,168,76,0.15)', border: 'rgba(201,168,76,0.45)' }
  if (v.startsWith('반')) return { color: '#A8C5DA', bg: 'rgba(168,197,218,0.12)', border: 'rgba(168,197,218,0.35)' }
  return { color: '#E4A0A0', bg: 'rgba(158,43,43,0.16)', border: 'rgba(158,43,43,0.40)' }
}

/**
 * 종합사주풀이 결과 뷰 — 프리미엄 무드(玄·골드). 1차 카드 문법 재사용.
 * parsed 있으면 구조화 카드, 없으면 원문(raw) 폴백. 캡처 컨테이너 안에 위치.
 * v2(삼재교차법) 필드(now·crosses·coherence)는 구 리포트에 없으므로 전부 optional 가드.
 */
export function SamhapResultView({ result, targetName }: { result: SamhapResult; targetName?: string }) {
  const p = result.parsed
  const raw = result.raw ?? ''
  const crosses = p?.crosses ?? []
  const now = p?.now
  const coherence = result.coherence

  return (
    <div className="space-y-5">
      {/* 프리미엄 히어로 */}
      <div
        className="relative overflow-hidden rounded-2xl border border-gold-500/40 p-7 text-center"
        style={{ background: 'linear-gradient(135deg, #0D0A00 0%, #1A1200 50%, #0A0800 100%)' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.16),transparent_70%)]" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
        <p className="relative text-[10px] tracking-[0.3em] text-gold-500/60 uppercase mb-4 font-sans">
          종합사주풀이 · Premium
        </p>
        {typeof result.score === 'number' && (
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1, stiffness: 140, damping: 16 }}
            className="relative flex justify-center mb-4"
          >
            <ScoreRing score={result.score} label={coherence ? '정합' : '종합'} />
          </motion.div>
        )}
        {coherence && (
          <p className="relative text-[11px] font-sans text-gold-500/70 tracking-wide">
            삼재 정합 판정 <span className="font-bold text-gold-300">{coherence.grade}</span> —
            命(사주)·相(관상)·宅(풍수) 오행 교차
          </p>
        )}
        <h2
          className="relative font-serif font-bold tracking-[0.14em] text-4xl leading-tight"
          style={{
            background: 'linear-gradient(180deg, #F4E4BA 0%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          綜合
        </h2>
        <p className="relative mt-2 text-sm font-serif text-ink-primary/85">
          {targetName ? `${targetName}님의 ` : ''}사주·관상·손금·풍수 종합
        </p>
        {p?.summary && (
          <p className="relative mt-4 pt-4 border-t border-gold-500/15 text-sm text-ink-primary/80 font-serif font-light leading-relaxed">
            “{p.summary}”
          </p>
        )}
      </div>

      {/* 구조화 결과 */}
      {p ? (
        <>
          {/* 현재 국면 — 대운×삼정×손금 시간축 정렬 (v2) */}
          {now && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gold-500/25 bg-white/[0.02] p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-gold-500" />
                <div>
                  <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">지금 서 있는 자리</h3>
                  <p className="text-[10px] text-gold-500/50 font-sans tracking-wider uppercase">대운 × 삼정 × 손금</p>
                </div>
              </div>
              <p className="text-sm font-serif font-bold text-ink-primary/90 mb-1.5">{now.phase}</p>
              <p className="text-xs text-ink-primary/70 font-sans font-light leading-relaxed">{now.detail}</p>
            </motion.div>
          )}

          {/* 교차 검증 4주제 — 궁위-십성 대응 (v2) */}
          {crosses.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-4 h-4 text-gold-500" />
                <div>
                  <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">삼재 교차 검증</h3>
                  <p className="text-[10px] text-gold-500/50 font-sans tracking-wider uppercase">
                    십성 × 궁위 × 선 — 합·반합·충
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {crosses.map((c, i) => {
                  const vs = verdictStyle(c.verdict)
                  return (
                    <motion.div
                      key={c.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="rounded-xl p-4 border border-white/8 bg-black/20"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-serif font-bold text-ink-primary/90">{c.label}</p>
                        <span
                          className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-serif font-bold border"
                          style={{ color: vs.color, background: vs.bg, borderColor: vs.border }}
                        >
                          {c.verdict}
                        </span>
                      </div>
                      <p className="text-xs text-ink-primary/70 font-sans font-light leading-relaxed">{c.detail}</p>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 정합 근거 — 코드 결정론 판정 (v2) */}
          {coherence && coherence.parts.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[11px] font-sans font-bold text-ink-primary/60 tracking-wide mb-2.5">
                정합도 {coherence.score}점 산출 근거
              </p>
              <ul className="space-y-1.5">
                {coherence.parts.map((part, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-[11px] font-sans">
                    <span className="text-ink-primary/55">
                      {part.label} <span className="text-ink-primary/80">{part.pair}</span> — {part.relationLabel}
                    </span>
                    <span className={part.delta >= 0 ? 'text-gold-400 shrink-0' : 'text-[#E4A0A0] shrink-0'}>
                      {part.delta > 0 ? '+' : ''}
                      {part.delta}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 합치점 (三合) */}
          {p.harmonies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-gold-500/50 p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(158,43,43,0.06) 100%)',
                boxShadow: '0 0 20px rgba(201,168,76,0.15)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gold-500/15 border border-gold-500/40">
                  <Link2 className="w-3.5 h-3.5 text-gold-500" />
                </div>
                <div>
                  <p className="text-sm font-serif font-bold text-gold-500 tracking-wide">네 기운의 합치점</p>
                  <p className="text-[10px] text-gold-500/50 font-sans tracking-wider uppercase">
                    사주 × 관상 × 손금 × 풍수
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {p.harmonies.map((h, i) => (
                  <div key={i} className="rounded-xl p-4 border border-gold-500/15 bg-black/20">
                    <p className="text-sm font-serif font-bold text-gold-300 mb-1">{h.title}</p>
                    <p className="text-xs text-ink-primary/75 font-sans font-light leading-relaxed">{h.detail}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 긴장점 */}
          {p.tension && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Waves className="w-4 h-4" style={{ color: '#A8C5DA' }} />
                <h3 className="text-sm font-serif font-bold tracking-wide" style={{ color: '#A8C5DA' }}>
                  완급이 필요한 결
                </h3>
              </div>
              <p className="text-sm font-serif font-bold text-ink-primary/85 mb-1">{p.tension.title}</p>
              <p className="text-xs text-white/60 font-sans font-light leading-relaxed">{p.tension.interpretation}</p>
            </div>
          )}

          {/* 시기별 조언 */}
          {p.timings.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-gold-500" />
                <h3 className="text-sm font-serif font-bold text-gold-500 tracking-wide">시기별 조언</h3>
              </div>
              <div className="space-y-4">
                {p.timings.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="relative pl-4 border-l-2 border-gold-500/25"
                  >
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-gold-500" />
                    <span className="text-sm font-serif font-bold text-gold-500">{t.period}</span>
                    <p className="text-xs text-white/55 leading-relaxed font-sans font-light mt-1">{t.advice}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 개운 처방 */}
          {p.remedies.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <h3 className="text-sm font-serif font-bold text-gold-500">개운 처방</h3>
              </div>
              <ul className="space-y-2">
                {p.remedies.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70 font-sans font-light">
                    <span className="text-gold-500/60 mt-0.5 shrink-0">·</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        // 파싱 실패 → 원문 폴백(정돈된 본문)
        raw && (
          <div
            className="analysis-prose rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-sm text-white/70 font-sans font-light leading-loose"
            dangerouslySetInnerHTML={{ __html: cleanAnalysisText(raw) }}
          />
        )
      )}

      {/* 전문 보기 — 항상 원문 접근 가능 */}
      {p && <DetailAnalysisAccordion raw={raw} title="종합사주풀이 전문 보기" />}
    </div>
  )
}
