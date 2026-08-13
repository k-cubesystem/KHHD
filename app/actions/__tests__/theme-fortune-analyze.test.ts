/**
 * 인기테마운세 서버 액션 — **돈이 오가는 경로**의 계약.
 *
 * `'use server'` export 는 공개 엔드포인트다. 그래서 여기서 재는 것은 결과의 예쁨이 아니라
 * 넷이다 — ①인가 없이는 아무것도 안 한다 ②캐시가 있으면 복채가 안 나간다 ③실패하면 돌려준다
 * ④무료 미끼는 차감 경로 자체를 안 탄다.
 *
 * L1·L2(사주 엔진·판정)는 **모킹하지 않는다.** 순수 함수라 실제로 돌려도 결정론이고, 그래야
 * 「액션이 판정을 제대로 태우는가」까지 함께 재진다.
 */
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'
import { deductTalisman } from '@/app/actions/payment/wallet'
import { refundBokchae } from '@/lib/services/bokchae'
import { generateAIContent } from '@/lib/services/ai-client'
import { buildMasterPromptForAction } from '@/lib/saju-engine/master-prompt-builder'
import { getDestinyTarget } from '@/app/actions/user/destiny'
import { saveAnalysisHistoryObserved } from '@/app/actions/user/history'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { UNLIMITED_BALANCE } from '@/lib/auth/privileges'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/utils/rate-limit', () => ({ rateLimit: jest.fn() }))
jest.mock('@/app/actions/payment/wallet', () => ({ deductTalisman: jest.fn() }))
jest.mock('@/lib/services/bokchae', () => ({ refundBokchae: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/services/bok-grant', () => ({ addBokPoints: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/services/ai-client', () => ({ generateAIContent: jest.fn() }))
jest.mock('@/lib/saju-engine/master-prompt-builder', () => ({ buildMasterPromptForAction: jest.fn() }))
jest.mock('@/app/actions/user/destiny', () => ({ getDestinyTarget: jest.fn() }))
jest.mock('@/app/actions/user/history', () => ({ saveAnalysisHistoryObserved: jest.fn() }))
jest.mock('@/lib/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn(), info: jest.fn() },
}))

import { analyzeThemeFortune } from '../theme-fortune/analyze'
import { THEME_CACHE_DAYS } from '@/lib/domain/theme-fortune/themes'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>
const mockDeduct = deductTalisman as jest.MockedFunction<typeof deductTalisman>
const mockRefund = refundBokchae as jest.MockedFunction<typeof refundBokchae>
const mockAI = generateAIContent as jest.MockedFunction<typeof generateAIContent>
const mockPrompt = buildMasterPromptForAction as jest.MockedFunction<typeof buildMasterPromptForAction>
const mockTarget = getDestinyTarget as jest.MockedFunction<typeof getDestinyTarget>
const mockSave = saveAnalysisHistoryObserved as jest.MockedFunction<typeof saveAnalysisHistoryObserved>

const USER = { id: 'user-1' }
const TARGET_ID = 'target-1'
const PAID_THEME = 'leave-or-stay'

const TARGET = {
  id: TARGET_ID,
  owner_id: USER.id,
  name: '홍길동',
  relation_type: '본인',
  birth_date: '1988-03-14',
  birth_time: '09:30',
  calendar_type: 'solar' as const,
  gender: 'male' as const,
  avatar_url: null,
  face_image_url: null,
  hand_image_url: null,
  home_address: null,
  target_type: 'self' as const,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  is_leap_month: false,
}

const AI_JSON = JSON.stringify({
  headline: '지금 답답한 것은 자리보다 시기에서 옵니다.',
  situation: '관성이 눌리는 구간입니다.',
  indicatorNotes: ['가', '나', '다'],
  timingNotes: ['열림', '주의'],
  actions: ['하나', '둘', '셋'],
  pastEcho: '그 무렵 변동이 있었을 것입니다.',
  caution: '결정을 대신하지 않습니다.',
})

/** analysis_history 조회 체인만 흉내 낸다 — 액션은 auth 와 그 표만 본다. */
function supabaseStub(user: { id: string } | null, cachedRows: Array<{ result_json: unknown }> = []) {
  const limit = jest.fn().mockResolvedValue({ data: cachedRows })
  const order = jest.fn(() => ({ limit }))
  const gte = jest.fn(() => ({ order }))
  const eqCategory = jest.fn(() => ({ gte }))
  const eqTarget = jest.fn(() => ({ eq: eqCategory }))
  const select = jest.fn(() => ({ eq: eqTarget }))
  const from = jest.fn(() => ({ select }))

  return {
    client: {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>,
    from,
    eqCategory,
  }
}

function useSupabase(user: { id: string } | null, cachedRows: Array<{ result_json: unknown }> = []) {
  const stub = supabaseStub(user, cachedRows)
  mockCreateClient.mockResolvedValue(stub.client)
  return stub
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRateLimit.mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 60_000 })
  mockTarget.mockResolvedValue(TARGET)
  mockDeduct.mockResolvedValue({ success: true, remainingBalance: 100 })
  mockPrompt.mockResolvedValue({ prompt: '프롬프트' })
  mockAI.mockResolvedValue({ text: AI_JSON, provider: 'gemini', model: 'flash', inputTokens: 1, outputTokens: 1 })
  mockSave.mockResolvedValue({ success: true, id: 'history-1' })
  useSupabase(USER)
})

describe('인가 — 인자가 아니라 함수 안에서 판정한다', () => {
  it('로그인하지 않으면 아무것도 하지 않는다', async () => {
    useSupabase(null)

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' })
    expect(mockDeduct).not.toHaveBeenCalled()
    expect(mockAI).not.toHaveBeenCalled()
  })

  it('rate limit 에 걸리면 복채도 AI 도 건드리지 않는다', async () => {
    mockRateLimit.mockResolvedValue({ success: false, limit: 5, remaining: 0, reset: Date.now() + 60_000 })

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result.success).toBe(false)
    expect(mockDeduct).not.toHaveBeenCalled()
    expect(mockAI).not.toHaveBeenCalled()
  })

  it('🔴 남의 대상·없는 대상이면 복채를 건드리기 전에 멈춘다', async () => {
    // getDestinyTarget 은 owner_id 로 이미 걸러 준다 — 그 결과를 차감보다 **먼저** 본다.
    mockTarget.mockResolvedValue(null)

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: 'not-mine' })

    expect(result).toEqual({ success: false, error: '대상 정보를 찾을 수 없습니다.' })
    expect(mockDeduct).not.toHaveBeenCalled()
  })

  it('생년월일이 없으면 차감하지 않는다', async () => {
    mockTarget.mockResolvedValue({ ...TARGET, birth_date: null })

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result.success).toBe(false)
    expect(mockDeduct).not.toHaveBeenCalled()
  })

  it('클라이언트가 보낸 테마 문자열은 서버에서 다시 해석된다', async () => {
    for (const themeId of ['없는테마', 'constructor', 'work-friction']) {
      const result = await analyzeThemeFortune({ themeId, targetId: TARGET_ID })

      expect({ themeId, success: result.success }).toEqual({ themeId, success: false })
    }
    expect(mockDeduct).not.toHaveBeenCalled()
    expect(mockAI).not.toHaveBeenCalled()
  })

  it('판정이 등록되지 않은 출하 테마는 복채를 받지 않는다', async () => {
    // 카피 표에 `reading` 이 켜져 있어도 판정기가 없으면 여기서 먼저 거절한다.
    const result = await analyzeThemeFortune({ themeId: 'when-love', targetId: TARGET_ID })

    expect(result).toEqual({ success: false, error: '이 테마의 풀이는 아직 준비 중입니다.' })
    expect(mockDeduct).not.toHaveBeenCalled()
  })
})

describe('🔴 캐시 — 7일 안에는 복채가 다시 안 나간다', () => {
  const cached = {
    themeId: PAID_THEME,
    targetId: TARGET_ID,
    targetName: '홍길동',
    verdict: { themeId: PAID_THEME, indicators: [], timings: [] },
    narration: { headline: '저장본' },
    analyzedAt: '2026-08-10T00:00:00.000Z',
  }

  it('저장본이 있으면 그것을 돌려주고 차감도 AI 도 하지 않는다', async () => {
    useSupabase(USER, [{ result_json: cached }])

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result).toEqual({ success: true, reading: cached, cached: true })
    expect(mockDeduct).not.toHaveBeenCalled()
    expect(mockAI).not.toHaveBeenCalled()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('다른 테마의 저장본을 이 테마의 결과로 내주지 않는다', async () => {
    useSupabase(USER, [{ result_json: { ...cached, themeId: 'nothing-left' } }])

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result.success && result.cached).toBe(false)
    expect(mockAI).toHaveBeenCalledTimes(1)
  })

  it('망가진 저장본은 캐시로 치지 않는다', async () => {
    useSupabase(USER, [{ result_json: null }, { result_json: { themeId: PAID_THEME } }])

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result.success && result.cached).toBe(false)
  })

  it('THEME 카테고리 안에서만 찾는다 (다른 분석 기록을 캐시로 쓰지 않는다)', async () => {
    const stub = useSupabase(USER, [])

    await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(stub.from).toHaveBeenCalledWith('analysis_history')
    expect(stub.eqCategory).toHaveBeenCalledWith('category', 'THEME')
  })

  it('재분석(force)은 캐시를 건너뛰고 다시 차감한다', async () => {
    useSupabase(USER, [{ result_json: cached }])

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID, force: true })

    expect(result.success && result.cached).toBe(false)
    expect(mockDeduct).toHaveBeenCalledTimes(1)
  })

  it('캐시 기간은 기획서의 7일이다', () => {
    expect(THEME_CACHE_DAYS).toBe(7)
  })

  it('🔴 서버 액션 파일은 async 함수만 export 한다 (Next 규칙 — 상수를 두면 빌드가 깨진다)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const source: string = require('fs').readFileSync('app/actions/theme-fortune/analyze.ts', 'utf8')

    expect(source).toMatch(/^'use server'/)
    expect(source).not.toMatch(/^export (const|let|var|class) /m)
    expect(source).not.toMatch(/^export function /m)
  })
})

describe('🔴 복채 — 표시 = 실차감', () => {
  it('차감액이 feature-costs 단일 소스에서 온다 (리터럴 금액이 아니다)', async () => {
    await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(mockDeduct).toHaveBeenCalledWith(`theme_${PAID_THEME}`, FEATURE_COST.themeFortune.display)
  })

  it('차감이 실패하면 AI 를 부르지 않고 오류 종류를 그대로 넘긴다 (멤버십 안내로 이어진다)', async () => {
    mockDeduct.mockResolvedValue({
      success: false,
      error: '오늘의 일일 복채 한도에 도달했습니다.',
      errorType: 'DAILY_LIMIT',
      currentTier: 'SINGLE',
    })

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result).toEqual({
      success: false,
      error: '오늘의 일일 복채 한도에 도달했습니다.',
      errorType: 'DAILY_LIMIT',
      currentTier: 'SINGLE',
    })
    expect(mockAI).not.toHaveBeenCalled()
  })

  it('🔴 무료 미끼 테마는 차감 경로 자체를 타지 않는다 (마스터 §7-1)', async () => {
    // what-next 는 아직 판정이 없으므로, 「무료면 차감을 안 한다」는 계약은 그 앞 관문으로 증명된다.
    // 판정이 서는 순간 이 테스트는 아래 두 줄로 «차감 0회 + 결과 성공»을 함께 재게 된다.
    const result = await analyzeThemeFortune({ themeId: 'what-next', targetId: TARGET_ID })

    expect(result.success).toBe(false)
    expect(mockDeduct).not.toHaveBeenCalled()
  })

  it('AI 가 실패하면 복채를 돌려준다', async () => {
    mockAI.mockRejectedValue(new Error('gemini 500'))

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result).toEqual({ success: false, error: '복채는 돌려드렸습니다. 잠시 후 다시 시도해주세요.' })
    expect(mockRefund).toHaveBeenCalledWith(USER.id, FEATURE_COST.themeFortune.display, expect.any(String))
  })

  it('AI 응답을 해석하지 못해도 복채를 돌려준다', async () => {
    mockAI.mockResolvedValue({
      text: '죄송합니다. 답변할 수 없습니다.',
      provider: 'gemini',
      model: 'flash',
      inputTokens: 1,
      outputTokens: 1,
    })

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result.success).toBe(false)
    expect(mockRefund).toHaveBeenCalledTimes(1)
  })

  it('🔴 마스터(무제한)는 실차감이 없으므로 환불도 하지 않는다', async () => {
    mockDeduct.mockResolvedValue({ success: true, remainingBalance: UNLIMITED_BALANCE })
    mockAI.mockRejectedValue(new Error('gemini 500'))

    await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(mockRefund).not.toHaveBeenCalled()
  })

  it('🔴 지갑을 직접 만지지 않는다 — 차감·환불 두 경로뿐이다', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const source: string = require('fs').readFileSync('app/actions/theme-fortune/analyze.ts', 'utf8')

    expect(source).not.toMatch(/from\('wallets'\)/)
    expect(source).not.toMatch(/wallet_transactions/)
    expect(source).toMatch(/deductTalisman/)
    expect(source).toMatch(/refundBokchae/)
  })
})

describe('🔴 THEME 카테고리 — DB 제약과 코드가 어긋나면 캐시가 통째로 죽는다', () => {
  it('마이그레이션의 CHECK 목록이 코드의 카테고리 유니온을 전부 담는다', () => {
    // 과거 SAMHAP 이 이 제약에 막혀 저장이 통째로 실패한 전력이 있다. 테마는 **저장이 곧 캐시**라
    // 막히면 사용자가 같은 풀이에 복채를 다시 낸다 — 그래서 코드와 SQL 을 여기서 대조한다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    const sql: string = fs.readFileSync('supabase/migrations/20260814_analysis_history_theme.sql', 'utf8')
    const source: string = fs.readFileSync('app/actions/user/history.ts', 'utf8')

    const declared = [...source.matchAll(/^\s*\|\s*'([A-Z_]+)'/gm)].map((match) => match[1])
    const allowed = [...(sql.match(/ARRAY\[([^\]]+)\]/)?.[1] ?? '').matchAll(/'([A-Z_]+)'/g)].map((match) => match[1])

    expect(declared).toContain('THEME')
    expect(allowed).toContain('THEME')
    for (const category of declared) expect(allowed).toContain(category)
  })

  it('재분석 라우트 표가 THEME 을 안다 (기록 화면에서 되돌아올 길)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { REANALYZE_ROUTES } = require('@/lib/domain/analysis/reanalyze-routes') as {
      REANALYZE_ROUTES: Record<string, string>
    }

    expect(REANALYZE_ROUTES.THEME).toBe('/protected/analysis/theme')
  })
})

describe('결과 — 판정과 저장', () => {
  it('L2 판정이 결과에 실려 나온다 (AI 가 지어낸 값이 아니다)', async () => {
    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    if (!result.success) throw new Error(result.error)
    expect(result.reading.verdict.themeId).toBe(PAID_THEME)
    expect(result.reading.verdict.indicators).toHaveLength(3)
    expect(result.reading.verdict.verdictLabel).not.toBeNull()
    expect(result.reading.narration.headline).toContain('자리보다 시기')
  })

  it('확정 판정이 프롬프트에 실려 나간다 (AI 가 다시 계산하지 못하게)', async () => {
    await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    const [, analysisType, , additionalContext, outputGuide] = mockPrompt.mock.calls[0]
    expect(analysisType).toBe('TREND_CAREER')
    expect(additionalContext).toContain('다시 계산하지 말고')
    expect(additionalContext).toContain('"themeId": "leave-or-stay"')
    expect(outputGuide).toContain('"headline"')
  })

  it('저장은 THEME 카테고리 + themeId 를 실은 result_json 으로 간다 (공유·OG 가 그 행을 본다)', async () => {
    await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    const saved = mockSave.mock.calls[0][0]
    expect(saved.category).toBe('THEME')
    expect(saved.context_mode).toBe('CAREER')
    expect(saved.target_id).toBe(TARGET_ID)
    expect(saved.talisman_cost).toBe(FEATURE_COST.themeFortune.display)
    expect((saved.result_json as { themeId: string }).themeId).toBe(PAID_THEME)
  })

  it('저장이 실패해도 방금 산 풀이는 돌려준다', async () => {
    mockSave.mockResolvedValue({ success: false, error: 'category check' })

    const result = await analyzeThemeFortune({ themeId: PAID_THEME, targetId: TARGET_ID })

    expect(result.success).toBe(true)
    expect(mockRefund).not.toHaveBeenCalled()
  })
})
