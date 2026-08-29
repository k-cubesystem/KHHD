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

/**
 * 🔴 로더는 **하이드레이션이 끝난 뒤**에만 실행돼야 한다 (2026-08-30 사고 회귀선).
 *
 * ads.txt 게재 다음 날 자동 광고(앵커)가 송출을 시작하자, <head> 의 async 로더가
 * 하이드레이션 «도중» <body> 에 <ins> 를 꽂았다. App Router 는 문서 전체를
 * 하이드레이션하므로 React #418 로 죽고 — 스트리밍 본문이 커밋되지 않아 상점이
 * 「불러오는 중...」 에 갇히고 **결제 버튼이 전부 죽었다.**
 *
 * head 의 서버 렌더 <script> 로 되돌리면 이 사고가 그대로 재발한다. 재확인이
 * 필요하면 애드센스 «메타 태그» 확인을 쓴다.
 */
describe('🔴 애드센스 로더는 하이드레이션과 경주하지 않는다', () => {
  const fs = jest.requireActual<typeof import('fs')>('fs')
  const path = jest.requireActual<typeof import('path')>('path')
  const layout = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'app', 'layout.tsx'), 'utf8')

  it('로더는 next/script lazyOnload 로 실린다', () => {
    expect(layout).toContain('strategy="lazyOnload"')
    expect(layout).toMatch(/<Script[\s\S]{0,200}adsbygoogle\.js/)
  })

  it('head 에 서버 렌더 <script> 로 되돌아가지 않는다', () => {
    expect(layout).not.toMatch(/<script[\s\S]{0,120}adsbygoogle\.js/)
  })
})
