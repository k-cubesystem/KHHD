/**
 * «전문 보기» 원문 본문(analysis-prose)의 소제목·글머리 규칙은 정적 CSS 에 둔다.
 * styled-jsx 로 두었을 때는 규칙이 아코디언 안에만 갇혀, 같은 클래스를 쓰는 종합사주 폴백 본문이
 * 글머리·소제목 없이 그려졌다(2026-09-23).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8')

describe('AI 풀이 원문 본문 — analysis-prose 규칙은 정적 CSS 에 있다', () => {
  it.each(['components/studio/detail-analysis-accordion.tsx', 'components/studio/samhap-result.tsx'])(
    '%s 는 analysis-prose 를 쓰고 styled-jsx 를 쓰지 않는다',
    (rel) => {
      const src = read(rel)
      expect(src).toContain('className="analysis-prose ')
      expect(src).not.toMatch(/<style\s+jsx/)
    }
  )

  it('globals.css 가 소제목과 점 글머리를 그린다', () => {
    const css = read('app/globals.css')
    expect(css).toMatch(/\.analysis-prose h4 \{[^}]*font-weight: 700;/)
    expect(css).toMatch(/\.analysis-prose ul \{[^}]*list-style: none;/)
    expect(css).toMatch(/\.analysis-prose li::before \{[^}]*content: '·';/)
  })

  it('문단은 기본 p 의 색·줄간격 대신 본문을 따르고 문단 사이만 띄운다', () => {
    const css = read('app/globals.css')
    expect(css).toMatch(/\.analysis-prose p \{[^}]*color: inherit;[^}]*line-height: inherit;[^}]*margin: 0 0 0\.75rem;/)
  })
})
