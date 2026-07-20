/**
 * 관계군(FocusGroup) — 궁합 프롬프트의 "질문·문체·섹션" 분기 단위.
 *
 * ⚠️ 엔진 가중치 타입(점수 계산, compatibility-engine)과는 별개 축이다.
 * 이 파일은 "그 관계에서 실제로 궁금한 것"이 갈리는 단위로 19종 UI 관계를 8군에 매핑하고,
 * 군별 단골 질문 5개(사주 상담 현장 기준)·특화 지시·금지 소재·섹션 제목·과거 역추산 생성 여부를 정의한다.
 * 순수 상수 + 매핑 함수(단위 테스트 대상).
 */

export type FocusGroup =
  | 'MEETING'
  | 'COUPLE'
  | 'MARRIAGE'
  | 'PARENT_CHILD'
  | 'SIBLINGS'
  | 'FRIEND'
  | 'WORK'
  | 'BUSINESS'

export interface FocusGroupSpec {
  group: FocusGroup
  /** 군 한글 이름 (UI/프롬프트용) */
  label: string
  /** 그 관계에서 사람들이 실제 궁금해하는 단골 질문 5개 (focusAnswers 가 1:1 응답) */
  questions: string[]
  /** 프롬프트 특화 지시 (군별 문체·관점) */
  guidance: string
  /** 금지 소재 (어울리지 않는 소재 차단) */
  forbidden: string
  /** recommendedPlaces 섹션 제목 (군별 의미 재정의) */
  placesLabel: string
  /** 과거 역추산(pastRetrograde) 생성 여부 — COUPLE/MARRIAGE 만 true */
  generatePastRetrograde: boolean
}

/** 19종 UI 관계값 → FocusGroup (정확히 1:1, 누락 시 테스트 실패) */
const RELATION_TO_GROUP: Record<string, FocusGroup> = {
  // MEETING 만남 전
  dating: 'MEETING',
  crush: 'MEETING',
  // COUPLE 연인
  lover: 'COUPLE',
  marriage: 'COUPLE',
  // MARRIAGE 부부
  spouse: 'MARRIAGE',
  // PARENT_CHILD 부모자식·어른
  parent_child: 'PARENT_CHILD',
  in_laws: 'PARENT_CHILD',
  // SIBLINGS 형제자매
  siblings: 'SIBLINGS',
  // FRIEND 친구·동거
  friend: 'FRIEND',
  best_friend: 'FRIEND',
  roommate: 'FRIEND',
  // WORK 직장
  boss_employee: 'WORK',
  coworker: 'WORK',
  mentor_mentee: 'WORK',
  part_timer: 'WORK',
  // BUSINESS 사업·거래
  business_partner: 'BUSINESS',
  investor: 'BUSINESS',
  client: 'BUSINESS',
  team_project: 'BUSINESS',
}

export const FOCUS_GROUPS: Record<FocusGroup, FocusGroupSpec> = {
  MEETING: {
    group: 'MEETING',
    label: '소개팅·짝사랑 (시작해도 되나)',
    questions: [
      '이 사람과 잘 될 가능성이 있는 인연인가요?',
      '상대는 나를 어떤 사람으로 느낄까요? (첫인상)',
      '어떻게 다가가야 호감을 얻을까요? (연락 빈도·속도)',
      '마음을 표현하기 좋은 시기는 언제인가요?',
      '오래갈 인연인가요, 스쳐갈 인연인가요?',
    ],
    guidance:
      '아직 시작 전 관계다. 만난 적이 없으므로 과거 사건 추론을 하지 말고, 미래 가능성과 접근법 중심으로 답하라. 확신 없는 단정("반드시 이어진다")은 금지한다.',
    forbidden: '과거 사건 추론(둘은 아직 만난 적이 없다), "반드시 이어진다"식 단정',
    placesLabel: '함께 가면 좋은 곳',
    generatePastRetrograde: false,
  },
  COUPLE: {
    group: 'COUPLE',
    label: '연인·결혼 예정 (계속 가도 되나)',
    questions: [
      '우리는 성격이 어디서 잘 맞고 어디서 부딪히나요?',
      '결혼까지 갈 수 있는 상대인가요?',
      '싸웠을 때 어떻게 화해하는 게 좋을까요?',
      '상대의 애정 표현 방식은 무엇인가요? (내가 오해하기 쉬운 부분)',
      '결혼(또는 다음 단계)에 좋은 시기는 언제인가요?',
    ],
    guidance:
      '연애 관계다. 과거 역추산(끌림·다툼 시점)을 허용하고, 데이트 장소 추천을 유지한다. 애정 표현·결혼 흐름을 구체적으로 다뤄라.',
    forbidden: '없음(연애 소재 허용)',
    placesLabel: '함께 가면 좋은 곳',
    generatePastRetrograde: true,
  },
  MARRIAGE: {
    group: 'MARRIAGE',
    label: '부부 (어떻게 잘 살아가나)',
    questions: [
      '반복되는 갈등의 진짜 뿌리는 무엇인가요?',
      '돈 관리는 누가 어떻게 하는 게 우리에게 맞나요? (재물 합)',
      '자녀와의 합, 자녀 계획에 좋은 흐름은 언제인가요?',
      '권태기·위기가 온다면 언제, 어떻게 넘기나요?',
      '중년 이후 우리는 어떤 부부가 되나요?',
    ],
    guidance:
      '부부 관계다. 과거 역추산(신혼 갈등·고비 시점)을 허용하되, "이별을 권유"하는 문구는 금지한다. 위기여도 극복법 중심으로 답하라. 재물 합·자녀·중년 흐름을 다뤄라.',
    forbidden: '이별 권유(위기여도 극복법 중심)',
    placesLabel: '함께 가면 좋은 곳',
    generatePastRetrograde: true,
  },
  PARENT_CHILD: {
    group: 'PARENT_CHILD',
    label: '부모-자식·시댁/처가 (어떻게 대해야 하나)',
    questions: [
      '아이(상대)의 타고난 기질은 나와 어디가 다른가요?',
      '내 방식(훈육·조언)이 상대에게 통하나요? 어떻게 말해야 들리나요?',
      '크게 부딪히기 쉬운 시기는 언제인가요? (사춘기·독립·명절)',
      '상대의 재능·장점을 어떻게 밀어주면 좋을까요?',
      '사이가 틀어졌을 때 회복하는 방법은 무엇인가요?',
    ],
    guidance:
      '세대 간 관계다. 연애 소재(도화살·애정 표현 등)를 전면 금지하고, 세대 차·소통법·존중 중심으로 답하라. 시댁/처가는 "어른-며느리/사위" 프레임(호칭·경계·명절)으로 다뤄라.',
    forbidden: '연애 소재 전면 금지(도화살·애정 표현·이별·데이트)',
    placesLabel: '함께하면 좋은 활동',
    generatePastRetrograde: false,
  },
  SIBLINGS: {
    group: 'SIBLINGS',
    label: '형제자매 (우애와 경쟁 사이)',
    questions: [
      '우리는 왜 이렇게 다른가요? (같은 집에서 자랐는데)',
      '경쟁심·비교 의식의 뿌리는 무엇인가요?',
      '돈 문제(부모 부양·상속·빌려주기)에서 주의할 점은요?',
      '서로에게 어떤 귀인이 될 수 있나요?',
      '멀어진 사이라면 어떻게 회복하나요?',
    ],
    guidance:
      '형제자매 관계다. 연애 소재를 금지한다. 비견·겁재(형제 별)를 쉬운 말로 활용하되, 재물 갈등은 겁주지 말고 예방법 중심으로 답하라.',
    forbidden: '연애 소재 금지, 재물 갈등 겁주기 금지(예방법 중심)',
    placesLabel: '함께하기 좋은 자리',
    generatePastRetrograde: false,
  },
  FRIEND: {
    group: 'FRIEND',
    label: '친구·동거 (어떤 인연인가)',
    questions: [
      '우리는 왜 잘 맞나요(또는 왜 자꾸 어긋나나요)?',
      '돈 거래를 해도 되는 사이인가요?',
      '여행·동거를 해도 괜찮은 합인가요?',
      '서로에게 어떤 귀인이 되나요?',
      '다퉜을 때 누가 어떻게 풀어야 하나요?',
    ],
    guidance:
      '우정 관계다. 연애 프레임(도화·이별·연애 감정)은 적용하지 말고, 신뢰·거리·생활 합·귀인 관점으로 답하라. 돈 거래·여행·동거의 현실적 궁합을 다뤄라.',
    forbidden: '연애 프레임(연인이 아님)',
    placesLabel: '함께하기 좋은 자리',
    generatePastRetrograde: false,
  },
  WORK: {
    group: 'WORK',
    label: '직장 (같이 일해도 되는 사람인가)',
    questions: [
      '이 사람과 일하면 시너지가 나나요, 소모가 되나요?',
      '소통 방식이 어떻게 다른가요? (보고·지시·피드백 스타일)',
      '갈등이 생기면 주로 어떤 지점에서, 어떻게 대처해야 하나요?',
      '믿고 맡겨도 되는 부분과 조심할 부분은 무엇인가요?',
      '오래 함께 갈 인연인가요? (이직·부서 이동 흐름 포함)',
    ],
    guidance:
      '직장 관계다. 연애 소재를 전면 금지한다. 데이트 장소 대신 "합이 트이는 협업 방식"(회의 방식·업무 분담·소통 채널)을 제시하라. 존댓말 관계를 전제로 답하라.',
    forbidden: '연애 소재 전면 금지(도화·이별·데이트 장소)',
    placesLabel: '합이 트이는 협업 방식',
    generatePastRetrograde: false,
  },
  BUSINESS: {
    group: 'BUSINESS',
    label: '사업·거래 (돈을 같이 만져도 되나)',
    questions: [
      '동업(거래)해도 되는 상대인가요? 깨질 위험은 어디에 있나요?',
      '금전 신뢰도는 어떤가요? (돈 앞에서 어떻게 변하는가)',
      '역할은 어떻게 나누는 게 맞나요? (안살림/바깥일)',
      '위기가 온다면 언제, 무엇으로 오나요? 대비는요?',
      '계약·확장·투자에 좋은 시기는 언제인가요?',
    ],
    guidance:
      '사업·거래 관계다. 연애 소재를 금지한다. 리스크를 솔직하게 지적하라(「솔직한 분석」 원칙 유지 — 엔진 40점 이하 경고 규칙이 이 군에서 특히 중요). 금전 신뢰·역할 분배·위기 대비를 구체적으로 다뤄라.',
    forbidden: '연애 소재 금지',
    placesLabel: '합이 트이는 협업 방식',
    generatePastRetrograde: false,
  },
}

/** 19종 관계값 → FocusGroup. 매핑 불가 시 COUPLE(연애) 기본. */
export function resolveFocusGroup(relationship: string): FocusGroup {
  return RELATION_TO_GROUP[relationship] ?? 'COUPLE'
}

/** 관계값에 해당하는 FocusGroupSpec 반환. */
export function getFocusGroupSpec(relationship: string): FocusGroupSpec {
  return FOCUS_GROUPS[resolveFocusGroup(relationship)]
}

/** 매핑 테이블에 정의된 모든 관계값 (테스트/검증용). */
export const MAPPED_RELATIONSHIPS = Object.keys(RELATION_TO_GROUP)
