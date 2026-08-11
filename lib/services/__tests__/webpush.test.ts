import webpush from 'web-push'
import { sendPushToUser, readVapidConfig, isPushConfigured, isGoneStatus } from '../webpush'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }))
jest.mock('web-push', () => ({
  __esModule: true,
  default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() },
}))

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const setVapidDetails = webpush.setVapidDetails as jest.MockedFunction<typeof webpush.setVapidDetails>
const sendNotification = webpush.sendNotification as jest.MockedFunction<typeof webpush.sendNotification>

/** push_subscriptions 조회 결과 */
const selectResult = jest.fn()
/** 만료 구독 DELETE 결과 */
const deleteResult = jest.fn()
/** last_success_at UPDATE 결과 */
const updateResult = jest.fn()

let deletedEndpoints: string[] | null = null
let touchedEndpoints: string[] | null = null
let updatePatch: unknown = null
let selectedTable: string | null = null

function pushTable() {
  return {
    select: () => ({
      eq: () => Promise.resolve(selectResult()),
    }),
    delete: () => ({
      in: (_column: string, values: string[]) => {
        deletedEndpoints = values
        return Promise.resolve(deleteResult())
      },
    }),
    update: (patch: unknown) => {
      updatePatch = patch
      return {
        in: (_column: string, values: string[]) => {
          touchedEndpoints = values
          return Promise.resolve(updateResult())
        },
      }
    },
  }
}

function sub(endpoint: string) {
  return { endpoint, p256dh: `p-${endpoint}`, auth_key: `a-${endpoint}` }
}

/** 푸시 서비스가 «죽은 구독»에 주는 응답 */
function webPushError(statusCode: number) {
  return Object.assign(new Error(`push service ${statusCode}`), { statusCode })
}

function setKeys() {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key'
  process.env.VAPID_PRIVATE_KEY = 'test-private-key'
}

function clearKeys() {
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  delete process.env.VAPID_PRIVATE_KEY
  delete process.env.VAPID_SUBJECT
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  clearKeys()
  selectResult.mockReturnValue({ data: [], error: null })
  deleteResult.mockReturnValue({ error: null })
  updateResult.mockReturnValue({ error: null })
  sendNotification.mockResolvedValue({ statusCode: 201, body: '', headers: {} })
  deletedEndpoints = null
  touchedEndpoints = null
  updatePatch = null
  selectedTable = null
  mockCreateAdminClient.mockReturnValue({
    from: (table: string) => {
      selectedTable = table
      return pushTable()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
})

afterEach(() => {
  jest.clearAllMocks()
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

describe('readVapidConfig — VAPID 키 부재 판정', () => {
  it('키가 하나도 없으면 null', () => {
    expect(readVapidConfig()).toBeNull()
    expect(isPushConfigured()).toBe(false)
  })

  it('공개키만 있으면 null — 반쪽 설정은 켜진 것이 아니다', () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'only-public'

    expect(readVapidConfig()).toBeNull()
  })

  it('비밀키만 있어도 null', () => {
    process.env.VAPID_PRIVATE_KEY = 'only-private'

    expect(readVapidConfig()).toBeNull()
  })

  it('공백만 든 값은 «없음»으로 본다 (환경변수를 빈 칸으로 두는 실수 흡수)', () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = '   '
    process.env.VAPID_PRIVATE_KEY = 'private'

    expect(readVapidConfig()).toBeNull()
  })

  it('둘 다 있으면 설정으로 읽고 subject 기본값을 채운다', () => {
    setKeys()

    expect(readVapidConfig()).toEqual({
      publicKey: 'test-public-key',
      privateKey: 'test-private-key',
      subject: 'https://k-haehwadang.com',
    })
    expect(isPushConfigured()).toBe(true)
  })

  it('VAPID_SUBJECT 가 있으면 그것을 쓴다', () => {
    setKeys()
    process.env.VAPID_SUBJECT = 'mailto:ops@example.com'

    expect(readVapidConfig()?.subject).toBe('mailto:ops@example.com')
  })

  it('키를 넣으면 재적재 없이 즉시 켜진다 — 호출 시점에 읽는다', () => {
    expect(isPushConfigured()).toBe(false)

    setKeys()

    expect(isPushConfigured()).toBe(true)
  })
})

describe('sendPushToUser — 키 부재 시 완전 무동작', () => {
  it('DB 도 web-push 도 건드리지 않고 configured:false 로 돌아온다', async () => {
    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toEqual({
      configured: false,
      sent: 0,
      removed: 0,
      failed: 0,
    })

    expect(mockCreateAdminClient).not.toHaveBeenCalled()
    expect(setVapidDetails).not.toHaveBeenCalled()
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('반쪽 설정에서도 무동작 — 크래시하지 않는다', async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'only-public'

    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toMatchObject({ configured: false })
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})

describe('sendPushToUser — 발송', () => {
  beforeEach(setKeys)

  it('구독이 없으면 web-push 를 적재하지도 않는다', async () => {
    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toEqual({
      configured: true,
      sent: 0,
      removed: 0,
      failed: 0,
    })

    expect(selectedTable).toBe('push_subscriptions')
    expect(setVapidDetails).not.toHaveBeenCalled()
  })

  it('보유한 모든 기기로 보내고 payload 를 JSON 으로 싣는다', async () => {
    selectResult.mockReturnValue({ data: [sub('https://fcm/a'), sub('https://fcm/b')], error: null })

    await expect(
      sendPushToUser('u-1', { title: '신탁', body: '오늘도 평안하시길', url: '/protected/shrine', tag: 'deity-oracle' })
    ).resolves.toEqual({ configured: true, sent: 2, removed: 0, failed: 0 })

    expect(setVapidDetails).toHaveBeenCalledWith('https://k-haehwadang.com', 'test-public-key', 'test-private-key')
    expect(sendNotification).toHaveBeenCalledTimes(2)
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://fcm/a', keys: { p256dh: 'p-https://fcm/a', auth: 'a-https://fcm/a' } },
      JSON.stringify({ title: '신탁', body: '오늘도 평안하시길', url: '/protected/shrine', tag: 'deity-oracle' })
    )
  })

  it('성공한 구독만 last_success_at 을 갱신한다', async () => {
    selectResult.mockReturnValue({ data: [sub('https://fcm/a')], error: null })

    await sendPushToUser('u-1', { title: 't', body: 'b' })

    expect(touchedEndpoints).toEqual(['https://fcm/a'])
    expect(updatePatch).toMatchObject({ last_success_at: expect.any(String) })
  })
})

describe('sendPushToUser — 만료 구독 정리', () => {
  beforeEach(setKeys)

  it.each([404, 410])('%i 는 죽은 구독으로 보고 그 행을 지운다', async (status) => {
    selectResult.mockReturnValue({ data: [sub('https://fcm/dead')], error: null })
    sendNotification.mockRejectedValue(webPushError(status))

    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toEqual({
      configured: true,
      sent: 0,
      removed: 1,
      failed: 0,
    })
    expect(deletedEndpoints).toEqual(['https://fcm/dead'])
  })

  it('죽은 것만 지우고 살아 있는 구독은 남긴다', async () => {
    selectResult.mockReturnValue({ data: [sub('https://fcm/live'), sub('https://fcm/dead')], error: null })
    sendNotification.mockImplementation((subscription: { endpoint: string }) =>
      subscription.endpoint === 'https://fcm/dead'
        ? Promise.reject(webPushError(410))
        : Promise.resolve({ statusCode: 201, body: '', headers: {} })
    )

    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toEqual({
      configured: true,
      sent: 1,
      removed: 1,
      failed: 0,
    })
    expect(deletedEndpoints).toEqual(['https://fcm/dead'])
    expect(touchedEndpoints).toEqual(['https://fcm/live'])
  })

  it.each([429, 500, 503])('%i 는 일시 장애다 — 멀쩡한 구독을 지우지 않는다', async (status) => {
    selectResult.mockReturnValue({ data: [sub('https://fcm/a')], error: null })
    sendNotification.mockRejectedValue(webPushError(status))

    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toEqual({
      configured: true,
      sent: 0,
      removed: 0,
      failed: 1,
    })
    expect(deletedEndpoints).toBeNull()
  })

  it('statusCode 가 없는 예외도 삭제 사유가 아니다', async () => {
    selectResult.mockReturnValue({ data: [sub('https://fcm/a')], error: null })
    sendNotification.mockRejectedValue(new Error('socket hang up'))

    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toMatchObject({ removed: 0, failed: 1 })
    expect(deletedEndpoints).toBeNull()
  })

  it('삭제가 실패하면 removed 를 올리지 않는다 — 안 지운 걸 지웠다고 하지 않는다', async () => {
    selectResult.mockReturnValue({ data: [sub('https://fcm/dead')], error: null })
    sendNotification.mockRejectedValue(webPushError(410))
    deleteResult.mockReturnValue({ error: { message: 'permission denied' } })

    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toMatchObject({ removed: 0 })
    expect(logger.warn).toHaveBeenCalled()
  })

  it('endpoint 는 로그에 싣지 않는다 — 기기로 가는 비밀 URL 이다', async () => {
    selectResult.mockReturnValue({ data: [sub('https://fcm/secret-token')], error: null })
    sendNotification.mockRejectedValue(webPushError(500))

    await sendPushToUser('u-1', { title: 't', body: 'b' })

    const logged = JSON.stringify((logger.warn as jest.Mock).mock.calls)
    expect(logger.warn).toHaveBeenCalled()
    expect(logged).not.toContain('secret-token')
  })
})

describe('sendPushToUser — 실패해도 호출부를 죽이지 않는다', () => {
  beforeEach(setKeys)

  it('구독 조회 실패는 삼키고 결과로 돌려준다', async () => {
    selectResult.mockReturnValue({ data: null, error: { message: 'boom' } })

    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toEqual({
      configured: true,
      sent: 0,
      removed: 0,
      failed: 0,
    })
    expect(logger.warn).toHaveBeenCalled()
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('service_role 키가 없어 admin 생성이 터져도 throw 하지 않는다', async () => {
    mockCreateAdminClient.mockImplementation(() => {
      throw new Error('Supabase URL or Service Role Key is missing.')
    })

    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toMatchObject({ configured: true, sent: 0 })
    expect(logger.warn).toHaveBeenCalled()
  })

  it('setVapidDetails 가 잘못된 키로 터져도 throw 하지 않는다', async () => {
    selectResult.mockReturnValue({ data: [sub('https://fcm/a')], error: null })
    setVapidDetails.mockImplementation(() => {
      throw new Error('Vapid public key should be 65 bytes long')
    })

    await expect(sendPushToUser('u-1', { title: 't', body: 'b' })).resolves.toMatchObject({ configured: true, sent: 0 })
  })
})

describe('isGoneStatus', () => {
  it('404·410 만 «지워라» 신호다', () => {
    expect(isGoneStatus(404)).toBe(true)
    expect(isGoneStatus(410)).toBe(true)
    expect(isGoneStatus(400)).toBe(false)
    expect(isGoneStatus(429)).toBe(false)
    expect(isGoneStatus(500)).toBe(false)
  })
})
