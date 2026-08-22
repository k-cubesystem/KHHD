/**
 * 속풀이(구 고민상담) 전용 GA4 이벤트 — P0-F4.
 *
 * ga4.ts 의 trackEvent 를 재사용하되 파일을 분리한다 — 챗 도메인 이벤트의 단일 출처(SRP).
 * 퍼널 사상(FUNNEL_BY_ACTION)은 종전대로 ga4.ts 한 곳이 든다.
 */
import { trackEvent } from './ga4'

export const GAChat = {
  /** 채팅 화면 진입(세션 로드 완료 시점). label = 좌정 신위 코드 | none */
  open: (deityCode: string | null) =>
    trackEvent({ action: 'chat_open', category: 'counsel', label: deityCode ?? 'none' }),
  /** 선문안 노출. label = 방문 유형(first/today_first/long_absence/resume/new_chat) */
  greetingShown: (visitKind: string) =>
    trackEvent({ action: 'chat_greeting_shown', category: 'counsel', label: visitKind }),
  /** 세션 첫 질문 — 활성화 순간 */
  firstQuestion: () => trackEvent({ action: 'chat_first_question', category: 'counsel' }),
  /** 질문 전송. value = 세션 내 문답 턴 수 */
  messageSent: (turn: number) => trackEvent({ action: 'chat_message_sent', category: 'counsel', value: turn }),
  /** 칩 탭. label = greeting(선문안 빠른답) | followup(답변 후 이어 여쭙기) */
  chipTap: (kind: 'greeting' | 'followup') => trackEvent({ action: 'chat_chip_tap', category: 'counsel', label: kind }),
  /** 한도 도달 — 전송 시도 시 잔여 0 */
  limitHit: () => trackEvent({ action: 'chat_limit_hit', category: 'counsel' }),
  /** 질문권 충전 성공(복채 1만냥 → 20회) */
  ticketPurchase: () => trackEvent({ action: 'chat_ticket_purchase', category: 'counsel' }),
  /** 복채 부족 → 상점 이동 */
  rechargeRedirect: () => trackEvent({ action: 'chat_recharge_redirect', category: 'counsel' }),
  /** 전송 실패(사용자 노출 오류) */
  sendError: () => trackEvent({ action: 'chat_send_error', category: 'counsel' }),
} as const
