/**
 * @jest-environment node
 */
/**
 * 속풀이 SSE 라우트 — 위기 신호(crisis) 응답.
 *
 * 🔴 고정 안내도 평소와 같은 규약(meta → token → done)으로 나가야 한다. 4xx 로 끊으면 클라이언트가 토스트만 띄우고
 *    메시지를 되돌린다 — 안내문이 화면에 남지 않는다.
 */
import type { NextRequest } from 'next/server'
import { CRISIS_REPLY } from '@/lib/domain/chat/crisis'
import { parseSseBuffer } from '@/lib/domain/chat/stream-client'

const prepareShamanChat = jest.fn()
const getGeminiModel = jest.fn()
const refundConsumed = jest.fn()

jest.mock('@/lib/services/shaman-chat-pipeline', () => ({
  prepareShamanChat: (...args: unknown[]) => prepareShamanChat(...args),
  getGeminiModel: (...args: unknown[]) => getGeminiModel(...args),
  refundConsumed: (...args: unknown[]) => refundConsumed(...args),
  finalizeShamanChat: jest.fn(),
  stripEmotionTag: jest.fn(),
  EMPTY_RESPONSE_FALLBACK: '',
}))
jest.mock('@/lib/services/gemini-rate-limiter', () => ({ logUsage: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn(), info: jest.fn() },
}))

type PostHandler = (typeof import('../route'))['POST']
let POST: PostHandler

beforeAll(async () => {
  ;({ POST } = await import('../route'))
})

function request(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest
}

describe('POST /api/chat/stream — crisis', () => {
  it('모델을 부르지 않고 고정 안내를 meta → token → done 으로 흘린다', async () => {
    prepareShamanChat.mockResolvedValue({ ok: false, crisis: true })

    const res = await POST(request({ message: '죽고 싶어요', history: [] }))
    const { events, rest } = parseSseBuffer(await res.text())

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
    expect(rest).toBe('')
    expect(events.map((e) => e.event)).toEqual(['meta', 'token', 'done'])
    expect(JSON.parse(events[0].data)).toEqual({ emotion: 'neutral', deityCode: null })
    expect(JSON.parse(events[1].data)).toEqual({ t: CRISIS_REPLY })
    expect(JSON.parse(events[2].data)).toEqual({ full: CRISIS_REPLY, suggestedQuestions: [], safety: 'crisis' })
    expect(getGeminiModel).not.toHaveBeenCalled()
    expect(refundConsumed).not.toHaveBeenCalled()
  })

  it('질문권 소진 같은 종전 거절은 그대로 4xx 다', async () => {
    prepareShamanChat.mockResolvedValue({ ok: false, error: '질문 횟수를 모두 썼어요.', noCredits: true })

    const res = await POST(request({ message: '재물운이 궁금해요', history: [] }))

    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({ error: '질문 횟수를 모두 썼어요.', noCredits: true })
  })
})
