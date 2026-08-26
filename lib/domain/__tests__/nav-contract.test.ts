/**
 * 내비 계약 — 「문은 있는데 아이콘이 없다」·「기능은 있는데 문이 없다」를 막는다.
 *
 * 이 자리는 회귀가 잦다:
 *  · 1:1 문의 게시판은 2026-08 에 완성돼 있었는데 **이름이 「고객센터」라 물건이 감춰져** 있었다
 *    (CEO 2026-08-26 「1:1 문의 게시판 넣어 달라」 — 실은 이미 있었고 이름만 바꾸면 됐다).
 *  · 웹툰 아이콘은 파일만 있고 생성 표엔 없었다(재생성 시 결이 갈리던 자리).
 * 둘 다 타입·빌드가 못 잡는 종류라 여기서 소스와 파일계를 직접 대조한다.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const NAV_SRC = readFileSync(path.join(ROOT, 'components', 'layout', 'bottom-nav.tsx'), 'utf8')
const FOOTER_SRC = readFileSync(path.join(ROOT, 'components', 'site-footer.tsx'), 'utf8')
/**
 * 주석을 뺀 소스 — 라벨 검사는 «화면에 나오는 글자»만 봐야 한다.
 * (되돌리지 말라는 이력 주석에 옛 이름이 남아 있어 소스 전체를 훑으면 오탐이 난다)
 */
const FOOTER_RENDERED = FOOTER_SRC.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const KO = JSON.parse(readFileSync(path.join(ROOT, 'messages', 'ko.json'), 'utf8')) as {
  nav: Record<string, string>
}
const EN = JSON.parse(readFileSync(path.join(ROOT, 'messages', 'en.json'), 'utf8')) as {
  nav: Record<string, string>
}

/** 하단 내비 소스에서 (번역키, 아이콘 슬러그, href) 세 쌍을 뽑는다. */
function navEntries(): { slug: string; href: string; key: string }[] {
  const rows = [...NAV_SRC.matchAll(/t\('(\w+)'\)[^}]*?icon:\s*'\/icons\/nav\/([\w-]+)\.webp'[^}]*?href:\s*'([^']+)'/g)]
  return rows.map((m) => ({ key: m[1], slug: m[2], href: m[3] }))
}

/** 푸터 링크 바의 href 목록. */
function footerHrefs(): string[] {
  return [...FOOTER_SRC.matchAll(/<Link\s+href="([^"]+)"/g)].map((m) => m[1])
}

describe('하단 내비 — 표·자산·번역·라우트가 갈라지지 않는다', () => {
  const entries = navEntries()

  it('항목을 실제로 읽어 냈다 (정규식이 조용히 0건이 되면 이 파일 전체가 무의미해진다)', () => {
    expect(entries.length).toBe(5)
  })

  it.each(navEntries())('«$key» — 아이콘 파일이 실재한다', ({ slug }) => {
    expect(existsSync(path.join(ROOT, 'public', 'icons', 'nav', `${slug}.webp`))).toBe(true)
  })

  it.each(navEntries())('«$key» — 한국어·영어 라벨이 둘 다 있다', ({ key }) => {
    expect(KO.nav[key]).toBeTruthy()
    expect(EN.nav[key]).toBeTruthy()
  })

  it.each(navEntries())('«$key» — 목적지 라우트가 실재한다 ($href)', ({ href }) => {
    expect(existsSync(path.join(ROOT, 'app', href.replace(/^\//, ''), 'page.tsx'))).toBe(true)
  })

  it('다섯 칸이 좁은 폰(360px)에서 터치 최소 44px 를 넘는다', () => {
    expect((360 - 16) / entries.length).toBeGreaterThanOrEqual(44)
  })
})

describe('푸터 링크 바 — 1:1 문의가 이름 그대로 게시판을 가리킨다', () => {
  const hrefs = footerHrefs()

  it('링크를 실제로 읽어 냈다', () => {
    expect(hrefs.length).toBeGreaterThanOrEqual(4)
  })

  it('🔴 「1:1 문의」 가 있고 문의 게시판으로 간다 — 이름이 물건을 감추던 자리', () => {
    expect(FOOTER_RENDERED).toContain('1:1 문의')
    expect(hrefs).toContain('/protected/support')
    // 이름을 되돌리지 말 것: 「고객센터」는 이 앱에 없는 물건(전화 상담·FAQ)을 가리킨다
    expect(FOOTER_RENDERED).not.toContain('고객센터')
  })

  it('같은 곳으로 가는 문이 둘이 아니다 — href 중복 금지', () => {
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it.each(footerHrefs())('목적지 라우트가 실재한다 (%s)', (href) => {
    expect(existsSync(path.join(ROOT, 'app', href.replace(/^\//, ''), 'page.tsx'))).toBe(true)
  })
})
