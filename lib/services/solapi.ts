/**
 * Solapi 클라이언트 설정
 * 카카오 알림톡(Alimtalk) 발송을 위한 서비스 레이어
 */

import { SolapiMessageService } from 'solapi'

// 환경변수 검증
const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET
const SOLAPI_PFID = process.env.SOLAPI_PFID // 카카오 채널 ID (ex: KA01PF...)
// 발신번호: SOLAPI_SENDER 또는 SOLAPI_SENDER_PHONE (기존 환경변수 호환)
const SOLAPI_SENDER = process.env.SOLAPI_SENDER || process.env.SOLAPI_SENDER_PHONE || ''

/**
 * 알림톡 템플릿 코드 상수
 * Solapi 콘솔에서 승인된 템플릿 코드로 교체 필요
 */
export const ALIMTALK_TEMPLATES = {
  /** 오늘의 운세 요약 */
  DAILY_FORTUNE: 'KA01TP000000000000000000000000001',
  /** 회원가입 환영 */
  WELCOME: 'KA01TP000000000000000000000000002',
  /** 복채 충전 완료 */
  PAYMENT_COMPLETE: 'KA01TP000000000000000000000000003',
  /** 출석 체크 보상 */
  ATTENDANCE_REWARD: 'KA01TP000000000000000000000000004',
  /** 룰렛 당첨 */
  ROULETTE_WIN: 'KA01TP000000000000000000000000005',
} as const

export type AlimtalkTemplateCode = (typeof ALIMTALK_TEMPLATES)[keyof typeof ALIMTALK_TEMPLATES]

/**
 * Solapi MessageService 인스턴스 생성
 * API 키가 없으면 null 반환 (개발 환경 대응)
 */
export function getSolapiClient(): SolapiMessageService | null {
  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET) {
    console.warn('[Solapi] API 키가 설정되지 않았습니다. SOLAPI_API_KEY, SOLAPI_API_SECRET 환경변수를 확인하세요.')
    return null
  }
  return new SolapiMessageService(SOLAPI_API_KEY, SOLAPI_API_SECRET)
}

export { SOLAPI_PFID, SOLAPI_SENDER }
