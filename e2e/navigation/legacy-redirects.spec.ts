import { test, expect } from '@playwright/test'

/**
 * 구 주소 리다이렉트는 반드시 HTTP 레이어(미들웨어)에서 처리되어야 한다.
 *
 * RSC 페이지의 redirect()만으로 처리하면 정적 셸이 200으로 스트리밍된 뒤 클라이언트
 * 전환으로 실행되는데, 병렬 부하로 하이드레이션과 겹치면 Next Router 내부 훅 순서
 * 오류(React #310)가 간헐 발생한다 — 2026-08-20 /protected/membership 에서 5/5 재현.
 * 이 스펙은 미들웨어 선처리가 빠지면(응답이 200이 되면) 즉시 실패한다.
 */
const LEGACY: Array<{ from: string; to: string }> = [
  { from: '/protected', to: '/protected/analysis' },
  { from: '/protected/membership', to: '/protected/store?tab=membership' },
  { from: '/protected/shrine/shop', to: '/protected/store?tab=items' },
  { from: '/protected/shrine/chat', to: '/protected/ai-shaman' },
  { from: '/admin/monitoring', to: '/admin/analytics' },
]

test.describe('구 주소 → 새 주소 HTTP 리다이렉트 (React #310 회귀 가드)', () => {
  for (const { from, to } of LEGACY) {
    test(`${from} 은 HTTP 30x 로 ${to} 를 가리킨다`, async ({ page }) => {
      const res = await page.request.get(from, { maxRedirects: 0 })
      expect([307, 308]).toContain(res.status())
      const location = res.headers()['location'] ?? ''
      expect(location).toContain(to)
    })
  }

  test('/protected/shrine/deities 는 member 쿼리를 보존해 collection 으로 넘긴다', async ({ page }) => {
    const res = await page.request.get('/protected/shrine/deities?member=abc-123', { maxRedirects: 0 })
    expect([307, 308]).toContain(res.status())
    const location = res.headers()['location'] ?? ''
    expect(location).toContain('/protected/shrine/collection')
    expect(location).toContain('tab=deity')
    expect(location).toContain('member=abc-123')
  })
})
