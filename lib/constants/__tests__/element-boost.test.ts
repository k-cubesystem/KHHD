/**
 * ELEMENT_BOOST 키 도메인 잠금.
 *
 * 조회 키는 yongsinAnalysis.yongsin — 한자 오행("木" 등, lib/domain/saju/saju-analysis.ts)이다.
 * 키가 영문(Wood…)이던 동안 조회가 늘 undefined 라 만세력 용신 실천법 UI 3곳
 * (advice 문단 · 실천법 그리드 · 용신 풀이 다이얼로그)이 조용히 비어 있었다.
 *
 * Regression: QA 2026-08-20 — main 6커밋 리뷰 H-2.
 */
import { ELEMENT_BOOST } from '../element-boost'
import { analyzeYongsin } from '@/lib/domain/saju/saju-analysis'

const HANJA_ELEMENTS = ['木', '火', '土', '金', '水'] as const

describe('ELEMENT_BOOST 키 도메인', () => {
  it('키는 한자 오행 5종 전부이며 그 외는 없다', () => {
    expect(Object.keys(ELEMENT_BOOST).sort()).toEqual([...HANJA_ELEMENTS].sort())
  })

  it.each(HANJA_ELEMENTS)('%s 항목은 실천법 필드가 전부 채워져 있다', (key) => {
    const entry = ELEMENT_BOOST[key]
    expect(entry).toBeDefined()
    expect(entry.color).not.toHaveLength(0)
    expect(entry.direction).not.toHaveLength(0)
    expect(entry.season).not.toHaveLength(0)
    expect(entry.time).not.toHaveLength(0)
    expect(entry.activities.length).toBeGreaterThan(0)
    expect(entry.foods.length).toBeGreaterThan(0)
    expect(entry.jobs.length).toBeGreaterThan(0)
    expect(entry.advice).not.toHaveLength(0)
  })

  it('실엔진 analyzeYongsin 의 용신 값으로 조회가 성립한다', () => {
    const saju = {
      dayGan: '甲',
      elementsDistribution: { 木: 0, 火: 3, 土: 2, 金: 2, 水: 1 },
    } as unknown as Parameters<typeof analyzeYongsin>[0]
    const result = analyzeYongsin(saju)
    expect(ELEMENT_BOOST[result.yongsin]).toBeDefined()
  })
})
