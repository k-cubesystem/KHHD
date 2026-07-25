/**
 * 삼합(三合) 리포트 파서 — Gemini 텍스트 1콜 응답의 `[[태그]]` 구조를 파싱한다(B-4).
 *
 * 태그 스키마 v2 (PLAN-samhap-synthesis-v2 §5 — v1 태그는 전부 유지, 구 리포트 재열람 호환):
 *   [[SUMMARY: 종합 한줄]]
 *   [[NOW: 현재 대운·구간 | 삼정·손금과 겹쳐 본 현재 국면]]            (v2, 파이프 구분)
 *   [[CROSS_WEALTH: 합|반합|충 | 사주·관상·손금 근거를 엮은 해석]]      (v2 — CAREER/LOVE/HEALTH 동일)
 *   [[HARMONY_1: 합치점 제목, 설명]]  (HARMONY_1~3)
 *   [[TENSION: 긴장점 제목, 해석]]   (v2 에선 체용 상충으로 재정의 — 태그는 동일)
 *   [[TIMING_1: 시기, 조언]]         (TIMING_1~3)
 *   [[REMEDY_1: 개운 처방]]          (REMEDY_1~3)
 *
 * 파싱 실패해도 크래시 없이 빈 구조를 반환 → 호출부는 isSamhapEmpty 로 원문 폴백 판단.
 * 순수 함수(side-effect 없음) — 단위테스트 대상.
 */

export interface SamhapHarmony {
  title: string
  detail: string
}

export interface SamhapTiming {
  period: string
  advice: string
}

export type SamhapCrossKey = 'wealth' | 'career' | 'love' | 'health'

export interface SamhapCross {
  key: SamhapCrossKey
  /** UI 표기 라벨 (재물/일·명예/인연/건강) */
  label: string
  /** 판정: 합 | 반합 | 충 (모델 출력 그대로 — 앞뒤 공백만 제거) */
  verdict: string
  detail: string
}

export interface SamhapParsed {
  summary?: string
  /** 현재 국면 (대운 × 삼정 × 손금 시간축 정렬) — v2 */
  now?: { phase: string; detail: string }
  /** 주제별 교차 검증 (재물·일·인연·건강) — v2 */
  crosses: SamhapCross[]
  /** 합치점 3 (사주·관상·손금의 일치) */
  harmonies: SamhapHarmony[]
  /** 긴장점과 해석 */
  tension?: { title: string; interpretation: string }
  /** 시기별 조언 */
  timings: SamhapTiming[]
  /** 개운 처방 */
  remedies: string[]
}

/** `[[TAG: a, b]]` — 첫 값(콤마 없음) + 둘째 값(나머지, 콤마 허용). */
function two(raw: string, tag: string): [string, string] | null {
  const m = raw.match(new RegExp(`\\[\\[${tag}:\\s*([^,\\]]+?)\\s*,\\s*([\\s\\S]+?)\\]\\]`))
  if (m?.[1] && m?.[2]) return [m[1].trim(), m[2].trim()]
  return null
}

/** `[[TAG: text]]` — 단일 값. */
function one(raw: string, tag: string): string | null {
  const m = raw.match(new RegExp(`\\[\\[${tag}:\\s*([\\s\\S]+?)\\]\\]`))
  return m?.[1]?.trim() || null
}

/** `[[TAG: a | b]]` — 파이프 구분 2필드 (v2 태그 전용, 값 안 콤마 허용). */
function pipe(raw: string, tag: string): [string, string] | null {
  const m = raw.match(new RegExp(`\\[\\[${tag}:\\s*([^|\\]]+?)\\s*\\|\\s*([\\s\\S]+?)\\]\\]`))
  if (m?.[1] && m?.[2]) return [m[1].trim(), m[2].trim()]
  return null
}

const CROSS_TAGS: ReadonlyArray<{ tag: string; key: SamhapCrossKey; label: string }> = [
  { tag: 'CROSS_WEALTH', key: 'wealth', label: '재물' },
  { tag: 'CROSS_CAREER', key: 'career', label: '일·명예' },
  { tag: 'CROSS_LOVE', key: 'love', label: '인연' },
  { tag: 'CROSS_HEALTH', key: 'health', label: '건강' },
]

export function parseSamhap(raw: string): SamhapParsed {
  const harmonies: SamhapHarmony[] = []
  for (const t of ['HARMONY_1', 'HARMONY_2', 'HARMONY_3']) {
    const p = two(raw, t)
    if (p) harmonies.push({ title: p[0], detail: p[1] })
  }

  const timings: SamhapTiming[] = []
  for (const t of ['TIMING_1', 'TIMING_2', 'TIMING_3']) {
    const p = two(raw, t)
    if (p) timings.push({ period: p[0], advice: p[1] })
  }

  const remedies: string[] = []
  for (const t of ['REMEDY_1', 'REMEDY_2', 'REMEDY_3']) {
    const r = one(raw, t)
    if (r) remedies.push(r)
  }

  const crosses: SamhapCross[] = []
  for (const { tag, key, label } of CROSS_TAGS) {
    const p = pipe(raw, tag)
    if (p) crosses.push({ key, label, verdict: p[0], detail: p[1] })
  }

  const np = pipe(raw, 'NOW')
  const now = np ? { phase: np[0], detail: np[1] } : undefined

  const tp = two(raw, 'TENSION')
  const tension = tp ? { title: tp[0], interpretation: tp[1] } : undefined
  const summary = one(raw, 'SUMMARY') ?? undefined

  return { summary, now, crosses, harmonies, tension, timings, remedies }
}

/** 구조화된 값이 하나도 없으면 true → 호출부는 원문(raw) 폴백을 노출한다. */
export function isSamhapEmpty(p: SamhapParsed): boolean {
  return (
    p.harmonies.length === 0 &&
    p.timings.length === 0 &&
    p.remedies.length === 0 &&
    p.crosses.length === 0 &&
    !p.now &&
    !p.tension &&
    !p.summary
  )
}
