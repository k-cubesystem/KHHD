/**
 * 해화지기 관상 엔진 - 알고리즘 모듈
 * 기색론(氣色論), 유년운(流年運) 부위 매핑, 성격 유형 분류
 */

// ===================== 기색론(氣色論) 데이터 =====================

export const GISAEK_COLORS = {
  홍색: { meaning: '기쁜 일·승진·합격·좋은 소식', valence: 'good' as const },
  황색: { meaning: '재물 발복·건강 회복·안정', valence: 'good' as const },
  백색: { meaning: '슬픔·상실·이별·근심', valence: 'caution' as const },
  청색: { meaning: '놀람·두려움·갑작스러운 변화', valence: 'caution' as const },
  흑색: { meaning: '재앙·병환·큰 장애', valence: 'warning' as const },
  자색: { meaning: '귀인 도움·명예 상승·영적 보호', valence: 'good' as const },
}

// 인당(印堂, 미간) - 현재 운세의 핵심 지표
export const INDANG_READINGS = [
  { sign: '빛이 맑고 환함', fortune: '좋은 기운이 흐르는 시기', valence: 'good' as const },
  { sign: '황금빛 기운', fortune: '재물운 상승, 성취 가능성', valence: 'good' as const },
  { sign: '어둡거나 탁함', fortune: '주의가 필요한 시기, 신중하게 행동', valence: 'caution' as const },
  { sign: '붉은 기운', fortune: '구설수 또는 갑작스러운 변화 가능성', valence: 'caution' as const },
  { sign: '청흑색 기운', fortune: '건강·재물 모두 신경 쓸 시기', valence: 'warning' as const },
]

// ===================== 유년운(流年運) - 나이별 관상 부위 매핑 =====================

export interface AgeFortuneZone {
  ageRange: string
  zone: string
  zoneHanja: string
  meaning: string
  aiPromptKey: string // AI 프롬프트에서 추출할 키
}

export const AGE_FORTUNE_ZONES: AgeFortuneZone[] = [
  { ageRange: '1-14', zone: '귀', zoneHanja: '耳', meaning: '초년 조력자, 부모 덕', aiPromptKey: 'EARS' },
  { ageRange: '15-30', zone: '이마', zoneHanja: '額', meaning: '초년운, 학업, 부모 덕', aiPromptKey: 'UPPER_STOP' },
  { ageRange: '31-40', zone: '눈썹·눈', zoneHanja: '眉目', meaning: '청년 사회운, 형제 덕', aiPromptKey: 'EYES' },
  { ageRange: '41-50', zone: '코', zoneHanja: '鼻', meaning: '중년 재물운, 사업운', aiPromptKey: 'NOSE' },
  { ageRange: '51-60', zone: '입·법령', zoneHanja: '口', meaning: '장년 식복, 자녀 덕', aiPromptKey: 'MOUTH' },
  { ageRange: '61+', zone: '턱·하정', zoneHanja: '頤', meaning: '말년운, 부하 덕, 부동산', aiPromptKey: 'LOWER_STOP' },
]

// ===================== 일간별 이상적 관상 매핑 (사주 연계) =====================

export const DAYGAN_FACE_SYNERGY: Record<string, { ideal: string; strength: string; caution: string }> = {
  甲: {
    ideal: '이마가 넓고 눈썹이 진하며 눈빛이 맑은 상',
    strength: '리더십과 사업 추진력을 더욱 강화시켜줍니다',
    caution: '코끝이 너무 뾰족하면 재물이 모이지 않을 수 있습니다',
  },
  乙: {
    ideal: '눈이 크고 부드러우며 입술이 도톰한 상',
    strength: '친화력과 예술적 감성이 배가됩니다',
    caution: '이마가 좁으면 초년 굴곡이 올 수 있습니다',
  },
  丙: {
    ideal: '이마가 환하고 눈빛에 광채가 있는 상',
    strength: '화려함과 대중적 인기가 더해집니다',
    caution: '눈꼬리가 처지면 명예에 흠이 생길 수 있습니다',
  },
  丁: {
    ideal: '눈에 지혜로운 빛이 있고 입술이 붉은 상',
    strength: '예리한 통찰력이 관상으로도 드러납니다',
    caution: '피부 광택이 어두우면 기(氣)가 새는 것을 주의하세요',
  },
  戊: {
    ideal: '뺨이 넉넉하고 코가 우뚝한 상',
    strength: '신뢰감과 중후한 카리스마가 배가됩니다',
    caution: '입이 너무 작으면 식복과 재복이 줄 수 있습니다',
  },
  己: {
    ideal: '안색이 황금빛이고 이목구비가 균형 잡힌 상',
    strength: '현실 감각과 포용력이 얼굴에서도 나타납니다',
    caution: '인당이 좁으면 판단력이 흐려질 수 있습니다',
  },
  庚: {
    ideal: '코와 턱선이 단단하고 눈썹이 짙은 상',
    strength: '결단력과 카리스마가 강화됩니다',
    caution: '눈빛이 너무 강하면 주변과 마찰이 생길 수 있습니다',
  },
  辛: {
    ideal: '피부가 맑고 이목구비가 정교한 상',
    strength: '섬세한 미적 감각과 전문성이 드러납니다',
    caution: '인상이 너무 날카로우면 고독해질 수 있습니다',
  },
  壬: {
    ideal: '이마와 눈이 크고 수려하며 귀가 두꺼운 상',
    strength: '지혜와 포용력이 강화됩니다',
    caution: '턱이 약하면 말년 기반이 흔들릴 수 있습니다',
  },
  癸: {
    ideal: '눈빛이 깊고 촉촉하며 피부에 윤기가 있는 상',
    strength: '직관력과 영적 감수성이 배가됩니다',
    caution: '안색이 어두우면 건강과 재물 모두 주의가 필요합니다',
  },
}

// ===================== 성격 유형 분류 (관상 기반) =====================

export interface FacePersonalityType {
  type: string
  hanja: string
  traits: string[]
  strengths: string[]
  cautions: string[]
  famousExample: string
}

export const FACE_PERSONALITY_TYPES: FacePersonalityType[] = [
  {
    type: '목형(木型)',
    hanja: '木',
    traits: ['이마가 넓고 턱이 좁음', '눈이 가늘고 긺', '피부가 푸른 기운'],
    strengths: ['인자함', '인내력', '창의성', '사람에 대한 신의'],
    cautions: ['우유부단', '분노 조절'],
    famousExample: '학자, 교육자, 사회사업가 형',
  },
  {
    type: '화형(火型)',
    hanja: '火',
    traits: ['이마가 넓고 턱이 뾰족함', '눈빛이 빛남', '안색이 붉은 편'],
    strengths: ['화술', '추진력', '열정', '카리스마'],
    cautions: ['경솔함', '지속성 부족'],
    famousExample: '연예인, 강사, 영업 형',
  },
  {
    type: '토형(土型)',
    hanja: '土',
    traits: ['얼굴이 넓고 뺨이 넉넉함', '코가 우뚝함', '안색이 황금빛'],
    strengths: ['신뢰감', '포용력', '현실감각', '인내'],
    cautions: ['보수적', '변화 거부'],
    famousExample: 'CEO, 관료, 자산가 형',
  },
  {
    type: '금형(金型)',
    hanja: '金',
    traits: ['이목구비가 뚜렷하고 각짐', '눈빛이 날카로움', '피부가 흰 편'],
    strengths: ['결단력', '정의감', '전문성', '리더십'],
    cautions: ['완고함', '독선'],
    famousExample: '군인, 법관, 전문직 형',
  },
  {
    type: '수형(水型)',
    hanja: '水',
    traits: ['얼굴이 둥글고 부드러움', '눈이 크고 촉촉함', '귀가 두꺼움'],
    strengths: ['지혜', '사교성', '적응력', '직관력'],
    cautions: ['우유부단', '집중력 부족'],
    famousExample: '상인, 외교관, 컨설턴트 형',
  },
]

// ===================== 개선 포인트 우선순위 알고리즘 =====================

export interface ImprovementPoint {
  priority: number // 1 = 최우선
  zone: string
  issue: string
  modernFix: string
  impact: '재물운' | '건강운' | '애정운' | '직업운' | '인기운' | '장수운'
}

export function calculateImprovementPriority(faceScores: Record<string, number>, goal: string): ImprovementPoint[] {
  const ZONE_IMPACT: Record<string, { impact: ImprovementPoint['impact']; goalWeight: Record<string, number> }> = {
    nose: { impact: '재물운', goalWeight: { wealth: 3, love: 1, authority: 2, general: 2 } },
    eyes: { impact: '직업운', goalWeight: { wealth: 2, love: 2, authority: 3, general: 2 } },
    mouth: { impact: '애정운', goalWeight: { wealth: 1, love: 3, authority: 1, general: 2 } },
    eyebrows: { impact: '인기운', goalWeight: { wealth: 2, love: 2, authority: 3, general: 2 } },
    ears: { impact: '장수운', goalWeight: { wealth: 1, love: 1, authority: 1, general: 3 } },
    upperStop: { impact: '직업운', goalWeight: { wealth: 2, love: 1, authority: 3, general: 2 } },
    lowerStop: { impact: '장수운', goalWeight: { wealth: 2, love: 2, authority: 1, general: 2 } },
  }

  const IMPROVEMENT_SUGGESTIONS: Record<string, { issue: string; fix: string }> = {
    nose: { issue: '재물 기운이 새어나가고 있음', fix: '코 주변 피부 관리, 코끝을 약간 올려주는 하이라이터 활용' },
    eyes: { issue: '눈빛의 생기가 약함', fix: '충분한 수면, 아이라인으로 눈빛 강조, 안구 마사지' },
    mouth: { issue: '식복·언변 기운이 약함', fix: '립밤으로 입술 윤기 유지, 미소 연습, 치아 관리' },
    eyebrows: { issue: '사회운·형제운이 불안정함', fix: '눈썹 정돈 및 숱 채우기, 균형 잡힌 눈썹 메이크업' },
    ears: { issue: '초년 기반 및 장수 기운이 약함', fix: '귀 마사지, 귀걸이로 시선 집중, 귀 주변 청결 유지' },
    upperStop: { issue: '초년운·사회운 기반이 약함', fix: '이마 스킨케어, 앞머리를 올려 이마 노출 확대' },
    lowerStop: { issue: '말년운·부동산운이 불안정함', fix: '턱 라인 관리, 자세 교정으로 턱 선명하게' },
  }

  const points: ImprovementPoint[] = []
  let priority = 1

  const sorted = Object.entries(faceScores)
    .filter(([key]) => ZONE_IMPACT[key])
    .sort(([keyA, scoreA], [keyB, scoreB]) => {
      const weightA = (ZONE_IMPACT[keyA]?.goalWeight[goal] ?? 1) * (10 - scoreA)
      const weightB = (ZONE_IMPACT[keyB]?.goalWeight[goal] ?? 1) * (10 - scoreB)
      return weightB - weightA
    })

  for (const [zone, score] of sorted.slice(0, 3)) {
    const zoneInfo = ZONE_IMPACT[zone]
    const suggestion = IMPROVEMENT_SUGGESTIONS[zone]
    if (zoneInfo && suggestion && score < 8) {
      points.push({
        priority: priority++,
        zone,
        issue: suggestion.issue,
        modernFix: suggestion.fix,
        impact: zoneInfo.impact,
      })
    }
  }

  return points
}

// ===================== 관상-사주 교차 분석 텍스트 빌더 =====================

export function buildFaceSajuSynergyText(dayGan: string, faceScore: number, goal: string): string {
  const synergy = DAYGAN_FACE_SYNERGY[dayGan]
  if (!synergy) return ''

  const goalLabel =
    goal === 'wealth' ? '재물운' : goal === 'love' ? '도화운' : goal === 'authority' ? '권위운' : '전반 운세'

  return `일간 ${dayGan}의 사주를 가진 분에게는 "${synergy.ideal}"이 ${goalLabel}을 극대화합니다. ${synergy.strength} 단, ${synergy.caution}`
}
