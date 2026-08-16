/**
 * 분석 카테고리의 우리말 이름 — **한 곳**.
 *
 * ## 왜 생겼나 (2026-08-16)
 * 라벨이 화면마다 따로 있었고, 그래서 두 가지가 동시에 어긋나 있었다 —
 *   ① 기록 카드에는 10종이 다 있는데 **탭에는 여덟 종만** 있었다. 종합사주(SAMHAP)와
 *      인기테마운세(THEME) 기록은 목록에 뜨지만 **걸러 볼 수가 없었다.**
 *   ② 상세 모달과 공유 문구는 라벨을 아예 안 거치고 **영문 코드를 그대로** 내보냈다 —
 *      「홍길동님의 SAMHAP 분석」. 테마가 출하되면 「THEME 분석」이 된다.
 *
 * 카테고리는 앞으로도 는다. 이름을 화면이 각자 들고 있으면 그때마다 같은 사고가 반복된다.
 *
 * 🔴 키는 `analysis_history.category` 의 CHECK 제약과 **한 글자도 다르면 안 된다.**
 *    제약 목록은 `app/actions/__tests__/analysis-history-coverage.test.ts` 가 함께 지킨다.
 */
import type { AnalysisCategory } from '@/app/actions/user/history'

export const ANALYSIS_CATEGORY_LABEL: Record<AnalysisCategory, string> = {
  SAJU: '사주',
  FACE: '관상',
  HAND: '손금',
  FENGSHUI: '풍수',
  COMPATIBILITY: '궁합',
  WEALTH: '재물운',
  TODAY: '오늘의운세',
  NEW_YEAR: '신년운세',
  SAMHAP: '종합사주풀이',
  THEME: '인기테마운세',
}

/** 탭·목록에 세우는 순서. 여정 순서(사주→관상→손금→풍수→종합)를 앞에 둔다. */
export const ANALYSIS_CATEGORY_ORDER: readonly AnalysisCategory[] = [
  'SAJU',
  'FACE',
  'HAND',
  'FENGSHUI',
  'SAMHAP',
  'COMPATIBILITY',
  'THEME',
  'WEALTH',
  'TODAY',
  'NEW_YEAR',
]

/**
 * 화면에 쓰는 이름. 모르는 값이 와도 **영문 코드를 그대로 내보내지 않는다** —
 * 사용자에게 「THEME」은 아무 뜻이 없다.
 */
export function analysisCategoryLabel(category: string): string {
  return ANALYSIS_CATEGORY_LABEL[category as AnalysisCategory] ?? '분석'
}
