/**
 * 이미지 분석 액션 입구의 매직바이트 게이트(S-2) 배선 검증.
 *
 * 핵심 계약: 위조 이미지는 AI 호출 이전에 끊긴다.
 * 2026-09-01 부터 과금도 이 액션 안에서 일어나므로, 계약이 하나 더 붙는다 —
 * **위조 이미지에는 복채가 빠지지 않는다.** 게이트가 차감보다 앞에 있어야 성립한다.
 */
import { UNSUPPORTED_IMAGE_MESSAGE } from '@/lib/security/magic-bytes'

// image.ts 는 모듈 로드 시점에 GoogleGenerativeAI 를 생성하므로, 목은 팩토리 내부에서 만들어야 한다
// (바깥 const 는 아직 초기화 전 — TDZ).
jest.mock('@google/generative-ai', () => {
  const generateContent = jest.fn()
  const getGenerativeModel = jest.fn(() => ({ generateContent }))
  return {
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel })),
    __testMocks: { generateContent, getGenerativeModel },
  }
})

jest.mock('@/lib/ai/prompt-loader', () => ({
  getPromptByKey: jest.fn(async () => null),
}))

jest.mock('@/lib/services/gemini-rate-limiter', () => ({
  withGeminiRateLimit: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}))

jest.mock('@/lib/supabase/edge-config', () => ({
  isEdgeEnabled: jest.fn(() => false),
}))

// next/cache 를 끌고 오는 하위 모듈은 jsdom 에서 로드할 수 없으므로 대역으로 대체한다.
jest.mock('@/app/actions/user/history', () => ({
  saveAnalysisHistoryObserved: jest.fn(async () => undefined),
}))

// 복 포인트 발행은 서버 전용 모듈(lib/services/bok-grant)에 있다 — 대역으로 대체한다.
jest.mock('@/lib/services/bok-grant', () => ({
  addBokPoints: jest.fn(async () => undefined),
}))

// 과금은 액션 안에서 일어난다 — 로그인 사용자와 차감을 대역으로 세워 «불렸는가»를 본다.
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'test-user' } } })) },
  })),
}))

jest.mock('@/lib/services/feature-charge', () => ({
  chargeFeature: jest.fn(async () => ({ ok: true, remainingBalance: 10, refundOnFailure: null })),
}))

import { analyzeFaceForDestiny, analyzePalmReading, analyzeInteriorForFengshui } from '../ai/image'

const { generateContent: mockGenerateContent, getGenerativeModel: mockGetGenerativeModel } = (
  jest.requireMock('@google/generative-ai') as {
    __testMocks: { generateContent: jest.Mock; getGenerativeModel: jest.Mock }
  }
).__testMocks

const { chargeFeature: mockChargeFeature } = jest.requireMock('@/lib/services/feature-charge') as {
  chargeFeature: jest.Mock
}

/** ZIP 시그니처(PK\x03\x04) — 확장자만 .jpg 로 바꾼 전형적 위조 파일. */
const ZIP_BASE64 = Buffer.from(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00])).toString('base64')
/** 정상 JPEG 헤더. */
const JPEG_BASE64 = Buffer.from(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])).toString('base64')

describe('이미지 분석 액션 매직바이트 게이트', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateContent.mockRejectedValue(new Error('AI_CALL_STUB'))
  })

  it('관상: 이미지가 아닌 페이로드는 AI 호출 전에 거부한다', async () => {
    const result = await analyzeFaceForDestiny(ZIP_BASE64, 'general')

    expect(result).toEqual({ success: false, error: UNSUPPORTED_IMAGE_MESSAGE })
    expect(mockGetGenerativeModel).not.toHaveBeenCalled()
    expect(mockGenerateContent).not.toHaveBeenCalled()
    expect(mockChargeFeature).not.toHaveBeenCalled()
  })

  it('손금: 이미지가 아닌 페이로드는 AI 호출 전에 거부한다', async () => {
    const result = await analyzePalmReading(ZIP_BASE64, 'general')

    expect(result).toEqual({ success: false, error: UNSUPPORTED_IMAGE_MESSAGE })
    expect(mockGenerateContent).not.toHaveBeenCalled()
    expect(mockChargeFeature).not.toHaveBeenCalled()
  })

  it('풍수: 빈 입력도 거부한다', async () => {
    const result = await analyzeInteriorForFengshui('', 'general')

    expect(result).toEqual({ success: false, error: UNSUPPORTED_IMAGE_MESSAGE })
    expect(mockGenerateContent).not.toHaveBeenCalled()
    expect(mockChargeFeature).not.toHaveBeenCalled()
  })

  it('풍수: 슬롯 사진 중 한 장만 위조여도 전체를 거부한다', async () => {
    const result = await analyzeInteriorForFengshui(JPEG_BASE64, 'general', '거실', undefined, {
      images: [
        { label: '거실', base64: JPEG_BASE64 },
        { label: '현관', base64: ZIP_BASE64 },
      ],
    })

    expect(result).toEqual({ success: false, error: UNSUPPORTED_IMAGE_MESSAGE })
    expect(mockGenerateContent).not.toHaveBeenCalled()
    expect(mockChargeFeature).not.toHaveBeenCalled()
  })

  it('정상 JPEG 는 게이트를 통과해 분석 경로로 넘어간다(과차단 방지)', async () => {
    const result = await analyzeFaceForDestiny(JPEG_BASE64, 'general')

    expect(mockGenerateContent).toHaveBeenCalled()
    expect(result.success).toBe(false) // AI 스텁이 실패시킨 결과
    expect(result.error).not.toBe(UNSUPPORTED_IMAGE_MESSAGE)
  })

  it('정상 이미지일 때는 액션이 스스로 과금한다 — 화면이 차감해 주기를 기다리지 않는다', async () => {
    await analyzeFaceForDestiny(JPEG_BASE64, 'general')

    expect(mockChargeFeature).toHaveBeenCalledWith(
      expect.objectContaining({ featureKey: 'FACE', costKey: 'face', userId: 'test-user' })
    )
  })

  it('로그인하지 않으면 분석도 과금도 없다 — 종전에는 인증 검사가 아예 없었다', async () => {
    const { createClient } = jest.requireMock('@/lib/supabase/server') as { createClient: jest.Mock }
    createClient.mockResolvedValueOnce({ auth: { getUser: jest.fn(async () => ({ data: { user: null } })) } })

    const result = await analyzeFaceForDestiny(JPEG_BASE64, 'general')

    expect(result.success).toBe(false)
    expect(mockChargeFeature).not.toHaveBeenCalled()
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })
})
