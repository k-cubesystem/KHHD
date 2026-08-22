/**
 * 속풀이 스트리밍 응답 — SSE(P1-B).
 *
 * 왜 라우트인가: 서버 액션은 스트림을 돌려줄 수 없다. 조립·마무리·환급은 액션과 **같은 파이프라인**을
 * 쓰고(lib/services/shaman-chat-pipeline.ts), 여기서는 모델 청크를 흘려보내는 일만 한다.
 *
 * 이벤트: meta(감정·신위) → token(본문 조각들) → done(추천질문·잔여·인연) / error
 * 실패하면 클라가 서버 액션 경로로 폴백한다 — 그래서 여기서 죽어도 대화는 계속된다.
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { logUsage } from '@/lib/services/gemini-rate-limiter'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import {
  prepareShamanChat,
  finalizeShamanChat,
  refundConsumed,
  getGeminiModel,
  stripEmotionTag,
  EMPTY_RESPONSE_FALLBACK,
  type ShamanChatMessage,
} from '@/lib/services/shaman-chat-pipeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 감정 태그([[smile]])는 응답 맨 앞에 온다 — 이만큼 모은 뒤 떼어내고 흘리기 시작한다. */
const EMOTION_PROBE_CHARS = 24

interface StreamBody {
  message?: unknown
  history?: unknown
  familyMemberId?: unknown
}

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: NextRequest) {
  let body: StreamBody
  try {
    body = (await req.json()) as StreamBody
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message : ''
  const familyMemberId = typeof body.familyMemberId === 'string' ? body.familyMemberId : undefined
  const history = Array.isArray(body.history) ? (body.history as ShamanChatMessage[]) : []
  if (!message.trim()) return new Response('empty message', { status: 400 })

  // 인증·레이트리밋·잔량·차감·컨텍스트 — 액션과 동일 경로.
  const prep = await prepareShamanChat(message, history, familyMemberId)
  if (!prep.ok) {
    // 잔량 부족·로그인 필요 등은 스트림을 열지 않고 그대로 알린다(클라가 폴백하지 않도록 4xx).
    const status = prep.noCredits ? 402 : 400
    return Response.json({ error: prep.error, noCredits: prep.noCredits ?? false }, { status })
  }
  const prepared = prep.prepared

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now()
      let full = ''
      try {
        const model = getGeminiModel(prepared.systemInstruction)
        const chat = model.startChat({ history: prepared.geminiHistory })
        const result = await chat.sendMessageStream(prepared.safeMessage)

        let head = ''
        let headFlushed = false
        for await (const chunk of result.stream) {
          const piece = chunk.text()
          if (!piece) continue
          full += piece

          if (!headFlushed) {
            head += piece
            // 태그가 잘려 들어올 수 있어 앞부분을 조금 모은 뒤 판정한다.
            if (head.length < EMOTION_PROBE_CHARS) continue
            const { emotion } = stripEmotionTag(head, prepared.deityCode)
            const tagLen = head.length - head.replace(/^\s*\[\[[^\]]*\]\]\s*/, '').length
            controller.enqueue(sse('meta', { emotion, deityCode: prepared.deityCode }))
            const visible = head.slice(tagLen)
            if (visible) controller.enqueue(sse('token', { t: visible }))
            head = ''
            headFlushed = true
            continue
          }
          controller.enqueue(sse('token', { t: piece }))
        }

        // 응답이 EMOTION_PROBE_CHARS 보다 짧아 한 번도 흘리지 못한 경우
        if (!headFlushed) {
          const { emotion, text } = stripEmotionTag(head, prepared.deityCode)
          controller.enqueue(sse('meta', { emotion, deityCode: prepared.deityCode }))
          controller.enqueue(sse('token', { t: text }))
        }

        const usage = (await result.response).usageMetadata
        void logUsage({
          userId: prepared.userId,
          model: MODEL_FLASH,
          actionType: 'shaman_chat',
          inputTokens: usage?.promptTokenCount ?? null,
          outputTokens: usage?.candidatesTokenCount ?? null,
          latencyMs: Date.now() - startedAt,
          status: 'success',
        }).catch(() => {})

        // 인연 적립·추천 질문·잔여 — 액션과 같은 마무리.
        const done = await finalizeShamanChat(prepared, full)
        controller.enqueue(
          sse('done', {
            // 클라가 스트림으로 이미 그린 본문과 어긋나지 않게, 저장·복원용 정본도 함께 보낸다.
            full: done.responseText || EMPTY_RESPONSE_FALLBACK,
            suggestedQuestions: done.suggestedQuestions,
            remaining: done.remaining,
            deityCode: prepared.deityCode ?? undefined,
            emotion: done.emotion ?? undefined,
            bondLeveledUp: done.bondLeveledUp || undefined,
            bondLevelName: done.bondLevelName,
          })
        )
      } catch (e) {
        logger.error(e instanceof Error ? e : new Error(String(e)), '[chat/stream]')
        // 차감했는데 모델이 실패했으면 되돌린다(P0-F5) — 스트리밍도 같은 약속을 진다.
        await refundConsumed(prepared)
        controller.enqueue(sse('error', { message: '신당의 기운이 잠시 흐렸습니다. 잠시 후 다시 여쭤 주십시오.' }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // 프록시 버퍼링이 켜져 있으면 스트리밍이 무의미해진다(끝에 한 번에 도착).
      'X-Accel-Buffering': 'no',
    },
  })
}
