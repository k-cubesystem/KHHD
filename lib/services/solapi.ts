/**
 * Solapi 클라이언트 설정 + 알림톡 발송 (서버 내부 전용).
 *
 * 🔴 발송 함수를 `'use server'` 파일에 두지 않는다. `'use server'` 의 export 는 전부 **공개 엔드포인트**라
 *    «아무 번호에 아무 템플릿» 을 쏘는 문이 열린다(복채 증액 서버액션 사고와 같은 종류).
 *    호출자는 서버 내부(서버 액션 본문·크론·어드민 액션)에서만 이 모듈을 부른다.
 */

import 'server-only'

import { SolapiMessageService } from 'solapi'
import { logger } from '@/lib/utils/logger'

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
  /** 이용권 구매 완료 */
  PAYMENT_COMPLETE: 'KA01TP000000000000000000000000003',
} as const

export type AlimtalkTemplateCode = (typeof ALIMTALK_TEMPLATES)[keyof typeof ALIMTALK_TEMPLATES]

/**
 * Solapi MessageService 인스턴스 생성
 * API 키가 없으면 null 반환 (개발 환경 대응)
 */
export function getSolapiClient(): SolapiMessageService | null {
  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET) {
    logger.warn('[Solapi] API 키가 설정되지 않았습니다. SOLAPI_API_KEY, SOLAPI_API_SECRET 환경변수를 확인하세요.')
    return null
  }
  return new SolapiMessageService(SOLAPI_API_KEY, SOLAPI_API_SECRET)
}

/**
 * 아직 승인받지 못한 «자리표시» 템플릿 코드인가.
 * 위 상수는 KA01TP + 0000…1 형태의 가짜 코드다. 이대로 보내면 솔라피가 전건 거절해
 * «고쳤는데도 0통, 이유 모름» 이 된다 — 보내기 전에 걸러 이유를 남긴다.
 */
export function isPlaceholderTemplateCode(code: string): boolean {
  return /^0+\d{1,3}$/.test(code.replace(/^KA01TP/, ''))
}

/** 점검을 통과하면 발송에 쓸 값을 함께 돌려준다(호출부에서 다시 undefined 검사를 하지 않도록). */
export type AlimtalkPreflight = { ok: true; pfId: string; sender: string } | { ok: false; reason: string }

/**
 * 발송 전 점검 — 「고쳐도 0통」 의 다섯 원인 중 이 모듈이 아는 셋(키·PFID·발신번호)과
 * 승인 템플릿 유무를 한 번에 판정한다. 나머지 둘(시스템 스위치·수신자 동의)은 호출자가 본다.
 */
export function preflightAlimtalk(templateCode: string): AlimtalkPreflight {
  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET) return { ok: false, reason: 'SOLAPI_API_KEY/SECRET 미설정' }
  if (!SOLAPI_PFID) return { ok: false, reason: 'SOLAPI_PFID(카카오 채널 ID) 미설정' }
  if (!SOLAPI_SENDER) return { ok: false, reason: 'SOLAPI_SENDER(발신번호) 미설정' }
  if (!templateCode) return { ok: false, reason: '템플릿 코드가 비어 있음' }
  if (isPlaceholderTemplateCode(templateCode)) {
    return { ok: false, reason: `승인 템플릿 미등록 — 자리표시 코드(${templateCode})` }
  }
  return { ok: true, pfId: SOLAPI_PFID, sender: SOLAPI_SENDER }
}

export interface AlimtalkSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * 알림톡 한 통 발송 — 발송의 **단일 출처**.
 * @param phoneNumber 수신자 전화번호 (010-XXXX-XXXX 또는 01000000000)
 * @param templateCode 승인된 알림톡 템플릿 코드
 * @param variables 템플릿 변수 (#{변수명} 치환)
 */
export async function sendAlimtalkMessage(
  phoneNumber: string,
  templateCode: string,
  variables: Record<string, string> = {}
): Promise<AlimtalkSendResult> {
  const preflight = preflightAlimtalk(templateCode)
  if (!preflight.ok) return { success: false, error: preflight.reason }

  const client = getSolapiClient()
  if (!client) return { success: false, error: 'Solapi 클라이언트가 초기화되지 않았습니다.' }

  try {
    const response = await client.sendOne({
      to: phoneNumber.replace(/-/g, ''),
      from: preflight.sender,
      kakaoOptions: {
        pfId: preflight.pfId,
        templateId: templateCode,
        variables,
      },
    })

    return { success: true, messageId: response.messageId }
  } catch (err: unknown) {
    logger.error('[Alimtalk] 발송 실패:', err)
    const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: msg }
  }
}

export { SOLAPI_PFID, SOLAPI_SENDER }
