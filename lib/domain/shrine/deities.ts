/**
 * 신당 3.0 신위(神位) 도메인 — 결정론적 수호신 자동 배정 (AI 0)
 * 클라이언트·서버 공용 순수 로직 (side-effect 없음). DB shrine_deities 시드와 일치.
 * 근거: TEAM_G_DESIGN/prd/PRD-shrine-3.0-deities-v1.md §2.1
 */

import type { Element } from './types'

export type GuardianCode = 'samsin' | 'jowang' | 'seongju' | 'teoju' | 'dongja' | 'seonnyeo'

export interface GuardianRule {
  code: GuardianCode
  /** 오행 (용신 매칭용) */
  element: Element
  /** 배정 우선순위 · 동점 시 tiebreak (낮을수록 우선, 시드 sort_order와 일치) */
  order: number
  /** focus_areas(고민) 매칭 키워드 — 부분 문자열 매칭 */
  concernKeywords: readonly string[]
}

/** 6수호신 배정 규칙 (PRD §2.1 배정 키 기반) */
export const GUARDIAN_RULES: readonly GuardianRule[] = [
  {
    code: 'samsin',
    element: 'earth',
    order: 1,
    concernKeywords: ['자녀', '가정', '육아', '임신', '출산', '아이', '가족', '자식'],
  },
  {
    code: 'jowang',
    element: 'fire',
    order: 2,
    concernKeywords: ['건강', '병', '치료', '수술', '다이어트', '몸', '질병'],
  },
  {
    code: 'seongju',
    element: 'wood',
    order: 3,
    concernKeywords: ['직장', '이직', '취업', '승진', '사업', '새출발', '이사', '변화', '전직', '창업', '직업'],
  },
  {
    code: 'teoju',
    element: 'earth',
    order: 4,
    concernKeywords: ['재물', '돈', '부동산', '투자', '재산', '저축', '금전', '집값', '자산'],
  },
  {
    code: 'dongja',
    element: 'wood',
    order: 5,
    concernKeywords: ['학업', '시험', '공부', '합격', '인연', '소통', '친구', '수능', '자격증', '진학', '면접'],
  },
  {
    code: 'seonnyeo',
    element: 'water',
    order: 6,
    concernKeywords: ['애정', '연애', '사랑', '결혼', '이성', '궁합', '연인', '짝사랑', '재회'],
  },
]

/** 기본 수호신 — 매칭 신호가 전혀 없을 때(가정 화목, 가장 보편). */
export const DEFAULT_GUARDIAN: GuardianCode = 'samsin'

const CONCERN_WEIGHT = 10
const ELEMENT_WEIGHT = 3

export interface AssignGuardianInput {
  /** user_energy_profile.yongsin_element (없으면 null) */
  yongsin: Element | null
  /** profiles.focus_areas (콤마 구분, 없으면 null) */
  focusAreas: string | null
}

export interface GuardianAssignment {
  code: GuardianCode
  /** 배정 근거 (UI 설명·로그용) */
  reason: 'concern' | 'element' | 'default'
  score: number
}

/** focus_areas 문자열을 정규화된 키워드 조각으로 분해 */
function parseFocusAreas(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(/[,·、/\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * 결정론적 수호신 자동 배정.
 * 우선순위: ① 고민(focus_areas) 키워드 매칭 → ② 용신 오행 매칭 → ③ 기본(삼신).
 * 동점은 order(시드 sort_order)로 확정 → 항상 같은 입력에 같은 결과.
 */
export function assignGuardian(input: AssignGuardianInput): GuardianAssignment {
  const tokens = parseFocusAreas(input.focusAreas)

  let best: GuardianAssignment | null = null

  for (const rule of GUARDIAN_RULES) {
    const concernMatches = tokens.reduce(
      (n, tok) => n + (rule.concernKeywords.some((kw) => tok.includes(kw) || kw.includes(tok)) ? 1 : 0),
      0
    )
    const elementMatch = input.yongsin !== null && rule.element === input.yongsin ? 1 : 0
    const score = concernMatches * CONCERN_WEIGHT + elementMatch * ELEMENT_WEIGHT

    if (score === 0) continue

    const reason: GuardianAssignment['reason'] = concernMatches > 0 ? 'concern' : 'element'
    // 더 높은 점수 우선; 동점이면 낮은 order 우선(안정적 결정론)
    if (best === null || score > best.score) {
      best = { code: rule.code, reason, score }
    }
  }

  if (best === null) {
    return { code: DEFAULT_GUARDIAN, reason: 'default', score: 0 }
  }
  return best
}
