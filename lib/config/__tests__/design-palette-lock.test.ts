/**
 * 제품 전역 팔레트 회귀선 (2026-09-01).
 *
 * ## 🔴 「디자인이 일정하지 않다」의 뿌리
 * DESIGN.md 는 오방색·골드 다크 테마 하나를 정의하는데, 화면들은 Tailwind 기본 팔레트를
 * **111개 파일 1,032곳**에서 쓰고 있었다 — amber 428곳(브랜드 골드 #C9A84C 와 «다른 금색»이
 * 화면마다 혼용), stone 계열 155곳(어드민에서 2026-08-19 에 추방한 회색조가 제품 쪽에 그대로),
 * purple/pink 계열 116곳(DESIGN.md 가 명시적으로 거부한 서양 점성술 색). 같은 서비스가
 * 화면마다 다른 앱처럼 보인 이유다. CEO 지적(2026-09-01) 후 전량 토큰으로 이관했다.
 *
 * 이 잠금이 재는 것은 «색이 예쁜가»가 아니라 «색이 토큰 밖에서 오는가»다.
 * 색은 tailwind.config 의 토큰(gold-* · seal · obangsaek-* · bok-* · ink-* ·
 * error/success/warning/info 계열)에서만 온다. 새 화면이 기본 팔레트를 쓰면 여기서 막힌다.
 *
 * admin-palette.test.ts(stone 전용·어드민 한정)의 상위집합이지만, 그쪽은 사고 기록을 품은
 * 독립 회귀선이라 그대로 둔다.
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(__dirname, '..', '..', '..')

/** Tailwind 기본 팔레트 클래스 — 접두사(bg/text/border/…)와 무관하게 «-팔레트-숫자» 형태를 잡는다. */
const DEFAULT_PALETTE =
  /\b[a-z]+-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/

/**
 * 대상 밖:
 * - api/og·opengraph·twitter 이미지 라우트 — Satori 는 Tailwind 를 못 쓴다(DESIGN.md 예외)
 * - dev-preview — 내부 개발 도구, 제품 화면이 아니다
 */
const EXCLUDED_PATH = /(api[\/]og[\/]|opengraph-image|twitter-image|dev-preview)/

function productTsx(): string[] {
  const out: string[] = []
  const walk = (rel: string) => {
    const dir = path.join(ROOT, rel)
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue
      const next = `${rel}/${e.name}`
      if (e.isDirectory()) walk(next)
      // lib 는 .ts 가 클래스 문자열을 든다(manse GAN_INFO·seasonal ELEMENT_LABELS 실사고) — 둘 다 잰다.
      else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !EXCLUDED_PATH.test(next)) out.push(next)
    }
  }
  walk('app')
  walk('components')
  walk('lib')
  return out
}

/** 주석은 «왜 바꿨나»의 기록이라 옛 클래스 이름이 남아 있어도 된다. 코드 줄만 본다. */
function codeLines(source: string): string[] {
  return source.split('\n').filter((line) => {
    const t = line.trim()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  })
}

describe('🔴 제품 화면의 색은 토큰에서만 온다', () => {
  const files = productTsx()

  it('스캔이 실제로 파일을 찾는다 (게이트가 헛돌지 않는지)', () => {
    expect(files.length).toBeGreaterThan(200)
    expect(files).toContain('app/business/page.tsx')
    expect(files).toContain('components/shared/paywall-modal.tsx')
  })

  it.each(files)('%s 에 Tailwind 기본 팔레트 클래스가 없다', (file) => {
    const offending = codeLines(fs.readFileSync(path.join(ROOT, file), 'utf8')).filter((l) => DEFAULT_PALETTE.test(l))

    expect(
      offending.length === 0 ? `${file}: 0` : `${file}:\n  ${offending.map((l) => l.trim().slice(0, 100)).join('\n  ')}`
    ).toBe(`${file}: 0`)
  })

  it('게이트가 실제로 위반을 잡는다 (자가검증)', () => {
    expect(DEFAULT_PALETTE.test('<div className="text-amber-400" />')).toBe(true)
    expect(DEFAULT_PALETTE.test('<div className="from-purple-900/60" />')).toBe(true)
    // 토큰은 잡지 않는다 — 잠금이 정답까지 막으면 잠금이 아니라 소음이다.
    expect(DEFAULT_PALETTE.test('<div className="text-gold-500 bg-obangsaek-blue/10 text-bok-sprout" />')).toBe(false)
    expect(DEFAULT_PALETTE.test('<div className="text-error-text bg-success-light" />')).toBe(false)
  })
})
