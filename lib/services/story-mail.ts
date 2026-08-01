import 'server-only'
import { logger } from '@/lib/utils/logger'
import { storyMailBody, storyMailSubject } from '@/lib/domain/webtoon/story'

/**
 * 「내 이야기」 접수 알림 메일 — **알림 층**이다.
 *
 * ⚠️ 이 모듈이 실패해도 **접수는 이미 DB 에 남아 있다**. 메일을 보내지 못했다고 접수를 되돌리면
 *    사람이 오래 쓴 사연이 사라진다 — 알림은 알림이고 접수는 접수다. 그래서 여기서는 던지지 않고
 *    보냈는지 여부만 돌려준다.
 *
 * ⚠️ **사연 원문과 연락처를 싣지 않는다**(도메인 storyMailBody 참고). 메일은 전달 경로가 길고
 *    한 번 나가면 회수할 수 없다. 내용은 DB 한 곳에만 있어야 한다.
 *
 * 의존성 0 — Resend REST 를 fetch 로 직접 부른다. 키가 없으면 조용히 건너뛴다(개발·미설정 환경).
 */

const ENDPOINT = 'https://api.resend.com/emails'

export interface StoryMailInput {
  submissionId: string
  title: string
  no: number | null
  receivedAt: string
  bodyLength: number
}

/** 보냈으면 true. 키 미설정·실패는 false 이고 **예외를 던지지 않는다**. */
export async function notifyStorySubmission(input: StoryMailInput): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const to = process.env.STORY_INBOX_EMAIL
  const from = process.env.STORY_MAIL_FROM
  if (!key || !to || !from) {
    // 미설정은 사고가 아니다 — 접수는 남았고 운영자는 관리 화면에서 본다
    logger.warn('[story-mail] 메일 설정이 없어 알림을 건너뜁니다(접수는 저장됨)')
    return false
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: storyMailSubject(input.title, input.no),
        text: storyMailBody({
          submissionId: input.submissionId,
          receivedAt: input.receivedAt,
          bodyLength: input.bodyLength,
        }),
      }),
    })
    if (!res.ok) {
      logger.error('[story-mail] 알림 전송 실패:', res.status)
      return false
    }
    return true
  } catch (e) {
    logger.error('[story-mail] 알림 전송 예외:', e)
    return false
  }
}
