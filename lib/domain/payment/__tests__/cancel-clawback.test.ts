/**
 * 결제 취소 복채 회수량 계산 검증.
 *
 * 핵심 계약:
 *  1. 전액 취소는 지급 전량을 회수한다(반올림 누수 없음).
 *  2. 부분 취소는 실취소 금액 비율만 회수한다.
 *  3. 같은 웹훅이 재전송되면 회수 증분이 0 이 된다(원장 기준 멱등).
 *  4. 확정되지 않은 취소(IN_PROGRESS/ABORTED)는 회수하지 않는다.
 */
import { computeCancelClawback } from '../cancel-clawback'

/** 1만원에 복채 20만냥을 지급받은 결제 — 아직 아무것도 회수되지 않은 상태 */
function basePayment() {
  return { paidAmount: 10_000, creditsGranted: 20, creditsRemaining: 20 }
}

describe('computeCancelClawback — 전액 취소', () => {
  it('지급된 복채 전량을 회수 목표로 잡는다', () => {
    const plan = computeCancelClawback({
      ...basePayment(),
      tossStatus: 'CANCELED',
      totalAmount: 10_000,
      balanceAmount: 0,
      cancels: [{ cancelAmount: 10_000, cancelStatus: 'DONE', transactionKey: 'tk-full' }],
    })

    expect(plan.fullyCancelled).toBe(true)
    expect(plan.cancelledAmount).toBe(10_000)
    expect(plan.targetClawed).toBe(20)
    expect(plan.delta).toBe(20)
    expect(plan.idempotencySuffix).toBe('tk-full')
  })

  it('cancels 가 비어 있어도 status=CANCELED 면 전액 회수한다', () => {
    const plan = computeCancelClawback({ ...basePayment(), tossStatus: 'CANCELED' })

    expect(plan.fullyCancelled).toBe(true)
    expect(plan.cancelledAmount).toBe(10_000)
    expect(plan.delta).toBe(20)
  })

  it('부분 취소가 쌓여 잔액이 0 이 되면 남은 지급분을 쓸어 담는다', () => {
    // 40% 를 이미 회수(8만냥)한 상태에서 나머지가 취소됨 — 비율 반올림으로 1만냥이 남으면 안 된다.
    const plan = computeCancelClawback({
      paidAmount: 10_000,
      creditsGranted: 20,
      creditsRemaining: 12,
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 10_000,
      balanceAmount: 0,
      cancels: [
        { cancelAmount: 4_000, cancelStatus: 'DONE', transactionKey: 'tk-1' },
        { cancelAmount: 6_000, cancelStatus: 'DONE', transactionKey: 'tk-2' },
      ],
    })

    expect(plan.fullyCancelled).toBe(true)
    expect(plan.targetClawed).toBe(20)
    expect(plan.delta).toBe(12)
    expect(plan.idempotencySuffix).toBe('tk-2')
  })
})

describe('computeCancelClawback — 부분 취소', () => {
  it('실취소 금액 비율만큼만 회수한다', () => {
    const plan = computeCancelClawback({
      ...basePayment(),
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 10_000,
      balanceAmount: 7_000,
      cancels: [{ cancelAmount: 3_000, cancelStatus: 'DONE', transactionKey: 'tk-part' }],
    })

    expect(plan.fullyCancelled).toBe(false)
    expect(plan.cancelledAmount).toBe(3_000)
    expect(plan.targetClawed).toBe(6) // 20 * 0.3
    expect(plan.delta).toBe(6)
  })

  it('2차 부분 취소는 누적 목표에서 이미 회수분을 뺀 증분만 회수한다', () => {
    // 1차로 3,000원(6만냥) 회수 완료 → 2차 2,000원 추가 취소 → 누적 5,000원(10만냥) 목표
    const plan = computeCancelClawback({
      paidAmount: 10_000,
      creditsGranted: 20,
      creditsRemaining: 14,
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 10_000,
      balanceAmount: 5_000,
      cancels: [
        { cancelAmount: 3_000, cancelStatus: 'DONE', transactionKey: 'tk-1' },
        { cancelAmount: 2_000, cancelStatus: 'DONE', transactionKey: 'tk-2' },
      ],
    })

    expect(plan.cancelledAmount).toBe(5_000)
    expect(plan.targetClawed).toBe(10)
    expect(plan.delta).toBe(4) // 10 목표 − 6 기회수
  })

  it('보너스·첫구매 2배로 부풀려 지급된 복채도 지급 총량 기준으로 비례 회수한다', () => {
    // 1만원 결제에 보너스 포함 50만냥 지급 → 절반 취소면 25만냥 회수
    const plan = computeCancelClawback({
      paidAmount: 10_000,
      creditsGranted: 50,
      creditsRemaining: 50,
      tossStatus: 'PARTIAL_CANCELED',
      balanceAmount: 5_000,
      totalAmount: 10_000,
      cancels: [{ cancelAmount: 5_000, cancelStatus: 'DONE', transactionKey: 'tk-half' }],
    })

    expect(plan.targetClawed).toBe(25)
    expect(plan.delta).toBe(25)
  })
})

describe('computeCancelClawback — 멱등(웹훅 재전송)', () => {
  it('같은 전액 취소 페이로드가 다시 와도 증분이 0 이다', () => {
    const plan = computeCancelClawback({
      paidAmount: 10_000,
      creditsGranted: 20,
      creditsRemaining: 0, // 이미 전량 회수됨
      tossStatus: 'CANCELED',
      totalAmount: 10_000,
      balanceAmount: 0,
      cancels: [{ cancelAmount: 10_000, cancelStatus: 'DONE', transactionKey: 'tk-full' }],
    })

    expect(plan.targetClawed).toBe(20)
    expect(plan.delta).toBe(0)
  })

  it('같은 부분 취소 페이로드가 다시 와도 증분이 0 이다', () => {
    const plan = computeCancelClawback({
      paidAmount: 10_000,
      creditsGranted: 20,
      creditsRemaining: 14, // 이미 6만냥 회수됨
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 10_000,
      balanceAmount: 7_000,
      cancels: [{ cancelAmount: 3_000, cancelStatus: 'DONE', transactionKey: 'tk-part' }],
    })

    expect(plan.delta).toBe(0)
    // 멱등키가 같아야 DB 유니크 인덱스에서도 걸린다.
    expect(plan.idempotencySuffix).toBe('tk-part')
  })

  it('회수 목표를 초과해 이미 회수했어도 음수 증분이 나오지 않는다', () => {
    const plan = computeCancelClawback({
      paidAmount: 10_000,
      creditsGranted: 20,
      creditsRemaining: 2,
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 10_000,
      balanceAmount: 9_000,
      cancels: [{ cancelAmount: 1_000, cancelStatus: 'DONE', transactionKey: 'tk-small' }],
    })

    expect(plan.targetClawed).toBe(2)
    expect(plan.delta).toBe(0)
  })
})

describe('computeCancelClawback — 오회수 방지', () => {
  it('확정되지 않은 취소(IN_PROGRESS)는 회수하지 않는다', () => {
    const plan = computeCancelClawback({
      ...basePayment(),
      tossStatus: 'IN_PROGRESS',
      cancels: [{ cancelAmount: 10_000, cancelStatus: 'IN_PROGRESS', transactionKey: 'tk-pending' }],
    })

    expect(plan.cancelledAmount).toBe(0)
    expect(plan.delta).toBe(0)
  })

  it('실패한 취소(ABORTED)는 회수하지 않는다', () => {
    const plan = computeCancelClawback({
      ...basePayment(),
      tossStatus: 'PARTIAL_CANCELED',
      cancels: [{ cancelAmount: 5_000, cancelStatus: 'ABORTED', transactionKey: 'tk-failed' }],
    })

    expect(plan.cancelledAmount).toBe(0)
    expect(plan.delta).toBe(0)
  })

  it('취소 금액을 전혀 판별할 수 없으면 무동작이다', () => {
    const plan = computeCancelClawback({ ...basePayment(), tossStatus: 'PARTIAL_CANCELED' })

    expect(plan.cancelledAmount).toBe(0)
    expect(plan.delta).toBe(0)
    expect(plan.idempotencySuffix).toBe('amt0')
  })

  it('취소 금액이 결제 금액을 넘어도 지급 총량을 넘겨 회수하지 않는다', () => {
    const plan = computeCancelClawback({
      ...basePayment(),
      tossStatus: 'PARTIAL_CANCELED',
      cancels: [{ cancelAmount: 99_000, cancelStatus: 'DONE', transactionKey: 'tk-bogus' }],
    })

    expect(plan.cancelledAmount).toBe(10_000)
    expect(plan.targetClawed).toBe(20)
    expect(plan.delta).toBe(20)
  })

  it('transactionKey 가 없으면 누적 금액으로 안정적인 멱등키를 만든다', () => {
    const input = {
      ...basePayment(),
      tossStatus: 'PARTIAL_CANCELED',
      totalAmount: 10_000,
      balanceAmount: 6_000,
      cancels: [{ cancelAmount: 4_000, cancelStatus: 'DONE' }],
    }

    // 같은 페이로드는 항상 같은 키 → 재전송이 DB 유니크 인덱스에 걸린다.
    expect(computeCancelClawback(input).idempotencySuffix).toBe('amt4000')
    expect(computeCancelClawback(input).idempotencySuffix).toBe('amt4000')
  })
})
