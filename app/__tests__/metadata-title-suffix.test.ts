/**
 * 페이지 제목에 브랜드를 손으로 덧붙이지 않는다.
 *
 * app/layout.tsx 가 `title.template = '%s | 청담해화당'` 을 걸어 두었으므로, 페이지가
 * 제목에 브랜드를 또 적으면 Next 가 그 위에 한 번 더 붙인다. 라이브 실측(2026-09-01):
 *   "이용약관 | 청담해화당 | 청담해화당"
 *   "갑목(甲木) 일간 — 「하늘로 곧게 뻗는 큰 나무」 | 청담해화당 | 청담해화당"
 * 검색 결과·브라우저 탭·공유 카드에 그대로 나간다.
 *
 * 이 잠금은 「제목이 예쁜가」가 아니라 「템플릿이 붙일 것을 페이지가 또 붙이지 않는가」를 잰다.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const APP = join(__dirname, '..')
const BRAND = '청담해화당'

/**
 * 템플릿·기본값을 정의하는 곳(layout.tsx)과 루트 세그먼트의 페이지(app/page.tsx).
 * Next 는 title.template 을 «그 template 을 정의한 세그먼트 자신»에는 적용하지 않는다 —
 * 라이브 실측으로도 홈만 접미사가 안 붙는다. 그래서 홈은 제 이름을 스스로 적어야 한다.
 */
const ALLOWED = ['layout.tsx', 'page.tsx']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/^(page|layout)\.tsx$/.test(entry)) out.push(full)
  }
  return out
}

/**
 * metadata 객체 **최상위**의 `title:` 만 본다(들여쓰기 정확히 2칸).
 * openGraph.title·twitter.title 은 템플릿을 타지 않으므로 대상이 아니고,
 * `{ absolute: ... }` 는 템플릿을 쓰지 않겠다는 명시적 선언이라 통과시킨다.
 */
function topLevelTitleLines(source: string): string[] {
  const hits: string[] = []
  for (const line of source.split('\n')) {
    const m = /^ {2}title:\s*(.+)$/.exec(line)
    if (m && !m[1].includes('absolute:')) hits.push(m[1])
    const inline = /export const metadata\s*(?::\s*Metadata\s*)?=\s*\{\s*title:\s*([^}]+)\}/.exec(line)
    if (inline) hits.push(inline[1])
  }
  return hits
}

describe('제목 접미사 중복 금지', () => {
  it(`페이지 metadata.title 에 "${BRAND}" 을 손으로 적지 않는다`, () => {
    const offenders: string[] = []
    for (const file of walk(APP)) {
      const rel = file.slice(APP.length + 1)
      if (ALLOWED.some((a) => rel === a)) continue
      for (const line of topLevelTitleLines(readFileSync(file, 'utf8'))) {
        if (line.includes(BRAND)) offenders.push(`${rel}: ${line.trim()}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('템플릿 자체는 그대로 살아 있다 — 이 잠금이 브랜드를 통째로 지우게 두지 않는다', () => {
    const layout = readFileSync(join(APP, 'layout.tsx'), 'utf8')
    expect(layout).toContain(`template: '%s | ${BRAND}'`)
  })
})
