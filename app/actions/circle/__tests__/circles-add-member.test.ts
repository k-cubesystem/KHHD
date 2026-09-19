import { addCircleMember } from '@/app/actions/circle/circles'
import { getCurrentUserMembership, type ActiveMembership } from '@/lib/auth/subscription'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/auth/subscription', () => ({ getCurrentUserMembership: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

const mockMembership = getCurrentUserMembership as jest.MockedFunction<typeof getCurrentUserMembership>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const CIRCLE_ID = '11111111-1111-4111-8111-111111111111'
const MEMBER_ID = '22222222-2222-4222-8222-222222222222'

/**
 * 운영 DB 계약(2026-09-14 실측): authenticated 는 circle_members 에 INSERT(네 칸)와 UPDATE(role, consent_at)만 있다.
 * PostgREST upsert 는 ON CONFLICT DO UPDATE SET 에 circle_id·member_id 까지 넣어 42501 로 거절된다 — 그래서 0건이었다.
 */
const PERMISSION_DENIED = { code: '42501', message: 'permission denied for table circle_members' }

type DbError = { code: string; message: string } | null

let insertError: DbError = null
let inserted: unknown[] = []
let upserted: unknown[] = []

function membership(tier: string): ActiveMembership {
  return {
    tier,
    planId: 'plan-1',
    status: 'ACTIVE',
    currentPeriodEnd: null,
    currentPeriodStart: null,
    isMaster: false,
    renews: true,
  }
}

function singleRow(row: unknown) {
  const chain = { eq: () => chain, maybeSingle: () => Promise.resolve({ data: row, error: null }) }
  return chain
}

function fakeClient() {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u-1' } } }) },
    from: (table: string) => {
      if (table === 'circles') {
        return {
          select: () =>
            singleRow({ id: CIRCLE_ID, name: '등산 모임', kind: 'friends', created_at: '2026-09-10T00:00:00Z' }),
        }
      }
      if (table === 'family_members') return { select: () => singleRow({ id: MEMBER_ID }) }
      return {
        select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }),
        insert: (row: unknown) => {
          inserted.push(row)
          return Promise.resolve({ error: insertError })
        },
        upsert: (row: unknown) => {
          upserted.push(row)
          return Promise.resolve({ error: PERMISSION_DENIED })
        },
      }
    },
  }
}

beforeEach(() => {
  insertError = null
  inserted = []
  upserted = []
  mockMembership.mockResolvedValue(membership('FAMILY'))
  mockCreateClient.mockResolvedValue(fakeClient() as unknown as Awaited<ReturnType<typeof createClient>>)
})

describe('addCircleMember — 그룹에 사람 넣기', () => {
  it('🔴 upsert 가 아니라 insert 로 넣는다 — upsert 는 운영 DB 권한에 42501 로 막혀 한 명도 못 넣었다(2026-09-14)', async () => {
    const result = await addCircleMember({ circleId: CIRCLE_ID, memberId: MEMBER_ID, consent: false, role: ' 총무 ' })
    expect(result).toEqual({ success: true })
    expect(upserted).toHaveLength(0)
    expect(inserted).toEqual([{ circle_id: CIRCLE_ID, member_id: MEMBER_ID, role: '총무', consent_at: null }])
  })

  it('이미 들어 있는 사람(기본 키 중복 23505)은 성공으로 본다 — 두 번 눌러도 오류가 뜨지 않는다', async () => {
    insertError = { code: '23505', message: 'duplicate key value violates unique constraint' }
    await expect(addCircleMember({ circleId: CIRCLE_ID, memberId: MEMBER_ID, consent: false })).resolves.toEqual({
      success: true,
    })
  })

  it('그 밖의 DB 오류는 DB_ERROR 로 돌려준다', async () => {
    insertError = PERMISSION_DENIED
    await expect(addCircleMember({ circleId: CIRCLE_ID, memberId: MEMBER_ID, consent: false })).resolves.toEqual({
      success: false,
      error: 'DB_ERROR',
    })
  })
})
