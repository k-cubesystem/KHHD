/**
 * 속풀이 위기 신호 «건수» 기록 — 등급·규칙 라벨·경로 셋만 남긴다.
 *
 * 🔴 원문·회원 식별자를 싣지 않는다. 「누가 위기 신호를 보였다」는 그 자체로 민감한 정보이고, 기록은 국외(Sentry)로 나간다.
 * 🔴 logger.warn 을 쓰지 않는 이유 — Sentry 는 요청 스코프에 잡힌 정보(요청 본문 = 회원이 쓴 글 · 쿠키)를 이벤트에
 *    붙여 보낸다. 스코프 이벤트 프로세서는 통합(RequestData) «뒤»에 돌므로, 여기서 떼어 내야 확실히 빠진다.
 *
 * 'use server' 가 아니다 — 액션 파일에서 export 하면 공개 엔드포인트가 된다.
 */

import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/utils/logger'
import type { CrisisDetection } from '@/lib/domain/chat/crisis'

export type ChatSafetyPath = 'stream' | 'action'

export function recordChatSafetyEvent(detection: CrisisDetection, path: ChatSafetyPath): void {
  if (detection.level === 'none') return

  logger.info('[chat-safety]', detection.level, detection.reason, path)

  try {
    Sentry.withScope((scope) => {
      scope.setUser(null)
      scope.clearBreadcrumbs()
      scope.setTags({
        'chat_safety.level': detection.level,
        'chat_safety.reason': detection.reason,
        'chat_safety.path': path,
      })
      scope.setFingerprint(['chat-safety', detection.level, detection.reason])
      scope.addEventProcessor((event) => {
        delete event.request
        delete event.user
        delete event.breadcrumbs
        delete event.extra
        return event
      })
      Sentry.captureMessage(`[chat-safety] ${detection.level}`, 'info')
    })
  } catch {
    /* 기록 실패가 안내를 막아서는 안 된다 */
  }
}
