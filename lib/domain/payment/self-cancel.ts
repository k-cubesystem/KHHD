/**
 * 결제 취소 셀프서비스 판정 (순수 함수 · 테스트 가능).
 *
 * 두 축을 다룬다.
 *  1) 복채 충전 취소 — 「지급분 중 지금 회수 가능한 양」으로 세 갈래 판정
 *  2) 멤버십 중도 해지 — 잔여기간 일할 환불액 계산(복채는 회수하지 않는다)
 *
 * 회수 가능량 판정은 어제 만든 원장(payments.credits_purchased ↔ credits_remaining)을 그대로 쓴다.
 * `clawback_payment_credits` RPC 가 실제로 하는 계산(min(미회수 지급분, 지갑 잔액))을 화면에서
 * 미리 돌려보는 것이므로, 화면 안내와 실제 결과가 어긋나지 않는다.
 *
 * 법적 근거(요약 — 상세는 docs/REPORTS/RESEARCH-20260811-bok-prepaid-law.md §4)
 *  - 전자상거래법 제17조 제1항·제2항 제5호 단서: 가분적 디지털콘텐츠의 «제공 미개시분»은 7일 내 철회 가능.
 *  - 약관 제7조 제2항: 7일 이내 미사용분 전액 / 7일 경과 후 미사용분의 90%(수수료 10%).
 *  - 약관 제7조 제3항: 멤버십은 이용 일수 일할 계산 후 잔여 금액 환불(위약금 규정 없음).
 *  - 콘텐츠이용자보호지침 제19조: 계속거래 임의 해지 시 기이용분 공제 + 잔여 대금 10% 이내 손해배상금.
 *    → 약관이 위약금을 두지 않았으므로 **약관(사용자 유리) 기준**으로 위약금 0을 적용한다.
 */

import type { LossCapStatus } from './loss-cap'

// ────────────────────────────────────────────────────────────
// 취소 사유 (객관식 + 메모)
// ────────────────────────────────────────────────────────────

export const CANCEL_REASON_CODES = ['MISTAKE', 'NOT_AS_EXPECTED', 'DEFECT', 'PRICE', 'LOW_USAGE', 'OTHER'] as const

export type CancelReasonCode = (typeof CANCEL_REASON_CODES)[number]

export interface CancelReasonOption {
  code: CancelReasonCode
  label: string
  /** 선택 시 메모 필수 여부 */
  memoRequired: boolean
}

export const CANCEL_REASONS: readonly CancelReasonOption[] = [
  { code: 'MISTAKE', label: '실수로 결제했어요', memoRequired: false },
  { code: 'NOT_AS_EXPECTED', label: '서비스가 기대와 달라요', memoRequired: false },
  { code: 'DEFECT', label: '기능이 제대로 동작하지 않아요', memoRequired: false },
  { code: 'PRICE', label: '가격이 부담돼요', memoRequired: false },
  { code: 'LOW_USAGE', label: '이용 빈도가 낮아요', memoRequired: false },
  { code: 'OTHER', label: '기타 (사유를 적어주세요)', memoRequired: true },
]

/** 메모 최대 길이. 개인정보 최소수집 원칙상 길게 받지 않는다. */
export const CANCEL_MEMO_MAX_LENGTH = 300

/** 메모 입력란 아래 상시 노출 문구 — 민감정보 수집 방지. */
export const CANCEL_MEMO_PRIVACY_NOTICE =
  '주민등록번호·카드번호·계좌번호 등 민감한 개인정보는 적지 말아주세요. 취소 처리에 필요하지 않습니다.'

export function isCancelReasonCode(value: unknown): value is CancelReasonCode {
  return typeof value === 'string' && (CANCEL_REASON_CODES as readonly string[]).includes(value)
}

const LF = String.fromCharCode(10)

/** 저장에서 걸러낼 문자: 제어문자(줄바꿈 제외)·C1·제로폭/방향 제어·BOM. */
function isStrippableChar(codePoint: number): boolean {
  if (codePoint === 10) return false
  if (codePoint <= 0x1f) return true
  if (codePoint >= 0x7f && codePoint <= 0x9f) return true
  if (codePoint >= 0x200b && codePoint <= 0x200f) return true
  return codePoint === 0xfeff
}

/**
 * 메모 정규화 — 저장 전에 반드시 통과시킨다.
 * 제어문자·제로폭 문자를 지우고, 꺾쇠(`<`·`>`)를 제거해 마크업 주입 경로를 막는다.
 * (렌더는 React 가 이스케이프하지만, 어드민 표·CSV 내보내기 등 다른 소비처를 미리 막아둔다.)
 */
export function sanitizeCancelMemo(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const cleaned = Array.from(raw)
    .filter((ch) => !isStrippableChar(ch.codePointAt(0) ?? 0))
    .join('')
    .replace(/[<>]/g, '')
  const lines = cleaned.split(LF).map((line) => line.replace(/ {2,}/g, ' ').trim())
  return lines.join(LF).trim().slice(0, CANCEL_MEMO_MAX_LENGTH)
}

export interface CancelReasonInput {
  reasonCode: unknown
  memo?: unknown
}

export type CancelReasonValidation =
  | { ok: true; reasonCode: CancelReasonCode; memo: string }
  | { ok: false; error: string }

/** 사유·메모 검증. 「기타」는 메모 필수. */
export function validateCancelReason(input: CancelReasonInput): CancelReasonValidation {
  if (!isCancelReasonCode(input.reasonCode)) {
    return { ok: false, error: '취소 사유를 선택해주세요.' }
  }
  const memo = sanitizeCancelMemo(input.memo)
  const option = CANCEL_REASONS.find((item) => item.code === input.reasonCode)
  if (option?.memoRequired && memo.length === 0) {
    return { ok: false, error: '「기타」를 선택하신 경우 사유를 적어주세요.' }
  }
  return { ok: true, reasonCode: input.reasonCode, memo }
}

// ────────────────────────────────────────────────────────────
// 복채 충전 취소 판정
// ────────────────────────────────────────────────────────────

/** 약관 제7조 제2항 — 청약철회 기간(일). */
export const WITHDRAWAL_PERIOD_DAYS = 7

/** 약관 제7조 제2항 — 기간 경과 후 환불 수수료율(10%). */
export const LATE_CANCEL_FEE_RATE = 0.1

/**
 * 복채 환불 조건 안내 문구 — **화면에 적는 숫자의 단일 출처.**
 *
 * 실제 사고(2026-09-01 발견): 심사 제출 문서는 상점 화면이 「미사용분 7일 이내 전액,
 * 이후 90%」를 명시한다고 적었는데, 화면은 「7일 이내 가능」까지만 있었다. 심사관이
 * 캡처와 설명을 대조하면 바로 어긋난다. 같은 숫자가 화면 4곳에 손으로 박혀 있어
 * 수수료율을 바꾸면 옛 숫자가 남는 구조이기도 했다.
 */
export function chargeRefundPolicyLine(): string {
  const keepRate = Math.round((1 - LATE_CANCEL_FEE_RATE) * 100)
  return `미사용분은 결제일로부터 ${WITHDRAWAL_PERIOD_DAYS}일 이내 전액, 이후 ${keepRate}% 환불합니다.`
}

const DAY_MS = 86_400_000

export type ChargeCancelVerdict =
  /** (a) 지급 복채가 전액 남아 있다 → 즉시 취소 가능 */
  | 'FULL_REFUNDABLE'
  /** (b) 일부·전부 소진 → 기본 안내는 「취소 불가」, 2차 경로에서 손실 처리로 진행 */
  | 'PARTIALLY_SPENT'
  /** (c) 애초에 취소 대상이 아니다(이미 취소됨·충전 결제 아님 등) */
  | 'NOT_CANCELLABLE'

export type ChargeCancelBlockedReason = 'ALREADY_CANCELLED' | 'NOT_A_CHARGE' | 'NOT_COMPLETED' | 'NOTHING_GRANTED'

export interface ChargeCancelInput {
  /** payments.amount — 결제 금액(원) */
  paidAmount: number
  /** payments.cancelled_amount — 이미 취소된 누적 금액(원) */
  cancelledAmount?: number | null
  /** payments.credits_purchased — 지급된 복채 총량 */
  grantedCredits: number
  /** payments.credits_remaining — 지급분 중 아직 회수되지 않은 복채(원장) */
  ledgerRemaining: number
  /** wallets.balance — 현재 지갑 잔액 */
  walletBalance: number
  /** payments.status */
  status: string
  /** payments.bokchae_type */
  bokchaeType?: string | null
  /** payments.created_at */
  paidAt: string | Date
  /** 판정 기준 시각(테스트용). 기본 현재 시각 */
  now?: Date
}

export interface ChargeCancelPlan {
  verdict: ChargeCancelVerdict
  blockedReason?: ChargeCancelBlockedReason
  /** 지급된 복채 총량 */
  grantedCredits: number
  /** 지금 회수 가능한 복채 = min(미회수 지급분, 지갑 잔액) */
  recoverableCredits: number
  /** 회수할 수 없는 복채 = 이미 사용한 분. 손실 처리 대상 */
  spentCredits: number
  /** 결제 후 경과 일수(초일불산입) */
  elapsedDays: number
  /** 청약철회 기간 이내 여부 */
  withinWithdrawalPeriod: boolean
  /** 적용 수수료율 (0 또는 0.1) */
  feeRate: number
  /** 수수료 차감 전 취소 대상 금액(원) = 결제액 − 기취소액 */
  grossAmount: number
  /** 환불 수수료(원) */
  feeAmount: number
  /** 실제 환불 금액(원). 토스 취소 API 의 cancelAmount 로 그대로 쓴다 */
  refundAmount: number
  /** 손실 처리되는 복채(= spentCredits). 사용자에게 청구하지 않는다 */
  lossCredits: number
  /** 손실 처리 상당 금액(원) — 회수 못 한 복채의 결제액 환산 */
  lossAmount: number
}

function toInt(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

/**
 * 결제 후 경과 일수. 민법 제157조(초일 불산입)에 맞춰 결제 당일은 0일로 센다.
 * `withinWithdrawalPeriod` 는 `elapsedDays <= 7` — 7일째 되는 날까지 철회 가능(사용자 유리).
 */
export function elapsedDaysSince(paidAt: string | Date, now: Date = new Date()): number {
  const paid = toDate(paidAt).getTime()
  if (!Number.isFinite(paid)) return 0
  return Math.max(0, Math.floor((now.getTime() - paid) / DAY_MS))
}

export function classifyChargeCancel(input: ChargeCancelInput): ChargeCancelPlan {
  const now = input.now ?? new Date()
  const paidAmount = toInt(input.paidAmount)
  const cancelledAmount = Math.min(toInt(input.cancelledAmount), paidAmount)
  const grantedCredits = toInt(input.grantedCredits)
  const ledgerRemaining = Math.min(toInt(input.ledgerRemaining), grantedCredits)
  const walletBalance = toInt(input.walletBalance)

  const elapsedDays = elapsedDaysSince(input.paidAt, now)
  const withinWithdrawalPeriod = elapsedDays <= WITHDRAWAL_PERIOD_DAYS
  const feeRate = withinWithdrawalPeriod ? 0 : LATE_CANCEL_FEE_RATE

  const grossAmount = Math.max(0, paidAmount - cancelledAmount)
  // 수수료는 내림 — 반올림 이득은 사용자에게 준다(약관보다 불리해지지 않도록).
  const feeAmount = Math.floor(grossAmount * feeRate)
  const refundAmount = Math.max(0, grossAmount - feeAmount)

  // 실제 RPC 와 같은 계산: 지갑에 남은 만큼만 회수된다.
  const recoverableCredits = Math.min(ledgerRemaining, walletBalance)
  const spentCredits = Math.max(0, ledgerRemaining - recoverableCredits)
  const lossAmount = grantedCredits > 0 ? Math.floor((grossAmount * spentCredits) / grantedCredits) : 0

  const base = {
    grantedCredits,
    recoverableCredits,
    spentCredits,
    elapsedDays,
    withinWithdrawalPeriod,
    feeRate,
    grossAmount,
    feeAmount,
    refundAmount,
    lossCredits: spentCredits,
    lossAmount,
  }

  const blocked = (reason: ChargeCancelBlockedReason): ChargeCancelPlan => ({
    ...base,
    verdict: 'NOT_CANCELLABLE',
    blockedReason: reason,
    // 취소 대상이 아니면 금액도 0 으로 닫는다(화면이 실수로 금액을 띄우지 않도록).
    feeAmount: 0,
    refundAmount: 0,
    lossCredits: 0,
    lossAmount: 0,
  })

  if (input.bokchaeType && input.bokchaeType !== 'charge') return blocked('NOT_A_CHARGE')
  if (input.status === 'refunded') return blocked('ALREADY_CANCELLED')
  if (input.status !== 'completed') return blocked('NOT_COMPLETED')
  if (grossAmount <= 0) return blocked('ALREADY_CANCELLED')
  if (grantedCredits <= 0) return blocked('NOTHING_GRANTED')

  return {
    ...base,
    verdict: spentCredits > 0 ? 'PARTIALLY_SPENT' : 'FULL_REFUNDABLE',
  }
}

// ────────────────────────────────────────────────────────────
// 멤버십 중도 해지 — 잔여기간 일할 환불
// ────────────────────────────────────────────────────────────

export type MembershipCancelMode =
  /** 기본 — 남은 기간까지 이용하고 다음 결제부터 중단. 환불 없음 */
  | 'PERIOD_END'
  /** 즉시 해지 + 잔여기간 일할 환불 */
  | 'IMMEDIATE_REFUND'

export function isMembershipCancelMode(value: unknown): value is MembershipCancelMode {
  return value === 'PERIOD_END' || value === 'IMMEDIATE_REFUND'
}

export interface MembershipRefundInput {
  /** membership_plans.price — 이번 주기에 결제한 금액(원) */
  price: number
  /** subscriptions.current_period_start */
  periodStart: string | Date | null
  /** subscriptions.current_period_end */
  periodEnd: string | Date | null
  /** membership_plans.talismans_per_period — 이번 주기에 지급된 복채 */
  grantedCredits: number
  /** wallets.balance — 현재 지갑 잔액 */
  walletBalance: number
  /** 이미 환불된 금액(원) — 재요청 방어 */
  alreadyRefunded?: number | null
  now?: Date
}

export interface MembershipRefundPlan {
  /** 이번 결제 주기 총 일수 */
  totalDays: number
  /** 이용한 일수(개시 당일 포함) */
  usedDays: number
  /** 남은 일수 */
  remainingDays: number
  /** 기간 기준 이용 비율 */
  dayUsageRatio: number
  /** 복채 소진 기준 이용 비율 */
  creditUsageRatio: number
  /** 최종 이용 비율 = max(기간, 복채). 두 값을 더하지 않는다(이중 공제 방지) */
  usageRatio: number
  /** 환불 금액(원) */
  refundAmount: number
  /** 회수하지 않고 그대로 두는 복채 — CEO 결정 */
  keptCredits: number
  /** 지급 복채 중 이미 소진한 양(환불 계산 근거) */
  consumedCredits: number
}

/**
 * 잔여기간 일할 환불액.
 *
 * 이용 비율 = **max(기간 비율, 복채 소진 비율)**.
 *  - 기간만 보면 가입 다음 날 해지하면서 한 달치 복채를 다 쓰고 97% 를 돌려받는 구멍이 열린다.
 *  - 두 비율을 더하면 같은 이용을 두 번 공제해 사용자에게 불리해진다.
 *  → 더 큰 쪽 하나만 공제한다. 복채를 쓰지 않았다면 순수 일할 환불이 그대로 나온다.
 *
 * 위약금은 0 이다(약관 제7조 제3항이 위약금을 두지 않음 — 지침 제19조의 10% 한도보다 사용자 유리).
 */
export function computeMembershipRefund(input: MembershipRefundInput): MembershipRefundPlan {
  const now = input.now ?? new Date()
  const price = toInt(input.price)
  const grantedCredits = toInt(input.grantedCredits)
  const walletBalance = toInt(input.walletBalance)
  const alreadyRefunded = Math.min(toInt(input.alreadyRefunded), price)

  const start = input.periodStart ? toDate(input.periodStart) : null
  const end = input.periodEnd ? toDate(input.periodEnd) : null

  const hasPeriod =
    !!start && !!end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start

  const totalDays = hasPeriod ? Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS)) : 0
  const usedDays = hasPeriod
    ? Math.min(totalDays, Math.max(0, Math.ceil((now.getTime() - start.getTime()) / DAY_MS)))
    : 0
  const remainingDays = Math.max(0, totalDays - usedDays)

  // 기간을 모르면 일할 계산 근거가 없다 → 환불 0(수동 처리 대상). 해지 자체는 진행된다.
  const dayUsageRatio = hasPeriod ? usedDays / totalDays : 1

  const consumedCredits = Math.max(0, grantedCredits - Math.min(grantedCredits, walletBalance))
  const creditUsageRatio = grantedCredits > 0 ? consumedCredits / grantedCredits : 0

  const usageRatio = Math.min(1, Math.max(dayUsageRatio, creditUsageRatio))
  // 🔴 반올림. 내림을 쓰면 부동소수 오차(9900 × (1−0.8) = 1979.99…)가 그대로 1원 손해로 굳는다.
  //    1원 단위 이득은 사용자에게 준다 — 수수료 계산과 같은 방향.
  const refundable = Math.round(price * (1 - usageRatio))
  const refundAmount = Math.max(0, Math.min(refundable, price - alreadyRefunded))

  return {
    totalDays,
    usedDays,
    remainingDays,
    dayUsageRatio,
    creditUsageRatio,
    usageRatio,
    refundAmount,
    keptCredits: Math.min(grantedCredits, walletBalance),
    consumedCredits,
  }
}

// ────────────────────────────────────────────────────────────
// 화면 ↔ 서버 액션 공용 DTO
// ('use server' 파일은 함수만 export 할 수 있으므로 타입은 여기 둔다)
// ────────────────────────────────────────────────────────────

export interface ChargeCancelItem {
  paymentId: string
  orderId: string
  /** ISO 문자열 */
  paidAt: string
  paidAmount: number
  packLabel: string
  plan: ChargeCancelPlan
}

export interface ChargeCancelOverview {
  walletBalance: number
  items: ChargeCancelItem[]
  /** 「손실 처리」 취소 경로가 지금 열려 있는지(loss-cap.ts). 잔여 횟수·금액은 담지 않는다. */
  lossCap: LossCapStatus
}

export interface MembershipCancelOverview {
  hasSubscription: boolean
  planName: string
  tier: string
  price: number
  grantedCredits: number
  periodStart: string | null
  periodEnd: string | null
  nextBillingDate: string | null
  /** 환불 대상 결제(마지막 성공 결제)가 있어 즉시 환불이 가능한지 */
  refundable: boolean
  refund: MembershipRefundPlan
}

export interface ChargeCancelSubmission {
  paymentId: string
  reasonCode: string
  memo?: string
  /** (b) 갈래에서 「그래도 취소 요청」을 누른 경우에만 true */
  acceptLoss?: boolean
}

export interface MembershipCancelSubmission {
  /** 'PERIOD_END'(기본, 환불 없음) | 'IMMEDIATE_REFUND'(즉시 해지 + 일할 환불) */
  mode: string
  reasonCode: string
  memo?: string
}

export interface CancelActionResult {
  success: boolean
  error?: string
  /** 실제 환불 금액(원) */
  refundAmount?: number
  /** 손실 처리된 복채 */
  lossCredits?: number
  /** 지갑에서 실제 회수된 복채 */
  clawedCredits?: number
  /** true 면 「그래도 취소 요청」 2차 확인이 필요하다 */
  requiresLossAcknowledgement?: boolean
  /** true 면 손실 처리 상한에 걸려 막혔다 — error 에 안내 문구가 들어 있다 */
  lossCapBlocked?: boolean
}
