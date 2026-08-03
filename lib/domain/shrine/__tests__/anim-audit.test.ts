import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SHRINE_ANIM_CLASSES, auditProbes, auditSummary, type ClassProbe } from '../anim-audit'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const CSS = read('app/shrine-scene.css') + read('app/globals.css')

const p = (className: string, nodes: number, animated: number): ClassProbe => ({ className, nodes, animated })

describe('연출 계측 — 화면에 없는 것을 죽었다고 하지 않는다', () => {
  it('★ 클래스는 붙었는데 하나도 안 돌면 죽음이다 (styled-jsx 사고의 모양)', () => {
    const r = auditProbes([p('shrine-idle-sway', 4, 0)])
    expect(r.dead).toEqual(['shrine-idle-sway'])
    expect(r.alive).toEqual([])
  })

  it('★ 화면에 요소가 없으면 판정하지 않는다 — 상시로 울리는 경보는 아무도 안 본다', () => {
    const r = auditProbes([p('fh-bloom', 0, 0)])
    expect(r.absent).toEqual(['fh-bloom'])
    expect(r.dead).toEqual([])
  })

  it('전부 돌면 구동, 일부만 돌면 일부', () => {
    const r = auditProbes([p('a', 3, 3), p('b', 3, 1)])
    expect(r.alive).toEqual(['a'])
    expect(r.partial).toEqual(['b'])
    expect(r.dead).toEqual([])
  })

  it('망가진 관측값에도 무너지지 않는다 (도는 수가 요소 수를 넘을 수 없다)', () => {
    const r = auditProbes([p('a', 2, 9), p('b', -1, -1), p('c', 2.7, 1.9)])
    expect(r.alive).toEqual(['a'])
    expect(r.absent).toEqual(['b'])
    expect(r.partial).toEqual(['c'])
  })

  it('한 줄 요약은 죽은 것부터 말한다', () => {
    expect(auditSummary(auditProbes([p('a', 1, 0)]))).toContain('죽어 있음')
    expect(auditSummary(auditProbes([p('a', 1, 1)]))).toContain('구동 중')
    expect(auditSummary(auditProbes([p('a', 0, 0)]))).toContain('상시 연출이 없음')
  })
})

describe('연출 계측 — 목록이 CSS 원본과 어긋나지 않는다', () => {
  // ⚠️ 손으로 관리하는 배열이 원본을 모른 채 "확인 ✓"를 찍은 사고가 이미 있었다
  //    (CSS 게이트가 새 클래스를 모르고 통과). 그래서 목록을 원본과 맞대 본다.
  it('★ 계측 대상 클래스는 전부 CSS 에 실재한다', () => {
    for (const cls of SHRINE_ANIM_CLASSES) {
      expect([cls, new RegExp(`\\.${cls}[\\s,{:]`).test(CSS)]).toEqual([cls, true])
    }
  })

  it('★ 계측 대상은 전부 **상시(infinite)** 연출이다 — 일회성은 재 봐야 이미 끝나 있다', () => {
    for (const cls of SHRINE_ANIM_CLASSES) {
      // 클래스 규칙 본문을 잘라 animation 선언을 본다
      const at = CSS.indexOf(`.${cls}`)
      const body = CSS.slice(at, CSS.indexOf('}', at))
      expect([cls, /animation[^;]*infinite/.test(body)]).toEqual([cls, true])
    }
  })

  it('계측 대상이 비어 있지 않다 (목록이 비면 게이트가 구조적으로 통과한다)', () => {
    expect(SHRINE_ANIM_CLASSES.length).toBeGreaterThanOrEqual(10)
  })
})
