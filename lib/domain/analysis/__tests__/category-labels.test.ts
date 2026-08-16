/**
 * 분석 카테고리 이름의 계약 — **화면마다 따로 들지 않는다** (2026-08-16).
 *
 * 라벨이 흩어져 있어 두 가지가 동시에 어긋나 있었다 —
 *   ① 기록 탭에 종합사주·인기테마운세가 **없어서 걸러 볼 수 없었다**(카드에는 있었다).
 *   ② 상세 모달·공유 문구는 영문 코드를 그대로 내보냈다 — 「홍길동님의 SAMHAP 분석」.
 *
 * 카테고리는 앞으로도 는다. 이 파일이 «늘 때마다 어딘가에서만 빠지는» 일을 막는다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  ANALYSIS_CATEGORY_LABEL,
  ANALYSIS_CATEGORY_ORDER,
  analysisCategoryLabel,
} from '@/lib/domain/analysis/category-labels'
import { REANALYZE_ROUTES } from '@/lib/domain/analysis/reanalyze-routes'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('라벨 표 — 빠짐도 넘침도 없다', () => {
  it('재분석 라우트 표와 카테고리 집합이 정확히 같다', () => {
    // 두 표가 갈리면 «라우트는 있는데 이름이 없는» 또는 그 반대의 카테고리가 생긴다.
    expect(Object.keys(ANALYSIS_CATEGORY_LABEL).sort()).toEqual(Object.keys(REANALYZE_ROUTES).sort())
  })

  it('순서 목록이 라벨 표를 하나도 빠뜨리지 않는다', () => {
    expect([...ANALYSIS_CATEGORY_ORDER].sort()).toEqual(Object.keys(ANALYSIS_CATEGORY_LABEL).sort())
  })

  it('🔴 종합사주·인기테마운세가 들어 있다 (탭에서 빠져 있던 둘)', () => {
    expect(ANALYSIS_CATEGORY_LABEL.SAMHAP).toBe('종합사주풀이')
    expect(ANALYSIS_CATEGORY_LABEL.THEME).toBe('인기테마운세')
    expect(ANALYSIS_CATEGORY_ORDER).toContain('THEME')
  })

  it('모든 라벨이 우리말이다 (영문 코드가 그대로 새지 않는다)', () => {
    for (const [key, label] of Object.entries(ANALYSIS_CATEGORY_LABEL)) {
      expect({ key, hasLatin: /[A-Za-z]/.test(label) }).toEqual({ key, hasLatin: false })
    }
  })

  it('모르는 값도 영문을 내보내지 않는다', () => {
    expect(analysisCategoryLabel('UNKNOWN_THING')).toBe('분석')
    expect(analysisCategoryLabel('')).toBe('분석')
  })
})

describe('🔴 배선 — 화면이 단일 출처를 쓴다', () => {
  it('탭이 손으로 적은 목록 대신 순서 상수를 돈다', () => {
    const tabs = read('components/history/category-tabs.tsx')

    expect(tabs).toContain('ANALYSIS_CATEGORY_ORDER')
    // 옛 하드코딩이 남아 있으면 새 카테고리가 또 탭에서만 빠진다.
    expect(tabs).not.toContain("{ value: 'SAJU', label: '사주'")
  })

  it('상세 모달이 영문 카테고리를 화면·공유 문구에 쓰지 않는다', () => {
    const modal = read('components/history/detail-modal.tsx')

    expect(modal).toContain('analysisCategoryLabel(record.category)')
    expect(modal).not.toContain('${record.category} 분석')
    expect(modal).not.toContain('{record.category} 분석')
  })

  it('기록 카드도 같은 라벨을 쓴다', () => {
    expect(read('components/history/analysis-card.tsx')).toContain('analysisCategoryLabel')
  })
})
