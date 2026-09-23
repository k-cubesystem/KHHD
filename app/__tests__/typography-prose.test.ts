/**
 * tailwind.config 에 @tailwindcss/typography 가 없어 `prose` 계열 클래스는 CSS 를 한 줄도 만들지 않는다.
 * 기본 초기화의 list-style: none 이 그대로 남아 목록 번호·글머리가 화면에서 사라진다
 * (법률 문서 2026-09-22 · 사업 궁합 AI 풀이 2026-09-23).
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

function listTsx(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listTsx(full)
    return entry.name.endsWith('.tsx') ? [full] : []
  })
}

const STANDALONE_PROSE = /(?<![\w-])prose(?![\w-])/

describe('typography 플러그인 없이 prose 에 목록 모양을 맡기지 않는다', () => {
  it('prose 클래스는 legal-doc 목록 규칙과 함께일 때만 쓴다', () => {
    const offenders = ['app', 'components']
      .flatMap((dir) => listTsx(join(ROOT, dir)))
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .filter((line) => line.includes('className') && STANDALONE_PROSE.test(line) && !line.includes('legal-doc'))
          .map((line) => `${relative(ROOT, file)}: ${line.trim()}`)
      )
    expect(offenders).toEqual([])
  })

  it('사업 궁합 AI 풀이는 번호·글머리 목록을 직접 그린다', () => {
    const src = read('app/protected/analysis/celebrity-compatibility/business-compatibility-client.tsx')
    expect(src).toContain('[&_ol]:list-decimal')
    expect(src).toContain('[&_ul]:list-disc')
  })
})
