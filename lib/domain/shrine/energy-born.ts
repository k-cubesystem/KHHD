import { getSajuData, type SajuData } from '@/lib/domain/saju/saju'
import { computeElementProfile } from '@/lib/domain/saju/element-profile'
import { logger } from '@/lib/utils/logger'
import { DEFAULT_BASE } from './energy'
import type { Element } from './types'

export interface BornEnergy {
  /** 막대 자(5~100) — 신당 살림 계산(computeEnergy)이 이 위에 얹힌다. */
  base: Record<Element, number>
  /** 오행 비율(합 100) — 가족·인연 관리 화면이 그리는 «타고난 기운». */
  share: Record<Element, number>
  /** 가장 옅은 기운. 생년월일이 없어 유도하지 못하면 null. */
  yongsin: Element | null
}

const FLAT_SHARE: Record<Element, number> = { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 }

/** 명식 → 타고난 기운. 지장간·자리 무게를 반영한 세력 프로필(element-profile)이 정본이다. */
export function baseFromSajuData(saju: Pick<SajuData, 'pillars'>): BornEnergy {
  const profile = computeElementProfile(saju)
  return { base: profile.bar, share: profile.share, yongsin: profile.weakest }
}

/**
 * 생년월일 → 「타고난 기운」. 저장하지 않는다.
 *
 * 기운 지도·허브 요약·처방전·신당 프로필이 같은 함수를 쓴다 — 넷이 «타고난 값»을 각자 계산하면
 * 같은 사람에게 다른 수가 나온다. 생년월일이 없거나 계산이 실패하면 평평한 기본값이다.
 */
export function baseFromBirth(birthDate: string | null, birthTime: string | null, isSolar: boolean): BornEnergy {
  if (!birthDate) return { base: { ...DEFAULT_BASE }, share: { ...FLAT_SHARE }, yongsin: null }
  try {
    return baseFromSajuData(getSajuData(birthDate, birthTime || '12:00', isSolar))
  } catch (e) {
    logger.warn('[energy-born] 사주 유도 실패, 기본값 사용:', e)
    return { base: { ...DEFAULT_BASE }, share: { ...FLAT_SHARE }, yongsin: null }
  }
}
