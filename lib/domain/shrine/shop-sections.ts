/**
 * 신물 상점 갈래 — 81개 평면 나열을 끝낸다.
 *
 * 카탈로그가 46신물+시렁3+신수32 로 늘면서 한 그리드 스크롤이 됐고, 시렁(95번째 언저리)과
 * 신수(맨 끝)는 **있는데도 못 찾는** 물건이 됐다("구매하는 부분이 안 보여"). 종류(type)를
 * 갈래로 접어 머리글을 세운다 — 갈래 배정의 단일 출처는 이 파일이고, 카탈로그의 모든 type 이
 * 갈래 하나에 속하는지는 테스트가 대조한다.
 */

import { FAMILY_SEAT_TYPES } from './shelf'

export interface ShopSection {
  readonly key: string
  readonly label: string
  /** 이 갈래에 속하는 카탈로그 type — 겹치면 안 된다(테스트 강제) */
  readonly types: readonly string[]
  /** 머리글 아래 한 줄 */
  readonly hint: string
}

export const SHOP_SECTIONS: readonly ShopSection[] = Object.freeze([
  {
    key: 'guardian',
    label: '신수(神獸)',
    types: ['guardian'],
    hint: '신이 자리를 비울 때 신당을 지키는 영물 — 착좌는 모아보기 「신수」 탭에서',
  },
  {
    key: 'shelf',
    label: '시렁·세간',
    // 가족 자리 도메인(FAMILY_SEAT_TYPES)과 단일 출처 — 이 갈래 = 가족을 지정할 수 있는 세간 전부
    types: FAMILY_SEAT_TYPES,
    hint: '벽에 매고 바닥에 놓는 세간 — 가족 한 사람의 자리로 지정할 수 있습니다',
  },
  {
    key: 'mugu',
    label: '무구(巫具)',
    types: ['blade', 'mirror', 'fan', 'pole', 'drum', 'paper', 'cloth', 'bell', 'chime', 'talisman'],
    hint: '굿과 점사에 쓰는 도구들',
  },
  {
    key: 'offering',
    label: '제물·공물',
    types: ['offering', 'vessel', 'plant', 'flower', 'incense', 'candle', 'lantern', 'spirit'],
    hint: '상에 올리고 불을 밝히는 것들',
  },
])

/** type → 갈래. 모르는 type 은 마지막 갈래(제물·공물)로 접는다 — 새 type 이 상점에서 사라지는 것보다 낫다. */
export function sectionForType(type: string): ShopSection {
  return SHOP_SECTIONS.find((s) => s.types.includes(type)) ?? SHOP_SECTIONS[SHOP_SECTIONS.length - 1]
}
