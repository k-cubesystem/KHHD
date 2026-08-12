/**
 * 토스 결제 취소 API 호출 계약 (v1 문서 ID 85 · 118 · 206).
 *
 * 여기서 못 박는 것:
 *  - 엔드포인트·인증 헤더 형식(`Basic base64("시크릿키:")`)·`Idempotency-Key`
 *  - `cancelAmount` 를 넣지 않으면 **전액 취소**이므로, 부분 환불에서는 반드시 실려야 한다
 *  - 실패 응답의 code 를 사용자 안내로 바꾸고, 재시도 가능 여부를 구분한다
 */
import { parseTossCanceledPayment, requestTossCancel } from '../toss-cancel'

const OK_PAYMENT = {
  status: 'CANCELED',
  totalAmount: 10_000,
  balanceAmount: 0,
  cancels: [{ cancelAmount: 10_000, cancelStatus: 'DONE', transactionKey: 'tk-1', receiptKey: 'rk-1' }],
}

function mockFetch(response: { ok: boolean; status: number; body: unknown }) {
  const spy = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: async () => response.body,
  })
  global.fetch = spy as unknown as typeof fetch
  return spy
}

describe('requestTossCancel — 요청 스펙', () => {
  beforeEach(() => jest.clearAllMocks())

  it('문서에 적힌 엔드포인트·인증·멱등키로 요청한다', async () => {
    const spy = mockFetch({ ok: true, status: 200, body: OK_PAYMENT })

    await requestTossCancel({
      secretKey: 'test_sk_1',
      paymentKey: 'pk_live_1',
      cancelReason: '구매자 요청',
      cancelAmount: 9_000,
      idempotencyKey: 'HHD-CANCEL-abc',
    })

    const [url, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.tosspayments.com/v1/payments/pk_live_1/cancel')
    expect(init.method).toBe('POST')

    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('test_sk_1:').toString('base64')}`)
    expect(headers['Idempotency-Key']).toBe('HHD-CANCEL-abc')
    expect(JSON.parse(String(init.body))).toEqual({ cancelReason: '구매자 요청', cancelAmount: 9_000 })
  })

  it('cancelAmount 를 주지 않으면 본문에 넣지 않는다(= 전액 취소)', async () => {
    const spy = mockFetch({ ok: true, status: 200, body: OK_PAYMENT })

    await requestTossCancel({
      secretKey: 'test_sk_1',
      paymentKey: 'pk_live_1',
      cancelReason: '구매자 요청',
      idempotencyKey: 'HHD-CANCEL-abc',
    })

    const [, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ cancelReason: '구매자 요청' })
  })

  it('취소 내역을 회수 계산에 쓸 형태로 좁혀 돌려준다', async () => {
    mockFetch({ ok: true, status: 200, body: OK_PAYMENT })

    const outcome = await requestTossCancel({
      secretKey: 'test_sk_1',
      paymentKey: 'pk_live_1',
      cancelReason: '구매자 요청',
      idempotencyKey: 'k',
    })

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.payment.balanceAmount).toBe(0)
    expect(outcome.payment.cancels).toEqual([{ cancelAmount: 10_000, cancelStatus: 'DONE', transactionKey: 'tk-1' }])
  })

  it('시크릿 키가 없으면 네트워크를 타지 않는다', async () => {
    const spy = mockFetch({ ok: true, status: 200, body: OK_PAYMENT })

    const outcome = await requestTossCancel({
      secretKey: '',
      paymentKey: 'pk',
      cancelReason: 'r',
      idempotencyKey: 'k',
    })

    expect(outcome.ok).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })

  it('멱등키가 300자를 넘으면 요청하지 않는다(400 INVALID_IDEMPOTENCY_KEY 방지)', async () => {
    const spy = mockFetch({ ok: true, status: 200, body: OK_PAYMENT })

    const outcome = await requestTossCancel({
      secretKey: 'sk',
      paymentKey: 'pk',
      cancelReason: 'r',
      idempotencyKey: 'x'.repeat(301),
    })

    expect(outcome).toMatchObject({ ok: false, code: 'INVALID_IDEMPOTENCY_KEY' })
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('requestTossCancel — 실패 처리', () => {
  beforeEach(() => jest.clearAllMocks())

  it('알려진 에러 코드는 사용자 안내 문구로 바꾼다', async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: { code: 'ALREADY_CANCELED_PAYMENT', message: 'Already canceled' },
    })

    const outcome = await requestTossCancel({
      secretKey: 'sk',
      paymentKey: 'pk',
      cancelReason: 'r',
      idempotencyKey: 'k',
    })

    expect(outcome).toEqual({
      ok: false,
      code: 'ALREADY_CANCELED_PAYMENT',
      message: '이미 취소된 결제입니다.',
      retryable: false,
      httpStatus: 400,
    })
  })

  it('409 처리 중 에러는 재시도 대상으로 표시한다', async () => {
    mockFetch({ ok: false, status: 409, body: { code: 'IDEMPOTENT_REQUEST_PROCESSING', message: '처리 중' } })

    const outcome = await requestTossCancel({
      secretKey: 'sk',
      paymentKey: 'pk',
      cancelReason: 'r',
      idempotencyKey: 'k',
    })

    expect(outcome).toMatchObject({ ok: false, retryable: true })
  })

  it('본문을 못 읽어도 성공으로 오인하지 않는다', async () => {
    mockFetch({ ok: true, status: 200, body: null })

    const outcome = await requestTossCancel({
      secretKey: 'sk',
      paymentKey: 'pk',
      cancelReason: 'r',
      idempotencyKey: 'k',
    })

    expect(outcome).toMatchObject({ ok: false, code: 'INVALID_RESPONSE' })
  })
})

describe('parseTossCanceledPayment', () => {
  it('형태가 어긋난 값은 null', () => {
    expect(parseTossCanceledPayment(null)).toBeNull()
    expect(parseTossCanceledPayment('CANCELED')).toBeNull()
  })

  it('숫자가 아닌 금액은 버린다(any 대신 타입 가드)', () => {
    const parsed = parseTossCanceledPayment({ status: 'CANCELED', totalAmount: '10000', cancels: 'nope' })

    expect(parsed).toEqual({ status: 'CANCELED', totalAmount: null, balanceAmount: null, cancels: null })
  })
})
