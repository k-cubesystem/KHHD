/**
 * 가족 닮은꼴 운세 (AI 호출 없음) — 두 FACE 결과의 부위별 assessment 를 비교해
 * 닮은 부위·다른 부위·한줄 스토리를 생성한다(B-3).
 *
 * 원칙: 부정 표현 금지. 다른 부위도 "개성/균형"의 긍정 프레임으로만 서술한다.
 *       템플릿 문구 품질에 신경 쓴다(궁 명칭 + 물려받은 기운의 결).
 * 순수 함수(side-effect 없음) — 단위테스트 대상.
 */

import type { Assessment } from './feature-parse'

export type FaceResemblanceKey = 'forehead' | 'eyes' | 'nose' | 'mouth' | 'ears' | 'chin'

export type PartAssessments = Partial<Record<FaceResemblanceKey, Assessment | undefined>>

export interface ResemblancePart {
  key: FaceResemblanceKey
  label: string // 부위 한글
  palace: string // 궁(宮) 명칭
}

export interface FamilyResemblance {
  /** 닮은 부위(같은 평가) — 우선순위 높은 순 */
  similar: ResemblancePart[]
  /** 다른 부위(평가 상이) */
  different: ResemblancePart[]
  /** 한줄 스토리(닮은 부위 중심, 긍정) */
  story: string
  /** 닮은 비율 0~1 (공통 부위 기준) */
  matchRatio: number
}

interface PartMeta {
  label: string
  palace: string
  /** "…가 이어졌습니다" 로 끝나 조사 문제 없는 물상 문구 */
  inherited: string
  /** 스토리 우선순위(작을수록 먼저) — 재물/관계 등 관심도 높은 부위 우선 */
  priority: number
}

const PART_META: Record<FaceResemblanceKey, PartMeta> = {
  nose: { label: '코', palace: '財帛宮', inherited: '재물을 다루는 감각이 이어졌습니다', priority: 1 },
  eyes: { label: '눈', palace: '監察官', inherited: '사람을 보는 따뜻한 눈이 이어졌습니다', priority: 2 },
  forehead: { label: '이마', palace: '天庭', inherited: '총명함과 부모 덕이 이어졌습니다', priority: 3 },
  chin: { label: '턱', palace: '地閣', inherited: '끈기와 든든한 말년의 터전이 이어졌습니다', priority: 4 },
  mouth: { label: '입', palace: '出納官', inherited: '말솜씨와 넉넉한 식복이 이어졌습니다', priority: 5 },
  ears: { label: '귀', palace: '採聽官', inherited: '귀 밝은 복과 다부진 건강이 이어졌습니다', priority: 6 },
}

const KEY_ORDER: FaceResemblanceKey[] = ['nose', 'eyes', 'forehead', 'chin', 'mouth', 'ears']

/** 받침 유무로 와/과 선택 (한글 종성). 비한글은 '와'. */
export function withGwaWa(word: string): string {
  const last = word.charCodeAt(word.length - 1)
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return `${word}와`
  const hasJongseong = (last - 0xac00) % 28 !== 0
  return `${word}${hasJongseong ? '과' : '와'}`
}

const toPart = (key: FaceResemblanceKey): ResemblancePart => ({
  key,
  label: PART_META[key].label,
  palace: PART_META[key].palace,
})

/**
 * 두 얼굴의 부위 평가를 비교해 닮은꼴 리포트 생성.
 * 공통 부위(양쪽 다 평가 존재)가 2곳 미만이면 null(데이터 미비).
 *
 * @param self 현재(방금 분석한) 대상의 부위 평가
 * @param other 비교 상대의 부위 평가
 * @param otherLabel 상대 호칭 (예: '아버지', '어머니', '본인')
 */
export function buildFamilyResemblance(
  self: PartAssessments,
  other: PartAssessments,
  otherLabel: string
): FamilyResemblance | null {
  const common = KEY_ORDER.filter((k) => self[k] && other[k])
  if (common.length < 2) return null

  const similarKeys = common
    .filter((k) => self[k] === other[k])
    .sort((a, b) => PART_META[a].priority - PART_META[b].priority)
  const differentKeys = common
    .filter((k) => self[k] !== other[k])
    .sort((a, b) => PART_META[a].priority - PART_META[b].priority)

  const similar = similarKeys.map(toPart)
  const different = differentKeys.map(toPart)
  const matchRatio = similarKeys.length / common.length

  let story: string
  if (similarKeys.length > 0) {
    const top = similarKeys[0]!
    const meta = PART_META[top]
    const extra = similarKeys.length > 1 ? ` 그 밖에도 ${similarKeys.length - 1}곳이 같은 결을 지녔습니다.` : ''
    story = `${meta.label}(${meta.palace}) 기운이 ${withGwaWa(otherLabel)} 닮았습니다 — ${meta.inherited}.${extra}`
  } else {
    story = `닮은 부위보다 저마다의 개성이 도드라집니다 — 서로 다른 강점으로 집안의 균형을 이룹니다.`
  }

  return { similar, different, story, matchRatio }
}
