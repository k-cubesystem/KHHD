import { EnhancedManseResult, DaewoonPeriod } from '@/lib/domain/saju/manse'

/**
 * 사주 팔자를 한 줄 텍스트로 포맷팅
 */
export function formatSajuText(manse: EnhancedManseResult): string {
  return `${manse.year.korean} ${manse.month.korean} ${manse.day.korean} ${manse.time.korean}`
}

/**
 * 만세력 상세 정보를 텍스트로 포맷팅
 */
export function formatManseDetails(manse: EnhancedManseResult): string {
  const elements = calculateElements(manse)

  return `
연주: ${manse.year.korean} (${manse.year.label})
월주: ${manse.month.korean} (${manse.month.label})
일주: ${manse.day.korean} (${manse.day.label})
시주: ${manse.time.korean} (${manse.time.label})

오행 분포:
목(木): ${elements.Wood}
화(火): ${elements.Fire}
토(土): ${elements.Earth}
금(金): ${elements.Metal}
수(水): ${elements.Water}

출생 절기: ${manse.birthSolarTerm || '미상'}
  `.trim()
}

/**
 * 대운을 텍스트로 포맷팅
 */
export function formatDaewoon(daewoon: DaewoonPeriod[]): string {
  return daewoon
    .map((d) => `${d.startAge}-${d.endAge}세: ${d.pillar.korean} (${d.startYear}-${d.endYear})`)
    .join('\n')
}

/**
 * 오행 분포 계산
 */
export function calculateElements(manse: EnhancedManseResult): Record<string, number> {
  const elements: Record<string, number> = {
    Wood: 0,
    Fire: 0,
    Earth: 0,
    Metal: 0,
    Water: 0,
  }

  ;[manse.year, manse.month, manse.day, manse.time].forEach((pillar) => {
    if (pillar.ganElement) {
      elements[pillar.ganElement]++
    }
    if (pillar.jiElement) {
      elements[pillar.jiElement]++
    }
  })

  return elements
}
