/**
 * 「손실 처리」 취소 상한 정책 (순수 함수 · 테스트 가능).
 *
 * 왜 필요한가
 *  복채를 이미 써버린 뒤에도 2차 동의를 거치면 취소가 되고, 회수하지 못한 몫은 회사가 손실로
 *  떠안는다(CEO 결정 — 사용자에게 청구하지 않는다). 이 경로는 구조적으로
 *  「충전 → 복채 전부 사용 → 전액 환불」을 반복할 수 있고, 지금까지 있던 방어는 **결제 1건당 1회**
 *  (부분 유니크 인덱스)뿐이라 계정 단위로는 무한히 반복할 수 있었다.
 *
 * 정책 — 다층(횟수 + 금액), 최근 365일 이동창(rolling window)
 *  1) 횟수: 계정당 최근 365일 **2회**
 *  2) 금액: 계정당 최근 365일 누적 손실 **10만원**
 *  둘 중 하나라도 이미 채웠으면 손실 처리 취소를 열지 않는다.
 *
 * 수치 근거
 *  - 충전 팩은 5만·10만·20만·30만원 네 종류다(price_plans). 최소 팩이 5만원이므로 금액 상한을
 *    5만원으로 두면 팩 하나 만에 소진되어 사실상 「연 1회」가 된다. **10만원 = 최소 팩 2개분
 *    = 인기 팩 1개분**이라, 「진짜 실수」를 두 번까지 구제하면서 그 이상은 닫는 지점이다.
 *  - 횟수만 두면 30만원 팩을 두 번 돌려 60만원이 새고, 금액만 두면 소액 반복이 상한 직전까지
 *    계속 성공한다. 그래서 둘 다 둔다.
 *  - 달력 연도가 아니라 이동창인 이유: 12월 31일과 1월 1일에 연달아 뽑는 연초 리셋 악용이 있다.
 *
 * 🔴 판정은 «이미 쌓인 누적»만 본다 — 이번 요청의 예상 손실을 더해서 넘는지 보지 **않는다**.
 *    사전 합산으로 막으면 30만원 팩을 쓴 정상 사용자가 **첫 요청부터** 거절당한다(구제 자체가 사라짐).
 *    이 방식이면 첫 요청은 팩 크기와 무관하게 반드시 통과하고, 큰 손실이 한 번 나면 그 즉시
 *    금액 상한이 닫혀 두 번째가 막힌다. 연간 최대 노출 = 「단일 최대 손실 1회」로 유계다.
 *
 * 🔴 손실이 0인 취소(복채를 안 쓴 정상 취소)는 이 상한과 **무관**하다. lossCredits > 0 일 때만 잰다.
 */

import { SUPPORT_LABEL } from '@/lib/domain/support/contact'

/** 이동창 길이(일). 달력 연도가 아니라 «최근 N일». */
export const LOSS_CANCEL_WINDOW_DAYS = 365

/** 계정당 이동창 내 손실 처리 취소 허용 «횟수». */
export const LOSS_CANCEL_MAX_COUNT = 2

/** 계정당 이동창 내 손실 처리 누적 «금액»(원). */
export const LOSS_CANCEL_MAX_AMOUNT = 100_000

const DAY_MS = 86_400_000

export type LossCapBlockedReason = 'COUNT_EXCEEDED' | 'AMOUNT_EXCEEDED'

export function isLossCapBlockedReason(value: unknown): value is LossCapBlockedReason {
  return value === 'COUNT_EXCEEDED' || value === 'AMOUNT_EXCEEDED'
}

export interface LossCapUsage {
  /** 이동창 안에서 이미 손실 처리된 취소 건수(진행 중 REQUESTED 포함 — 따닥 방어) */
  count: number
  /** 이동창 안 누적 손실 금액(원) */
  amount: number
  /** 이동창 안 «가장 오래된» 손실 취소 시각. 이 건이 창을 벗어나면 자리가 하나 돌아온다 */
  oldestAt?: string | Date | null
}

export interface LossCapDecision {
  allowed: boolean
  /** 마스터(admin) 면제로 통과한 경우 true */
  exempt: boolean
  blockedReason?: LossCapBlockedReason
  /** 다시 열릴 것으로 보이는 시각(ISO). 알 수 없으면 null */
  nextAvailableAt: string | null
}

function toCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function toDateOrNull(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

/** 이동창 시작 시각 — 이 시각 이후의 손실 취소만 상한 계산에 든다. */
export function lossCapWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - LOSS_CANCEL_WINDOW_DAYS * DAY_MS)
}

export interface LossCapInput {
  /** 이번 취소로 손실 처리될 복채. 0 이면 상한과 무관하다 */
  lossCredits: number
  usage: LossCapUsage
  /** 마스터(admin) 면제 — lib/auth/privileges.ts 의 hasUnlimitedAccess 결과를 그대로 넘긴다 */
  exempt?: boolean
  now?: Date
}

/**
 * 손실 처리 취소를 열어줄지 판정한다.
 *
 * 서버 액션의 «안내»용 사전 판정과 화면 표시에 쓰고, 실제 접수 차단은 DB 함수
 * `open_charge_cancel_request` 가 잠금 아래에서 같은 규칙으로 다시 판정한다(따닥 방어).
 */
export function evaluateLossCap(input: LossCapInput): LossCapDecision {
  const exempt = input.exempt === true
  const lossCredits = toCount(input.lossCredits)
  const now = input.now ?? new Date()

  // 손실이 없는 취소는 애초에 이 정책의 대상이 아니다.
  if (lossCredits <= 0) return { allowed: true, exempt, nextAvailableAt: null }
  if (exempt) return { allowed: true, exempt: true, nextAvailableAt: null }

  const usedCount = toCount(input.usage.count)
  const usedAmount = toCount(input.usage.amount)

  const oldest = toDateOrNull(input.usage.oldestAt)
  const nextAvailableAt = oldest ? new Date(oldest.getTime() + LOSS_CANCEL_WINDOW_DAYS * DAY_MS) : null
  // 이미 창을 벗어난 시각을 「다음 가능일」이라고 안내하면 거짓말이 된다.
  const nextIso = nextAvailableAt && nextAvailableAt.getTime() > now.getTime() ? nextAvailableAt.toISOString() : null

  if (usedCount >= LOSS_CANCEL_MAX_COUNT) {
    return { allowed: false, exempt: false, blockedReason: 'COUNT_EXCEEDED', nextAvailableAt: nextIso }
  }
  if (usedAmount >= LOSS_CANCEL_MAX_AMOUNT) {
    return { allowed: false, exempt: false, blockedReason: 'AMOUNT_EXCEEDED', nextAvailableAt: nextIso }
  }
  return { allowed: true, exempt: false, nextAvailableAt: null }
}

function koreanDate(iso: string | null): string | null {
  const date = toDateOrNull(iso)
  if (!date) return null
  // 서버는 UTC 로 돌 수 있다 — 날짜 안내는 반드시 KST 기준으로 찍는다.
  return date.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * 상한에 걸린 사용자에게 보여줄 문구.
 *
 * 노출 정책
 *  - 「횟수」 상한은 숫자를 밝힌다. 규칙을 알아야 납득하고, 2회라는 사실 자체는 얼마를 더 빼낼 수
 *    있는지 알려주지 않는다.
 *  - 「금액」 상한은 숫자를 밝히지 **않는다**. 남은 금액을 알려주는 순간 그게 곧 인출 한도 지도가 된다.
 *  - 평상시 화면에는 「2회 중 1회 사용」 같은 잔여 표시를 하지 않는다 — 남은 자리를 알려주면
 *    「쓸 수 있을 때 써두자」는 유인이 생긴다. 막혔을 때만 이유를 말한다.
 */
export function lossCapBlockedMessage(decision: LossCapDecision): string {
  const when = koreanDate(decision.nextAvailableAt)
  const reopen = when ? ` ${when} 이후에는 다시 요청하실 수 있습니다.` : ''
  const guide = ` 그전에 사정이 있으시면 ${SUPPORT_LABEL}로 말씀해 주세요 — 사람이 직접 살펴보고 도와드리겠습니다.`

  if (decision.blockedReason === 'AMOUNT_EXCEEDED') {
    return (
      '이미 사용하신 복채까지 되돌려 드리는 취소는 한 계정에 1년 동안 도와드릴 수 있는 한도가 있습니다. ' +
      `최근 1년 사이 그 한도에 이르러 지금은 자동으로 처리해 드리기 어렵습니다.${reopen}${guide}`
    )
  }
  return (
    '이미 사용하신 복채까지 되돌려 드리는 취소는 한 계정에 1년 2회까지 도와드리고 있습니다. ' +
    `지금은 그 횟수를 모두 쓰셔서 자동으로 처리해 드리기 어렵습니다.${reopen}${guide}`
  )
}

/** 화면에 내려보내는 상한 상태. 🔴 잔여 횟수·금액은 담지 않는다(악용 유인 차단). */
export interface LossCapStatus {
  /** 손실 처리 취소 경로가 지금 열려 있는지 */
  available: boolean
  blockedReason?: LossCapBlockedReason
  /** 다시 열리는 시각(ISO) */
  nextAvailableAt: string | null
  /** 차단 시 화면에 그대로 띄울 문구 */
  message?: string
}

export const LOSS_CAP_OPEN: LossCapStatus = { available: true, nextAvailableAt: null }

export function toLossCapStatus(decision: LossCapDecision): LossCapStatus {
  if (decision.allowed) return LOSS_CAP_OPEN
  return {
    available: false,
    blockedReason: decision.blockedReason,
    nextAvailableAt: decision.nextAvailableAt,
    message: lossCapBlockedMessage(decision),
  }
}
