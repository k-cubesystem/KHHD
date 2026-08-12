/**
 * 「손실 처리」 취소 상한 정책.
 *
 * 못 박는 것:
 *  1. 손실 0 취소(복채 미사용)는 상한과 **무관**하다 — 정상 사용자를 막지 않는다.
 *  2. 횟수·금액 두 축이 각각 독립으로 막는다(하나만 두면 소액 반복 또는 고액 단발이 뚫린다).
 *  3. 판정은 «이미 쌓인 누적»만 본다 — 이번 요청분을 더해 넘는지 보지 않는다(첫 요청 항상 통과).
 *  4. 창은 rolling 365일. 달력 연도가 아니다(연초 리셋 악용 차단).
 *  5. 마스터(admin)는 면제.
 *  6. 문구는 «남은 금액»을 알려주지 않는다 — 그게 곧 인출 한도 지도가 된다.
 */
import {
  evaluateLossCap,
  lossCapBlockedMessage,
  lossCapWindowStart,
  toLossCapStatus,
  LOSS_CANCEL_MAX_AMOUNT,
  LOSS_CANCEL_MAX_COUNT,
  LOSS_CANCEL_WINDOW_DAYS,
} from '../loss-cap'

const DAY = 86_400_000
const NOW = new Date('2026-08-12T03:00:00.000Z')

function usage(count: number, amount: number, oldestAt?: string | null) {
  return { count, amount, oldestAt: oldestAt ?? null }
}

describe('evaluateLossCap — 정상 사용자를 막지 않는다', () => {
  it('손실 0 취소는 상한이 꽉 차 있어도 통과한다', () => {
    const decision = evaluateLossCap({
      lossCredits: 0,
      usage: usage(LOSS_CANCEL_MAX_COUNT + 5, LOSS_CANCEL_MAX_AMOUNT * 3),
      now: NOW,
    })

    expect(decision.allowed).toBe(true)
    expect(decision.blockedReason).toBeUndefined()
  })

  it('사용 이력이 없으면 통과한다', () => {
    expect(evaluateLossCap({ lossCredits: 12, usage: usage(0, 0), now: NOW }).allowed).toBe(true)
  })

  it('상한 «미만»이면 통과한다', () => {
    const decision = evaluateLossCap({
      lossCredits: 12,
      usage: usage(LOSS_CANCEL_MAX_COUNT - 1, LOSS_CANCEL_MAX_AMOUNT - 1),
      now: NOW,
    })

    expect(decision.allowed).toBe(true)
  })

  it('🔴 이번 손실이 상한보다 커도 누적이 0이면 통과한다 — 사전 합산 금지', () => {
    // 30만원 팩을 다 쓴 사용자의 «첫» 요청. 사전 합산으로 막으면 구제 자체가 사라진다.
    const decision = evaluateLossCap({ lossCredits: 30, usage: usage(0, 0), now: NOW })

    expect(decision.allowed).toBe(true)
  })

  it('그 대신 큰 손실이 한 번 나면 다음 요청이 곧바로 막힌다', () => {
    const decision = evaluateLossCap({ lossCredits: 5, usage: usage(1, 300_000), now: NOW })

    expect(decision.allowed).toBe(false)
    expect(decision.blockedReason).toBe('AMOUNT_EXCEEDED')
  })
})

describe('evaluateLossCap — 두 축이 각각 막는다', () => {
  it('횟수를 채우면 금액이 남아 있어도 막는다 — 소액 반복 봉쇄', () => {
    const decision = evaluateLossCap({ lossCredits: 3, usage: usage(LOSS_CANCEL_MAX_COUNT, 20_000), now: NOW })

    expect(decision.allowed).toBe(false)
    expect(decision.blockedReason).toBe('COUNT_EXCEEDED')
  })

  it('금액을 채우면 횟수가 남아 있어도 막는다 — 고액 단발 봉쇄', () => {
    const decision = evaluateLossCap({ lossCredits: 3, usage: usage(1, LOSS_CANCEL_MAX_AMOUNT), now: NOW })

    expect(decision.allowed).toBe(false)
    expect(decision.blockedReason).toBe('AMOUNT_EXCEEDED')
  })

  it('상한은 이동창 안 «누적»으로 잰다 — 정확히 상한과 같으면 막힌다', () => {
    expect(evaluateLossCap({ lossCredits: 1, usage: usage(LOSS_CANCEL_MAX_COUNT, 0), now: NOW }).allowed).toBe(false)
    expect(evaluateLossCap({ lossCredits: 1, usage: usage(0, LOSS_CANCEL_MAX_AMOUNT), now: NOW }).allowed).toBe(false)
  })
})

describe('lossCapWindowStart — rolling window 경계', () => {
  it('창 시작은 달력 연초가 아니라 «정확히 365일 전»이다', () => {
    const start = lossCapWindowStart(NOW)

    expect(LOSS_CANCEL_WINDOW_DAYS).toBe(365)
    expect(start.toISOString()).toBe(new Date(NOW.getTime() - 365 * DAY).toISOString())
    // 연초 리셋 악용 방어 — 1월 1일에 창이 비지 않는다.
    expect(start.getUTCFullYear()).toBe(NOW.getUTCFullYear() - 1)
  })

  it('가장 오래된 손실 건이 창을 벗어나는 시점을 「다시 가능한 날」로 안내한다', () => {
    const oldest = new Date(NOW.getTime() - 300 * DAY).toISOString()
    const decision = evaluateLossCap({ lossCredits: 3, usage: usage(2, 40_000, oldest), now: NOW })

    expect(decision.allowed).toBe(false)
    // 365일 - 300일 = 65일 뒤
    expect(decision.nextAvailableAt).toBe(new Date(NOW.getTime() + 65 * DAY).toISOString())
  })

  it('이미 창을 벗어난 시각은 「다음 가능일」로 안내하지 않는다 — 거짓 안내 방지', () => {
    const stale = new Date(NOW.getTime() - 400 * DAY).toISOString()
    const decision = evaluateLossCap({ lossCredits: 3, usage: usage(2, 40_000, stale), now: NOW })

    expect(decision.nextAvailableAt).toBeNull()
  })

  it('창을 벗어난 건은 사용량에서 빠져 자리가 돌아온다', () => {
    // 호출자(RPC·액션)가 창 밖 행을 세지 않으므로, 같은 계정이 다음 해에는 다시 통과한다.
    const decision = evaluateLossCap({ lossCredits: 3, usage: usage(0, 0), now: NOW })

    expect(decision.allowed).toBe(true)
  })
})

describe('evaluateLossCap — 마스터 예외', () => {
  it('마스터는 상한이 꽉 차 있어도 통과한다', () => {
    const decision = evaluateLossCap({
      lossCredits: 30,
      usage: usage(LOSS_CANCEL_MAX_COUNT + 3, LOSS_CANCEL_MAX_AMOUNT * 5),
      exempt: true,
      now: NOW,
    })

    expect(decision.allowed).toBe(true)
    expect(decision.exempt).toBe(true)
  })

  it('exempt 를 넘기지 않으면 일반 계정으로 판정한다 — 기본값은 면제 아님', () => {
    const decision = evaluateLossCap({ lossCredits: 30, usage: usage(LOSS_CANCEL_MAX_COUNT, 0), now: NOW })

    expect(decision.allowed).toBe(false)
    expect(decision.exempt).toBe(false)
  })
})

describe('lossCapBlockedMessage — 사용자 문구', () => {
  const oldest = new Date(NOW.getTime() - 100 * DAY).toISOString()

  it('횟수 상한은 이유·규칙·다음 경로를 모두 말한다', () => {
    const decision = evaluateLossCap({ lossCredits: 3, usage: usage(LOSS_CANCEL_MAX_COUNT, 0, oldest), now: NOW })
    const message = lossCapBlockedMessage(decision)

    expect(message).toContain('1년 2회')
    expect(message).toContain('고객센터')
    // 다음 가능일은 KST 기준으로 찍는다(서버가 UTC 로 돌아도 하루가 밀리면 안 된다).
    expect(message).toContain('2027년')
  })

  it('🔴 금액 상한 문구는 한도 금액을 밝히지 않는다 — 인출 한도 지도가 된다', () => {
    const decision = evaluateLossCap({ lossCredits: 3, usage: usage(1, LOSS_CANCEL_MAX_AMOUNT, oldest), now: NOW })
    const message = lossCapBlockedMessage(decision)

    expect(message).not.toContain('100,000')
    expect(message).not.toContain('10만')
    expect(message).toContain('한도')
    expect(message).toContain('고객센터')
  })

  it('다음 가능일을 모르면 그 문장을 빼고 안내한다', () => {
    const decision = evaluateLossCap({ lossCredits: 3, usage: usage(LOSS_CANCEL_MAX_COUNT, 0), now: NOW })

    expect(lossCapBlockedMessage(decision)).not.toContain('이후에는')
  })
})

describe('toLossCapStatus — 화면에 내려보내는 값', () => {
  it('통과하면 열림만 알려준다', () => {
    const status = toLossCapStatus(evaluateLossCap({ lossCredits: 3, usage: usage(0, 0), now: NOW }))

    expect(status).toEqual({ available: true, nextAvailableAt: null })
  })

  it('🔴 차단이어도 잔여 횟수·금액은 담지 않는다', () => {
    const status = toLossCapStatus(
      evaluateLossCap({ lossCredits: 3, usage: usage(LOSS_CANCEL_MAX_COUNT, 77_000), now: NOW })
    )

    expect(status.available).toBe(false)
    expect(status.message).toBeTruthy()
    expect(JSON.stringify(status)).not.toContain('77000')
    expect(Object.keys(status).sort()).toEqual(['available', 'blockedReason', 'message', 'nextAvailableAt'])
  })
})
