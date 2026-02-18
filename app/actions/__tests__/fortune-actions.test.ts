import {
  getMonthlyFamilyFortune,
  getYearlyFortuneTrend,
  getFamilyFortuneBreakdown,
  recordFortuneEntry,
  getMemberMonthlyFortune,
} from '../fortune/fortune'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Fortune Actions', () => {
  let mockSupabase: ReturnType<typeof jest.fn>

  beforeEach(() => {
    // Reset mock with proper chaining support
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
      rpc: jest.fn(),
    }

    mockCreateClient.mockResolvedValue(
      mockSupabase as Parameters<typeof mockCreateClient.mockResolvedValue>[0]
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getMonthlyFamilyFortune', () => {
    it('should return empty fortune when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getMonthlyFamilyFortune()

      expect(result).toEqual({
        totalPossible: 800,
        currentFortune: 0,
        percentage: 0,
        completedCategories: [],
      })
    })

    it('should return empty fortune when no family members exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null }),
        }),
      })

      const result = await getMonthlyFamilyFortune()

      expect(result.currentFortune).toBe(0)
      expect(result.percentage).toBe(0)
    })

    it('should calculate fortune correctly with members and entries', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      })

      const mockMembers = [{ id: 'member-1' }, { id: 'member-2' }]
      const mockFortuneData = [
        { fortune_points: 100, category: 'saju' },
        { fortune_points: 100, category: 'compatibility' },
      ]

      // Create separate mock chains for each call
      let callIndex = 0
      mockSupabase.from.mockImplementation(() => {
        callIndex++
        if (callIndex === 1) {
          // First call: family_members
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockMembers }),
            }),
          }
        } else {
          // Second call: fortune_journal
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ data: mockFortuneData }),
                }),
              }),
            }),
          }
        }
      })

      const result = await getMonthlyFamilyFortune()

      expect(result.currentFortune).toBe(200)
      expect(result.totalPossible).toBe(1600) // 2 members × 800
      expect(result.completedCategories).toContain('saju')
      expect(result.completedCategories).toContain('compatibility')
    })
  })

  describe('getYearlyFortuneTrend', () => {
    it('should return empty array when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getYearlyFortuneTrend()

      expect(result).toEqual([])
    })

    it('should use RPC function when available', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      })

      const mockData = [
        { month: 1, fortune: 200, memberCount: 2 },
        { month: 2, fortune: 300, memberCount: 2 },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null })

      const result = await getYearlyFortuneTrend(2024)

      expect(result).toEqual(mockData)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_yearly_fortune', {
        user_id_param: 'test-user-id',
        year_param: 2024,
      })
    })

    it('should use fallback when RPC function does not exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      })

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '42883', message: 'function does not exist' },
      })

      // Mock for both fortune_journal and family_members queries in fallback
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        }),
      })

      const result = await getYearlyFortuneTrend(2024)

      expect(result).toHaveLength(12)
    })
  })

  describe('getFamilyFortuneBreakdown', () => {
    it('should return empty array when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getFamilyFortuneBreakdown()

      expect(result).toEqual([])
    })

    it('should return family fortune breakdown with RPC', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      })

      const mockData = [
        {
          memberId: 'member-1',
          memberName: '홍길동',
          relationship: '본인',
          fortune: 300,
          missionsCompleted: 3,
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null })

      const result = await getFamilyFortuneBreakdown()

      expect(result).toEqual(mockData)
    })
  })

  describe('recordFortuneEntry', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await recordFortuneEntry('member-1', 'saju', 'analysis-1', 100)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should successfully record fortune entry', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      })

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      })

      const result = await recordFortuneEntry('member-1', 'saju', 'analysis-1', 100)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle database errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      })

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      })

      const result = await recordFortuneEntry('member-1', 'saju', 'analysis-1', 100)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('getMemberMonthlyFortune', () => {
    it('should return empty fortune when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await getMemberMonthlyFortune('member-1')

      expect(result).toEqual({
        totalPossible: 800,
        currentFortune: 0,
        percentage: 0,
        completedCategories: [],
      })
    })

    it('should return member fortune when RPC succeeds', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      })

      const mockData = [
        {
          total_possible: 800,
          current_fortune: 300,
          percentage: 37.5,
          completed_categories: ['saju', 'compatibility', 'wealth'],
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null })

      const result = await getMemberMonthlyFortune('member-1')

      expect(result.totalPossible).toBe(800)
      expect(result.currentFortune).toBe(300)
      expect(result.percentage).toBe(37.5)
      expect(result.completedCategories).toHaveLength(3)
    })
  })
})
