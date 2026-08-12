/**
 * 토스페이먼츠 결제 취소 API 클라이언트 (v1).
 *
 * 스펙 근거 — 토스 공식 문서 「결제 취소하기」(문서 ID 85) · 「코어 API」(118) · 「인증 및 기타 헤더 설정」(206)
 *  - `POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel`
 *  - 인증: `Authorization: Basic base64("{시크릿키}:")` — 비밀번호 없이 콜론만 붙인다.
 *  - 본문 필수: `cancelReason`.
 *  - 부분 취소: `cancelAmount` 에 취소할 금액. **넣지 않으면 전액 취소**된다(→ 부분 취소는 반드시 명시).
 *  - `Idempotency-Key` 헤더(최대 300자, 최초 요청일부터 15일 유효)를 넣으면 중복 취소가 일어나지 않는다.
 *    409 `IDEMPOTENT_REQUEST_PROCESSING` 은 «앞선 같은 요청이 처리 중»이라는 뜻이라 재시도 대상이다.
 *  - 응답은 Payment 객체 — `status`(CANCELED/PARTIAL_CANCELED), `balanceAmount`, `cancels[]`
 *    (각 원소에 `cancelAmount`·`transactionKey`·`cancelStatus`).
 *
 * 🔴 시크릿 키는 이 모듈이 읽지 않는다. 호출자(서버 액션)가 기존 결제 승인 경로와 같은 방식으로 넘긴다.
 */

import type { TossCancelRecord } from './cancel-clawback'

const TOSS_API_BASE = 'https://api.tosspayments.com/v1/payments'

/** 취소 후 돌아오는 Payment 객체 중 회수 계산에 필요한 부분만. */
export interface TossCanceledPayment {
  status?: string | null
  totalAmount?: number | null
  balanceAmount?: number | null
  cancels?: TossCancelRecord[] | null
}

export interface TossCancelRequest {
  secretKey: string
  paymentKey: string
  /** 토스에 전달되는 취소 사유 문자열. 사용자 메모가 아니라 정형 문구를 쓴다. */
  cancelReason: string
  /** 부분 취소 금액(원). 생략하면 **전액 취소**. */
  cancelAmount?: number
  /** 최대 300자. 같은 취소를 재시도할 때 반드시 같은 값을 넣는다. */
  idempotencyKey: string
}

export type TossCancelOutcome =
  | { ok: true; payment: TossCanceledPayment }
  | { ok: false; code: string; message: string; retryable: boolean; httpStatus: number }

/** 멱등키 최대 길이(토스 규격). 초과 시 400 INVALID_IDEMPOTENCY_KEY. */
export const TOSS_IDEMPOTENCY_KEY_MAX_LENGTH = 300

/** 재시도해도 의미 있는 에러 — 처리 중(409)·일시 장애(5xx). */
const RETRYABLE_CODES: ReadonlySet<string> = new Set([
  'IDEMPOTENT_REQUEST_PROCESSING',
  'PROVIDER_ERROR',
  'FAILED_INTERNAL_SYSTEM_PROCESSING',
])

/** 사용자에게 그대로 보여줄 수 있는 안내로 치환. 없으면 토스 메시지를 쓴다. */
const USER_MESSAGES: Readonly<Record<string, string>> = {
  ALREADY_CANCELED_PAYMENT: '이미 취소된 결제입니다.',
  NOT_CANCELABLE_PAYMENT: '결제 수단 사정으로 취소할 수 없는 결제입니다. 고객센터로 문의해주세요.',
  NOT_CANCELABLE_AMOUNT: '취소할 수 있는 금액을 넘었습니다. 화면을 새로고침한 뒤 다시 시도해주세요.',
  EXCEED_CANCEL_AMOUNT: '취소할 수 있는 금액을 넘었습니다. 화면을 새로고침한 뒤 다시 시도해주세요.',
  NOT_FOUND_PAYMENT: '결제 정보를 찾을 수 없습니다. 고객센터로 문의해주세요.',
  INVALID_IDEMPOTENCY_KEY: '취소 요청을 만들지 못했습니다. 잠시 후 다시 시도해주세요.',
  IDEMPOTENT_REQUEST_PROCESSING: '앞선 취소 요청을 처리하는 중입니다. 잠시 후 다시 확인해주세요.',
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' ? value : null
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseCancelRecords(value: unknown): TossCancelRecord[] | null {
  if (!Array.isArray(value)) return null
  const records: TossCancelRecord[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    records.push({
      cancelAmount: readNumber(record, 'cancelAmount'),
      cancelStatus: readString(record, 'cancelStatus'),
      transactionKey: readString(record, 'transactionKey'),
    })
  }
  return records
}

/** 토스 응답(unknown)을 회수 계산에 필요한 형태로 좁힌다. any 금지. */
export function parseTossCanceledPayment(value: unknown): TossCanceledPayment | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  return {
    status: readString(record, 'status'),
    totalAmount: readNumber(record, 'totalAmount'),
    balanceAmount: readNumber(record, 'balanceAmount'),
    cancels: parseCancelRecords(record.cancels),
  }
}

function parseError(value: unknown, httpStatus: number): { code: string; message: string } {
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    const code = readString(record, 'code')
    const message = readString(record, 'message')
    if (code) return { code, message: USER_MESSAGES[code] ?? message ?? '결제 취소에 실패했습니다.' }
  }
  return { code: `HTTP_${httpStatus}`, message: '결제 취소에 실패했습니다. 잠시 후 다시 시도해주세요.' }
}

/**
 * 결제 취소 요청. 성공하면 Payment 객체(취소 내역 포함)를 돌려준다.
 *
 * `cancelAmount` 를 넘기지 않으면 **전액 취소**이므로, 부분 환불에서는 반드시 값을 채운다.
 */
export async function requestTossCancel(input: TossCancelRequest): Promise<TossCancelOutcome> {
  if (!input.secretKey) {
    return {
      ok: false,
      code: 'MISSING_SECRET_KEY',
      message: '결제 취소 설정 오류입니다.',
      retryable: false,
      httpStatus: 0,
    }
  }
  if (input.idempotencyKey.length > TOSS_IDEMPOTENCY_KEY_MAX_LENGTH) {
    return {
      ok: false,
      code: 'INVALID_IDEMPOTENCY_KEY',
      message: USER_MESSAGES.INVALID_IDEMPOTENCY_KEY,
      retryable: false,
      httpStatus: 0,
    }
  }

  const body: Record<string, string | number> = { cancelReason: input.cancelReason }
  if (typeof input.cancelAmount === 'number' && Number.isFinite(input.cancelAmount)) {
    body.cancelAmount = Math.max(0, Math.trunc(input.cancelAmount))
  }

  const response = await fetch(`${TOSS_API_BASE}/${encodeURIComponent(input.paymentKey)}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${input.secretKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify(body),
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const { code, message } = parseError(payload, response.status)
    return { ok: false, code, message, retryable: RETRYABLE_CODES.has(code), httpStatus: response.status }
  }

  const payment = parseTossCanceledPayment(payload)
  if (!payment) {
    return {
      ok: false,
      code: 'INVALID_RESPONSE',
      message: '결제 취소 응답을 해석하지 못했습니다. 고객센터로 문의해주세요.',
      retryable: false,
      httpStatus: response.status,
    }
  }

  return { ok: true, payment }
}
