/**
 * 삼합(三合) 리포트 파서 — Gemini 텍스트 1콜 응답의 `[[태그]]` 구조를 파싱한다(B-4).
 *
 * 태그 스키마(결정):
 *   [[SUMMARY: 종합 한줄]]
 *   [[HARMONY_1: 합치점 제목, 설명]]  (HARMONY_1~3 — 사주·관상·손금이 같은 말을 하는 지점)
 *   [[TENSION: 긴장점 제목, 해석]]
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

export interface SamhapParsed {
  summary?: string
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

  const tp = two(raw, 'TENSION')
  const tension = tp ? { title: tp[0], interpretation: tp[1] } : undefined
  const summary = one(raw, 'SUMMARY') ?? undefined

  return { summary, harmonies, tension, timings, remedies }
}

/** 구조화된 값이 하나도 없으면 true → 호출부는 원문(raw) 폴백을 노출한다. */
export function isSamhapEmpty(p: SamhapParsed): boolean {
  return p.harmonies.length === 0 && p.timings.length === 0 && p.remedies.length === 0 && !p.tension && !p.summary
}
