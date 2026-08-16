/**
 * 인연 갈래 — 가족과 지인 (CEO 지시 2026-08-16).
 *
 * ## 왜 갈래가 필요한가
 * 지금까지 등록한 사람은 전부 «가족»이었다. 그래서 「아는 사람 사주 한번 봐주고 싶다」는
 * 쓰임이 가족 목록에 섞여 들어갔고, 가족 신당·오행 지도처럼 **가족을 전제로 만든 화면**이
 * 지인까지 끌고 다니게 됐다.
 *
 * ## 🔴 관계(relationship)와 갈래(category)는 다른 축이다
 * 관계는 «어떤 사이인가»(배우자·친구·직장 동료)이고, 갈래는 «내 사람인가 남인가»다.
 * 관계 문자열로 갈래를 추측하면 「아는 형」이 가족으로 묶인다 — 그래서 갈래는 데이터가 든다.
 *
 * ## 🔴 기본값은 가족이다
 * 갈래가 없던 시절에 등록된 사람을 지인으로 옮기면 가족 신당·오행 지도에서 조용히 빠진다.
 * 지인은 **새로 등록하는 사람이 스스로 고르는 값**이지, 과거를 소급해 나누는 값이 아니다.
 */

export type MemberCategory = 'family' | 'acquaintance'

export const MEMBER_CATEGORIES: readonly MemberCategory[] = ['family', 'acquaintance']

export const DEFAULT_MEMBER_CATEGORY: MemberCategory = 'family'

interface MemberCategoryMeta {
  readonly label: string
  /** 목록이 비었을 때 그 자리에 놓는 말. */
  readonly emptyHint: string
  /** 등록 화면에서 이 갈래를 고를 때 붙는 한 줄. */
  readonly pickHint: string
}

export const MEMBER_CATEGORY_META: Record<MemberCategory, MemberCategoryMeta> = {
  family: {
    label: '가족',
    emptyHint: '아직 등록한 가족이 없습니다.',
    pickHint: '함께 사는 사람, 피를 나눈 사람. 가족 신당과 기운 지도에 함께 놓입니다.',
  },
  acquaintance: {
    label: '지인',
    emptyHint: '아직 등록한 지인이 없습니다.',
    pickHint: '친구·동료처럼 곁의 사람. 사주는 똑같이 볼 수 있고, 가족 화면과는 따로 관리됩니다.',
  },
}

export function isMemberCategory(value: string | null | undefined): value is MemberCategory {
  return value === 'family' || value === 'acquaintance'
}

/** 모르는 값·빈 값은 가족으로 떨어뜨린다 — 갈래를 잃은 사람이 목록에서 사라지지 않게. */
export function toMemberCategory(value: string | null | undefined): MemberCategory {
  return isMemberCategory(value) ? value : DEFAULT_MEMBER_CATEGORY
}

export function memberCategoryLabel(value: string | null | undefined): string {
  return MEMBER_CATEGORY_META[toMemberCategory(value)].label
}

/**
 * 지인 등록에서 고를 수 있는 관계.
 *
 * 🔴 가족 관계(부부·부모자녀·형제·인척)는 여기 없다. 지인으로 등록하면서 «부부»를 고르는 것은
 *    갈래와 관계가 서로 다른 말을 하는 상태이고, 그 데이터는 나중에 어느 화면에서든 사고가 된다.
 *    값은 `lib/constants/relationship-types.ts` 의 라벨과 같은 말을 쓴다.
 */
export const ACQUAINTANCE_RELATIONS: readonly string[] = [
  '친구',
  '가까운 친구',
  '직장 동료',
  '상사',
  '후배',
  '선생님',
  '동업자',
  '거래처',
  '이웃',
  '지인',
]

/** 가족 등록에서 고를 수 있는 관계. */
export const FAMILY_RELATIONS: readonly string[] = [
  '배우자',
  '자녀',
  '부모',
  '형제',
  '자매',
  '조부모',
  '손주',
  '며느리',
  '사위',
  '친척',
]

export function relationsFor(category: MemberCategory): readonly string[] {
  return category === 'acquaintance' ? ACQUAINTANCE_RELATIONS : FAMILY_RELATIONS
}
