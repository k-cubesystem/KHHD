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
      /**
       * 클라이언트에 **실제로 전달된** 본문 길이.
       *
       * 🔴 환급 판정의 기준이다(2026-08-26). 예전엔 catch 가 무조건 환급해서,
       *    답을 거의 다 읽은 뒤 탭을 닫거나 abort 하면 — 취소된 스트림에 enqueue 하면
       *    throw 가 나므로 catch 로 떨어진다 — **답은 받고 질문권은 돌려받는** 짓을
       *    레이트리밋 안에서 무한 반복할 수 있었다.
       *    `full`(모델 산출량)이 아니라 «전달 성공량»으로 재야 한다. 모델이 글자를 냈어도
       *    첫 토큰조차 못 보냈다면 사용자는 아무것도 못 받은 것이고, 그때는 환급이 옳다.
       */
      let delivered = 0
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
            if (visible) {
              controller.enqueue(sse('token', { t: visible }))
              delivered += visible.length
            }
            head = ''
            headFlushed = true
            continue
          }
          controller.enqueue(sse('token', { t: piece }))
          delivered += piece.length
        }

        // 응답이 EMOTION_PROBE_CHARS 보다 짧아 한 번도 흘리지 못한 경우
        if (!headFlushed) {
          const { emotion, text } = stripEmotionTag(head, prepared.deityCode)
          controller.enqueue(sse('meta', { emotion, deityCode: prepared.deityCode }))
          controller.enqueue(sse('token', { t: text }))
          delivered += text.length
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
        // 단 **아무것도 전달되지 않았을 때만**. 답을 받은 뒤의 중단은 환급 대상이 아니다.
        if (delivered === 0) {
          await refundConsumed(prepared)
        } else {
          logger.warn('[chat/stream] 전달 후 중단 — 환급하지 않는다', {
            userId: prepared.userId,
            delivered,
          })
        }
        // 이미 끊긴 스트림에 쓰면 또 throw 난다 — 오류 통지는 실패해도 무시한다.
        try {
          controller.enqueue(sse('error', { message: '신당의 기운이 잠시 흐렸습니다. 잠시 후 다시 여쭤 주십시오.' }))
        } catch {
          /* 클라이언트가 이미 떠났다 */
        }
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
