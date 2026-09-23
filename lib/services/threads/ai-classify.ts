/**
 * Threads 댓글 AI 2차 분류 — 규칙이 확신 못 한 댓글만 여기로 온다(threads-sync 크론).
 * Jev 가 확신하면 그 답을 쓰고, 키가 없거나 실패했거나 확신이 낮으면 Gemini 로 넘긴다.
 *
 * 크론 한 번(`maxDuration` 60초)에 묶인 예산을 이 객체가 든다:
 * 🔴 상한은 «성공»이 아니라 «시도»로 센다. 성공만 세면 둘 다 null 인 날에는 상한에 영영 닿지 않아
 *    댓글마다 외부 호출 둘(Jev 최대 2.5초 + Gemini)이 돌고, 함수가 시간 초과로 죽는다. 죽으면 이미 적재된
 *    댓글은 다음 실행이 23505 로 건너뛰어 «신청» 초안이 영영 안 생긴다.
 * 🔴 Jev 가 한 번 실패하면 그 실행에서는 다시 부르지 않는다 — 멎은 상대에게 댓글마다 2.5초씩 기다리지 않는다.
 */
import {
  JEV_REPLY_MIN_CONFIDENCE,
  REPLY_CLASSES,
  REPLY_CLASS_CRITERIA,
  REPLY_CLASS_INSTRUCTIONS,
  type ReplyClass,
} from '@/lib/domain/threads/classify'
import { GEMINI_OUTPUT_TOKENS_FLOOR } from '@/lib/config/ai-models'
import { generateAIContent } from '@/lib/services/ai-client'
import { askJev, confidentChoice, isJevEnabled } from '@/lib/services/jev-client'
import { logger } from '@/lib/utils/logger'

const MAX_COMMENT_CHARS = 500

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isReplyClass(value: unknown): value is ReplyClass {
  return REPLY_CLASSES.some((c) => c === value)
}

export interface ReplyAiClassifier {
  /** 예산이 남았고 댓글에 글자가 있을 때만 AI 를 부른다. 못 정하면 null(규칙 판정이 그대로 남는다). */
  classify(text: string | null | undefined): Promise<ReplyClass | null>
}

export function createReplyAiClassifier(maxAttempts: number): ReplyAiClassifier {
  let attempts = 0
  let jevDown = false

  async function viaJev(text: string): Promise<ReplyClass | null> {
    if (jevDown || !isJevEnabled()) return null
    const answers = await askJev({
      state: text,
      questions: { intent: { type: 'choice', instructions: REPLY_CLASS_INSTRUCTIONS, criteria: REPLY_CLASS_CRITERIA } },
      actionType: 'threads_classify_jev',
    })
    if (!answers) {
      jevDown = true
      return null
    }
    return confidentChoice(answers.intent, REPLY_CLASSES, JEV_REPLY_MIN_CONFIDENCE)
  }

  async function viaGemini(text: string): Promise<ReplyClass | null> {
    try {
      const res = await generateAIContent({
        featureKey: 'threads-classify',
        systemPrompt:
          '스레드 댓글을 다음 중 하나로 분류합니다: apply(이벤트 신청·참여 의사), question(질문), chat(감상·인사·잡담), spam(광고·도배·욕설), other. JSON {"c":"..."} 만 답하세요.',
        userPrompt: text,
        // 🔴 한도는 «생각 + 본문»의 합이다. 2026-09-23 실측(댓글 3종 실호출): 생각 78~203 · 본문 5토큰 · 전부 STOP —
        //    1,024 로도 돌았지만 생각량은 댓글이 정하므로 다른 호출과 같은 안전선을 쓴다(과금은 쓴 만큼이라 비용 동일).
        maxTokens: GEMINI_OUTPUT_TOKENS_FLOOR,
        temperature: 0,
        jsonMode: true,
        actionType: 'threads_classify',
      })
      const parsed: unknown = JSON.parse(res.text)
      const c = isRecord(parsed) ? parsed.c : undefined
      return isReplyClass(c) ? c : null
    } catch (e) {
      logger.warn('[threads-sync] AI 분류 실패', e instanceof Error ? e.message : String(e))
      return null
    }
  }

  return {
    async classify(raw) {
      const text = (raw ?? '').trim().slice(0, MAX_COMMENT_CHARS)
      if (!text || attempts >= maxAttempts) return null
      attempts += 1
      return (await viaJev(text)) ?? (await viaGemini(text))
    },
  }
}
