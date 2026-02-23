/**
 * 해화지기 손금 엔진 - 알고리즘 모듈
 * 손형태학(手形態學), 엄지 분석, 양손 비교, 시기 예측
 */

// ===================== 손의 형태학(形態學) =====================

export interface HandShapeType {
  type: string
  characteristics: string[]
  personality: string
  strengths: string[]
  bestCareers: string[]
  element: string // 오행 대응
}

export const HAND_SHAPES: HandShapeType[] = [
  {
    type: '지형수(地形手) - 네모 손',
    characteristics: ['손바닥이 정사각형에 가까움', '손가락이 짧고 굵음', '피부가 두꺼운 편'],
    personality: '현실적이고 안정 지향적. 계획적이며 꼼꼼한 성격',
    strengths: ['실행력', '인내력', '현실 감각', '안정성'],
    bestCareers: ['건축', '의료', '금융', '관리직', '제조업'],
    element: '土',
  },
  {
    type: '풍형수(風形手) - 원뿔 손',
    characteristics: ['손바닥이 길고 손가락 끝이 뾰족함', '손가락이 섬세함', '피부가 부드러움'],
    personality: '감수성이 풍부하고 예술적 직관이 뛰어남. 이상주의자',
    strengths: ['창의성', '감수성', '예술성', '직관력'],
    bestCareers: ['예술', '음악', '디자인', '문학', '영적 활동'],
    element: '木',
  },
  {
    type: '화형수(火形手) - 삽 손',
    characteristics: ['손바닥이 위로 갈수록 넓어짐', '손가락이 평평함', '관절이 두드러짐'],
    personality: '독립적이고 행동 지향적. 새로운 아이디어와 모험을 즐김',
    strengths: ['독립심', '혁신성', '행동력', '개척정신'],
    bestCareers: ['기업가', '발명가', '엔지니어', '탐험가', '스포츠'],
    element: '火',
  },
  {
    type: '수형수(水形手) - 철학 손',
    characteristics: ['손바닥이 길고 손가락도 길며 관절이 두드러짐', '뼈대가 두드러져 보임'],
    personality: '분석적이고 사색적. 깊이 생각하고 원칙을 중시함',
    strengths: ['분석력', '논리력', '원칙의식', '학문성'],
    bestCareers: ['철학', '연구', '법률', '신학', '심리학'],
    element: '水',
  },
  {
    type: '금형수(金形手) - 혼합 손',
    characteristics: ['특정 유형에 속하지 않는 균형 잡힌 손', '다양한 특성이 혼재'],
    personality: '다재다능하고 적응력이 뛰어남. 다양한 환경에 잘 적응',
    strengths: ['적응력', '다재다능', '균형감', '사교성'],
    bestCareers: ['경영', '교육', '정치', '미디어', '서비스업'],
    element: '金',
  },
]

// ===================== 엄지 분석 - 의지력·논리력 지표 =====================

export interface ThumbAnalysis {
  willpowerLevel: '강' | '중' | '약'
  logicLevel: '강' | '중' | '약'
  description: string
  advice: string
}

export const THUMB_READINGS = {
  long_flexible: {
    willpowerLevel: '강' as const,
    logicLevel: '강' as const,
    description: '긴 엄지 + 유연한 관절: 강한 의지력과 탁월한 적응력. 리더이지만 경직되지 않음',
    advice: '리더십을 발휘하되 주변 의견도 경청하세요',
  },
  long_stiff: {
    willpowerLevel: '강' as const,
    logicLevel: '중' as const,
    description: '긴 엄지 + 딱딱한 관절: 강한 의지와 고집. 목표 달성력이 뛰어나지만 융통성 부족',
    advice: '타인의 방식을 인정하는 연습이 필요합니다',
  },
  short_flexible: {
    willpowerLevel: '약' as const,
    logicLevel: '강' as const,
    description: '짧은 엄지 + 유연한 관절: 논리적이고 분석적이나 실행력이 다소 약함',
    advice: '계획을 세운 뒤 단계적 실행력 강화가 필요합니다',
  },
  short_stiff: {
    willpowerLevel: '약' as const,
    logicLevel: '약' as const,
    description: '짧은 엄지 + 딱딱한 관절: 내향적이고 독립적. 자신만의 세계가 강함',
    advice: '자신의 강점에 집중하고 주변 지지를 적극 활용하세요',
  },
}

// ===================== 팔궁(八宮) 의미 =====================

export const PALM_MOUNTS: Record<string, { name: string; meaning: string; fortune: string }> = {
  jupiter: { name: '목성구(木星丘)', meaning: '검지 아래', fortune: '리더십, 야망, 명예욕' },
  saturn: { name: '토성구(土星丘)', meaning: '중지 아래', fortune: '책임감, 인내, 철학적 사고' },
  apollo: { name: '태양구(太陽丘)', meaning: '약지 아래', fortune: '창의성, 예술성, 명예' },
  mercury: { name: '수성구(水星丘)', meaning: '새끼손가락 아래', fortune: '소통 능력, 사업 수완, 의학적 재능' },
  venus: { name: '금성구(金星丘)', meaning: '엄지 기저부', fortune: '애정, 생명력, 육체적 활력' },
  mars_upper: { name: '제1화성구', meaning: '엄지와 검지 사이', fortune: '용기, 공격성, 의지력' },
  mars_lower: { name: '제2화성구', meaning: '새끼손가락 아래 측면', fortune: '인내력, 저항력, 도덕심' },
  moon: { name: '월구(月丘)', meaning: '손목 위 측면', fortune: '상상력, 직관력, 여행운, 창의력' },
}

// ===================== 시기 예측 알고리즘 =====================

/**
 * 생명선·운명선 점수 기반 시기별 운세 예측
 */
export function predictTimeline(
  lifeLineScore: number,
  fateLineScore: number,
  sunLineScore: number,
  currentAge: number = 35
): { next1Year: string; next3Years: string; next10Years: string } {
  const overallStrength = (lifeLineScore + fateLineScore + sunLineScore) / 3

  const next1Year =
    overallStrength >= 8
      ? '강한 기운이 흐르는 시기. 새로운 시작과 도전에 최적입니다.'
      : overallStrength >= 6
        ? '안정적인 흐름 속에 꾸준한 노력이 결실을 맺을 시기입니다.'
        : '신중하게 행동하고 내실을 다지는 것이 중요한 시기입니다.'

  const next3Years =
    fateLineScore >= 8
      ? '운명선이 강해 목표한 방향으로 큰 전진이 예상됩니다.'
      : fateLineScore >= 5
        ? '중요한 선택의 기로가 있으나, 꾸준한 노력으로 개운이 가능합니다.'
        : '새로운 방향을 모색하고 기반을 다시 구축하는 3년이 될 것입니다.'

  const next10Years =
    lifeLineScore >= 8
      ? '생명선이 강해 건강하고 활력 있는 10년이 예상됩니다. 큰 성취를 이룰 기반이 있습니다.'
      : sunLineScore >= 7
        ? '태양선이 발달해 명예와 성취가 두드러지는 10년입니다.'
        : '지속적인 건강 관리와 자기 개발이 장기 운을 결정할 것입니다.'

  return { next1Year, next3Years, next10Years }
}

// ===================== 양손 비교 분석 =====================

export function analyzeDualHands(
  leftScore: number,
  rightScore: number
): { leftHand: string; rightHand: string; comparison: string } {
  const leftHand = '왼손(타고난 운명): 선천적으로 가지고 태어난 잠재력과 운명의 설계도입니다.'
  const rightHand = '오른손(현재 운명): 지금까지의 노력과 선택으로 만들어온 현재의 운입니다.'

  let comparison: string
  if (rightScore > leftScore + 1) {
    comparison = '오른손의 운이 왼손보다 강합니다. 후천적 노력과 의지로 타고난 운명을 뛰어넘고 있는 훌륭한 상입니다.'
  } else if (leftScore > rightScore + 1) {
    comparison = '왼손의 잠재력이 더 강합니다. 아직 발휘되지 않은 능력이 있습니다. 지금보다 더 크게 성장할 수 있습니다.'
  } else {
    comparison = '양손이 균형을 이루고 있습니다. 타고난 운명과 현재의 노력이 조화롭게 일치하고 있습니다.'
  }

  return { leftHand, rightHand, comparison }
}

// ===================== 손금-사주 교차 분석 =====================

export const DAYGAN_PALM_SYNERGY: Record<string, { keyLine: string; keyMount: string; advice: string }> = {
  甲: { keyLine: '운명선', keyMount: '목성구', advice: '운명선이 강하면 리더로서 큰 성취를 이룹니다' },
  乙: { keyLine: '감정선', keyMount: '금성구', advice: '감정선이 풍부하면 대인관계에서 꽃을 피웁니다' },
  丙: { keyLine: '태양선', keyMount: '태양구', advice: '태양선이 있으면 선천적 화려함이 현실로 드러납니다' },
  丁: { keyLine: '지능선', keyMount: '수성구', advice: '지능선이 길수록 직관과 분석력이 극대화됩니다' },
  戊: { keyLine: '생명선', keyMount: '금성구', advice: '굵은 생명선이 탄탄한 기반과 재물을 지켜줍니다' },
  己: { keyLine: '생명선', keyMount: '금성구', advice: '생명선 근처 지선이 재물 복을 더해줍니다' },
  庚: { keyLine: '운명선', keyMount: '목성구', advice: '강한 운명선이 원대한 목표 달성을 뒷받침합니다' },
  辛: { keyLine: '지능선', keyMount: '수성구', advice: '섬세한 지능선이 전문성과 완벽주의를 나타냅니다' },
  壬: { keyLine: '감정선', keyMount: '월구', advice: '깊은 감정선과 발달한 월구가 지혜와 직관을 줍니다' },
  癸: { keyLine: '태양선', keyMount: '월구', advice: '태양선과 월구 발달 시 예술적 재능이 빛을 발합니다' },
}

export function buildPalmSajuSynergyText(dayGan: string, palmScore: number): string {
  const synergy = DAYGAN_PALM_SYNERGY[dayGan]
  if (!synergy) return ''
  return `일간 ${dayGan}의 운명을 가진 분에게 ${synergy.keyLine}과 ${synergy.keyMount}는 핵심 지표입니다. ${synergy.advice}`
}
