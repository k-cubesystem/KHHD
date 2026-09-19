/**
 * 가족관리 게이트는 두 곳(레이아웃 · 인덱스 페이지)에 서 있다 — 문구를 따로 적다가 페이지 쪽에만
 * 폐지된 «가족별 신당»(2026-08-25 폐지 — 나의 신당에 가족을 함께 모신다)이 남아 있었다.
 */
import fs from 'fs'
import path from 'path'

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

const gateOf = (source: string) => {
  const start = source.indexOf('<MembershipGate')
  return source.slice(start, source.indexOf('/>', start))
}

const LAYOUT_GATE = gateOf(read('app/protected/family/layout.tsx'))
const PAGE_GATE = gateOf(read('app/protected/family/page.tsx'))

describe('가족관리 게이트 — 레이아웃과 페이지가 같은 말을 한다', () => {
  it('★ 두 게이트의 제목 · 설명 · 혜택 줄이 같다', () => {
    const props = (gate: string) => gate.replace(/\s+/g, ' ').trim()
    expect(props(PAGE_GATE)).toBe(props(LAYOUT_GATE))
  })

  it('혜택 줄은 단일 출처에서 온다 — 폐지된 가족별 신당을 약속하지 않는다', () => {
    expect(PAGE_GATE).toContain('FAMILY_GATE_BENEFIT_LINES')
    expect(PAGE_GATE).not.toMatch(/가족별|가족 신당|기운 지도/)
  })
})
