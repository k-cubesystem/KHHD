import { computeAnalysisScore, computeFaceScore, computePalmScore, NEUTRAL_SCORE } from '../scoring'
import { scoreToBand } from '../titles'
import type { Assessment } from '../feature-parse'

const good = (n: number): Assessment[] => Array<Assessment>(n).fill('좋음')
const fair = (n: number): Assessment[] => Array<Assessment>(n).fill('보통')
const warn = (n: number): Assessment[] => Array<Assessment>(n).fill('주의')

describe('computeAnalysisScore — 분포', () => {
  it('데이터 전무면 중립 폴백', () => {
    expect(computeAnalysisScore([])).toBe(NEUTRAL_SCORE)
  })

  it('전부 좋음 ≈ 92~96 (high 밴드)', () => {
    const s = computeAnalysisScore([...good(8)].map((v) => ({ value: v === '좋음' ? 1.0 : 0, weight: 1 })))
    expect(s).toBeGreaterThanOrEqual(92)
    expect(s).toBeLessThanOrEqual(96)
    expect(scoreToBand(s)).toBe('high')
  })
})

describe('computeFaceScore — 자연 분포 + 밴드 도달', () => {
  it('전부 좋음 → 92~96, high', () => {
    const s = computeFaceScore({ fiveFeatures: good(5), threeStops: good(3), sixParts: good(6) })
    expect(s).toBeGreaterThanOrEqual(92)
    expect(s).toBeLessThanOrEqual(96)
    expect(scoreToBand(s)).toBe('high')
  })

  it('전부 주의 → 30대, growth', () => {
    const s = computeFaceScore({ fiveFeatures: warn(5), threeStops: warn(3), sixParts: warn(6) })
    expect(s).toBeGreaterThanOrEqual(30)
    expect(s).toBeLessThan(40)
    expect(scoreToBand(s)).toBe('growth')
  })

  it('전부 보통 → mid 경계(약 60)', () => {
    const s = computeFaceScore({ fiveFeatures: fair(5), threeStops: fair(3), sixParts: fair(6) })
    expect(s).toBeGreaterThanOrEqual(58)
    expect(s).toBeLessThanOrEqual(62)
  })

  it('대부분 좋음 + 일부 보통 → high 도달(≥80)', () => {
    const s = computeFaceScore({
      fiveFeatures: ['좋음', '좋음', '좋음', '보통', '좋음'],
      threeStops: ['좋음', '보통', '좋음'],
      sixParts: ['좋음', '좋음', '좋음', '좋음', '보통', '좋음'],
    })
    expect(s).toBeGreaterThanOrEqual(80)
    expect(scoreToBand(s)).toBe('high')
  })

  it('부위 가중이 삼정보다 크다(같은 주의라도 부위 주의가 더 끌어내림)', () => {
    const partsWarn = computeFaceScore({ fiveFeatures: good(5), threeStops: good(3), sixParts: warn(6) })
    const stopsWarn = computeFaceScore({ fiveFeatures: good(5), threeStops: warn(3), sixParts: good(6) })
    expect(partsWarn).toBeLessThan(stopsWarn)
  })

  it('미스(null/undefined)는 제외 — 존재 항목만 반영', () => {
    const s = computeFaceScore({
      fiveFeatures: ['좋음', null, undefined, '좋음', null],
      threeStops: [null, null, null],
      sixParts: [undefined, undefined, undefined, undefined, undefined, undefined],
    })
    // 오관 2개(좋음)만 존재 → 전부 좋음과 동일 곡선 상단
    expect(s).toBeGreaterThanOrEqual(92)
  })

  it('전부 미스면 중립 폴백(NaN 방어)', () => {
    const s = computeFaceScore({
      fiveFeatures: [null, null, null, null, null],
      threeStops: [null, null, null],
      sixParts: [null, null, null, null, null, null],
    })
    expect(s).toBe(NEUTRAL_SCORE)
  })

  it('항상 0~100 범위', () => {
    const s = computeFaceScore({ fiveFeatures: warn(5), threeStops: warn(3), sixParts: warn(6) })
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(100)
  })
})

describe('computePalmScore — 6선 + fortuneOverview 보너스', () => {
  it('삼대주선 전부 좋음 → high', () => {
    const s = computePalmScore({
      majorLines: good(3),
      specialLines: [null, null, null],
      fortunePresentCount: 4,
    })
    expect(scoreToBand(s)).toBe('high')
  })

  it('fortuneOverview 완성도가 점수를 소폭 올린다(최대 +3)', () => {
    const base = computePalmScore({ majorLines: fair(3), specialLines: fair(3), fortunePresentCount: 0 })
    const rich = computePalmScore({ majorLines: fair(3), specialLines: fair(3), fortunePresentCount: 4 })
    expect(rich).toBe(base + 3)
  })

  it('데이터 전무면 중립 폴백 + 보너스 0', () => {
    const s = computePalmScore({
      majorLines: [null, null, null],
      specialLines: [null, null, null],
      fortunePresentCount: 0,
    })
    expect(s).toBe(NEUTRAL_SCORE)
  })

  it('전부 주의 → 30대', () => {
    const s = computePalmScore({ majorLines: warn(3), specialLines: warn(3), fortunePresentCount: 0 })
    expect(s).toBeGreaterThanOrEqual(30)
    expect(s).toBeLessThan(40)
  })

  it('항상 0~100 범위(보너스 포함)', () => {
    const s = computePalmScore({ majorLines: good(3), specialLines: good(3), fortunePresentCount: 4 })
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(100)
  })
})
