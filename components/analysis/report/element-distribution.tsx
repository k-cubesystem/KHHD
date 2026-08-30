'use client'

import { getSajuData, WU_XING_COLORS } from '@/lib/domain/saju/saju'
import { logger } from '@/lib/utils/logger'

/**
 * 오행 분포 五行 가로 막대 그래프 — 풀이 결과 화면용.
 *
 * /story 랜딩의 리포트 미리보기(components/landing/story/story-report-preview.tsx)가
 * 예시 값으로 보여주던 그래프를 **실제 명식**으로 그린다. 색은 WU_XING_COLORS 단일 출처.
 */
const ELEMENTS = [
  { key: '木', name: '목' },
  { key: '火', name: '화' },
  { key: '土', name: '토' },
  { key: '金', name: '금' },
  { key: '水', name: '수' },
] as const

interface ElementDistributionProps {
  birthDate: string | null | undefined
  birthTime?: string | null
  isSolar?: boolean
  isLeapMonth?: boolean
  /** 출생 시간 미상 여부. 미전달 시 birthTime 부재로 판정. */
  birthTimeUnknown?: boolean
  className?: string
}

export function ElementDistribution({
  birthDate,
  birthTime,
  isSolar = true,
  isLeapMonth = false,
  birthTimeUnknown,
  className = '',
}: ElementDistributionProps) {
  if (!birthDate) return null
  const timeUnknown = birthTimeUnknown ?? !birthTime

  let saju: ReturnType<typeof getSajuData>
  try {
    saju = getSajuData(birthDate, birthTime || '12:00', isSolar, isLeapMonth)
  } catch (e) {
    logger.error('[ElementDistribution] getSajuData 실패:', e)
    return null
  }

  // 시간 미상이면 기본시(12:00)로 세운 시주 두 글자가 분포를 오염시키므로 제외한다(여섯 글자 기준).
  const dist: Record<string, number> = { ...saju.elementsDistribution }
  if (timeUnknown) {
    const { ganElement, zhiElement } = saju.pillars.time
    dist[ganElement] = Math.max(0, (dist[ganElement] ?? 0) - 1)
    dist[zhiElement] = Math.max(0, (dist[zhiElement] ?? 0) - 1)
  }

  const total = ELEMENTS.reduce((sum, el) => sum + (dist[el.key] ?? 0), 0)
  if (total === 0) return null

  const rows = ELEMENTS.map((el) => ({
    ...el,
    color: WU_XING_COLORS[el.key],
    count: dist[el.key] ?? 0,
    percent: Math.round(((dist[el.key] ?? 0) / total) * 100),
  }))

  const strongest = rows.reduce((a, b) => (b.count > a.count ? b : a))
  const weakest = rows.reduce((a, b) => (b.count < a.count ? b : a))
  const caption =
    strongest.count === weakest.count
      ? '다섯 기운이 고르게 자리한 구성입니다.'
      : `${strongest.name}(${strongest.key})이(가) 강하고 ${weakest.name}(${weakest.key})이(가) 약한 구성입니다.`

  return (
    <div className={className}>
      <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/70 mb-3 m-0">
        오행 분포 五行
      </h3>
      <ul className="flex flex-col gap-2 list-none p-0 m-0">
        {rows.map((el) => (
          <li key={el.key} className="flex items-center gap-2.5">
            <span className="font-serif text-[13px] w-4 text-center shrink-0" style={{ color: el.color }}>
              {el.key}
            </span>
            <span className="font-sans text-[11px] text-ink-light/80 w-4 shrink-0">{el.name}</span>
            <span className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <span
                className="block h-full rounded-full"
                style={{ width: `${el.percent}%`, backgroundColor: el.color, opacity: 0.85 }}
              />
            </span>
            <span className="font-sans text-[11px] tabular-nums text-ink-light/80 w-8 text-right shrink-0">
              {el.percent}%
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 font-sans text-[11px] leading-relaxed text-ink-light/70 break-keep m-0">
        {caption}
        {timeUnknown ? ' 출생 시각 미상이라 여섯 글자를 기준으로 계산했습니다.' : ''}
      </p>
    </div>
  )
}
