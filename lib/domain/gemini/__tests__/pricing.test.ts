import { estimateCostUsd, isImageModel, IMAGE_MODEL_PRICE_USD, MODEL_PRICING } from '@/lib/domain/gemini/pricing'

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
  })
})
