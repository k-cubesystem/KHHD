/**
 * 하단 내비 계약 — 「문은 있는데 아이콘이 없다」·「아이콘은 있는데 문이 없다」를 막는다.
 *
 * 이 자리는 회귀가 잦다. 실제로 2026-08-26 에 **1:1 문의 기능이 완성돼 있는데 하단에 문만
 * 없어서** 프로필 안쪽으로 두 번 들어가야 닿았다(CEO 지적). 반대로 파일만 있고 표엔 없던
 * 웹툰 아이콘 사례도 있었다. 둘 다 타입·빌드가 못 잡는 종류라 여기서 파일계와 소스를 대조한다.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const NAV_SRC = readFileSync(path.join(ROOT, 'components', 'layout', 'bottom-nav.tsx'), 'utf8')
const KO = JSON.parse(readFileSync(path.join(ROOT, 'messages', 'ko.json'), 'utf8')) as {
  nav: Record<string, string>
}
const EN = JSON.parse(readFileSync(path.join(ROOT, 'messages', 'en.json'), 'utf8')) as {
  nav: Record<string, string>
}

/** 소스에서 NAV_ITEMS 의 (아이콘 슬러그, href, 번역키) 세 쌍을 뽑는다. */
function navEntries(): { slug: string; href: string; key: string }[] {
  const rows = [...NAV_SRC.matchAll(/t\('(\w+)'\)[^}]*?icon:\s*'\/icons\/nav\/([\w-]+)\.webp'[^}]*?href:\s*'([^']+)'/g)]
  return rows.map((m) => ({ key: m[1], slug: m[2], href: m[3] }))
}

describe('하단 내비 — 표·자산·번역·라우트가 갈라지지 않는다', () => {
  const entries = navEntries()

  it('항목을 실제로 읽어 냈다 (정규식이 조용히 0건이 되면 이 파일 전체가 무의미해진다)', () => {
    expect(entries.length).toBeGreaterThanOrEqual(6)
  })

  it.each(navEntries())('«$key» — 아이콘 파일이 실재한다', ({ slug }) => {
    expect(existsSync(path.join(ROOT, 'public', 'icons', 'nav', `${slug}.webp`))).toBe(true)
  })

  it.each(navEntries())('«$key» — 한국어·영어 라벨이 둘 다 있다', ({ key }) => {
    expect(KO.nav[key]).toBeTruthy()
    expect(EN.nav[key]).toBeTruthy()
  })

  it.each(navEntries())('«$key» — 목적지 라우트가 실재한다 ($href)', ({ href }) => {
    const seg = href.replace(/^\//, '')
    expect(existsSync(path.join(ROOT, 'app', seg, 'page.tsx'))).toBe(true)
  })

  it('🔴 1:1 문의가 하단에 있다 — 기능만 있고 문이 없던 2026-08-26 회귀 방지', () => {
    const support = entries.find((e) => e.href === '/protected/support')
    expect(support).toBeDefined()
    expect(support?.slug).toBe('support')
  })

  it('여섯 칸이 좁은 폰(360px)에서도 터치 최소 44px 를 넘는다', () => {
    const perItem = (360 - 16) / entries.length // px-2 = 좌우 8px
    expect(perItem).toBeGreaterThanOrEqual(44)
  })
})
