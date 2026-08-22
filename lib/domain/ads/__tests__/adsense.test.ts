/**
 * 애드센스 게재 판정 — 이 테스트가 지키는 것은 «계정이 날아가지 않는 조건» 둘이다.
 * ① 슬롯 ID 가 없으면 아무것도 그리지 않는다(빈 회색 상자 방지)
 * ② 프로덕션이 아니면 그리지 않는다 — 우리가 개발·프리뷰에서 만든 노출/클릭은
 *    무효 트래픽으로 잡혀 계정 위험이 된다.
 */
import {
  ADSENSE_CLIENT,
  ADSENSE_SLOTS,
  hasAnyAdSlot,
  isAdSlotConfigured,
  isLiveAdEnvironment,
  shouldRenderAds,
} from '@/lib/domain/ads/adsense'

describe('애드센스 게재 판정', () => {
  it('발행자 ID 형식(ca-pub-숫자)', () => {
    expect(ADSENSE_CLIENT).toMatch(/^ca-pub-\d+$/)
  })

  it('슬롯 ID 가 비면 그 자리는 미게재', () => {
    const 원래 = ADSENSE_SLOTS.wallpaper
    try {
      ADSENSE_SLOTS.wallpaper = ''
      expect(isAdSlotConfigured('wallpaper')).toBe(false)
      expect(shouldRenderAds('production', 'production', 'wallpaper')).toBe(false)

      ADSENSE_SLOTS.wallpaper = '   ' // 공백만 있어도 미설정으로 본다
      expect(isAdSlotConfigured('wallpaper')).toBe(false)
    } finally {
      ADSENSE_SLOTS.wallpaper = 원래
    }
  })

  it('🔴 슬롯이 있어도 프로덕션이 아니면 미게재(무효 트래픽 방지)', () => {
    const 원래 = ADSENSE_SLOTS.wallpaper
    try {
      ADSENSE_SLOTS.wallpaper = '1234567890'
      expect(isAdSlotConfigured('wallpaper')).toBe(true)
      expect(shouldRenderAds('production', 'production', 'wallpaper')).toBe(true)

      // 🔴 프리뷰도 NODE_ENV=production 이다 — VERCEL_ENV 로 갈리는지가 이 테스트의 핵심.
      expect(shouldRenderAds('preview', 'production', 'wallpaper')).toBe(false)
      expect(shouldRenderAds('development', 'production', 'wallpaper')).toBe(false)
      for (const env of ['development', 'test', undefined]) {
        expect(shouldRenderAds(undefined, env, 'wallpaper')).toBe(false)
      }
    } finally {
      ADSENSE_SLOTS.wallpaper = 원래
    }
  })

  it('hasAnyAdSlot 은 하나라도 설정됐을 때만 참(스크립트 로드 조건)', () => {
    const 원래 = ADSENSE_SLOTS.wallpaper
    try {
      ADSENSE_SLOTS.wallpaper = ''
      expect(hasAnyAdSlot()).toBe(false)
      ADSENSE_SLOTS.wallpaper = '1234567890'
      expect(hasAnyAdSlot()).toBe(true)
    } finally {
      ADSENSE_SLOTS.wallpaper = 원래
    }
  })

  it('🔴 isLiveAdEnvironment — VERCEL_ENV가 있으면 그것이 정본, 없으면 NODE_ENV 폴백', () => {
    expect(isLiveAdEnvironment('production', 'production')).toBe(true)
    // 프리뷰 배포도 NODE_ENV=production 으로 빌드된다 — 여기서 걸러야 무효 트래픽을 막는다.
    expect(isLiveAdEnvironment('preview', 'production')).toBe(false)
    expect(isLiveAdEnvironment('development', 'production')).toBe(false)
    // 자체 호스팅 등 VERCEL_ENV 부재 시에만 NODE_ENV 로 판정
    expect(isLiveAdEnvironment(undefined, 'production')).toBe(true)
    expect(isLiveAdEnvironment(undefined, 'development')).toBe(false)
  })
})
