import type { DestinyTarget } from '@/app/actions/user/destiny'

/**
 * Destiny Target 유틸리티 함수 모음
 * - Server Action이 아닌 순수 함수들
 */

/**
 * Destiny Target의 출생 데이터 유효성 검증
 * - 사주 분석을 위해서는 birth_date가 필수
 */
export function hasValidBirthData(target: DestinyTarget): boolean {
  return !!target.birth_date
}

/**
 * Destiny Target의 이미지 URL 가져오기
 * - 본인: avatar_url 사용
 * - 가족/친구: face_image_url 사용
 */
export function getTargetImageUrl(target: DestinyTarget): string | null {
  if (target.target_type === 'self') {
    return target.avatar_url
  }
  return target.face_image_url
}

/**
 * 관계 유형에 따른 색상 반환
 * - 본인: primary (gold)
 * - 가족: wood (green)
 * - 연인/배우자: seal (red)
 * - 직장: metal (silver)
 * - 기타: default
 */
export function getTargetColor(relationType: string, targetType: string): string {
  if (targetType === 'self') return 'primary'
  if (
    relationType.includes('가족') ||
    relationType.includes('부모') ||
    relationType.includes('자녀')
  )
    return 'wood'
  if (relationType.includes('연인') || relationType.includes('배우자')) return 'seal'
  if (
    relationType.includes('직장') ||
    relationType.includes('동료') ||
    relationType.includes('상사')
  )
    return 'metal'
  return 'default'
}

/**
 * 출생 데이터 포맷팅
 * - 생년월일 + 생시 + 양력/음력 표시
 */
export function formatBirthData(target: DestinyTarget): string {
  if (!target.birth_date) return '출생 정보 없음'

  let formatted = target.birth_date

  if (target.birth_time) {
    formatted += ` ${target.birth_time}`
  }

  if (target.calendar_type) {
    formatted += ` (${target.calendar_type === 'solar' ? '양력' : '음력'})`
  }

  return formatted
}
