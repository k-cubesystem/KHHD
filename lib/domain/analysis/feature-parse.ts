/**
 * 관상/손금 AI 응답 태그 파서 — 숫자·등급 양쪽 허용 (Track F P0).
 * 문제: 프롬프트는 `[[EARS: 숫자, 설명]]`(숫자)을 지시하나 기존 파서는 등급(좋음/보통/주의)만
 *       매칭해 전량 폐기됐다. 이 순수함수는 숫자·등급 모두 받아 등급으로 정규화한다.
 * 순수 함수(side-effect 없음) — 단위테스트 대상.
 */

export type Assessment = '좋음' | '보통' | '주의'

export interface FeatureResult {
  description: string
  assessment: Assessment
  /** 원본 점수(숫자 형식일 때). 등급 형식이거나 없으면 null. */
  score: number | null
}

/** 숫자 점수를 등급으로. 0~10 스케일이면 ×10 해서 0~100 기준으로 판정. */
export function scoreToAssessment(score: number): Assessment {
  const norm = score <= 10 ? score * 10 : score
  if (norm >= 70) return '좋음'
  if (norm >= 40) return '보통'
  return '주의'
}

const GRADES: readonly Assessment[] = ['좋음', '보통', '주의']

/**
 * `[[TAG: 값, 설명]]` 파싱. 값은 숫자 또는 등급 양쪽 허용.
 * 매칭 실패 시 fallback({ '분석 중', '보통', null }).
 */
export function parseFeatureTag(text: string, tag: string): FeatureResult {
  const re = new RegExp(`\\[\\[${tag}:\\s*([^,\\]]+?)\\s*,\\s*([\\s\\S]+?)\\]\\]`)
  const m = text.match(re)
  if (!m || !m[1] || !m[2]) {
    return { description: '분석 중', assessment: '보통', score: null }
  }
  const rawVal = m[1].trim()
  const description = m[2].trim()

  if ((GRADES as readonly string[]).includes(rawVal)) {
    return { description, assessment: rawVal as Assessment, score: null }
  }

  const num = Number.parseFloat(rawVal)
  if (Number.isFinite(num)) {
    return { description, assessment: scoreToAssessment(num), score: num }
  }

  // 값 형식이 예상 밖이어도 설명은 살린다(전량 폐기 방지).
  return { description, assessment: '보통', score: null }
}
