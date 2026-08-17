/**
 * Threads 댓글 1차 분류 — 규칙 기반·결정론·순수 함수.
 *
 * AI 를 «먼저» 부르지 않는 이유: 댓글의 대부분은 «저요/신청/궁합 봐주세요» 같은 짧은 정형이라
 * 규칙으로 충분하고, 결과가 재현돼야 어드민에서 «왜 이렇게 분류됐나»를 설명할 수 있다.
 * 규칙이 못 정한 것(other + 신뢰도 낮음)만 AI 로 넘긴다(threads-sync 크론).
 *
 * 분류값 (threads_replies.classification):
 *   apply    — 이벤트 신청 의사 (→ 신청 링크 답글 큐)
 *   question — 사주·서비스 질문 (→ 사람이 답할 큐, 자동 답글 안 함)
 *   chat     — 감상·인사·잡담 (→ 무응답, 필요시 좋아요만)
 *   spam     — 광고·링크 도배·욕설 (→ 숨김 큐)
 *   other    — 판정 불가 (→ AI 2차)
 */

export type ReplyClass = 'apply' | 'question' | 'chat' | 'spam' | 'other'

export interface ClassifyResult {
  classification: ReplyClass
  /** 0~1. 규칙 매칭 강도. 0.6 미만이면 AI 2차 대상 */
  confidence: number
  /** 어떤 규칙이 잡았나(어드민 표시·디버그) */
  reason: string
}

const APPLY = [
  /저요/,
  /신청/,
  /참여/,
  /해\s*주세요/,
  /봐\s*주세요/,
  /부탁/,
  /하고\s*싶/,
  /궁금/,
  /저도/,
  /선정/,
  /뽑아/,
  /응모/,
  /me too/i,
  /please/i,
]
const QUESTION = [/\?/, /어떻게/, /뭐예요/, /뭔가요/, /맞나요/, /인가요/, /얼마/, /언제/, /어디/, /왜/, /무슨/]
const CHAT = [
  /감사/,
  /좋아요/,
  /멋지/,
  /예쁘/,
  /대박/,
  /응원/,
  /화이팅/,
  /파이팅/,
  /ㅋㅋ/,
  /ㅎㅎ/,
  /굿/,
  /최고/,
  /안녕/,
  /반가/,
]
const SPAM_STRONG = [
  /https?:\/\/(?!k-haehwadang\.com)/i, // 외부 링크
  /카톡\s*[:：]?\s*[A-Za-z0-9_]{4,}/, // 카톡 아이디 남기기
  /텔레그램|텔레\s*그램|telegram/i,
  /(무료|100%)\s*(수익|배당|입금)/,
  /토토|카지노|바카라|주식\s*리딩|코인\s*리딩/,
  /팔로우\s*하면\s*.*팔로우/,
]
const PROFANITY = [/시발|씨발|병신|개새|좆|썅/]

/** 규칙 분류. 순서가 곧 우선순위: 스팸 > 신청 > 질문 > 잡담. */
export function classifyReply(text: string | null | undefined): ClassifyResult {
  const t = (text ?? '').trim()
  if (!t) return { classification: 'other', confidence: 0, reason: 'empty' }

  const spamHits = SPAM_STRONG.filter((r) => r.test(t)).length + PROFANITY.filter((r) => r.test(t)).length
  if (spamHits > 0)
    return { classification: 'spam', confidence: Math.min(1, 0.7 + spamHits * 0.15), reason: `spam×${spamHits}` }

  const applyHits = APPLY.filter((r) => r.test(t)).length
  const questionHits = QUESTION.filter((r) => r.test(t)).length
  const chatHits = CHAT.filter((r) => r.test(t)).length

  // 신청 의사가 있으면 질문 표지가 있어도 신청으로 본다("궁합 봐주세요?" 는 신청)
  if (applyHits > 0) {
    return { classification: 'apply', confidence: Math.min(1, 0.6 + applyHits * 0.15), reason: `apply×${applyHits}` }
  }
  if (questionHits > 0 && t.length >= 6) {
    return {
      classification: 'question',
      confidence: Math.min(1, 0.55 + questionHits * 0.1),
      reason: `question×${questionHits}`,
    }
  }
  if (chatHits > 0) {
    return { classification: 'chat', confidence: Math.min(1, 0.6 + chatHits * 0.15), reason: `chat×${chatHits}` }
  }
  // 아주 짧은 무표지 댓글(이모지 한두 개 등)은 잡담으로
  if (t.length <= 4) return { classification: 'chat', confidence: 0.5, reason: 'short' }
  return { classification: 'other', confidence: 0.3, reason: 'no-rule' }
}

/** AI 2차 분류가 필요한가 — 규칙이 확신 못 한 것만. */
export function needsAiClassification(r: ClassifyResult): boolean {
  return r.classification === 'other' || r.confidence < 0.6
}

/** 스레드 아이디 정규화 — 응모 dedupe 키와 댓글 매칭에 같은 규칙을 쓴다. */
export function normalizeThreadsUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
}
