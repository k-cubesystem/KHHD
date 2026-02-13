/**
 * 궁합 분석 관계 타입
 */
export interface RelationshipType {
  value: string
  label: string
  emoji: string
  category: 'love' | 'family' | 'work' | 'friend' | 'business'
  description: string
}

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  // 연인 관계
  {
    value: 'lover',
    label: '애인',
    emoji: '💕',
    category: 'love',
    description: '연인 관계의 궁합을 분석합니다',
  },
  {
    value: 'dating',
    label: '소개팅/만남',
    emoji: '💐',
    category: 'love',
    description: '처음 만난 두 사람의 인연을 살펴봅니다',
  },
  {
    value: 'crush',
    label: '짝사랑',
    emoji: '💘',
    category: 'love',
    description: '한쪽의 마음이 이루어질지 분석합니다',
  },
  {
    value: 'marriage',
    label: '결혼 예정',
    emoji: '💒',
    category: 'love',
    description: '결혼을 앞둔 두 사람의 미래를 봅니다',
  },

  // 가족 관계
  {
    value: 'spouse',
    label: '부부',
    emoji: '👫',
    category: 'family',
    description: '부부 관계의 조화와 갈등 해소법을 제시합니다',
  },
  {
    value: 'parent_child',
    label: '부모-자녀',
    emoji: '👨‍👧',
    category: 'family',
    description: '부모와 자녀 간의 이해와 소통을 돕습니다',
  },
  {
    value: 'siblings',
    label: '형제/자매',
    emoji: '👫',
    category: 'family',
    description: '형제자매 간의 관계를 분석합니다',
  },
  {
    value: 'in_laws',
    label: '시댁/처가',
    emoji: '🏠',
    category: 'family',
    description: '시댁 또는 처가와의 관계를 살펴봅니다',
  },

  // 친구 관계
  {
    value: 'friend',
    label: '친구',
    emoji: '🤝',
    category: 'friend',
    description: '우정의 깊이와 지속 가능성을 봅니다',
  },
  {
    value: 'best_friend',
    label: '절친',
    emoji: '💛',
    category: 'friend',
    description: '평생 우정을 나눌 수 있을지 분석합니다',
  },
  {
    value: 'roommate',
    label: '룸메이트',
    emoji: '🏡',
    category: 'friend',
    description: '함께 사는 생활 궁합을 확인합니다',
  },

  // 직장 관계
  {
    value: 'boss_employee',
    label: '상사-부하',
    emoji: '👔',
    category: 'work',
    description: '상하 관계의 협업 효율을 분석합니다',
  },
  {
    value: 'coworker',
    label: '동료',
    emoji: '🤝',
    category: 'work',
    description: '직장 동료로서의 협업 가능성을 봅니다',
  },
  {
    value: 'mentor_mentee',
    label: '멘토-멘티',
    emoji: '📚',
    category: 'work',
    description: '가르침과 배움의 관계를 살펴봅니다',
  },
  {
    value: 'part_timer',
    label: '알바-사장',
    emoji: '🏪',
    category: 'work',
    description: '단기 고용 관계의 조화를 분석합니다',
  },

  // 비즈니스 관계
  {
    value: 'business_partner',
    label: '동업자',
    emoji: '💼',
    category: 'business',
    description: '사업 파트너로서의 시너지를 분석합니다',
  },
  {
    value: 'investor',
    label: '투자자-창업자',
    emoji: '💰',
    category: 'business',
    description: '투자 관계의 신뢰와 성공 가능성을 봅니다',
  },
  {
    value: 'client',
    label: '고객-공급자',
    emoji: '🤝',
    category: 'business',
    description: '비즈니스 거래 관계를 분석합니다',
  },
  {
    value: 'team_project',
    label: '프로젝트 팀원',
    emoji: '🎯',
    category: 'business',
    description: '단기 프로젝트 협업 궁합을 확인합니다',
  },
]

/**
 * 카테고리별 관계 타입 그룹화
 */
export const RELATIONSHIP_CATEGORIES = {
  love: RELATIONSHIP_TYPES.filter((r) => r.category === 'love'),
  family: RELATIONSHIP_TYPES.filter((r) => r.category === 'family'),
  friend: RELATIONSHIP_TYPES.filter((r) => r.category === 'friend'),
  work: RELATIONSHIP_TYPES.filter((r) => r.category === 'work'),
  business: RELATIONSHIP_TYPES.filter((r) => r.category === 'business'),
}

/**
 * 카테고리 라벨
 */
export const CATEGORY_LABELS = {
  love: '💕 연인 관계',
  family: '👨‍👩‍👧 가족 관계',
  friend: '🤝 친구 관계',
  work: '👔 직장 관계',
  business: '💼 비즈니스',
}
