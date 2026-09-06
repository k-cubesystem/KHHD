import { getSajuData } from '@/lib/domain/saju/saju'
import { logger } from '@/lib/utils/logger'
import { DEFAULT_BASE, deriveBaseFromDistribution } from './energy'
import type { Element } from './types'

export interface BornEnergy {
  base: Record<Element, number>
  /** 사주 분포에서 가장 옅은 기운. 생년월일이 없어 유도하지 못하면 null. */
  yongsin: Element | null
}

/**
 * 생년월일 → 「타고난 기운」(사주 오행 분포에서 유도). 저장하지 않는다.
 *
 * 기운 지도·허브 요약·처방전이 같은 함수를 쓴다 — 셋이 «타고난 값»을 각자 계산하면
 * 같은 사람에게 다른 수가 나온다. 생년월일이 없거나 계산이 실패하면 평평한 기본값이다.
 */
export function baseFromBirth(birthDate: string | null, birthTime: string | null, isSolar: boolean): BornEnergy {
  if (!birthDate) return { base: { ...DEFAULT_BASE }, yongsin: null }
  try {
    const saju = getSajuData(birthDate, birthTime || '12:00', isSolar)
    return deriveBaseFromDistribution(saju.elementsDistribution)
  } catch (e) {
    logger.warn('[energy-born] 사주 유도 실패, 기본값 사용:', e)
    return { base: { ...DEFAULT_BASE }, yongsin: null }
  }
}
