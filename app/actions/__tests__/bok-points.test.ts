/**
 * 복(bok_points) 적립 중단(2026-09-18) 뒤의 계약.
 *
 *  1. `'use server'` 모듈(bok-points)은 발급·차감 함수를 export 하지 않는다 — 공개 표면은 등급 읽기뿐이다.
 *  2. 등급 읽기는 포인트 수(잔액·누적)를 읽지도 돌려주지도 않는다.
 *  3. 앱 코드 어디에도 복을 올리거나 내리는 경로(RPC·원장 기록)가 없다.
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@/lib/supabase/server'

import * as bokPointsActions from '../payment/bok-points'
import { getBokTier } from '../payment/bok-points'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function tierStub(user: { id: string } | null, row: Record<string, unknown> | null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null })
  const eq = jest.fn(() => ({ maybeSingle }))
  const select = jest.fn(() => ({ eq }))
  const from = jest.fn(() => ({ select }))
  return {
    client: {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>,
    from,
    select,
  }
}

describe('bok-points 공개 액션 표면', () => {
  const surface = bokPointsActions as unknown as Record<string, unknown>

  it('발급·차감·미션 보상 함수는 공개 액션이 아니다', () => {
    for (const name of [
      'addBokPoints',
      'claimShareReward',
      'completeBokMission',
      'deductBokPoints',
      'getBokMissions',
      'getBokTransactions',
      'getBokPointsBalance',
    ]) {
      expect(surface[name]).toBeUndefined()
    }
  })

  it('남은 공개 표면은 인자 없는 등급 읽기 하나다', () => {
    expect(Object.keys(surface).filter((k) => typeof surface[k] === 'function')).toEqual(['getBokTier'])
    expect(getBokTier.length).toBe(0)
  })
})

describe('getBokTier', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('등급 열만 읽는다 — 포인트 수는 읽지 않는다', async () => {
    const stub = tierStub({ id: 'user-1' }, { tier: 'FLOWER' })
    mockCreateClient.mockResolvedValue(stub.client)

    await expect(getBokTier()).resolves.toBe('FLOWER')
    expect(stub.from).toHaveBeenCalledWith('bok_points')
    expect(stub.select).toHaveBeenCalledWith('tier')
  })

  it('모르는 값·빈 행·미인증은 씨앗 등급이다', async () => {
    mockCreateClient.mockResolvedValue(tierStub({ id: 'user-1' }, { tier: 'GALAXY' }).client)
    await expect(getBokTier()).resolves.toBe('SEED')

    mockCreateClient.mockResolvedValue(tierStub({ id: 'user-1' }, null).client)
    await expect(getBokTier()).resolves.toBe('SEED')

    const anonymous = tierStub(null, { tier: 'FOREST' })
    mockCreateClient.mockResolvedValue(anonymous.client)
    await expect(getBokTier()).resolves.toBe('SEED')
    expect(anonymous.from).not.toHaveBeenCalled()
  })
})

describe('복 쓰기 경로 부재 (적립 중단)', () => {
  const ROOT = path.resolve(__dirname, '../../..')

  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full)
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
    })
  }

  it('복 적립·차감 RPC 와 복 원장 기록을 부르는 코드가 없다', () => {
    const offenders = ['app', 'lib', 'components', 'hooks']
      .flatMap((dir) => sourceFiles(path.join(ROOT, dir)))
      .filter((file) =>
        /add_bok_points|deduct_bok_points|from\('bok_transactions'\)\s*\.(insert|update|upsert)/.test(
          fs.readFileSync(file, 'utf8')
        )
      )
      .map((file) => path.relative(ROOT, file))

    expect(offenders).toEqual([])
  })
})
