'use client'

import { getSajuData, WU_XING_TEXT_COLORS } from '@/lib/domain/saju/saju'
import { logger } from '@/lib/utils/logger'

/**
 * 명식(命式) 4주 스트립 — 사주·오늘의 운세 결과 최상단(R-P1-5).
 *
 * AI 풀이 결과에 "당신의 명식 기준" 근거를 노출해 "지어낸 말" 인상을 없앤다.
 * 데이터는 기존 getSajuData 산출물 재사용(클라 계산). 시간 미상이면 시주 칸에 "미상"(R-P1-4 연동).
 *
 * 모양의 정본은 /story 리포트 미리보기의 명식 그리드
 * (components/landing/story/story-report-preview.tsx) — 전통 표기 순서 시·일·월·년,
 * 일주(나)는 금테로 강조, 글자는 세리프에 오행색.
 */
interface PillarsStripProps {
  birthDate: string | null | undefined
  birthTime?: string | null
  isSolar?: boolean
  isLeapMonth?: boolean
  /** 출생 시간 미상 여부. 미전달 시 birthTime 부재로 판정. */
  birthTimeUnknown?: boolean
  /** true 면 자체 카드 프레임 없이 그린다 — 리포트 카드 안에 넣을 때. */
  frameless?: boolean
  className?: string
}

export function PillarsStrip({
  birthDate,
  birthTime,
  isSolar = true,
  isLeapMonth = false,
  birthTimeUnknown,
  frameless = false,
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

  // 전통 표기 순서(우→좌를 그대로 펼친 시·일·월·년). 일주가 «나».
  const cols = [
    { label: '시주', pillar: saju.pillars.time, self: false, unknown: timeUnknown },
    { label: '일주', pillar: saju.pillars.day, self: true, unknown: false },
    { label: '월주', pillar: saju.pillars.month, self: false, unknown: false },
    { label: '년주', pillar: saju.pillars.year, self: false, unknown: false },
  ] as const

  const body = (
    <>
      <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/70 mb-2.5 m-0">
        명식 命式
      </h3>
      <div className="grid grid-cols-4 gap-1.5">
        {cols.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg border py-2 flex flex-col items-center gap-1 ${
              c.self ? 'border-gold-500/50 bg-gold-500/[0.12]' : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <span className={`font-sans text-[9px] ${c.self ? 'text-gold-300/80' : 'text-ink-light/70'}`}>
              {c.label}
            </span>
            {c.unknown ? (
              <span className="py-[9px] font-serif text-xs leading-none text-ink-light/30">미상</span>
            ) : (
              <>
                <span
                  className="font-serif text-[19px] leading-none"
                  style={{ color: WU_XING_TEXT_COLORS[c.pillar.ganElement] }}
                >
                  {c.pillar.gan}
                </span>
                <span
                  className="font-serif text-[19px] leading-none"
                  style={{ color: WU_XING_TEXT_COLORS[c.pillar.zhiElement] }}
                >
                  {c.pillar.zhi}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center font-sans text-[9px] uppercase tracking-[0.2em] text-gold-500/50 m-0">
        당신의 명식(命式) 기준
      </p>
    </>
  )

  if (frameless) return <div className={className}>{body}</div>

  return (
    <div className={`rounded-xl border border-gold-500/15 bg-gold-500/[0.03] px-3 py-2.5 ${className}`.trim()}>
      {body}
    </div>
  )
}
