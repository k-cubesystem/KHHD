/**
 * 성별 값 정규화 단일 유틸
 *
 * DB(profiles·family_members)의 gender 는 'male' | 'female' | null 이다. 옛 표기('M'·'F'·'남성'·'여성')도 받아 준다.
 * 'M'·'남성' 과의 동등 비교는 실제 값 'male' 을 놓친다 — 속풀이가 모든 회원을 여성으로 계산했다(2026-09-29).
 * DB 값을 읽는 곳은 반드시 이 함수를 거친다.
 */
export type Gender = 'male' | 'female'

const GENDER_ALIASES: Readonly<Record<string, Gender>> = {
  male: 'male',
  m: 'male',
  남성: 'male',
  female: 'female',
  f: 'female',
  여성: 'female',
}

/** 성별 미상일 때 엔진(대운 순행·역행)에 넘기는 값 — context-builder 가 'male' 아닌 값을 모두 여성으로 계산하던 동작을 유지한다. */
export const ENGINE_GENDER_WHEN_UNKNOWN: Gender = 'female'

export function normalizeGender(value: unknown): Gender | null {
  if (typeof value !== 'string') return null
  return GENDER_ALIASES[value.trim().toLowerCase()] ?? null
}

export function genderLabel(gender: Gender | null): '남성' | '여성' | '미상' {
  if (gender === 'male') return '남성'
  if (gender === 'female') return '여성'
  return '미상'
}
