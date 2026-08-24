import { act, renderHook, waitFor } from '@testing-library/react'
import { useTts } from '../useTts'

/**
 * 🔴 2026-08-24 CEO 보고: 「듣기를 한 번 더 누르면 기존 소리 뒤에 또 하나가 나온다」
 *
 * 기전은 경쟁 조건이었다 — `speak()` 가 서버 음성을 기다리는 «사이»에 두 번째 호출이 들어오면
 * 그 시점엔 멈출 audio 객체가 아직 없어서, 두 응답이 차례로 도착해 둘 다 재생됐다.
 * 여기서 지키는 계약은 하나다: **늦게 도착한 응답은 재생되지 않는다.**
 */

class FakeAudio {
  static played: string[] = []
  static reset() {
    FakeAudio.played = []
  }
  src: string
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(src: string) {
    this.src = src
  }
  play() {
    FakeAudio.played.push(this.src)
    return Promise.resolve()
  }
  pause() {}
}

/** blob → 식별 가능한 URL. 어떤 응답이 재생됐는지 추적하려고 순번을 박는다. */
let urlSeq = 0

function setupBrowserMocks() {
  FakeAudio.reset()
  urlSeq = 0
  // @ts-expect-error 테스트용 주입
  global.Audio = FakeAudio
  global.URL.createObjectURL = jest.fn(() => `blob:${++urlSeq}`)
  // Web Speech 는 없는 환경으로 둔다(서버 TTS 경로만 검증)
  // @ts-expect-error 테스트용 주입
  delete global.window.speechSynthesis
}

/** 지정한 시간 뒤에 응답하는 fetch — 1차를 느리게, 2차를 빠르게 만들어 경쟁을 재현한다. */
function mockFetchWithDelays(delays: number[]) {
  let call = 0
  global.fetch = jest.fn(() => {
    const delay = delays[call++] ?? 0
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob(['audio'])),
          } as unknown as Response),
        delay
      )
    )
  }) as unknown as typeof fetch
}

describe('useTts — 겹침 방지', () => {
  beforeEach(() => {
    setupBrowserMocks()
    jest.useRealTimers()
  })

  it('🔴 연달아 누르면 «마지막 것 하나만» 재생된다 (느린 1차 응답은 폐기)', async () => {
    mockFetchWithDelays([120, 10]) // 1차가 늦게, 2차가 먼저 도착
    const { result } = renderHook(() => useTts())

    await act(async () => {
      void result.current.speak('첫 번째', { trackId: 'a' })
      void result.current.speak('두 번째', { trackId: 'b' })
      await new Promise((r) => setTimeout(r, 300))
    })

    expect(FakeAudio.played).toHaveLength(1)
    await waitFor(() => expect(result.current.speakingId).toBe('b'))
  })

  it('정지를 누르면 날아오던 응답도 재생되지 않는다', async () => {
    mockFetchWithDelays([80])
    const { result } = renderHook(() => useTts())

    await act(async () => {
      void result.current.speak('읽는 중', { trackId: 'a' })
      result.current.stop()
      await new Promise((r) => setTimeout(r, 200))
    })

    expect(FakeAudio.played).toHaveLength(0)
    expect(result.current.speakingId).toBeNull()
    expect(result.current.speaking).toBe(false)
  })

  it('같은 말풍선을 다시 눌러도(처음부터) 소리는 하나다', async () => {
    mockFetchWithDelays([40, 40])
    const { result } = renderHook(() => useTts())

    await act(async () => {
      void result.current.speak('같은 말', { trackId: 'a' })
      await new Promise((r) => setTimeout(r, 80))
      void result.current.speak('같은 말', { trackId: 'a' })
      await new Promise((r) => setTimeout(r, 120))
    })

    // 두 번 재생하되 «동시에»가 아니다 — 앞의 것은 stop 으로 끊긴다.
    expect(FakeAudio.played).toHaveLength(2)
    await waitFor(() => expect(result.current.speakingId).toBe('a'))
  })

  it('재생 중인 말풍선을 화면이 알 수 있다 (trackId 노출)', async () => {
    mockFetchWithDelays([10])
    const { result } = renderHook(() => useTts())
    await act(async () => {
      void result.current.speak('안녕', { trackId: 'msg-1' })
      await new Promise((r) => setTimeout(r, 60))
    })
    expect(result.current.speakingId).toBe('msg-1')
  })
})
