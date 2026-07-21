'use client'

import { getSajuData, WU_XING_COLORS } from '@/lib/domain/saju/saju'
import { logger } from '@/lib/utils/logger'

/**
 * 명식(命式) 4주 컴팩트 스트립 — 사주·오늘의 운세 결과 최상단(R-P1-5).
 *
 * AI 풀이 결과에 "당신의 명식 기준" 근거를 노출해 "지어낸 말" 인상을 없앤다.
 * 데이터는 기존 getSajuData 산출물 재사용(클라 계산). 시간 미상이면 시주 칸에 "미상"(R-P1-4 연동).
 */
interface PillarsStripProps {
  birthDate: string | null | undefined
  birthTime?: string | null
  isSolar?: boolean
  isLeapMonth?: boolean
  /** 출생 시간 미상 여부. 미전달 시 birthTime 부재로 판정. */
  birthTimeUnknown?: boolean
  className?: string
}

const PILLAR_LABELS = ['연주', '월주', '일주', '시주'] as const

export function PillarsStrip({
  birthDate,
  birthTime,
  isSolar = true,
  isLeapMonth = false,
  birthTimeUnknown,
  className = '',
}: PillarsStripProps) {
  if (!birthDate) return null
  const timeUnknown = birthTimeUnknown ?? !birthTime

  let saju: ReturnType<typeof getSajuData>
  try {
    saju = getSajuData(birthDate, birthTime || '12:00', isSolar, isLeapMonth)
  } catch (e) {
    logger.error('[PillarsStrip] getSajuData 실패:', e)
    return null
  }

  const cols = [saju.pillars.year, saju.pillars.month, saju.pillars.day, saju.pillars.time]

  return (
    <div className={`rounded-xl border border-gold-500/15 bg-gold-500/[0.03] px-3 py-2.5 ${className}`.trim()}>
      <p className="mb-2 text-center font-sans text-[9px] uppercase tracking-[0.2em] text-gold-500/50">
        당신의 명식(命式) 기준
      </p>
      <div className="grid grid-cols-4 gap-1">
        {cols.map((p, i) => {
          const showUnknown = i === 3 && timeUnknown
          return (
            <div key={PILLAR_LABELS[i]} className="flex flex-col items-center gap-1">
              <span className="font-sans text-[9px] text-ink-light/40">{PILLAR_LABELS[i]}</span>
              {showUnknown ? (
                <span className="py-1 font-serif text-xs text-ink-light/30">미상</span>
              ) : (
                <div className="flex flex-col items-center font-mono leading-none">
                  <span className="text-base font-bold tabular-nums" style={{ color: WU_XING_COLORS[p.ganElement] }}>
                    {p.gan}
                  </span>
                  <span className="text-base font-bold tabular-nums" style={{ color: WU_XING_COLORS[p.zhiElement] }}>
                    {p.zhi}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
