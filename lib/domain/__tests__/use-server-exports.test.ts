/**
 * `'use server'` 파일은 **async 함수만 export 할 수 있다** — 두 번 밟은 함정.
 *
 * ## 왜 조용하지 않고 크게 터지나
 * 상수·타입·객체를 export 하면 `tsc` 는 통과하고 dev 도 돌지만 **`next build` 가 죽는다**
 * (「Failed to collect page data」). 배포 직전에야 드러나서, 원인을 모르면 한참 헤맨다.
 *
 * ## 실제로 밟은 두 번
 * 1. 종합사주 프롬프트가 `'use server'` 안에 있어 테스트조차 못 했다
 *    → `lib/domain/analysis/samhap-prompt.ts` 로 분리(15차).
 * 2. 사용량 기간 상수를 `app/actions/admin/gemini-usage.ts` 에 넣어 빌드가 죽었다
 *    → `lib/domain/gemini/usage-range.ts` 로 분리(2026-08-19).
 *
 * 🔴 서버 액션에 상수가 필요하면 **도메인 모듈로 빼고 import** 한다.
 *    (`type` 만 내보내는 것은 컴파일 뒤 사라지므로 허용한다.)
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(__dirname, '..', '..', '..')

function serverActionFiles(): string[] {
  const out: string[] = []
  const walk = (rel: string) => {
    const dir = path.join(ROOT, rel)
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const next = `${rel}/${e.name}`
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue
        walk(next)
      } else if (/\.tsx?$/.test(e.name)) {
        const head = fs.readFileSync(path.join(ROOT, next), 'utf8').slice(0, 200)
        if (/^\s*['"]use server['"]/.test(head)) out.push(next)
      }
    }
  }
  walk('app')
  walk('lib')
  return out
}

/** 허용: `export async function` · `export type` · `export interface` · re-export 타입. */
const FORBIDDEN = [
  /^export\s+const\s+/m,
  /^export\s+let\s+/m,
  /^export\s+var\s+/m,
  /^export\s+function\s+(?!.*Promise)/m, // 동기 함수
  /^export\s+class\s+/m,
  /^export\s+enum\s+/m,
]

describe("🔴 'use server' 파일은 async 함수만 내보낸다", () => {
  const files = serverActionFiles()

  it('스캔이 실제로 서버 액션 파일을 찾는다 (게이트가 헛돌지 않는지)', () => {
    expect(files.length).toBeGreaterThan(10)
    expect(files).toContain('app/actions/admin/gemini-usage.ts')
  })

  it.each(serverActionFiles())('%s 에 상수·클래스 export 가 없다', (file) => {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8')
    const offending = FORBIDDEN.filter((re) => re.test(source)).map((re) => re.source)

    expect(`${file}: ${offending.join(', ') || 'clean'}`).toBe(`${file}: clean`)
  })

  it('게이트가 실제로 위반을 잡는다 (자가검증)', () => {
    const violating = "'use server'\n\nexport const RANGES = [7, 30] as const\n"
    expect(FORBIDDEN.some((re) => re.test(violating))).toBe(true)
  })

  it('async 함수 export 는 통과시킨다', () => {
    const ok = "'use server'\n\nexport async function doThing() {\n  return 1\n}\n"
    expect(FORBIDDEN.some((re) => re.test(ok))).toBe(false)
  })
})
