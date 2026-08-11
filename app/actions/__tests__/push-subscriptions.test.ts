import { getPushStatus, savePushSubscription, removePushSubscription } from '../notifications/push'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

const getUser = jest.fn()
const upsertResult = jest.fn()
const deleteResult = jest.fn()

/** upsert 로 넘어간 행 + 충돌 옵션 — 「세션 사용자만 실린다」 계약 검증용 */
let upsertRow: Record<string, unknown> | null = null
let upsertOptions: unknown = null
/** DELETE 체인에 걸린 필터 — 「내 것만 지운다」 계약 검증용 */
let deleteFilters: Array<[string, unknown]> = []
let adminTable: string | null = null
let userTable: string | null = null

function adminPushTable() {
  return {
    upsert: (row: Record<string, unknown>, options: unknown) => {
      upsertRow = row
      upsertOptions = options
      return Promise.resolve(upsertResult())
    },
  }
}

function userPushTable() {
  const chain = {
    eq: (column: string, value: unknown) => {
      deleteFilters.push([column, value])
      return deleteFilters.length >= 2 ? Promise.resolve(deleteResult()) : chain
    },
  }
  return { delete: () => chain }
}

const VALID_SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
}

function setKeys() {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key'
  process.env.VAPID_PRIVATE_KEY = 'test-private-key'
}

function clearKeys() {
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  delete process.env.VAPID_PRIVATE_KEY
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  clearKeys()
  getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
  upsertResult.mockReturnValue({ error: null })
  deleteResult.mockReturnValue({ error: null })
  upsertRow = null
  upsertOptions = null
  deleteFilters = []
  adminTable = null
  userTable = null

  mockCreateClient.mockResolvedValue({
    auth: { getUser },
    from: (table: string) => {
      userTable = table
      return userPushTable()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  mockCreateAdminClient.mockReturnValue({
    from: (table: string) => {
      adminTable = table
      return adminPushTable()
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

describe('getPushStatus — 키 부재 시 화면이 꺼진다', () => {
  it('키가 없으면 enabled:false, 공개키도 내리지 않는다', async () => {
    await expect(getPushStatus()).resolves.toEqual({ enabled: false, publicKey: null })
  })

  it('비밀키만 있으면 여전히 꺼짐 — 반쪽 설정으로 토글을 열지 않는다', async () => {
    process.env.VAPID_PRIVATE_KEY = 'only-private'

    await expect(getPushStatus()).resolves.toEqual({ enabled: false, publicKey: null })
  })

  it('키가 갖춰지면 공개키와 함께 켜진다 — 코드 변경 없이 전환된다', async () => {
    setKeys()

    await expect(getPushStatus()).resolves.toEqual({ enabled: true, publicKey: 'test-public-key' })
  })
})

describe('savePushSubscription — 구독 저장', () => {
  it('키가 없으면 저장 경로도 닫힌다 — 보낼 수 없는 구독을 받아 두지 않는다', async () => {
    await expect(savePushSubscription(VALID_SUBSCRIPTION)).resolves.toEqual({
      success: false,
      error: 'PUSH_DISABLED',
    })
    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  describe('키가 갖춰진 뒤', () => {
    beforeEach(setKeys)

    it('정상 구독을 push_subscriptions 에 upsert 한다', async () => {
      await expect(savePushSubscription(VALID_SUBSCRIPTION, 'Mozilla/5.0 test')).resolves.toEqual({ success: true })

      expect(adminTable).toBe('push_subscriptions')
      expect(upsertRow).toEqual({
        user_id: 'u-1',
        endpoint: VALID_SUBSCRIPTION.endpoint,
        p256dh: 'p256dh-key',
        auth_key: 'auth-key',
        user_agent: 'Mozilla/5.0 test',
      })
    })

    it('endpoint 충돌은 덮어쓴다 — 같은 기기에서 계정을 갈아타면 소유가 넘어온다', async () => {
      await savePushSubscription(VALID_SUBSCRIPTION)

      expect(upsertOptions).toEqual({ onConflict: 'endpoint' })
    })

    it('user_id 는 세션에서만 온다 — 클라이언트가 남을 지목해도 무시된다', async () => {
      await savePushSubscription({ ...VALID_SUBSCRIPTION, user_id: 'victim' })

      expect(upsertRow?.user_id).toBe('u-1')
    })

    it('비로그인은 저장하지 못한다', async () => {
      getUser.mockResolvedValue({ data: { user: null } })

      await expect(savePushSubscription(VALID_SUBSCRIPTION)).resolves.toEqual({
        success: false,
        error: 'UNAUTHORIZED',
      })
      expect(upsertRow).toBeNull()
    })

    it.each([
      ['null', null],
      ['문자열', 'not-an-object'],
      ['endpoint 없음', { keys: { p256dh: 'a', auth: 'b' } }],
      ['http endpoint', { endpoint: 'http://insecure/x', keys: { p256dh: 'a', auth: 'b' } }],
      ['keys 없음', { endpoint: 'https://fcm/x' }],
      ['p256dh 빈 값', { endpoint: 'https://fcm/x', keys: { p256dh: '', auth: 'b' } }],
      ['auth 없음', { endpoint: 'https://fcm/x', keys: { p256dh: 'a' } }],
      ['endpoint 과길이', { endpoint: `https://fcm/${'x'.repeat(2100)}`, keys: { p256dh: 'a', auth: 'b' } }],
      ['키 과길이', { endpoint: 'https://fcm/x', keys: { p256dh: 'x'.repeat(300), auth: 'b' } }],
    ])('%s 는 거절하고 DB 에 닿지 않는다', async (_label, input) => {
      await expect(savePushSubscription(input)).resolves.toEqual({
        success: false,
        error: 'INVALID_SUBSCRIPTION',
      })
      expect(mockCreateAdminClient).not.toHaveBeenCalled()
    })

    it('user_agent 는 300자로 자른다', async () => {
      await savePushSubscription(VALID_SUBSCRIPTION, 'U'.repeat(500))

      expect(upsertRow?.user_agent).toHaveLength(300)
    })

    it('user_agent 가 문자열이 아니면 null 로 남긴다', async () => {
      await savePushSubscription(VALID_SUBSCRIPTION, { spoofed: true })

      expect(upsertRow?.user_agent).toBeNull()
    })

    it('저장 실패는 로그를 남기고 실패로 돌려준다 (무음 실패 금지)', async () => {
      upsertResult.mockReturnValue({ error: { message: 'duplicate key' } })

      await expect(savePushSubscription(VALID_SUBSCRIPTION)).resolves.toEqual({
        success: false,
        error: 'SAVE_FAILED',
      })
      expect(logger.error).toHaveBeenCalled()
    })

    it('service_role 키가 없어 admin 생성이 터져도 500 이 아니라 실패를 돌려준다', async () => {
      mockCreateAdminClient.mockImplementation(() => {
        throw new Error('Supabase URL or Service Role Key is missing.')
      })

      await expect(savePushSubscription(VALID_SUBSCRIPTION)).resolves.toEqual({
        success: false,
        error: 'SAVE_FAILED',
      })
    })
  })
})

describe('removePushSubscription — 구독 해지', () => {
  it('VAPID 키가 없어도 해지는 된다 — 끄기는 언제나 열려 있어야 한다', async () => {
    await expect(removePushSubscription(VALID_SUBSCRIPTION.endpoint)).resolves.toEqual({ success: true })

    expect(userTable).toBe('push_subscriptions')
  })

  it('내 것만 지운다 — endpoint 와 user_id 를 함께 건다', async () => {
    await removePushSubscription(VALID_SUBSCRIPTION.endpoint)

    expect(deleteFilters).toEqual([
      ['endpoint', VALID_SUBSCRIPTION.endpoint],
      ['user_id', 'u-1'],
    ])
  })

  it('service_role 을 쓰지 않는다 — RLS 가 소유를 지키는 경로다', async () => {
    await removePushSubscription(VALID_SUBSCRIPTION.endpoint)

    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('비로그인은 지우지 못한다', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    await expect(removePushSubscription(VALID_SUBSCRIPTION.endpoint)).resolves.toEqual({
      success: false,
      error: 'UNAUTHORIZED',
    })
    expect(deleteFilters).toEqual([])
  })

  it.each([
    ['null', null],
    ['빈 문자열', ''],
    ['객체', { endpoint: 'https://fcm/x' }],
  ])('%s 는 거절하고 DB 에 닿지 않는다', async (_label, input) => {
    await expect(removePushSubscription(input)).resolves.toEqual({
      success: false,
      error: 'INVALID_SUBSCRIPTION',
    })
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('삭제 실패는 로그를 남기고 실패로 돌려준다', async () => {
    deleteResult.mockReturnValue({ error: { message: 'boom' } })

    await expect(removePushSubscription(VALID_SUBSCRIPTION.endpoint)).resolves.toEqual({
      success: false,
      error: 'DELETE_FAILED',
    })
    expect(logger.error).toHaveBeenCalled()
  })
})
