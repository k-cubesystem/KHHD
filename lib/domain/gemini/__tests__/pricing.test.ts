import {
  estimateCostUsd,
  geminiTextModels,
  isImageModel,
  IMAGE_MODEL_PRICE_USD,
  MODEL_PRICING,
} from '@/lib/domain/gemini/pricing'
import { MODEL_FLASH, MODEL_PRO } from '@/lib/config/ai-models'

describe('Gemini 비용 추정', () => {
  describe('이미지 모델 분기 (장당 고정)', () => {
    it('이미지 모델은 토큰과 무관하게 고정 단가', () => {
      const price = IMAGE_MODEL_PRICE_USD['gemini-3.1-flash-image-preview']
      expect(estimateCostUsd('gemini-3.1-flash-image-preview', 0, 0)).toBeCloseTo(price, 6)
      // 토큰이 있어도 장당 고정 — 토큰 기반으로 계산되지 않음
      expect(estimateCostUsd('gemini-3.1-flash-image-preview', 99999, 99999)).toBeCloseTo(price, 6)
    })

    it('isImageModel: image 포함 모델명 인식', () => {
      expect(isImageModel('gemini-3.1-flash-image-preview')).toBe(true)
      expect(isImageModel('some-future-image-model')).toBe(true)
      expect(isImageModel('gemini-3.5-flash')).toBe(false)
    })

    it('미등록 image 모델도 기본 이미지 단가로 폴백(0 아님)', () => {
      expect(estimateCostUsd('unknown-image-thing', 0, 0)).toBeGreaterThan(0)
    })
  })

  describe('텍스트 모델 (토큰 기반)', () => {
    it('주력 모델 단가는 공식 확인값 고정 — 회귀 방지 (ai.google.dev/gemini-api/docs/pricing, 2026-07-21)', () => {
      expect(MODEL_PRICING['gemini-3.5-flash']).toEqual({ input: 1.5, output: 9.0 })
    })

    it('입력 100만 토큰 = input 단가', () => {
      const p = MODEL_PRICING['gemini-3.5-flash']
      expect(estimateCostUsd('gemini-3.5-flash', 1_000_000, 0)).toBeCloseTo(p.input, 6)
      expect(estimateCostUsd('gemini-3.5-flash', 0, 1_000_000)).toBeCloseTo(p.output, 6)
    })

    it('미등록 텍스트 모델은 폴백 단가로 계산(예외 없음)', () => {
      expect(estimateCostUsd('totally-unknown-text', 1_000_000, 0)).toBeGreaterThan(0)
    })

    it('토큰 0 이면 비용 0', () => {
      expect(estimateCostUsd('gemini-3.5-flash', 0, 0)).toBe(0)
    })

    it('🔴 생각 토큰은 출력 단가로 과금된다 — "Response pricing is the sum of output tokens and thinking tokens"', () => {
      const p = MODEL_PRICING[MODEL_FLASH]
      // 생각 100만 = 출력 100만 과 같은 값
      expect(estimateCostUsd(MODEL_FLASH, 0, 0, 1_000_000)).toBeCloseTo(p.output, 6)
      // 본문과 생각은 한 주머니 — 나눠 넣든 몰아 넣든 합이 같으면 값이 같다
      expect(estimateCostUsd(MODEL_FLASH, 0, 400_000, 600_000)).toBeCloseTo(p.output, 6)
    })

    it('생각을 안 넘기면 0 — Claude·Jev 처럼 출력에 이미 포함된 공급자를 이중 계상하지 않는다', () => {
      expect(estimateCostUsd(MODEL_FLASH, 1_000, 2_000)).toBe(estimateCostUsd(MODEL_FLASH, 1_000, 2_000, 0))
    })

    it('이미지 모델은 생각과 무관하게 장당 고정', () => {
      const price = IMAGE_MODEL_PRICE_USD['gemini-3.1-flash-image-preview']
      expect(estimateCostUsd('gemini-3.1-flash-image-preview', 0, 0, 99_999)).toBeCloseTo(price, 6)
    })

    it('🔴 지금 쓰는 텍스트 모델(ai-models 정본)은 단가표에 반드시 있다 — 모델을 올리고 단가를 빠뜨리면 원가가 폴백값으로 어긋난다', () => {
      for (const model of [MODEL_FLASH, MODEL_PRO]) {
        expect({ model, priced: model in MODEL_PRICING }).toEqual({ model, priced: true })
      }
      // 2026-09-14 주력 3.8-flash — 공식 단가 3.7 과 동일(https://ai.google.dev/gemini-api/docs/pricing)
      expect(MODEL_FLASH).toBe('gemini-3.8-flash')
      expect(MODEL_PRICING['gemini-3.8-flash']).toEqual({ input: 1.5, output: 7.5 })
    })
  })
})

describe('geminiTextModels — 호출 한도 화면의 모델 선택지', () => {
  it('지금 쓰는 Gemini 모델은 고를 수 있다', () => {
    expect(geminiTextModels()).toContain(MODEL_FLASH)
  })

  it('🔴 단가표에 함께 있는 Jev·Claude 는 섞이지 않는다 — Gemini 토큰 버킷에 남의 모델 이름이 적힌다', () => {
    expect(MODEL_PRICING['jev-latest']).toEqual({ input: 0.042, output: 0 })
    expect(geminiTextModels().filter((model) => !model.startsWith('gemini-'))).toEqual([])
  })
})
