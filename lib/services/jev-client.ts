/**
 * Jev(TypeSafe AI) 클라이언트 — 글을 쓰지 않고 «미리 정해 둔 답» 가운데 하나를 확률과 함께 돌려주는 결정형 모델.
 *
 * 쓰는 자리: 분류·라우팅·점수·예/아니오 판정처럼 답의 범위가 닫혀 있는 단계. 풀이 생성은 Gemini 가 한다.
 * 쓰지 않는 자리: 산수·날짜 계산·여러 단계 추론(공식 문서가 밝힌 약점), 그리고 «같은 사주 = 같은 답»이어야 하는
 * 테마운세 판정 엔진(lib/domain/theme-fortune/resolvers) — 그쪽은 결정론 코드가 정본이다.
 *
 * 계약: 어떤 실패든 null 을 돌려준다(키 없음·시간 초과·HTTP 오류·모양이 다른 응답). 부르는 쪽은 null 이면
 * 기존 경로로 떨어져야 한다 — Jev 는 덧붙이는 단계지 의존하는 단계가 아니다.
 *
 * 🔴 state 는 TypeSafe(미국) 서버로 나간다. 회원이 쓴 글·이름·생년월일을 넣으려면 개인정보처리방침의
 *    처리위탁·국외이전 고지를 먼저 고쳐야 한다. 지금 쓰는 곳(Threads 공개 댓글)은 회원 정보가 아니다.
 * 🔴 state 안의 지시문에 흔들릴 수 있다(공식 문서 «Adversarial Content») — 결과로 되돌릴 수 없는 일을 하지 말 것.
 *
 * API: https://docs.typesafe.ai/api.md (확인일 2026-09-20)
 */
import { logUsage } from '@/lib/services/gemini-rate-limiter'
import { logger } from '@/lib/utils/logger'

const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
export const JEV_MODEL = 'jev-latest'
const JEV_TIMEOUT_MS = 2500
/** 관계없는 내용이 길수록 정확도가 떨어진다(공식 문서 «Context Overload») — 비용 상한도 겸한다. */
const JEV_MAX_STATE_CHARS = 4000

export type JevQuestion =
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] }
  | { type: 'noul'; instructions: string; criteria?: { true: string; false: string } }

export type JevAnswer =
  | { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: 'score'; score: number; confidence: number }
  | { type: 'noul'; noul: number }

export interface JevAskOptions<K extends string> {
  state: string
  questions: Record<K, JevQuestion>
  /** 사용량 로그의 action_type — lib/domain/gemini/actions 에 등록된 값 */
  actionType: string
  userId?: string | null
}

export function isJevEnabled(): boolean {
  return !!process.env.TYPESAFE_API_KEY
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1
}

function parseAnswer(question: JevQuestion, raw: unknown): JevAnswer | null {
  if (!isRecord(raw) || raw.type !== question.type) return null
  if (question.type === 'noul') {
    return isUnitInterval(raw.noul) ? { type: 'noul', noul: raw.noul } : null
  }
  if (!isUnitInterval(raw.confidence)) return null
  if (question.type === 'score') {
    return typeof raw.score === 'number' ? { type: 'score', score: raw.score, confidence: raw.confidence } : null
  }
  if (typeof raw.choice !== 'string' || !(raw.choice in question.criteria) || !isRecord(raw.probabilities)) return null
  const probabilities: Record<string, number> = {}
  for (const [option, p] of Object.entries(raw.probabilities)) {
    if (typeof p === 'number') probabilities[option] = p
  }
  return { type: 'choice', choice: raw.choice, probabilities, confidence: raw.confidence }
}

export async function askJev<K extends string>(options: JevAskOptions<K>): Promise<Record<K, JevAnswer> | null> {
  const apiKey = process.env.TYPESAFE_API_KEY
  if (!apiKey) return null

  const startedAt = Date.now()
  const log = (status: string, inputTokens: number | null, outputTokens: number | null, errorCode?: string) =>
    void logUsage({
      userId: options.userId ?? null,
      model: JEV_MODEL,
      actionType: options.actionType,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startedAt,
      status,
      errorCode: errorCode ?? null,
    }).catch(() => {})

  try {
    const res = await fetch(JEV_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: JEV_MODEL,
        state: options.state.slice(0, JEV_MAX_STATE_CHARS),
        questions: options.questions,
      }),
      signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
    })
    if (!res.ok) {
      log(res.status === 429 || res.status === 529 ? 'rate_limited' : 'error', null, null, String(res.status))
      logger.warn('[Jev] 호출 실패 — 기존 경로로 진행', { status: res.status, actionType: options.actionType })
      return null
    }

    const body: unknown = await res.json()
    const rawAnswers = isRecord(body) && isRecord(body.answers) ? body.answers : null
    const usage = isRecord(body) && isRecord(body.usage) ? body.usage : {}
    const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0
    const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0

    const answers = {} as Record<K, JevAnswer>
    for (const key of Object.keys(options.questions) as K[]) {
      const parsed = rawAnswers ? parseAnswer(options.questions[key], rawAnswers[key]) : null
      if (!parsed) {
        log('error', inputTokens, outputTokens, 'bad_shape')
        logger.warn('[Jev] 응답 모양이 계약과 다름 — 기존 경로로 진행', { key, actionType: options.actionType })
        return null
      }
      answers[key] = parsed
    }
    log('success', inputTokens, outputTokens)
    return answers
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')
    log(timedOut ? 'timeout' : 'error', null, null)
    logger.warn('[Jev] 호출 예외 — 기존 경로로 진행', {
      actionType: options.actionType,
      message: e instanceof Error ? e.message : String(e),
    })
    return null
  }
}

/** 확신이 기준에 못 미치면 null — 부르는 쪽이 기존 경로로 넘긴다(공식 문서 «confidence-gated routing»). */
export function confidentChoice<T extends string>(
  answer: JevAnswer | undefined,
  allowed: readonly T[],
  minConfidence: number
): T | null {
  if (!answer || answer.type !== 'choice' || answer.confidence < minConfidence) return null
  return allowed.find((option) => option === answer.choice) ?? null
}
