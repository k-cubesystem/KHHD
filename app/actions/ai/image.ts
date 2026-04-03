'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { addBokPoints } from '@/app/actions/payment/bok-points'
import { getPromptByKey } from '@/app/admin/prompts/actions'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { MODEL_PRO } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

// Face Destiny Goals
export type FaceDestinyGoal = 'wealth' | 'love' | 'authority' | 'general'

const GOAL_PROMPTS: Record<FaceDestinyGoal, { name: string; desc: string; traits: string }> = {
  wealth: {
    name: 'CEO의 상 (재물운)',
    desc: '코와 이마를 강조한 중후하고 풍요로운 인상',
    traits: '둥글고 도톰한 코끝, 넓고 맑은 이마, 안정적이고 신뢰감 있는 눈빛, 풍성한 귀',
  },
  love: {
    name: '아이돌의 상 (도화운)',
    desc: '밝고 화사하며 매력적인 인상',
    traits: '살짝 올라간 눈꼬리, 윤기 있는 피부, 도톰하고 부드러운 입술, 미소를 머금은 표정',
  },
  authority: {
    name: '장군의 상 (권위운)',
    desc: '강인하고 카리스마 있는 인상',
    traits: '선명한 눈썹, 날카롭고 깊은 눈빛, 각진 턱선, 당당한 표정',
  },
  general: {
    name: '종합 관상',
    desc: '전반적인 운명과 성향',
    traits: '조화로운 이목구비, 맑은 안색, 편안한 인상, 균형 잡힌 비율',
  },
}

// Interior Feng Shui Themes
export type InteriorTheme = 'wealth' | 'romance' | 'health' | 'general'

const INTERIOR_THEMES: Record<InteriorTheme, { name: string; colors: string; elements: string }> = {
  wealth: {
    name: '재물 가득',
    colors: '골드, 옐로우, 웜 브라운',
    elements: '금전수 화분, 황금색 소품, 풍성한 과일 그림, 원형 거울',
  },
  romance: {
    name: '사랑 가득',
    colors: '핑크, 피치, 화이트, 소프트 레드',
    elements: '쌍으로 된 소품, 꽃 화병, 부드러운 조명, 하트 모양 장식',
  },
  health: {
    name: '건강/집중',
    colors: '그린, 우드톤, 스카이블루',
    elements: '녹색 식물, 나무 가구, 차분한 조명, 물 관련 소품',
  },
  general: {
    name: '종합 풍수',
    colors: '웜 화이트, 베이지, 우드톤',
    elements: '관엽식물, 밝은 조명, 정리된 수납, 자연 소재 소품',
  },
}

export interface FacePartAnalysis {
  description: string
  fortuneArea: string // 관장하는 운세 영역
  advice: string // 개운 조언
  assessment: '좋음' | '보통' | '주의'
}

export interface FaceImprovementTip {
  tip: string
  basis: string
}

interface FaceFeatureDetail {
  description: string
  assessment: '좋음' | '보통' | '주의'
  score?: number
}

export interface FaceAnalysisResult {
  success: boolean
  score?: number
  confidence?: number
  currentAnalysis?: string
  improvementPrompt?: string
  recommendations?: string[]
  facialFeatures?: {
    // 오관(五官) 분석
    ears?: FaceFeatureDetail
    eyebrows?: FaceFeatureDetail
    eyes?: FaceFeatureDetail
    nose?: FaceFeatureDetail
    mouth?: FaceFeatureDetail
    // 삼정(三停) 분석
    upperStop?: FaceFeatureDetail
    middleStop?: FaceFeatureDetail
    lowerStop?: FaceFeatureDetail
    [key: string]: FaceFeatureDetail | undefined
  }
  // === 고도화: 부위별 상세 분석 ===
  partAnalysis?: {
    forehead?: FacePartAnalysis // 이마(천정): 초년운, 지능, 부모복
    eyes?: FacePartAnalysis // 눈(감찰관): 관찰력, 인간관계, 이성운
    nose?: FacePartAnalysis // 코(재백궁): 재물운, 건강, 자존심
    mouth?: FacePartAnalysis // 입(출납관): 식복, 표현력, 노년운
    ears?: FacePartAnalysis // 귀(채청관): 명예, 건강, 장수
    chin?: FacePartAnalysis // 턱(지각): 만년운, 부동산운, 의지력
  }
  personalityType?: string // 목형/화형/토형/금형/수형
  gisaekReading?: string // 기색(氣色) 분석 텍스트
  ageFortuneMap?: {
    youth: string // 15-30세 이마
    middle: string // 31-50세 눈·코
    senior: string // 51세 이후 입·턱
  }
  sajuSynergy?: string
  improvementPriority?: Array<{
    priority: number
    zone: string
    issue: string
    modernFix: string
    impact: string
  }>
  firstImpression?: string // 첫인상 한줄 요약
  improvementTips?: FaceImprovementTip[] // 관상 개운법
  error?: string
}

export interface PalmAgeTimeline {
  age: string
  description: string
  advice: string
}

interface PalmLineDetail {
  description: string
  meaning: string
  assessment: '좋음' | '보통' | '주의'
  score?: number
}

export interface PalmAnalysisResult {
  success: boolean
  score?: number
  confidence?: number
  currentAnalysis?: string
  palmLines?: {
    lifeLine?: PalmLineDetail
    intelligenceLine?: PalmLineDetail
    emotionLine?: PalmLineDetail
    fateLine?: PalmLineDetail
    sunLine?: PalmLineDetail
    marriageLine?: PalmLineDetail
    [key: string]: PalmLineDetail | undefined
  }
  fortuneScores?: Record<string, number>
  fortuneOverview?: {
    wealth: string
    health: string
    love: string
    career: string
  }
  recommendations?: string[]
  // === 신규: 고도화 분석 ===
  handShape?: {
    // 손 형태 분석
    type: string
    personality: string
    strengths: string[]
    bestCareers: string[]
  }
  thumbAnalysis?: {
    // 엄지 분석
    willpowerLevel: string
    logicLevel: string
    description: string
    advice: string
  }
  timingPredictions?: {
    // 시기 예측
    next1Year: string
    next3Years: string
    next10Years: string
  }
  dualHandCompare?: {
    // 양손 비교
    leftHand: string
    rightHand: string
    comparison: string
  }
  ageTimeline?: PalmAgeTimeline[] // 나이별 타임라인
  sajuSynergy?: string // 사주 연계 분석
  error?: string
}

export interface DirectionAnalysis {
  direction: string // 동/서/남/북/동북/동남/서북/서남
  element: string // 오행 (木/火/土/金/水)
  fortune: 'good' | 'bad' | 'neutral'
  fortuneLabel: string // 길/흉/보통
  recommendation: string // 추천 물건/색상
  avoidance: string // 피해야 할 것
}

export interface RoomRecommendation {
  room: string // 거실/침실/주방/현관
  chiFlow: string // 기(氣) 흐름 상태
  mainIssue: string // 주요 문제점
  improvements: string[] // 개선 방법
  luckyItems: string[] // 행운 아이템
  luckyColor: string // 행운 색상
}

export interface PlacementSuggestion {
  item: string // 가구/화분/수석 등
  position: string // 배치 위치
  reason: string // 이유
  expectedEffect: string // 기대 효과
}

export interface SpaceScore {
  current: number
  potential: number
  description: string
}

export interface InteriorAnalysisResult {
  success: boolean
  currentAnalysis?: string
  problems?: string[]
  improvementPrompt?: string
  shoppingList?: string[]
  // === 고도화: 8방위 + 공간별 + 배치 분석 ===
  directionalAnalysis?: DirectionAnalysis[] // 8방위 길흉
  roomRecommendations?: RoomRecommendation[] // 공간별 추천
  placementSuggestions?: PlacementSuggestion[] // 배치 제안
  dominantElement?: string // 지배 오행
  luckyDirection?: string // 가장 길한 방위
  spaceScore?: SpaceScore // 공간 점수 (현재/잠재력)
  quickFixes?: string[] // 즉시 실행 가능한 개선안 3가지
  error?: string
}

// 1. Face Destiny Hacking - 관상 분석 및 개선 프롬프트 생성
export async function analyzeFaceForDestiny(
  imageBase64: string,
  goal: FaceDestinyGoal,
  sajuContext?: { dayGan?: string; currentAge?: number }
): Promise<FaceAnalysisResult> {
  if (isEdgeEnabled('ai-image')) {
    return invokeEdgeSafe('ai-image', { action: 'analyzeFace', imageBase64, goal, sajuContext })
  }
  const model = genAI.getGenerativeModel({ model: MODEL_PRO })
  const goalConfig = GOAL_PROMPTS[goal]

  // Load prompt from DB, fallback to hardcoded
  const dbPromptTemplate = await getPromptByKey('face_reading')
  const analysisPrompt = dbPromptTemplate
    ? dbPromptTemplate
        .replace(/\{\{goal_name\}\}/g, goalConfig.name)
        .replace(/\{\{goal_desc\}\}/g, goalConfig.desc)
        .replace(/\{\{goal_traits\}\}/g, goalConfig.traits)
    : `당신은 30년 경력의 관상학 전문 상담가입니다.
동양 전통 관상학을 깊이 연구했으며, 실용적이고 균형 잡힌 분석을 제공합니다.

아래 얼굴 이미지를 분석하여 "${goalConfig.name}"에 대한 평가를 제공하세요.
전문 용어 사용 시 괄호 안에 쉬운 설명을 추가하세요.
강점과 약점을 균형 있게 분석하세요.

[0단계: 첫인상 한줄 요약]
이 얼굴을 처음 마주한 사람이 받을 인상을 한 문장으로 작성하세요.
예: "처음 만나는 사람에게 신뢰감을 주는 인상입니다. 속마음을 잘 드러내지 않는 타입이시죠."
반드시 긍정적 인상 + 성격 특성 힌트를 조합하세요.

[1단계: 부위별(部位別) 심층 분석 - 6대 핵심 부위]
각 부위를 "좋음/보통/주의"로 평가하고, 관장하는 운세 영역과 개운 조언을 제시하세요.

1. **이마(천정, 天庭)** - 초년운(15~30세), 지능, 부모복
   - 넓이, 높이, 광택 등 특징 서술
   - 강점과 주의점 모두 진단
   - 실행 가능한 개운법 제시

2. **눈(감찰관, 監察官)** - 관찰력, 인간관계, 이성운
   - 형태, 눈빛 등 특징 서술
   - 강점과 주의점 모두 진단
   - 실행 가능한 개운법 제시

3. **코(재백궁, 財帛宮)** - 재물운, 건강, 중년운(40~50세)
   - 콧대, 코끝, 콧방울 등 특징 서술
   - 강점과 주의점 모두 진단
   - 실행 가능한 개운법 제시

4. **입(출납관, 出納官)** - 식복, 표현력, 노년운
   - 입술, 입 크기 등 특징 서술
   - 강점과 주의점 모두 진단
   - 실행 가능한 개운법 제시

5. **귀(채청관, 採聽官)** - 명예, 건강, 장수
   - 크기, 두께, 귓불 등 특징 서술
   - 강점과 주의점 모두 진단
   - 실행 가능한 개운법 제시

6. **턱(지각, 地閣)** - 만년운, 부동산운, 의지력
   - 넓이, 형태 등 특징 서술
   - 강점과 주의점 모두 진단
   - 실행 가능한 개운법 제시

[2단계: 오관(五官) 분석]
전통 관상학의 오관을 각각 "좋음/보통/주의"로 평가하세요:
1. **귀(耳)** - 지혜와 장수
2. **눈썹(眉)** - 형제운과 사회성
3. **눈(目)** - 정신과 지혜
4. **코(鼻)** - 재물운과 권력운
5. **입(口)** - 식복과 언변

[3단계: 삼정(三停) 분석]
1. **상정(上停)** - 이마 (초년운 0-30세)
2. **중정(中停)** - 눈·코 (중년운 30-60세)
3. **하정(下停)** - 입·턱 (말년운 60세 이후)

[4단계: 피부 기색(氣色) 분석]
- 현재 피부 광택, 혈색, 기운 상태 평가

[5단계: 교차 분석 (해화당 특화)]
사주 데이터가 함께 제공될 경우, 관상과 사주를 교차 검증하세요:
- "사주에서 재물운이 강한데, 관상에서도 코가 풍만하여 이를 확인합니다"
- "사주의 도화살과 관상의 눈매가 일치하여 이성에게 매력적입니다"
여러 근거가 일치하면 반드시 언급하세요 -- 신뢰를 높입니다.
사주 데이터가 없으면 이 단계는 생략하세요.

[6단계: ${goalConfig.name} 종합 평가]
- 강화할 핵심 특징: ${goalConfig.traits}

[7단계: 관상 개운법 (실행 가능한 팁)]
비수술적, 일상에서 즉시 적용 가능한 개운법을 3~5가지 제시하세요.
각 팁에 관상학적 근거를 포함하세요.
예:
- "안경 착용이 관운(官運)을 높입니다" (근거: 눈 주변 기운 보강)
- "입술 보습을 유지하세요" (근거: 출납관 기운 강화)
- "이마를 드러내는 헤어스타일" (근거: 천정 기운 활성화)

[8단계: 구체적 개선 방법]
- 메이크업 기법 3가지
- 헤어스타일 조언
- 표정 및 자세 관리

[CRITICAL: 출력 형식 - 아래 모든 태그를 정확히 포함하세요]
[[FIRST_IMPRESSION: 첫인상 한줄 요약 텍스트]]
[[EARS: 좋음/보통/주의, 설명]]
[[EYEBROWS: 좋음/보통/주의, 설명]]
[[EYES: 좋음/보통/주의, 설명]]
[[NOSE: 좋음/보통/주의, 설명]]
[[MOUTH: 좋음/보통/주의, 설명]]
[[UPPER_STOP: 좋음/보통/주의, 설명]]
[[MIDDLE_STOP: 좋음/보통/주의, 설명]]
[[LOWER_STOP: 좋음/보통/주의, 설명]]
[[PART_FOREHEAD: 좋음/보통/주의, 설명, 운세영역, 개운조언]]
[[PART_EYES: 좋음/보통/주의, 설명, 운세영역, 개운조언]]
[[PART_NOSE: 좋음/보통/주의, 설명, 운세영역, 개운조언]]
[[PART_MOUTH: 좋음/보통/주의, 설명, 운세영역, 개운조언]]
[[PART_EARS: 좋음/보통/주의, 설명, 운세영역, 개운조언]]
[[PART_CHIN: 좋음/보통/주의, 설명, 운세영역, 개운조언]]
[[IMPROVEMENT_TIP_1: 팁내용, 근거]]
[[IMPROVEMENT_TIP_2: 팁내용, 근거]]
[[IMPROVEMENT_TIP_3: 팁내용, 근거]]

목표: ${goalConfig.desc}
강화할 특징: ${goalConfig.traits}

※ 강점과 약점을 균형 있게 서술하세요.
※ 의학적/성형 관련 조언은 절대 하지 마세요.
※ 전문 용어 사용 시 괄호 안에 쉬운 설명을 추가하세요.`

  try {
    const result = await withGeminiRateLimit(
      () => model.generateContent([analysisPrompt, { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }]),
      { model: MODEL_PRO, actionType: 'face_destiny' }
    )

    const analysisText = result.response.text()

    // Extract 오관(五官) analysis with assessment
    const parseFeature = (tag: string) => {
      const regex = new RegExp(`\\[\\[${tag}:\\s*(좋음|보통|주의),\\s*(.+?)\\]\\]`)
      const match = analysisText.match(regex)
      if (match?.[1] && match?.[2]) {
        return { description: match[2].trim(), assessment: match[1] as '좋음' | '보통' | '주의' }
      }
      return { description: '분석 중', assessment: '보통' as const }
    }

    const facialFeatures = {
      ears: parseFeature('EARS'),
      eyebrows: parseFeature('EYEBROWS'),
      eyes: parseFeature('EYES'),
      nose: parseFeature('NOSE'),
      mouth: parseFeature('MOUTH'),
      upperStop: parseFeature('UPPER_STOP'),
      middleStop: parseFeature('MIDDLE_STOP'),
      lowerStop: parseFeature('LOWER_STOP'),
    }

    // Generate image modification prompt for DALL-E style generation
    const improvementPrompt = `Portrait photo of the same person with enhanced features for ${goalConfig.name}: ${goalConfig.traits}.
Professional portrait lighting, high quality, same person identity preserved, subtle natural enhancements only.
Style: Professional headshot, warm lighting, confident expression.`

    // Extract recommendations from analysis
    const recommendations = [
      `${goalConfig.traits.split(',')[0]} 강조하기`,
      '밝고 자신감 있는 표정 연습',
      `${goal === 'wealth' ? '안정감 있는' : goal === 'love' ? '화사한' : goal === 'authority' ? '강인한' : '자연스럽고 호감 가는'} 이미지 메이크업`,
    ]

    // === 부위별 상세 분석 파싱 ===
    const parsePartFeature = (tag: string): FacePartAnalysis | undefined => {
      // [[PART_XXX: 좋음/보통/주의, description, fortuneArea, advice]]
      const regex = new RegExp(`\\[\\[${tag}:\\s*(좋음|보통|주의),\\s*([^,\\]]+),\\s*([^,\\]]+),\\s*([^\\]]+)\\]\\]`)
      const match = analysisText.match(regex)
      if (match?.[1] && match?.[2] && match?.[3] && match?.[4]) {
        return {
          description: match[2].trim(),
          fortuneArea: match[3].trim(),
          advice: match[4].trim(),
          assessment: match[1] as '좋음' | '보통' | '주의',
        }
      }
      // Fallback: try simpler format
      const simpleRegex = new RegExp(`\\[\\[${tag}:\\s*(좋음|보통|주의),\\s*(.+?)\\]\\]`)
      const simpleMatch = analysisText.match(simpleRegex)
      if (simpleMatch?.[1] && simpleMatch?.[2]) {
        return {
          description: simpleMatch[2].trim(),
          fortuneArea: '',
          advice: '',
          assessment: simpleMatch[1] as '좋음' | '보통' | '주의',
        }
      }
      return undefined
    }

    const partAnalysis = {
      forehead: parsePartFeature('PART_FOREHEAD'),
      eyes: parsePartFeature('PART_EYES'),
      nose: parsePartFeature('PART_NOSE'),
      mouth: parsePartFeature('PART_MOUTH'),
      ears: parsePartFeature('PART_EARS'),
      chin: parsePartFeature('PART_CHIN'),
    }

    // === 알고리즘 엔진 연동 ===
    const { calculateImprovementPriority, buildFaceSajuSynergyText, AGE_FORTUNE_ZONES } =
      await import('@/lib/physiognomy-engine/face-algorithm')

    const ageFortuneMap = {
      youth: `초년운(15~30세) - 이마: ${AGE_FORTUNE_ZONES[1].meaning}. ${partAnalysis.forehead?.description ?? facialFeatures.upperStop?.description ?? ''}`,
      middle: `중년운(31~50세) - 눈·코: ${AGE_FORTUNE_ZONES[2].meaning}. ${partAnalysis.eyes?.description ?? facialFeatures.eyes?.description ?? ''}`,
      senior: `장년운(51세~) - 입·턱: ${AGE_FORTUNE_ZONES[4].meaning}. ${partAnalysis.chin?.description ?? facialFeatures.mouth?.description ?? ''}`,
    }

    // assessment를 점수로 변환하여 알고리즘 엔진에 전달
    const assessmentToScore = (a: '좋음' | '보통' | '주의'): number => (a === '좋음' ? 8 : a === '보통' ? 6 : 4)
    const faceScoreMap: Record<string, number> = {
      nose: assessmentToScore(facialFeatures.nose?.assessment ?? '보통'),
      eyes: assessmentToScore(facialFeatures.eyes?.assessment ?? '보통'),
      mouth: assessmentToScore(facialFeatures.mouth?.assessment ?? '보통'),
      eyebrows: assessmentToScore(facialFeatures.eyebrows?.assessment ?? '보통'),
      ears: assessmentToScore(facialFeatures.ears?.assessment ?? '보통'),
      upperStop: assessmentToScore(facialFeatures.upperStop?.assessment ?? '보통'),
      lowerStop: assessmentToScore(facialFeatures.lowerStop?.assessment ?? '보통'),
    }
    const improvementPriority = calculateImprovementPriority(faceScoreMap, goal)

    // 종합 점수 추정 (알고리즘 엔진 호환용)
    const estimatedScore = Math.round(
      (Object.values(faceScoreMap).reduce((a, b) => a + b, 0) / Object.values(faceScoreMap).length) * 10
    )
    const sajuSynergy = sajuContext?.dayGan
      ? buildFaceSajuSynergyText(sajuContext.dayGan, estimatedScore, goal)
      : undefined

    const gisaekMatch = analysisText.match(/기색|안색|혈색|광택|윤기/)
    const gisaekReading = gisaekMatch
      ? analysisText
          .split('\n')
          .find((line) => /기색|안색|혈색|광택/.test(line))
          ?.trim()
      : undefined

    // === 첫인상 한줄 파싱 ===
    const firstImpressionMatch = analysisText.match(/\[\[FIRST_IMPRESSION:\s*([^\]]+)\]\]/)
    const firstImpression = firstImpressionMatch?.[1]?.trim() || undefined

    // === 관상 개운법 파싱 ===
    const parseImprovementTip = (tag: string): FaceImprovementTip | null => {
      const regex = new RegExp(`\\[\\[${tag}:\\s*([^,\\]]+),\\s*([^\\]]+)\\]\\]`)
      const match = analysisText.match(regex)
      if (match?.[1] && match?.[2]) {
        return { tip: match[1].trim(), basis: match[2].trim() }
      }
      return null
    }

    const improvementTips: FaceImprovementTip[] = ['IMPROVEMENT_TIP_1', 'IMPROVEMENT_TIP_2', 'IMPROVEMENT_TIP_3']
      .map((tag) => parseImprovementTip(tag))
      .filter((t): t is FaceImprovementTip => t !== null)

    await addBokPoints(25, 'ANALYSIS', undefined, '이미지 관상 분석').catch(() => {})
    return {
      success: true,
      currentAnalysis: analysisText,
      facialFeatures,
      partAnalysis,
      improvementPrompt,
      recommendations,
      ageFortuneMap,
      improvementPriority,
      sajuSynergy,
      gisaekReading,
      firstImpression,
      improvementTips: improvementTips.length > 0 ? improvementTips : undefined,
    }
  } catch (error: unknown) {
    logger.error('Face Destiny Analysis Error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

// 2. Interior Feng Shui Analysis - 풍수 인테리어 분석 및 개선 프롬프트 생성
export async function analyzeInteriorForFengshui(
  imageBase64: string,
  theme: InteriorTheme,
  roomType: string = '거실'
): Promise<InteriorAnalysisResult> {
  if (isEdgeEnabled('ai-image')) {
    return invokeEdgeSafe('ai-image', { action: 'analyzeFengshui', imageBase64, theme, roomType })
  }
  const model = genAI.getGenerativeModel({ model: MODEL_PRO })
  const themeConfig = INTERIOR_THEMES[theme]

  const dbPromptTemplate = await getPromptByKey('fengshui_analysis')
  const analysisPrompt = dbPromptTemplate
    ? dbPromptTemplate
        .replace(/\{\{room_type\}\}/g, roomType)
        .replace(/\{\{theme_name\}\}/g, themeConfig.name)
        .replace(/\{\{theme_colors\}\}/g, themeConfig.colors)
        .replace(/\{\{theme_elements\}\}/g, themeConfig.elements)
        .replace(/\{\{theme\}\}/g, theme)
    : `당신은 전통 풍수지리 인테리어 전문 상담가입니다.
음양오행(陰陽五行, 다섯 가지 자연 원소)과 팔괘(八卦, 여덟 방위)를 바탕으로 공간을 분석합니다.
전문 용어 사용 시 괄호 안에 쉬운 설명을 추가하세요. 실용적이고 실행 가능한 조언을 제공하세요.

이 ${roomType} 사진을 분석하고, "${themeConfig.name}" 테마로 개선하기 위한 풍수 분석을 제공하세요.

[1단계: 공간 기운 진단 + 점수]
- 현재 기(氣, 공간의 에너지) 흐름 상태
- 지배 오행 판단 (木/火/土/金/水)
- 현재 공간 점수(0~100)와 개선 후 잠재 점수를 산출하세요
- 점수 산출 기준: 기 흐름 원활도(30%), 오행 균형(25%), 방위 활용도(25%), 정리/정돈 상태(20%)
- 한줄 요약: 이 공간이 어떤 기운이 부족/과잉인지 설명

[2단계: 즉시 실행 가능한 개선안 3가지 (최우선)]
반드시 오늘 당장 실행할 수 있는 개선안 3가지를 제시하세요:
- 각 개선안에 구체적 위치 + 풍수적 이유를 포함
- 비용이 적게 드는 것부터 제시 (무료 → 1만원 이내 → 5만원 이내)
- 예: "현관 왼쪽에 조명을 추가하세요 (입구의 양기 보강, 재물 유입 촉진)"
- 예: "침실 머리 방향을 동쪽으로 바꾸세요 (木 기운으로 건강운 상승)"

[3단계: 8방위(八方位) 길흉 분석]
사진과 공간 구조를 바탕으로 8방위의 기운을 분석하세요.
각 방위별로: 해당 오행, 길흉 판단, 추천 물건/색상, 피해야 할 것을 제시하세요.

- **동(東)**: 木 기운, 성장·발전·건강
- **서(西)**: 金 기운, 재물·결실·수확
- **남(南)**: 火 기운, 명예·인기·문서운
- **북(北)**: 水 기운, 지혜·직업·저장
- **동북(東北)**: 土 기운, 학업·지식·부동산
- **동남(東南)**: 木 기운, 재물·인연·여행
- **서북(西北)**: 金 기운, 귀인·리더십·이동
- **서남(西南)**: 土 기운, 건강·모성·인내

[4단계: 공간별 맞춤 추천]
아래 공간들에 대해 각각 기 흐름 상태, 주요 문제점, 개선 방법(3가지), 행운 아이템(3가지), 행운 색상을 제시하세요:
- 거실 (가족 화합, 재물운의 중심)
- 침실 (건강·수면·애정운)
- 주방 (식복·건강·재물 저장)
- 현관 (기운의 입구, 외부 운 유입)

[5단계: 가구·화분·수석 배치 제안]
구체적인 배치 제안을 5가지 이상 제시하세요:
- 배치할 아이템 (가구/화분/수석/소품)
- 추천 위치 (방위 또는 공간 설명)
- 이유 (풍수적 근거)
- 기대 효과

[6단계: 풍수 문제점 (최대 5개)]
현재 공간의 기운을 방해하는 주요 문제점

[7단계: 기운 전환 아이템 쇼핑 리스트]

[CRITICAL: 출력 형식 - 아래 모든 태그를 정확히 포함하세요]
[[DOMINANT_ELEMENT: 오행명]]
[[LUCKY_DIRECTION: 방위명]]
[[SPACE_SCORE: 현재점수, 잠재점수, 한줄설명]]
[[QUICK_FIX_1: 개선안 설명 (위치 + 이유)]]
[[QUICK_FIX_2: 개선안 설명 (위치 + 이유)]]
[[QUICK_FIX_3: 개선안 설명 (위치 + 이유)]]

[[DIR_EAST: 오행, 길흉(good/bad/neutral), 길흉한글, 추천물건색상, 피할것]]
[[DIR_WEST: 오행, 길흉(good/bad/neutral), 길흉한글, 추천물건색상, 피할것]]
[[DIR_SOUTH: 오행, 길흉(good/bad/neutral), 길흉한글, 추천물건색상, 피할것]]
[[DIR_NORTH: 오행, 길흉(good/bad/neutral), 길흉한글, 추천물건색상, 피할것]]
[[DIR_NORTHEAST: 오행, 길흉(good/bad/neutral), 길흉한글, 추천물건색상, 피할것]]
[[DIR_SOUTHEAST: 오행, 길흉(good/bad/neutral), 길흉한글, 추천물건색상, 피할것]]
[[DIR_NORTHWEST: 오행, 길흉(good/bad/neutral), 길흉한글, 추천물건색상, 피할것]]
[[DIR_SOUTHWEST: 오행, 길흉(good/bad/neutral), 길흉한글, 추천물건색상, 피할것]]

[[ROOM_LIVINGROOM: 기흐름상태|주요문제점|개선방법1/개선방법2/개선방법3|행운아이템1/행운아이템2/행운아이템3|행운색상]]
[[ROOM_BEDROOM: 기흐름상태|주요문제점|개선방법1/개선방법2/개선방법3|행운아이템1/행운아이템2/행운아이템3|행운색상]]
[[ROOM_KITCHEN: 기흐름상태|주요문제점|개선방법1/개선방법2/개선방법3|행운아이템1/행운아이템2/행운아이템3|행운색상]]
[[ROOM_ENTRANCE: 기흐름상태|주요문제점|개선방법1/개선방법2/개선방법3|행운아이템1/행운아이템2/행운아이템3|행운색상]]

[[PLACEMENT_1: 아이템|위치|이유|기대효과]]
[[PLACEMENT_2: 아이템|위치|이유|기대효과]]
[[PLACEMENT_3: 아이템|위치|이유|기대효과]]
[[PLACEMENT_4: 아이템|위치|이유|기대효과]]
[[PLACEMENT_5: 아이템|위치|이유|기대효과]]

[[SHOPPING_LIST]]
- 아이템1
- 아이템2
- 아이템3
- 아이템4
- 아이템5
[[/SHOPPING_LIST]]

추천 색상: ${themeConfig.colors}
추천 소품: ${themeConfig.elements}
실용적이고 구체적인 조언을 제공하세요.`

  try {
    const result = await withGeminiRateLimit(
      () => model.generateContent([analysisPrompt, { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }]),
      { model: MODEL_PRO, actionType: 'fengshui_destiny' }
    )

    const analysisText = result.response.text()

    // Extract shopping list
    const shoppingMatch = analysisText.match(/\[\[SHOPPING_LIST\]\]([\s\S]*?)\[\[\/SHOPPING_LIST\]\]/)
    const shoppingList: string[] = shoppingMatch?.[1]
      ? shoppingMatch[1]
          .split('\n')
          .filter((line) => line.trim().startsWith('-'))
          .map((line) => line.trim().substring(1).trim())
      : [
          `${themeConfig.colors.split(',')[0] ?? '골드'} 계열 쿠션`,
          themeConfig.elements.split(',')[0] ?? '화분',
          '조명 스탠드',
          '벽면 액자',
          '러그 또는 카펫',
        ]

    // Generate interior redesign prompt
    const improvementPrompt = `Redesign this ${roomType} interior with ${themeConfig.name} feng shui theme.
Color palette: ${themeConfig.colors}.
Must include: ${themeConfig.elements}.
Keep the same room structure and perspective. Modern Korean style interior.
Warm, inviting atmosphere with ${theme === 'wealth' ? 'luxurious' : theme === 'romance' ? 'romantic' : theme === 'health' ? 'refreshing' : 'harmonious'} mood.`

    // === 8방위 분석 파싱 ===
    const parseDirection = (tag: string, direction: string, element: string): DirectionAnalysis | null => {
      const regex = new RegExp(
        `\\[\\[${tag}:\\s*([^,\\]]+),\\s*(good|bad|neutral),\\s*([^,\\]]+),\\s*([^,\\]]+),\\s*([^\\]]+)\\]\\]`
      )
      const match = analysisText.match(regex)
      if (match) {
        return {
          direction,
          element: match[1]?.trim() || element,
          fortune: match[2] as 'good' | 'bad' | 'neutral',
          fortuneLabel: match[3]?.trim() || '보통',
          recommendation: match[4]?.trim() || '',
          avoidance: match[5]?.trim() || '',
        }
      }
      return null
    }

    const directionData: Array<{ tag: string; direction: string; element: string }> = [
      { tag: 'DIR_EAST', direction: '동(東)', element: '木' },
      { tag: 'DIR_WEST', direction: '서(西)', element: '金' },
      { tag: 'DIR_SOUTH', direction: '남(南)', element: '火' },
      { tag: 'DIR_NORTH', direction: '북(北)', element: '水' },
      { tag: 'DIR_NORTHEAST', direction: '동북(東北)', element: '土' },
      { tag: 'DIR_SOUTHEAST', direction: '동남(東南)', element: '木' },
      { tag: 'DIR_NORTHWEST', direction: '서북(西北)', element: '金' },
      { tag: 'DIR_SOUTHWEST', direction: '서남(西南)', element: '土' },
    ]

    const directionalAnalysis: DirectionAnalysis[] = directionData
      .map((d) => parseDirection(d.tag, d.direction, d.element))
      .filter((d): d is DirectionAnalysis => d !== null)

    // === 공간별 추천 파싱 ===
    const parseRoom = (tag: string, roomName: string): RoomRecommendation | null => {
      const regex = new RegExp(`\\[\\[${tag}:\\s*([^|\\]]+)\\|([^|\\]]+)\\|([^|\\]]+)\\|([^|\\]]+)\\|([^\\]]+)\\]\\]`)
      const match = analysisText.match(regex)
      if (match) {
        return {
          room: roomName,
          chiFlow: match[1]?.trim() || '',
          mainIssue: match[2]?.trim() || '',
          improvements: (match[3]?.trim() || '')
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean),
          luckyItems: (match[4]?.trim() || '')
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean),
          luckyColor: match[5]?.trim() || '',
        }
      }
      return null
    }

    const roomData: Array<{ tag: string; name: string }> = [
      { tag: 'ROOM_LIVINGROOM', name: '거실' },
      { tag: 'ROOM_BEDROOM', name: '침실' },
      { tag: 'ROOM_KITCHEN', name: '주방' },
      { tag: 'ROOM_ENTRANCE', name: '현관' },
    ]

    const roomRecommendations: RoomRecommendation[] = roomData
      .map((r) => parseRoom(r.tag, r.name))
      .filter((r): r is RoomRecommendation => r !== null)

    // === 배치 제안 파싱 ===
    const parsePlacement = (tag: string): PlacementSuggestion | null => {
      const regex = new RegExp(`\\[\\[${tag}:\\s*([^|\\]]+)\\|([^|\\]]+)\\|([^|\\]]+)\\|([^\\]]+)\\]\\]`)
      const match = analysisText.match(regex)
      if (match) {
        return {
          item: match[1]?.trim() || '',
          position: match[2]?.trim() || '',
          reason: match[3]?.trim() || '',
          expectedEffect: match[4]?.trim() || '',
        }
      }
      return null
    }

    const placementSuggestions: PlacementSuggestion[] = [
      'PLACEMENT_1',
      'PLACEMENT_2',
      'PLACEMENT_3',
      'PLACEMENT_4',
      'PLACEMENT_5',
    ]
      .map((tag) => parsePlacement(tag))
      .filter((p): p is PlacementSuggestion => p !== null)

    // === 기타 파싱 ===
    const dominantElementMatch = analysisText.match(/\[\[DOMINANT_ELEMENT:\s*([^\]]+)\]\]/)
    const dominantElement = dominantElementMatch?.[1]?.trim()

    const luckyDirectionMatch = analysisText.match(/\[\[LUCKY_DIRECTION:\s*([^\]]+)\]\]/)
    const luckyDirection = luckyDirectionMatch?.[1]?.trim()

    // === 공간 점수 파싱 ===
    const spaceScoreMatch = analysisText.match(/\[\[SPACE_SCORE:\s*(\d+),\s*(\d+),\s*([^\]]+)\]\]/)
    const spaceScore: SpaceScore | undefined = spaceScoreMatch
      ? {
          current: parseInt(spaceScoreMatch[1] ?? '0', 10),
          potential: parseInt(spaceScoreMatch[2] ?? '0', 10),
          description: spaceScoreMatch[3]?.trim() || '',
        }
      : undefined

    // === 즉시 실행 가능한 개선안 파싱 ===
    const parseQuickFix = (tag: string): string | null => {
      const regex = new RegExp(`\\[\\[${tag}:\\s*([^\\]]+)\\]\\]`)
      const match = analysisText.match(regex)
      return match?.[1]?.trim() || null
    }

    const quickFixes: string[] = ['QUICK_FIX_1', 'QUICK_FIX_2', 'QUICK_FIX_3']
      .map((tag) => parseQuickFix(tag))
      .filter((f): f is string => f !== null)

    // Extract problems from text if not structured
    const problems = ['가구 배치가 기의 흐름을 막고 있음', '색상 톤이 목표와 맞지 않음', '소품 배치 개선 필요']

    await addBokPoints(25, 'ANALYSIS', undefined, '이미지 풍수 분석').catch(() => {})
    return {
      success: true,
      currentAnalysis: analysisText,
      problems,
      improvementPrompt,
      shoppingList,
      directionalAnalysis,
      roomRecommendations,
      placementSuggestions,
      dominantElement,
      luckyDirection,
      spaceScore,
      quickFixes: quickFixes.length > 0 ? quickFixes : undefined,
    }
  } catch (error: unknown) {
    logger.error('Interior Fengshui Analysis Error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

// 3. Palm Reading Analysis - 손금 분석
export async function analyzePalmReading(
  imageBase64: string,
  sajuContext?: { dayGan?: string; currentAge?: number }
): Promise<PalmAnalysisResult> {
  if (isEdgeEnabled('ai-image')) {
    return invokeEdgeSafe('ai-image', { action: 'analyzePalm', imageBase64, sajuContext })
  }
  const model = genAI.getGenerativeModel({ model: MODEL_PRO })

  const dbPromptTemplate = await getPromptByKey('palm_reading')
  const analysisPrompt =
    dbPromptTemplate ??
    `당신은 30년 경력의 수상학(手相學, 손금학) 전문 상담가입니다.
실용적이고 균형 잡힌 분석을 제공합니다. 전문 용어 사용 시 괄호 안에 쉬운 설명을 추가하세요.

아래 손바닥 이미지를 분석하여 손금 운세를 제공하세요.
강점과 약점을 균형 있게 분석하세요.

[1단계: 삼대 주선(三大主線) 분석]
각 선을 "좋음/보통/주의"로 평가하고, 특징과 의미를 서술하세요:

1. **생명선(生命線)** - 건강과 생명력
   - 시작점, 길이, 굵기, 깊이, 끊김 여부
   - 이 선이 의미하는 것 (건강, 체력, 생활력)

2. **지능선(知能線)** - 사고방식과 재능
   - 시작점, 방향, 길이, 형태
   - 이 선이 의미하는 것 (사고 유형, 학습 능력)

3. **감정선(感情線)** - 애정운과 성격
   - 시작점, 끝점, 깊이, 곡선 형태
   - 이 선이 의미하는 것 (감정 표현, 대인관계)

[2단계: 특수선(特殊線) 분석]
있는 경우만 분석하세요:
1. **운명선(運命線)** - 인생 방향
2. **태양선(太陽線)** - 성공과 명예
3. **결혼선(結婚線)** - 결혼운

[3단계: 팔궁(八宮, 손바닥 8개 구역) 분석]
각 구역의 발달 상태와 의미를 서술하세요.

[4단계: 특수 문양 분석]
별, 십자, 섬 등 특수 문양이 있으면 의미를 해석하세요.

[5단계: 왼손/오른손 비교 분석]
한 장만 촬영된 경우에도, 보이는 손이 왼손인지 오른손인지 판별하여 아래 원칙으로 분석하세요:
- **왼손**: 타고난 운 (선천적 기질, 부모에게 물려받은 잠재력)
- **오른손**: 만들어가는 운 (후천적 노력, 현재 상태, 스스로 개척한 운)
- 한 손만 보이는 경우: 해당 손이 선천/후천 중 어느 쪽인지 명시하고, 반대쪽 손의 가능성도 추론하세요.
- 양손 모두 보이는 경우: 두 손의 차이점을 부각하고, "타고난 운 vs 만들어간 운"의 변화를 설명하세요.

[6단계: 나이별 타임라인]
손금의 주요 선 위에 시간 눈금을 대입하여, 인생을 3~4구간으로 나누어 운세 흐름을 제시하세요.
각 구간에 해당 시기의 핵심 설명과 행동 조언을 포함하세요.
예: "현재~35세: 생명선이 강하여 활발한 시기 — 도전하세요"

[7단계: 종합 운세 텍스트 분석]
다음 4가지 운세를 텍스트로 분석하세요 (점수 없이):
- **재물운**: 수성구, 태양선, 지능선 종합
- **건강운**: 생명선, 금성구 종합
- **애정운**: 감정선, 결혼선, 금성구 종합
- **직업운**: 운명선, 지능선, 목성구 종합

[8단계: 구체적 조언]
- 손금으로 본 적성 직업 3가지
- 대인관계 조언
- 실생활 개선 방법

[CRITICAL: 출력 형식]
반드시 다음 태그들을 모두 포함하세요:
[[LIFE_LINE: 좋음/보통/주의, 설명, 의미]]
[[INTELLIGENCE_LINE: 좋음/보통/주의, 설명, 의미]]
[[EMOTION_LINE: 좋음/보통/주의, 설명, 의미]]
[[FATE_LINE: 좋음/보통/주의, 설명, 의미]]
[[SUN_LINE: 좋음/보통/주의, 설명, 의미]]
[[MARRIAGE_LINE: 좋음/보통/주의, 설명, 의미]]
[[FORTUNE_WEALTH: 텍스트 분석]]
[[FORTUNE_HEALTH: 텍스트 분석]]
[[FORTUNE_LOVE: 텍스트 분석]]
[[FORTUNE_CAREER: 텍스트 분석]]
[[DUAL_HAND: 왼손 설명, 오른손 설명, 비교 시사점]]
[[AGE_TIMELINE_1: 나이구간, 설명, 조언]]
[[AGE_TIMELINE_2: 나이구간, 설명, 조언]]
[[AGE_TIMELINE_3: 나이구간, 설명, 조언]]

※ 강점과 약점을 균형 있게 서술하세요.
※ 의학적 진단이나 절대적 미래 예언은 하지 마세요.
※ 전문 용어 사용 시 괄호 안에 쉬운 설명을 추가하세요.`

  try {
    const result = await withGeminiRateLimit(
      () => model.generateContent([analysisPrompt, { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }]),
      { model: MODEL_PRO, actionType: 'palm_destiny' }
    )

    const analysisText = result.response.text()

    // Extract palm lines with assessment
    const parseLine = (tag: string) => {
      // [[TAG: 좋음/보통/주의, 설명, 의미]]
      const regex = new RegExp(`\\[\\[${tag}:\\s*(좋음|보통|주의),\\s*([^,\\]]+),\\s*([^\\]]+)\\]\\]`)
      const match = analysisText.match(regex)
      if (match?.[1] && match?.[2] && match?.[3]) {
        return {
          description: match[2].trim(),
          meaning: match[3].trim(),
          assessment: match[1] as '좋음' | '보통' | '주의',
        }
      }
      // Fallback: simpler format
      const simpleRegex = new RegExp(`\\[\\[${tag}:\\s*(좋음|보통|주의),\\s*(.+?)\\]\\]`)
      const simpleMatch = analysisText.match(simpleRegex)
      if (simpleMatch?.[1] && simpleMatch?.[2]) {
        return {
          description: simpleMatch[2].trim(),
          meaning: '',
          assessment: simpleMatch[1] as '좋음' | '보통' | '주의',
        }
      }
      return { description: '분석 중', meaning: '', assessment: '보통' as const }
    }

    const palmLines = {
      lifeLine: parseLine('LIFE_LINE'),
      intelligenceLine: parseLine('INTELLIGENCE_LINE'),
      emotionLine: parseLine('EMOTION_LINE'),
      fateLine: parseLine('FATE_LINE'),
      sunLine: parseLine('SUN_LINE'),
      marriageLine: parseLine('MARRIAGE_LINE'),
    }

    // Extract fortune overview (text-based)
    const extractFortuneText = (tag: string): string => {
      const match = analysisText.match(new RegExp(`\\[\\[${tag}:\\s*([^\\]]+)\\]\\]`))
      return match?.[1]?.trim() || '분석 중'
    }

    const fortuneOverview = {
      wealth: extractFortuneText('FORTUNE_WEALTH'),
      health: extractFortuneText('FORTUNE_HEALTH'),
      love: extractFortuneText('FORTUNE_LOVE'),
      career: extractFortuneText('FORTUNE_CAREER'),
    }

    // Extract recommendations
    const recommendations = [
      '손가락 관절 운동으로 순환 개선하기',
      '강점을 살릴 수 있는 직업 분야 탐색',
      '대인관계에서 감정선의 특성 활용하기',
    ]

    // === AI 출력에서 양손 비교 파싱 ===
    const dualHandMatch = analysisText.match(/\[\[DUAL_HAND:\s*([^,\]]+),\s*([^,\]]+),\s*([^\]]+)\]\]/)
    const aiDualHandCompare = dualHandMatch
      ? {
          leftHand: dualHandMatch[1]?.trim() || '',
          rightHand: dualHandMatch[2]?.trim() || '',
          comparison: dualHandMatch[3]?.trim() || '',
        }
      : undefined

    // === AI 출력에서 나이별 타임라인 파싱 ===
    const parseAgeTimeline = (tag: string): PalmAgeTimeline | null => {
      const regex = new RegExp(`\\[\\[${tag}:\\s*([^,\\]]+),\\s*([^,\\]]+),\\s*([^\\]]+)\\]\\]`)
      const match = analysisText.match(regex)
      if (match?.[1] && match?.[2] && match?.[3]) {
        return {
          age: match[1].trim(),
          description: match[2].trim(),
          advice: match[3].trim(),
        }
      }
      return null
    }

    const ageTimeline: PalmAgeTimeline[] = ['AGE_TIMELINE_1', 'AGE_TIMELINE_2', 'AGE_TIMELINE_3']
      .map((tag) => parseAgeTimeline(tag))
      .filter((t): t is PalmAgeTimeline => t !== null)

    // === 알고리즘 엔진 연동 ===
    const { predictTimeline, analyzeDualHands, buildPalmSajuSynergyText, HAND_SHAPES } =
      await import('@/lib/physiognomy-engine/palm-algorithm')

    // assessment를 점수로 변환하여 알고리즘 엔진에 전달
    const palmAssessmentToScore = (a: '좋음' | '보통' | '주의'): number => (a === '좋음' ? 8 : a === '보통' ? 6 : 4)
    const lifeScore = palmAssessmentToScore(palmLines.lifeLine?.assessment ?? '보통')
    const fateScore = palmAssessmentToScore(palmLines.fateLine?.assessment ?? '보통')
    const sunScore = palmAssessmentToScore(palmLines.sunLine?.assessment ?? '보통')
    const timingPredictions = predictTimeline(lifeScore, fateScore, sunScore, sajuContext?.currentAge)

    // 양손 비교: AI 파싱 우선, fallback으로 알고리즘 엔진
    const estimatedPalmScore = Math.round(((lifeScore + fateScore + sunScore) / 3) * 10)
    const dualHandCompare = aiDualHandCompare ?? analyzeDualHands(estimatedPalmScore - 5, estimatedPalmScore)

    // 손 형태 추정 (텍스트에서 키워드 기반)
    const handShapeText = analysisText.toLowerCase()
    const handShapeGuess =
      handShapeText.includes('길') || handShapeText.includes('섬세')
        ? HAND_SHAPES[1] // 원뿔형
        : handShapeText.includes('넓') || handShapeText.includes('두꺼')
          ? HAND_SHAPES[0] // 네모형
          : HAND_SHAPES[4] // 혼합형
    const handShape = {
      type: handShapeGuess.type,
      personality: handShapeGuess.personality,
      strengths: handShapeGuess.strengths,
      bestCareers: handShapeGuess.bestCareers,
    }

    // 사주 연계
    const sajuSynergy = sajuContext?.dayGan
      ? buildPalmSajuSynergyText(sajuContext.dayGan, estimatedPalmScore)
      : undefined

    await addBokPoints(25, 'ANALYSIS', undefined, '이미지 손금 분석').catch(() => {})
    return {
      success: true,
      currentAnalysis: analysisText,
      palmLines,
      fortuneOverview,
      recommendations,
      timingPredictions,
      dualHandCompare,
      handShape,
      sajuSynergy,
      ageTimeline: ageTimeline.length > 0 ? ageTimeline : undefined,
    }
  } catch (error: unknown) {
    logger.error('Palm Reading Analysis Error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return {
      success: false,
      error: errorMessage,
    }
  }
}

// 4. Generate Image (Placeholder - 실제 이미지 생성 API 연동 필요)
export async function generateDestinyImage(
  originalImageBase64: string,

  _prompt: string,

  _type: 'face' | 'interior'
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  if (isEdgeEnabled('ai-image')) {
    return invokeEdgeSafe('ai-image', { action: 'generateImage', originalImageBase64, prompt: _prompt, type: _type })
  }
  // NOTE: 실제 구현 시 DALL-E 3 또는 Stability AI API 연동 필요
  // 현재는 분석 결과만 제공하고, 이미지 생성은 준비 중 상태로 표시

  try {
    // 현재는 원본 이미지를 반환 (실제 구현 시 생성된 이미지 URL 반환)
    return {
      success: true,
      imageUrl: `data:image/jpeg;base64,${originalImageBase64}`,
    }
  } catch (error: unknown) {
    logger.error('Image Generation Error:', error)
    return {
      success: false,
      error: '이미지 생성 기능은 현재 준비 중입니다.',
    }
  }
}

// 4. Credit Check & Deduction
// Race condition 방지: read-then-write 대신 .gte() 조건부 UPDATE 사용
export async function checkAndDeductCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  const supabase = await createClient()

  // Step 1: Read current balance for user-facing error message
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single()

  if (fetchError || !profile) {
    return { success: false, error: '프로필을 찾을 수 없습니다.' }
  }

  const currentCredits = profile.credits || 0

  if (currentCredits < amount) {
    return {
      success: false,
      error: `크레딧이 부족합니다. (현재: ${currentCredits}, 필요: ${amount})`,
    }
  }

  // Step 2: Conditional UPDATE with .gte() guard
  // Even if another request deducted between Step 1 and here,
  // .gte('credits', amount) ensures we never go negative.
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ credits: currentCredits - amount })
    .eq('id', userId)
    .gte('credits', amount)
    .select('credits')
    .single()

  if (updateError || !updated) {
    logger.warn('[Credits] Conditional update failed — possible race condition', { userId, amount })
    return { success: false, error: '크레딧 차감 중 동시 요청이 감지되었습니다. 다시 시도해주세요.' }
  }

  return { success: true, remaining: updated.credits }
}
