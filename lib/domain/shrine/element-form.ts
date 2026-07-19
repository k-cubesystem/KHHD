/**
 * 오행형(五行形) 파싱 — 관상·손금 분석 결과에서 기운 보정을 뽑는다.
 * 클라이언트·서버 공용 순수 함수 (단위테스트 대상).
 *
 * 프롬프트가 `[[ELEMENT_FORM: 木, 근거]]` 태그를 선택적으로 출력한다(확신 없으면 생략).
 * 태그가 없으면 null — 보정 없이 사주만으로 기운을 잡는다.
 */

import type { Element } from './types'

const HANJA_TO_EL: Record<string, Element> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' }

/** 오행형이 강화하는 기운의 크기. 사주 기반 base(5~90)를 뒤집지 않을 만큼만 민다. */
export const ELEMENT_FORM_BONUS = 8

export interface ElementForm {
  element: Element
  /** 그렇게 본 근거 (UI 표기용) */
  reason: string | null
}

/**
 * 분석 원문에서 `[[ELEMENT_FORM: 木, 근거]]` 추출.
 * 「木形」처럼 形 이 붙어 나오거나 근거가 없어도 받아들인다(모델 출력 흔들림 흡수).
 */
export function parseElementForm(text: string): ElementForm | null {
  if (!text) return null
  const m = text.match(/\[\[ELEMENT_FORM:\s*([木火土金水])\s*形?\s*(?:,\s*([^\]]*))?\]\]/)
  if (!m?.[1]) return null
  const element = HANJA_TO_EL[m[1]]
  if (!element) return null
  const reason = m[2]?.trim()
  return { element, reason: reason ? reason : null }
}

/**
 * 오행형 → 기운 보정 객체. user_energy_profile.face_modifier / palm_modifier 에 저장되는 형태.
 * 해당 오행만 +ELEMENT_FORM_BONUS (나머지는 건드리지 않음).
 */
export function elementFormToModifier(form: ElementForm | null): Record<string, number> {
  if (!form) return {}
  return { [form.element]: ELEMENT_FORM_BONUS }
}
