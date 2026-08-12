/**
 * 어드민 결제 목록의 «보이는 숫자» 규칙 (순수 함수 · 테스트 가능).
 *
 * 왜 따로 두나: 취소가 payments 에 남는 방식이 상태 하나로 안 끝난다.
 *   · 전액 취소 → status='refunded'  (집계는 status='completed' 필터라 자동으로 매출에서 빠진다)
 *   · 부분 취소 → status 는 'completed' 그대로, 취소액만 cancelled_amount 에 누적된다
 * 그래서 목록이 amount 만 그리면 **부분 취소된 결제가 「성공 · 총액」으로 보인다**(이번 수복 대상).
 *
 * 🔴 화면과 집계가 같은 문장을 써야 한다 — 순매출은 lib/domain/payment/cancel-clawback 의 netRevenue()
 *    한 곳에서만 계산하고, 'refunded' 는 집계 필터가 통째로 빼므로 여기서도 0 으로 본다.
 *    (그러지 않으면 목록 합계와 대시보드 매출 카드가 서로 다른 숫자를 말한다.)
 */

import { netRevenue } from '@/lib/domain/payment/cancel-clawback'

/**
 * 상태 필터 값. 'partial_cancel' 만 payments.status 에 없는 **합성 필터**다 —
 * 부분 취소는 status 가 'completed' 로 남아서 상태 컬럼만으로는 걸러낼 수 없다.
 */
export const PAYMENT_STATUS_FILTERS = [
  'all',
  'completed',
  'partial_cancel',
  'refunded',
  'test_charge',
  'failed',
] as const

export type PaymentStatusFilter = (typeof PAYMENT_STATUS_FILTERS)[number]

export function isPaymentStatusFilter(value: string): value is PaymentStatusFilter {
  return (PAYMENT_STATUS_FILTERS as readonly string[]).includes(value)
}

export interface PaymentSettlementRow {
  amount: number
  cancelled_amount?: number | null
  status: string
}

export interface PaymentSettlement {
  /** 취소 없음 · 부분 취소 · 전액 취소 */
  kind: 'none' | 'partial' | 'full'
  /** 실제 남은 결제액(원) — 매출 집계와 같은 정의 */
  net: number
  /** 취소된 금액(원). 전액 취소인데 취소액 기록이 없으면 결제 총액으로 본다 */
  cancelled: number
}

function toNonNegativeInt(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

export function describePaymentSettlement(row: PaymentSettlementRow): PaymentSettlement {
  const amount = toNonNegativeInt(row.amount)
  const recorded = toNonNegativeInt(row.cancelled_amount)

  // 전액 취소는 status 가 정본이다. clawback RPC 가 fullyCancelled 일 때만 'refunded' 로 내린다.
  if (row.status === 'refunded') {
    return { kind: 'full', net: 0, cancelled: recorded > 0 ? Math.min(recorded, amount) : amount }
  }

  const net = netRevenue(row)
  if (recorded <= 0) return { kind: 'none', net, cancelled: 0 }
  // 취소액이 결제액을 다 먹었는데 status 가 아직 completed 인 경우(웹훅 순서 꼬임)도 전액 취소로 읽는다.
  if (net <= 0) return { kind: 'full', net: 0, cancelled: Math.min(recorded, amount) }
  return { kind: 'partial', net, cancelled: recorded }
}
