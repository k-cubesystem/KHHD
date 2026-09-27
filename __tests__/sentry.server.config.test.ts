/**
 * @jest-environment node
 */
/**
 * Sentry 서버 설정 — 「요청 본문·쿠키를 이벤트에 싣지 않는다」가 계약이다.
 *
 * 🔴 SDK 의 RequestData 통합이 요청 스코프(normalizedRequest)를 event.request 로 옮기는 유일한 경로이고,
 *    그 기본값은 본문·쿠키를 모두 싣는다. 설정에서 include 를 닫지 않으면 기본값이 되살아난다.
 *    스코프 단위의 같은 계약: lib/services/chat-safety.ts
 */
import type { Client, Event, Integration } from '@sentry/core'
import * as Sentry from '@sentry/nextjs'

jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  // @sentry/nextjs 는 @sentry/core 의 requestDataIntegration 을 그대로 다시 내보낸다 — 실제 구현으로 검증한다.
  requestDataIntegration: jest.requireActual<typeof import('@sentry/core')>('@sentry/core').requestDataIntegration,
}))

type InitOptions = { integrations?: Integration[]; sendDefaultPii?: boolean }

const mockInit = Sentry.init as unknown as jest.Mock

const normalizedRequest = {
  method: 'POST',
  url: 'https://k-haehwadang.com/api/chat/stream',
  query_string: 'target=self',
  headers: {
    cookie: 'sb-access-token=secret; sb-refresh-token=secret',
    'user-agent': 'jest',
    'content-type': 'application/json',
  },
  data: '{"message":"회원이 쓴 글","history":[]}',
}

async function loadInitOptions(file: 'server' | 'edge'): Promise<InitOptions> {
  mockInit.mockClear()
  await jest.isolateModulesAsync(async () => {
    if (file === 'server') await import('@/sentry.server.config')
    else await import('@/sentry.edge.config')
  })
  expect(mockInit).toHaveBeenCalledTimes(1)
  return mockInit.mock.calls[0][0] as InitOptions
}

async function processWithRequestData(options: InitOptions): Promise<Event | null> {
  const integration = options.integrations?.find((i) => i.name === 'RequestData')
  if (!integration?.processEvent)
    throw new Error('RequestData 통합이 설정에 없다 — SDK 기본값(본문·쿠키 포함)이 적용된다')
  const event: Event = {
    message: '[logger] error',
    sdkProcessingMetadata: { normalizedRequest, ipAddress: '10.0.0.1' },
  }
  const client = { getOptions: () => ({}) } as unknown as Client
  return await integration.processEvent(event, {}, client)
}

const originalDsn = process.env.NEXT_PUBLIC_SENTRY_DSN

beforeAll(() => {
  process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://00000000000000000000000000000000@o0.ingest.sentry.io/0'
})

afterAll(() => {
  if (originalDsn === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN
  else process.env.NEXT_PUBLIC_SENTRY_DSN = originalDsn
})

describe('sentry.server.config', () => {
  it('🔴 요청 본문·쿠키·IP 를 이벤트에 싣지 않는다', async () => {
    const event = await processWithRequestData(await loadInitOptions('server'))

    expect(event?.request?.data).toBeUndefined()
    expect(event?.request?.cookies).toBeUndefined()
    expect(event?.request?.headers?.cookie).toBeUndefined()
    expect(event?.user).toBeUndefined()
  })

  it('url·method·쿼리·나머지 헤더는 그대로 남긴다 — 디버깅 정보까지 잃지 않는다', async () => {
    const event = await processWithRequestData(await loadInitOptions('server'))

    expect(event?.request).toEqual({
      method: 'POST',
      url: 'https://k-haehwadang.com/api/chat/stream',
      query_string: 'target=self',
      headers: { 'user-agent': 'jest', 'content-type': 'application/json' },
    })
  })
})

describe('sentry.edge.config', () => {
  it('sendDefaultPii 를 켜지 않는다 — 켜면 Edge SDK 가 RequestData(본문·쿠키 포함)를 기본으로 얹는다', async () => {
    const options = await loadInitOptions('edge')

    expect(options.sendDefaultPii).toBeFalsy()
    expect(options.integrations?.some((i) => i.name === 'RequestData')).toBeFalsy()
  })
})
