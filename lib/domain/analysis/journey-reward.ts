/**
 * 종합운수 여정 완주 보상(택1) 순수 로직.
 *
 * 개인 5단계(사주·관상·손금·풍수·종합)를 모두 완료하면 아래 후보 중
 * **신위 1좌 또는 테마신당 1종을 1회** 무료 봉안/소장할 수 있다.
 * - 신위: 2품 명신(價 1만냥) 4좌 — 기원(祈願) 트랙과 겹치지 않음
 * - 테마: 기원 보상 트랙에 없는 1만냥 테마 4종
 * 가격·이름·활성 여부는 서버가 DB 값만 신뢰한다(여기 name 은 표시 폴백).
 *
 * side-effect 없음(순수 함수) — 단위테스트 대상.
 */

export type JourneyRewardKind = 'deity' | 'theme'

export interface JourneyRewardChoice {
  kind: JourneyRewardKind
  /** deity: shrine_deities.code · theme: shrine_theme_packs.code */
  code: string
  /** 표시 폴백 이름(DB 조회 실패 시). */
  name: string
  /** 오행 분위기 라벨(선택 UI 표기용). */
  element: string
  /** 한 줄 소개. */
  tagline: string
}

export const JOURNEY_REWARD_CHOICES: readonly JourneyRewardChoice[] = Object.freeze([
  // ── 신위(2품 명신) ──
  {
    kind: 'deity',
    code: 'bari',
    name: '바리공주',
    element: '水',
    tagline: '버려진 길 끝에서 생명을 살린 인도(引導)의 신',
  },
  { kind: 'deity', code: 'daegam', name: '대감신', element: '金', tagline: '집안의 재물과 곳간을 지키는 풍요의 신' },
  { kind: 'deity', code: 'dokkaebi', name: '도깨비 대장', element: '火', tagline: '심술과 복을 함께 부리는 변화의 신' },
  { kind: 'deity', code: 'eopsin', name: '업신', element: '土', tagline: '터에 깃들어 가업을 불리는 축적의 신' },
  // ── 테마신당 ──
  {
    kind: 'theme',
    code: 'dangsan',
    name: '당산나무 그늘',
    element: '木',
    tagline: '마을을 지켜온 노거수 아래의 서늘한 위엄',
  },
  {
    kind: 'theme',
    code: 'yeondeung',
    name: '연등 골짜기',
    element: '火',
    tagline: '골짜기를 메운 연등 불빛의 따뜻한 장엄',
  },
  {
    kind: 'theme',
    code: 'jangdok',
    name: '장독대 새벽',
    element: '土',
    tagline: '정화수 한 그릇으로 여는 살림의 기도',
  },
  { kind: 'theme', code: 'naru', name: '안개 나루터', element: '水', tagline: '물안개 너머로 길을 잇는 경계의 공간' },
] as const)

/** (kind, code) 후보 조회 — 목록 밖 값은 null(클라 입력 검증용). */
export function findJourneyRewardChoice(kind: string, code: string): JourneyRewardChoice | null {
  return JOURNEY_REWARD_CHOICES.find((c) => c.kind === kind && c.code === code) ?? null
}

/** 여정 완주 낙관 칭호 — 완주 연출·claimed 상태 표기에 사용. */
export const JOURNEY_COMPLETE_TITLE = '오상완집(五相完集)'
