/**
 * 가족 아바타 통합 카탈로그 — 오행 수호 정령 5종 + 신위 17종.
 *
 * 가족 구성원 선택기·카드·기운지도·신당 탭이 모두 이 카탈로그 하나로 수렴한다.
 * 순수 데이터 모듈(side-effect 0, 'use client' 아님) — 서버·클라이언트 공용.
 *
 * ⚠️ 오행 정령 id(…_dokkaebi)는 기존 family_members.avatar_id 저장값과의
 *    하위호환을 위해 절대 바꾸지 않는다. 신위 id 는 shrine_deities 시드 코드와 일치.
 */

import type { Element } from '@/lib/domain/shrine/types'

export type AvatarKind = 'element' | 'deity'

export interface FamilyAvatar {
  id: string
  kind: AvatarKind
  /** 대표 오행 — 배경 색조·기운지도 매핑용. 옥황상제(전 영역)는 중앙 土로 대표한다. */
  element: Element
  label: string
  color: string
  src: string
}

/** 오행별 아바타 배경 색조 — 기존 5정령 팔레트를 신위에도 일관 적용 */
export const ELEMENT_AVATAR_COLOR: Record<Element, string> = {
  water: '#4ECDC4',
  fire: '#FF6B6B',
  metal: '#F9CA24',
  wood: '#6BCF7F',
  earth: '#A29BFE',
}

/** 오행 수호 정령 5종 — 「설빛온기」 인물 초상. id·src·label 은 기존 저장값과 동일. */
export const ELEMENT_AVATARS: FamilyAvatar[] = [
  {
    id: 'water_dokkaebi',
    kind: 'element',
    element: 'water',
    label: '청수 도령 (水)',
    color: ELEMENT_AVATAR_COLOR.water,
    src: '/avatars/five/water.webp',
  },
  {
    id: 'fire_dokkaebi',
    kind: 'element',
    element: 'fire',
    label: '단화 낭자 (火)',
    color: ELEMENT_AVATAR_COLOR.fire,
    src: '/avatars/five/fire.webp',
  },
  {
    id: 'metal_dokkaebi',
    kind: 'element',
    element: 'metal',
    label: '백금 검사 (金)',
    color: ELEMENT_AVATAR_COLOR.metal,
    src: '/avatars/five/metal.webp',
  },
  {
    id: 'wood_dokkaebi',
    kind: 'element',
    element: 'wood',
    label: '청목 선비 (木)',
    color: ELEMENT_AVATAR_COLOR.wood,
    src: '/avatars/five/wood.webp',
  },
  {
    id: 'earth_dokkaebi',
    kind: 'element',
    element: 'earth',
    label: '온토 부인 (土)',
    color: ELEMENT_AVATAR_COLOR.earth,
    src: '/avatars/five/earth.webp',
  },
]

interface DeitySeed {
  id: string
  label: string
  element: Element
}

/** 신위 17종 — shrine_deities 시드(20260711)의 코드·이름·오행과 일치. portrait.webp 존재. */
const DEITY_SEEDS: DeitySeed[] = [
  { id: 'samsin', label: '삼신할매', element: 'earth' },
  { id: 'jowang', label: '조왕신', element: 'fire' },
  { id: 'seongju', label: '성주신', element: 'wood' },
  { id: 'teoju', label: '터주대감', element: 'earth' },
  { id: 'dongja', label: '동자신', element: 'wood' },
  { id: 'seonnyeo', label: '선녀신', element: 'water' },
  { id: 'daegam', label: '대감신', element: 'metal' },
  { id: 'dokkaebi', label: '도깨비 대장', element: 'fire' },
  { id: 'bari', label: '바리공주', element: 'water' },
  { id: 'eopsin', label: '업신', element: 'earth' },
  { id: 'choiyoung', label: '최영 장군', element: 'metal' },
  { id: 'gwanseong', label: '관성제군', element: 'fire' },
  { id: 'baekma', label: '백마신장', element: 'metal' },
  { id: 'chilseong', label: '칠성신', element: 'water' },
  { id: 'yongwang', label: '용왕신', element: 'water' },
  { id: 'sansin', label: '산신령', element: 'earth' },
  { id: 'okhwang', label: '옥황상제', element: 'earth' }, // 전 영역 가호 → 중앙 土로 대표
]

export const DEITY_AVATARS: FamilyAvatar[] = DEITY_SEEDS.map((d) => ({
  id: d.id,
  kind: 'deity',
  element: d.element,
  label: d.label,
  color: ELEMENT_AVATAR_COLOR[d.element],
  src: `/shrine/deities/${d.id}/portrait.webp`,
}))

/** 정령 5종 + 신위 17종 = 22종 통합 카탈로그 */
export const FAMILY_AVATARS: FamilyAvatar[] = [...ELEMENT_AVATARS, ...DEITY_AVATARS]

const AVATAR_BY_ID = new Map<string, FamilyAvatar>(FAMILY_AVATARS.map((a) => [a.id, a]))

/** 저장된 avatar_id 로 아바타를 찾는다. 미설정·미매칭·본인(경로형)은 undefined. */
export function findFamilyAvatar(id: string | null | undefined): FamilyAvatar | undefined {
  if (!id) return undefined
  return AVATAR_BY_ID.get(id)
}
