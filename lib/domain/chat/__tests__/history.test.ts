/**
 * 대화 히스토리 정규화 — **라이브 장애의 회귀선** (2026-08-16).
 *
 * 고민상담이 통째로 죽어 있었다. 원인은 한 줄이었다 —
 *   `[GoogleGenerativeAI Error]: First content should be with role 'user', got model`
 *
 * 신위가 먼저 인사하는 구조(선문안)라 히스토리 첫 항목이 `model` 이 되고, SDK 가 **호출 전에**
 * 거절한다. 즉 「인사 → 사용자 첫 발화」라는 **정상 경로가 100% 실패**했다. 유료 기능이 아니라
 * 티가 늦게 났을 뿐이다.
 */
import { toGeminiHistory, type ChatTurn } from '@/lib/domain/chat/history'

const user = (content: string): ChatTurn => ({ role: 'user', content })
const bot = (content: string): ChatTurn => ({ role: 'assistant', content })

/** SDK 가 거는 검사와 같은 조건 — 비어 있지 않다면 첫 항목은 반드시 user. */
function assertStartsWithUser(history: ReturnType<typeof toGeminiHistory>) {
  if (history.length === 0) return
  expect(history[0].role).toBe('user')
}

describe('🔴 첫 항목은 언제나 user 다', () => {
  it('신위 선문안(assistant)이 맨 앞이면 걷어낸다 — 이 한 줄이 상담을 죽였다', () => {
    const history = toGeminiHistory([bot('어서 오시게.'), user('재물운이 궁금해요'), bot('잔잔한 물결일세.')], 8)

    assertStartsWithUser(history)
    expect(history).toHaveLength(2)
    expect(history[0].parts[0].text).toBe('재물운이 궁금해요')
  })

  it('선문안만 있고 사용자 발화가 없으면 히스토리를 비운다 (첫 대화)', () => {
    expect(toGeminiHistory([bot('어서 오시게.')], 8)).toEqual([])
  })

  it('🔴 창을 자른 뒤에도 첫 항목이 user 다 (여기서 «가끔 되는» 버그가 난다)', () => {
    // [u,m,u,m,u] 에서 뒤 2개만 떼면 [m,u] 라 다시 거절당한다. 창 이후에 한 번 더 맞춰야 한다.
    const turns = [user('하나'), bot('답1'), user('둘'), bot('답2'), user('셋')]

    for (const size of [1, 2, 3, 4, 5, 6]) {
      const history = toGeminiHistory(turns, size)
      expect({ size, role: history[0]?.role ?? 'user' }).toEqual({ size, role: 'user' })
    }
  })

  it('선문안 + 긴 대화에서도 어떤 창 크기든 안전하다', () => {
    const turns: ChatTurn[] = [bot('선문안')]
    for (let i = 0; i < 10; i += 1) {
      turns.push(user(`질문${i}`), bot(`답${i}`))
    }

    for (let size = 1; size <= 12; size += 1) assertStartsWithUser(toGeminiHistory(turns, size))
  })
})

describe('창·정화', () => {
  it('최근 N개만 남긴다', () => {
    const turns = [user('하나'), bot('답1'), user('둘'), bot('답2'), user('셋')]

    expect(toGeminiHistory(turns, 3)).toHaveLength(3)
  })

  it('역할을 SDK 표기로 옮긴다 (assistant → model)', () => {
    const history = toGeminiHistory([user('가'), bot('나')], 8)

    expect(history.map((turn) => turn.role)).toEqual(['user', 'model'])
  })

  it('정화 함수가 모든 발화에 걸린다 (히스토리 경유 인젝션 방어)', () => {
    const history = toGeminiHistory([user('원문A'), bot('원문B')], 8, (text) => `[정화]${text}`)

    expect(history.map((turn) => turn.parts[0].text)).toEqual(['[정화]원문A', '[정화]원문B'])
  })

  it('창 크기가 0 이하로 와도 무너지지 않는다', () => {
    expect(() => toGeminiHistory([user('가')], 0)).not.toThrow()
  })
})

describe('🔴 배선 — 액션이 이 함수를 쓴다', () => {
  it('shaman-chat 이 직접 map 하지 않고 정규화를 거친다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const source: string = require('fs').readFileSync('app/actions/ai/shaman-chat.ts', 'utf8')

    expect(source).toContain('toGeminiHistory(conversationHistory, CHAT_HISTORY_WINDOW')
    // 옛 배선이 남아 있으면 장애가 그대로 돌아온다.
    expect(source).not.toContain('conversationHistory.slice(-CHAT_HISTORY_WINDOW)')
  })
})
