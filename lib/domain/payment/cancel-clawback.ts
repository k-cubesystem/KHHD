/**
 * 결제 취소 → 지급 복채 회수량 계산 (순수 함수 · 테스트 가능).
 *
 * 정본 대조는 payments 원장으로 한다:
 *   credits_purchased(지급 총량) ↔ credits_remaining(아직 회수되지 않은 지급분)
 *
 * 회수 목표는 **누적 취소 금액 비율**로 잡고, 이미 회수된 만큼을 뺀 **증분**만 회수한다.
 * → 웹훅 재전송·부분 취소 다중 발생이 모두 같은 식으로 수렴한다(멱등).
 *
 * 토스 페이로드 근거(v1 결제 취소 문서):
 *  - 취소 1건 = `cancels[]` 원소, 실취소 금액은 `cancelAmount`, 거래 식별자는 `transactionKey`.
 *  - 부분 취소를 여러 번 하면 `cancels[]` 에 누적되고, 남은 결제 금액은 `balanceAmount` 다.
 *  - 전액 취소는 `status='CANCELED'`, 부분 취소는 `status='PARTIAL_CANCELED'`.
 *  - 비동기 취소는 `cancelStatus` 가 `DONE` 이 되어야 확정이다(`IN_PROGRESS`/`ABORTED` 는 회수 금지).
 */

/** 토스 Payment 객체의 취소 거래 1건 */
export interface TossCancelRecord {
  cancelAmount?: number | null
  cancelStatus?: string | null
  transactionKey?: string | null
}

export interface CancelClawbackInput {
  /** 토스 Payment.status — 'CANCELED' | 'PARTIAL_CANCELED' 등 */
  tossStatus?: string | null
  /** 토스 Payment.totalAmount — 결제 총액(원) */
  totalAmount?: number | null
  /** 토스 Payment.balanceAmount — 취소 후 남은 결제 금액(원) */
  balanceAmount?: number | null
  /** 토스 Payment.cancels — 취소 거래 목록 */
  cancels?: readonly TossCancelRecord[] | null
  /** payments.amount — DB 정본 결제 금액(원) */
  paidAmount: number
  /** payments.credits_purchased — 실제 지갑에 지급된 복채 총량 */
  creditsGranted: number
  /** payments.credits_remaining — 아직 회수되지 않은 지급 복채 */
  creditsRemaining: number
}

export interface CancelClawbackPlan {
  /** 누적 취소 금액(원) */
  cancelledAmount: number
  /** 전액 취소 여부 */
  fullyCancelled: boolean
  /** 누적 회수 목표 복채 */
  targetClawed: number
  /** 이번에 회수할 복채(증분). 0 이면 할 일 없음 */
  delta: number
  /** 멱등키 꼬리 — 확정된 마지막 취소 거래 키(없으면 누적 금액으로 대체) */
  idempotencySuffix: string
}

/** 확정(DONE)된 취소만 회수 대상. cancelStatus 가 없으면 동기 취소로 보고 확정 취급한다. */
function isSettled(record: TossCancelRecord): boolean {
  const status = record.cancelStatus
  return status === null || status === undefined || status === '' || status === 'DONE'
}

function toNonNegativeInt(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

/** 매출로 잡을 실수령액 = 결제액 − 누적 취소액. */
export interface NetRevenueRow {
  amount?: number | null
  cancelled_amount?: number | null
}

/**
 * 부분 취소분을 뺀 순매출(원).
 *
 * 🔴 부분 취소는 payments.status 가 'completed' 로 **남는다**(전액 취소만 'refunded'). 그래서
 * `status='completed'` 필터만 걸고 amount 를 합치면 취소분만큼 매출이 과대 계상된다.
 * 어드민 집계는 전부 이 함수를 통과시킨다 — 화면마다 다른 숫자가 나오면 매출을 못 믿는다.
 */
export function netRevenue(row: NetRevenueRow): number {
  const paid = toNonNegativeInt(row.amount)
  const cancelled = toNonNegativeInt(row.cancelled_amount)
  return Math.max(0, paid - cancelled)
}

export function computeCancelClawback(input: CancelClawbackInput): CancelClawbackPlan {
  const paidAmount = toNonNegativeInt(input.paidAmount)
  const creditsGranted = toNonNegativeInt(input.creditsGranted)
  const creditsRemaining = Math.min(toNonNegativeInt(input.creditsRemaining), creditsGranted)

  const settled = (input.cancels ?? []).filter((record): record is TossCancelRecord => !!record && isSettled(record))
  const summed = settled.reduce((acc, record) => acc + toNonNegativeInt(record.cancelAmount), 0)

  // 취소 금액 산정 우선순위: cancels[] 합계 → totalAmount-balanceAmount → 전액취소 상태면 결제 총액
  let rawCancelled = summed
  if (rawCancelled === 0) {
    const total = typeof input.totalAmount === 'number' ? input.totalAmount : paidAmount
    if (typeof input.balanceAmount === 'number' && Number.isFinite(input.balanceAmount)) {
      rawCancelled = toNonNegativeInt(total - input.balanceAmount)
    }
  }
  if (rawCancelled === 0 && input.tossStatus === 'CANCELED') {
    rawCancelled = paidAmount
  }

  const cancelledAmount = paidAmount > 0 ? Math.min(rawCancelled, paidAmount) : rawCancelled

  const fullyCancelled =
    input.tossStatus === 'CANCELED' ||
    (cancelledAmount > 0 && typeof input.balanceAmount === 'number' && input.balanceAmount <= 0) ||
    (paidAmount > 0 && cancelledAmount >= paidAmount)

  // 금액을 못 읽었고 전액 취소도 아니면 아무것도 하지 않는다(오회수 방지).
  if (cancelledAmount <= 0 && !fullyCancelled) {
    return { cancelledAmount: 0, fullyCancelled: false, targetClawed: 0, delta: 0, idempotencySuffix: 'amt0' }
  }

  // 전액 취소는 비율 반올림을 거치지 않고 지급 전량을 쓸어 담는다(잔여 누수 방지).
  const targetClawed =
    fullyCancelled || paidAmount <= 0
      ? creditsGranted
      : Math.min(creditsGranted, Math.round((creditsGranted * cancelledAmount) / paidAmount))

  const alreadyClawed = Math.max(0, creditsGranted - creditsRemaining)
  const delta = Math.min(Math.max(targetClawed - alreadyClawed, 0), creditsRemaining)

  const lastKey = [...settled].reverse().find((record) => !!record.transactionKey)?.transactionKey

  return {
    cancelledAmount,
    fullyCancelled,
    targetClawed,
    delta,
    idempotencySuffix: lastKey ? lastKey : `amt${cancelledAmount}`,
  }
}
