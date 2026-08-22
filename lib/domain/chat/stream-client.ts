/**
 * 속풀이 스트리밍 수신부(P1-B) — /api/chat/stream 의 SSE 를 읽어 콜백으로 흘린다.
 *
 * EventSource 를 못 쓰는 이유: 히스토리·대상을 실어야 해서 POST 여야 한다(EventSource 는 GET 전용).
 * 그래서 fetch + ReadableStream 을 직접 파싱한다 — 파서는 순수 함수로 갈라 두어 테스트가 잡는다.
 *
 * 🔴 폴백 규칙: 스트림이 **열린 뒤**의 실패는 폴백하지 않는다. 그 시점엔 이미 질문권이 차감됐고
 *    서버가 환급까지 책임지므로, 여기서 서버 액션을 다시 부르면 **두 번 차감**된다.
 *    폴백은 «연결 자체가 실패»했을 때(fetch throw · 5xx)만이다.
 */

export interface SseEvent {
  event: string
  data: string
}

/** SSE 버퍼를 완성된 이벤트들과 잔여 문자열로 가른다. 순수 — 단위테스트 대상. */
export function parseSseBuffer(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = []
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  for (const block of parts) {
    let event = 'message'
    const dataLines: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    }
    if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') })
  }
  return { events, rest }
}

/** 이 브라우저에서 스트리밍을 시도해도 되는지 — 미지원이면 애초에 액션 경로로 간다(차감 후 유실 방지). */
export function canStream(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.fetch === 'function' &&
    typeof ReadableStream !== 'undefined' &&
    typeof TextDecoder !== 'undefined'
  )
}

export interface StreamDonePayload {
  full: string
  suggestedQuestions?: string[]
  remaining?: { free: number; ad: number; purchased: number; total: number }
  deityCode?: string
  emotion?: string
  bondLeveledUp?: boolean
  bondLevelName?: string
}

export interface StreamHandlers {
  onMeta?: (meta: { emotion?: string; deityCode?: string | null }) => void
  onToken?: (text: string) => void
}

export type StreamOutcome =
  | { status: 'done'; payload: StreamDonePayload }
  /** 서버가 스트림 안에서 알린 실패 — 서버가 환급까지 마쳤다. 폴백 금지. */
  | { status: 'error'; message: string }
  /** 잔량 소진·인증 실패 등 — 스트림이 열리지 않았고 차감도 없다. */
  | { status: 'rejected'; message: string; noCredits: boolean }
  /** 연결 자체가 실패 — 서버 액션으로 폴백해도 안전하다. */
  | { status: 'unavailable' }

export async function streamShamanChat(
  payload: { message: string; history: unknown[]; familyMemberId?: string },
  handlers: StreamHandlers = {}
): Promise<StreamOutcome> {
  let res: Response
  try {
    res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    return { status: 'unavailable' }
  }

  if (!res.ok) {
    if (res.status >= 500) return { status: 'unavailable' }
    const body = (await res.json().catch(() => ({}))) as { error?: string; noCredits?: boolean }
    return {
      status: 'rejected',
      message: body.error ?? '요청을 처리하지 못했습니다.',
      noCredits: body.noCredits === true,
    }
  }
  if (!res.body) return { status: 'unavailable' }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let outcome: StreamOutcome | null = null

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { events, rest } = parseSseBuffer(buffer)
      buffer = rest
      for (const ev of events) {
        if (ev.event === 'token') {
          const { t } = JSON.parse(ev.data) as { t?: string }
          if (t) handlers.onToken?.(t)
        } else if (ev.event === 'meta') {
          handlers.onMeta?.(JSON.parse(ev.data) as { emotion?: string; deityCode?: string | null })
        } else if (ev.event === 'done') {
          outcome = { status: 'done', payload: JSON.parse(ev.data) as StreamDonePayload }
        } else if (ev.event === 'error') {
          const { message } = JSON.parse(ev.data) as { message?: string }
          outcome = { status: 'error', message: message ?? '오류가 발생했습니다.' }
        }
      }
    }
  } catch {
    // 스트림이 중간에 끊겼다 — 이미 차감된 상태라 폴백하지 않는다(서버가 환급을 진다).
    return outcome ?? { status: 'error', message: '연결이 끊겼습니다. 잠시 후 다시 여쭤 주십시오.' }
  }

  return outcome ?? { status: 'error', message: '응답을 받지 못했습니다. 잠시 후 다시 여쭤 주십시오.' }
}
