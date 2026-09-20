/**
 * 위기 신호 건수 기록 — 「무엇을 남기지 않는가」가 계약이다.
 *
 * 🔴 Sentry 는 요청 스코프의 정보(요청 본문 = 회원이 쓴 글 · 쿠키 · 사용자)를 이벤트에 붙인다.
 *    이 기록은 등급·규칙 라벨·경로 셋만 나가야 한다.
 */
import * as Sentry from '@sentry/nextjs'
import { recordChatSafetyEvent } from '@/lib/services/chat-safety'

jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn(), info: jest.fn() },
}))

type Processor = (event: Record<string, unknown>) => Record<string, unknown> | null

const scope = {
  setUser: jest.fn(),
  clearBreadcrumbs: jest.fn(),
  setTags: jest.fn(),
  setFingerprint: jest.fn(),
  addEventProcessor: jest.fn(),
}

jest.mock('@sentry/nextjs', () => ({
  withScope: jest.fn(),
  captureMessage: jest.fn(),
}))

const mockWithScope = Sentry.withScope as unknown as jest.Mock
const mockCapture = Sentry.captureMessage as unknown as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockWithScope.mockImplementation((run: (s: typeof scope) => void) => run(scope))
})

describe('recordChatSafetyEvent', () => {
  it('none 은 기록하지 않는다', () => {
    recordChatSafetyEvent({ level: 'none', reason: 'clear' }, 'stream')
    expect(mockWithScope).not.toHaveBeenCalled()
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('등급·규칙 라벨·경로만 태그로 남긴다', () => {
    recordChatSafetyEvent({ level: 'crisis', reason: 'desire' }, 'action')

    expect(scope.setTags).toHaveBeenCalledWith({
      'chat_safety.level': 'crisis',
      'chat_safety.reason': 'desire',
      'chat_safety.path': 'action',
    })
    expect(mockCapture).toHaveBeenCalledWith('[chat-safety] crisis', 'info')
  })

  it('🔴 사용자를 지우고, 이벤트에서 요청 본문·사용자·브레드크럼을 떼어 낸다', () => {
    recordChatSafetyEvent({ level: 'concern', reason: 'weariness' }, 'stream')

    expect(scope.setUser).toHaveBeenCalledWith(null)
    expect(scope.clearBreadcrumbs).toHaveBeenCalled()

    const processor = scope.addEventProcessor.mock.calls[0][0] as Processor
    const scrubbed = processor({
      message: '[chat-safety] concern',
      request: { data: '{"message":"회원이 쓴 글"}', cookies: { sb: 'token' } },
      user: { id: 'user-1' },
      breadcrumbs: [{ message: 'fetch' }],
      extra: { anything: true },
      tags: { 'chat_safety.level': 'concern' },
    })

    expect(scrubbed).toEqual({ message: '[chat-safety] concern', tags: { 'chat_safety.level': 'concern' } })
  })

  it('기록이 실패해도 던지지 않는다 — 안내가 막히면 안 된다', () => {
    mockWithScope.mockImplementation(() => {
      throw new Error('sentry down')
    })
    expect(() => recordChatSafetyEvent({ level: 'crisis', reason: 'plan' }, 'stream')).not.toThrow()
  })
})
