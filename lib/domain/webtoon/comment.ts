/**
 * 웹툰 회차 댓글 — 공개 표라 규율이 사연(story.ts)과 정반대다.
 *
 * ⚠️ 여기 적히는 것은 **누구나 읽는다**. 그래서 화면·서버 어디서도 사용자의 이메일·연락처를
 *    붙이지 않고, 표시 이름은 프로필의 공개 이름 하나뿐이다.
 * ⚠️ 지우기는 **소프트 삭제**다(deleted_at). 행을 지우면 "지워진 자리"가 사라져 대화가
 *    앞뒤 없이 붙어 읽힌다 — 무엇이 있었는지는 남기되 내용만 거둔다.
 *
 * 전 함수 순수·결정론. 검증은 여기 한 벌뿐이고 화면·서버가 같은 것을 쓴다.
 */

/** 댓글 한 줄의 길이 — 스키마 CHECK 와 **같은 값**이어야 한다. */
export const COMMENT_MIN = 1
export const COMMENT_MAX = 500

/** 한 사람이 한 회차에 달 수 있는 수. 대화는 되게 하되 도배는 막는다. */
export const COMMENT_PER_EPISODE_LIMIT = 20

/** 분당 호출 상한 — 서버 액션 rate limit 과 짝이다. */
export const COMMENT_RATE_PER_MIN = 10

export const COMMENT_PUBLIC_NOTICE = '댓글은 누구나 볼 수 있습니다 — 연락처나 개인정보는 적지 마세요.'

export const COMMENT_EMPTY_LINE = '아직 이야기 나눈 분이 없습니다. 첫 마디를 남겨 주세요.'

export const COMMENT_DELETED_LINE = '지워진 댓글입니다'

export interface CommentIssue {
  readonly message: string
}

/**
 * 댓글 검증 — 길이만 본다.
 *
 * 금칙어 필터를 여기 두지 않는 이유: 낱말 목록은 반드시 새고, 새는 순간 정상적인 말이 막힌다.
 * 신고·가림은 운영의 일이고 도메인의 일이 아니다.
 */
export function validateComment(body: string): CommentIssue | null {
  const n = body.trim().length
  if (n < COMMENT_MIN) return { message: '내용을 적어 주세요' }
  if (n > COMMENT_MAX) return { message: `댓글은 ${COMMENT_MAX}자까지입니다` }
  return null
}

export function isCommentValid(body: string): boolean {
  return validateComment(body) === null
}

/** 표시 이름 — 없으면 '독자'. 이메일·아이디를 절대 대신 쓰지 않는다(공개 표다). */
export function displayName(name: string | null | undefined): string {
  const n = (name ?? '').trim()
  return n.length > 0 ? n : '독자'
}

/** 'n분 전' 표기. 시각은 호출자가 준다(모듈은 시계를 읽지 않는다 — SSR/클라 불일치 방지). */
export function timeAgo(createdAtMs: number, nowMs: number): string {
  const diff = Math.floor((nowMs - createdAtMs) / 1000)
  if (!Number.isFinite(diff) || diff < 0) return '방금 전'
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}일 전`
  return `${Math.floor(diff / (86400 * 30))}달 전`
}
