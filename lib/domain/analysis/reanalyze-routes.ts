import type { AnalysisCategory } from '@/app/actions/user/history'

/**
 * 카테고리별 재분석 페이지 라우트 (쿼리 제외 base 경로).
 * 모든 값은 실존하는 app 라우트여야 한다 — reanalyze-routes.test.ts 가 강제한다.
 */
export const REANALYZE_ROUTES: Record<AnalysisCategory, string> = {
  SAJU: '/protected/analysis/cheonjiin',
  FACE: '/protected/studio/face',
  HAND: '/protected/studio/palm',
  FENGSHUI: '/protected/studio/fengshui',
  COMPATIBILITY: '/protected/analysis/compatibility',
  TODAY: '/protected/analysis/today',
  WEALTH: '/protected/analysis/wealth',
  NEW_YEAR: '/protected/analysis/new-year',
  SAMHAP: '/protected/studio/samhap',
  // 테마는 32종이라 카테고리 하나로 라우트 하나를 정할 수 없다 — 목록으로 보낸다.
  // (어느 테마였는지는 result_json.themeId 에 있고, 그건 결과 화면이 읽는다)
  THEME: '/protected/analysis/theme',
}

/**
 * 재분석 링크를 만든다. 대상 프리셋(targetId)이 의미 있는 라우트에만 쿼리를 부착한다.
 * (스튜디오 관상/손금/풍수는 파라미터명이 다르고 대상=본인 사진이라 프리셋 생략)
 */
export function buildReanalyzeRoute(category: AnalysisCategory, targetId?: string | null): string {
  const base = REANALYZE_ROUTES[category]
  if (!base) return ''
  if ((category === 'SAJU' || category === 'COMPATIBILITY') && targetId) {
    return `${base}?targetId=${targetId}`
  }
  return base
}
