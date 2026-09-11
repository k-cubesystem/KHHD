/**
 * 오행색 표는 하나뿐이다.
 *
 * 실제 사고(2026-09-01 발견): 「디자인 시스템 통일」 주석이 붙은 WU_XING_COLORS 를 새 값으로
 * 바꿨는데, 같은 팔레트의 **독립 사본**이 네 곳에 살아 있었다(daily-lucky · daeun-chart ·
 * saju-knowledge-graph · EffectsCanvas). 그래서 사주 결과에서 水를 진한 청으로 본 사용자가
 * 대운 차트·명리 관계도로 넘어가면 같은 오행이 다른 색으로 나왔다 — 단일 출처라고 적힌 채로.
 *
 * 이 잠금이 재는 것은 「어떤 hex 가 어디 있는가」가 아니라 「오행 표를 또 정의한 파일이
 * 있는가」다. 결함이 '표의 복제'였으므로 표의 복제를 잰다.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { WU_XING_COLORS, WU_XING_TEXT_COLORS } from '../saju'

const ROOT = join(__dirname, '..', '..', '..', '..')
const ELEMENTS = ['木', '火', '土', '金', '水']

/** 오행색 표를 정의해도 되는 유일한 파일. */
const CANON = join('lib', 'domain', 'saju', 'saju.ts')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

/**
 * 「오행 한자 키 → 색」 표를 정의하는가.
 *
 * 다섯 오행 한자가 각각 콜론 뒤 가까이에서 hex 색을 물고 있으면 그건 이 팔레트의 사본이다.
 * 영문 키(wood/fire…)나 낱개 hex 는 잡지 않는다 — 신당 조명·오방기처럼 오행에서
 * 따왔지만 별개로 조율하는 팔레트가 실제로 있고, 그것까지 잡으면 잠금이 소음이 된다.
 */
function definesWuXingTable(source: string): boolean {
  const compact = source.replace(/\s/g, '')
  return ELEMENTS.every((el) => {
    const at = compact.indexOf(el + ':')
    if (at < 0) return false
    // 콜론 뒤에 따옴표/중괄호 몇 글자를 지나 바로 hex 가 오면 「이 오행의 색」을 적은 것이다.
    return /^['"`{:a-z]{0,24}#[0-9A-Fa-f]{6}/.test(compact.slice(at + el.length + 1))
  })
}

/** WCAG 상대휘도. */
function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = ch.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

describe('오행색 단일 출처', () => {
  it('오행 한자 → 색 표를 정의하는 파일은 saju.ts 하나뿐이다', () => {
    const offenders: string[] = []
    for (const dir of ['app', 'lib', 'components']) {
      for (const file of walk(join(ROOT, dir))) {
        const rel = file.slice(ROOT.length + 1)
        if (rel === CANON) continue
        if (definesWuXingTable(readFileSync(file, 'utf8'))) offenders.push(rel)
      }
    }
    expect(offenders).toEqual([])
  })

  it('이 잠금은 실제로 사본을 잡는다 — 음성 검사', () => {
    expect(definesWuXingTable(`{ 木: '#4A7C59', 火: '#C07055', 土: '#C5B358', 金: '#989390', 水: '#4A5D7C' }`)).toBe(
      true
    )
    // 영문 키 팔레트(신당 조명 등)는 잡지 않는다.
    expect(definesWuXingTable(`{ wood: '#4A7C59', fire: '#C07055' }`)).toBe(false)
  })

  it('다섯 오행이 모두 정의돼 있고 서로 다른 색이다', () => {
    const values = ELEMENTS.map((k) => WU_XING_COLORS[k])
    expect(values.every((v) => /^#[0-9A-Fa-f]{6}$/.test(v ?? ''))).toBe(true)
    expect(new Set(values).size).toBe(5)
  })

  it('글자용 변형은 대비가 모자란 두 색만 올리고 나머지는 건드리지 않는다', () => {
    for (const k of ELEMENTS) expect(WU_XING_TEXT_COLORS[k]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(WU_XING_TEXT_COLORS['木']).toBe(WU_XING_COLORS['木'])
    expect(WU_XING_TEXT_COLORS['土']).toBe(WU_XING_COLORS['土'])
    expect(WU_XING_TEXT_COLORS['金']).toBe(WU_XING_COLORS['金'])
    expect(WU_XING_TEXT_COLORS['火']).not.toBe(WU_XING_COLORS['火'])
    expect(WU_XING_TEXT_COLORS['水']).not.toBe(WU_XING_COLORS['水'])
  })

  it('글자용 변형은 리포트 카드 바탕(#16140F) 대비 4.5:1 을 넘는다', () => {
    const bg = luminance('#16140F')
    const ratios = ELEMENTS.map((k) => `${k}:${((luminance(WU_XING_TEXT_COLORS[k]) + 0.05) / (bg + 0.05)).toFixed(2)}`)
    const failing = ratios.filter((r) => Number(r.split(':')[1]) < 4.5)
    expect(`미달: ${failing.join(', ')}`).toBe('미달: ')
  })
})
