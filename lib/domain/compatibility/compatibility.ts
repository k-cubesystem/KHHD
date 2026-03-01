/**
 * 궁합 점수 계산 (레거시 호환 래퍼)
 * 실제 분석은 lib/saju-engine/compatibility-engine.ts에서 수행
 */

import { SajuData } from '../saju/saju'

export function calculateCompatibilityScore(saju1: SajuData, saju2: SajuData): { score: number; comment: string } {
  // 레거시 API: 간단한 일간 기반 점수만 반환
  // 전체 8개 카테고리 분석은 compatibility-engine.ts의 calculateCompatibility 사용
  const dayGan1 = saju1.pillars.day.gan
  const dayGan2 = saju2.pillars.day.gan

  const GAN_ELEMENT: Record<string, string> = {
    甲: '木',
    乙: '木',
    丙: '火',
    丁: '火',
    戊: '土',
    己: '土',
    庚: '金',
    辛: '金',
    壬: '水',
    癸: '水',
  }

  const SAENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  const GEUK: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }

  const el1 = GAN_ELEMENT[dayGan1]
  const el2 = GAN_ELEMENT[dayGan2]

  let baseScore = 65

  if (el1 === el2) baseScore = 72
  else if (SAENG[el1] === el2 || SAENG[el2] === el1) baseScore = 80
  else if (GEUK[el1] === el2 || GEUK[el2] === el1) baseScore = 55

  const finalScore = Math.min(100, Math.max(0, baseScore))

  let comment = '서로의 기운이 무난하게 어우러지는 관계입니다.'
  if (finalScore >= 90) comment = '천생연분의 기운이 느껴집니다. 서로 부족한 오행을 완벽히 채워줍니다.'
  else if (finalScore >= 80) comment = '매우 긍정적인 관계입니다. 함께하면 시너지가 발생합니다.'
  else if (finalScore >= 70) comment = '서로의 기운이 무난하게 어우러지는 관계입니다.'
  else if (finalScore < 60) comment = '서로 다름을 인정하고 배려가 필요한 관계입니다.'

  return { score: finalScore, comment }
}
