/**
 * 신위 탭 회전 — 영상 등급(deity-spin.ts)의 규격·타임라인과 **구워진 시트 17종**의 정합.
 *
 * 영상 등급이 어긋나는 방식은 셋이다. 규격이 시트와 안 맞으면 캔버스가 옆 칸을 잘라 그리고,
 * 타임라인이 칸 수를 잘못 세면 착지 통보(onSpinEnd)가 빨라지거나 영영 오지 않으며,
 * 굽는 스크립트가 형식을 바꾸면 런타임 가드(parseSpinManifest)가 전부 null 로 떨어뜨려
 * **아무 오류 없이 종전 회전으로 돌아간다**(무증상 회귀). 셋 다 브라우저 없이 여기서 잡는다.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  DIM_MAX,
  HOP_HEIGHT,
  LAND_SQUASH,
  SPARKS,
  frameRect,
  parseSpinManifest,
  sparksAt,
  spinLandIndex,
  spinTimeline,
  type DeitySpinManifest,
} from '../deity-spin'

const ROOT = path.resolve(__dirname, '../../../..')
const DEITY_DIR = path.join(ROOT, 'public', 'shrine', 'deities')

const MANIFEST: DeitySpinManifest = {
  version: 1,
  frameW: 200,
  frameH: 300,
  cols: 20,
  count: 44,
  anticEnd: 6,
  spinEnd: 39,
  fps: 25,
  baseX: 40,
  baseY: 10,
  baseW: 120,
  baseH: 280,
}

describe('parseSpinManifest — 네트워크 JSON 가드', () => {
  it('정상 규격은 그대로 통과한다', () => {
    expect(parseSpinManifest(JSON.parse(JSON.stringify(MANIFEST)))).toEqual(MANIFEST)
  })

  it.each([
    ['null', null],
    ['문자열', 'spin'],
    ['판 번호 다름', { ...MANIFEST, version: 2 }],
    ['칸 폭 0', { ...MANIFEST, frameW: 0 }],
    ['칸 수 소수', { ...MANIFEST, count: 44.5 }],
    ['예비 구간 없음', { ...MANIFEST, anticEnd: 0 }],
    ['회전 구간 없음', { ...MANIFEST, spinEnd: MANIFEST.anticEnd }],
    ['착지 구간 없음', { ...MANIFEST, spinEnd: MANIFEST.count }],
    ['정면 상자가 칸 밖', { ...MANIFEST, baseX: 100 }],
    ['정면 상자 높이 0', { ...MANIFEST, baseH: 0 }],
    ['정면 좌표 문자열', { ...MANIFEST, baseY: '10' }],
  ])('%s → null (종전 회전으로 내려간다)', (_, raw) => {
    expect(parseSpinManifest(raw)).toBeNull()
  })
})

describe('frameRect — 칸 i 의 시트 좌표', () => {
  it('가로로 cols 칸 채우고 줄을 바꾼다', () => {
    expect(frameRect(MANIFEST, 0)).toEqual({ sx: 0, sy: 0 })
    expect(frameRect(MANIFEST, 19)).toEqual({ sx: 19 * 200, sy: 0 })
    expect(frameRect(MANIFEST, 20)).toEqual({ sx: 0, sy: 300 })
    expect(frameRect(MANIFEST, 43)).toEqual({ sx: 3 * 200, sy: 2 * 300 })
  })

  it('범위 밖은 양끝 칸으로 붙든다 — 옆 칸이나 빈 영역을 자르지 않는다', () => {
    expect(frameRect(MANIFEST, -3)).toEqual(frameRect(MANIFEST, 0))
    expect(frameRect(MANIFEST, 999)).toEqual(frameRect(MANIFEST, 43))
  })
})

describe('spinTimeline — B 통통 + C 신령', () => {
  const cues = spinTimeline(MANIFEST)
  const land = spinLandIndex(MANIFEST)

  it('시트의 모든 칸을 순서대로 한 번씩 넘기고, 그 뒤는 정지 스프라이트(frame null)다', () => {
    expect(cues.slice(0, land).map((c) => c.frame)).toEqual(Array.from({ length: MANIFEST.count }, (_, i) => i))
    expect(cues.slice(land).every((c) => c.frame === null)).toBe(true)
  })

  it('착지 통보 시점 = 몸의 마지막 칸 바로 뒤', () => {
    expect(land).toBe(MANIFEST.count)
    expect(cues[land - 1]?.frame).toBe(MANIFEST.count - 1)
  })

  it('예비 동작은 제자리에서 웅크린다 — 뜨지도 어두워지지도 않고 금가루도 없다', () => {
    const antic = cues.slice(0, MANIFEST.anticEnd)
    expect(antic.every((c) => c.lift === 0 && c.dim === 0 && c.sparkClock === null)).toBe(true)
    expect(antic.every((c) => c.scaleY < 1 && c.scaleX > 1)).toBe(true)
  })

  it('도약은 회전 한가운데서 가장 높고 양끝에서 바닥에 닿는다', () => {
    const spin = cues.slice(MANIFEST.anticEnd, MANIFEST.spinEnd)
    const lifts = spin.map((c) => c.lift)
    expect(lifts[0]).toBeCloseTo(0, 6)
    expect(lifts[lifts.length - 1]).toBeCloseTo(0, 6)
    expect(Math.max(...lifts)).toBeCloseTo(HOP_HEIGHT, 3)
    expect(lifts.every((v) => v >= 0 && v <= HOP_HEIGHT + 1e-9)).toBe(true)
  })

  it('가라앉힘은 회전 중에만, 한가운데서 가장 짙다(DIM_MAX)', () => {
    const dims = cues.map((c) => c.dim)
    expect(Math.max(...dims)).toBeCloseTo(DIM_MAX, 3)
    expect(cues.filter((c, i) => c.dim > 0 && (i < MANIFEST.anticEnd || i >= MANIFEST.spinEnd))).toHaveLength(0)
  })

  it('착지 찌그러짐은 표 순서대로 — 크게 눌렸다 튕겨 가라앉는다', () => {
    const landCues = cues.slice(MANIFEST.spinEnd, MANIFEST.count)
    landCues.forEach((c, j) => {
      const [sy, sx] = LAND_SQUASH[j] ?? [1, 1]
      expect([c.scaleY, c.scaleX]).toEqual([sy, sx])
    })
    expect(landCues[0]?.scaleY).toBeLessThan(0.95)
  })

  it('금가루 시계는 회전 첫 칸부터 끊김 없이 1씩 늘고, 마지막 한 알이 다 질 때 끝난다', () => {
    const clocks = cues.map((c) => c.sparkClock).filter((c): c is number => c !== null)
    expect(clocks[0]).toBe(0)
    clocks.forEach((c, i) => expect(c).toBe(i))
    const lastBloom = Math.max(...SPARKS.map((p) => p.start + p.life)) - 1
    expect(clocks[clocks.length - 1]).toBe(lastBloom)
    expect(sparksAt(lastBloom).length).toBeGreaterThan(0)
    expect(sparksAt(lastBloom + 1)).toHaveLength(0)
  })

  it('착지 뒤 꼬리에는 몸이 없고 변형도 없다 — 정지 스프라이트가 그대로 선다', () => {
    for (const c of cues.slice(land)) expect([c.lift, c.scaleX, c.scaleY, c.dim]).toEqual([0, 1, 1, 0])
  })
})

describe('sparksAt — 결정적 금가루', () => {
  it('탭할 때마다 같은 자리에 같은 알이 핀다', () => {
    expect(sparksAt(20)).toEqual(sparksAt(20))
  })

  it('피었다 사그라든다 — 불투명도 0~1, 발치 폭 안에서 위로만 오른다', () => {
    for (let c = 0; c < 80; c += 1) {
      for (const p of sparksAt(c)) {
        expect(p.a).toBeGreaterThanOrEqual(0)
        expect(p.a).toBeLessThanOrEqual(1)
        expect(Math.abs(p.x)).toBeLessThan(0.55)
        expect(p.y).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

/** 구워진 시트 — 스크립트(scripts/shrine-assets/deity-spin.mjs)의 산출이 런타임 가드를 통과하는가 */
describe('public/shrine/deities/*/spin.json — 구워진 17종', () => {
  const codes = readdirSync(DEITY_DIR).filter((code) => existsSync(path.join(DEITY_DIR, code, 'spin.json')))

  it('17 신위 전부 시트가 있다', () => {
    expect(codes).toHaveLength(17)
  })

  it.each(codes)('%s — 가드 통과 · 시트 파일 동반 · 가로 4096px 이하', (code) => {
    const raw: unknown = JSON.parse(readFileSync(path.join(DEITY_DIR, code, 'spin.json'), 'utf8'))
    const m = parseSpinManifest(raw)
    expect(m).not.toBeNull()
    if (!m) return
    expect(existsSync(path.join(DEITY_DIR, code, 'spin.webp'))).toBe(true)
    // 구형 모바일 GPU 의 텍스처 한도 — 넘으면 캔버스가 소프트웨어 그리기로 떨어진다
    expect(m.cols * m.frameW).toBeLessThanOrEqual(4096)
    expect(m.fps).toBe(25)
  })
})
