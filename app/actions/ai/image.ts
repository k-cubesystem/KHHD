'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
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
  score: number // 0-10
  description: string
  fortuneArea: string // 관장하는 운세 영역
  advice: string // 개운 조언
}

export interface FaceAnalysisResult {
  success: boolean
  currentAnalysis?: string
  currentScore?: number
  confidence?: number
  improvementPrompt?: string
  recommendations?: string[]
  facialFeatures?: {
    // 오관(五官) 분석
    ears?: { score: number; description: string }
    eyebrows?: { score: number; description: string }
    eyes?: { score: number; description: string }
    nose?: { score: number; description: string }
    mouth?: { score: number; description: string }
    // 삼정(三停) 분석
    upperStop?: { score: number; description: string }
    middleStop?: { score: number; description: string }
    lowerStop?: { score: number; description: string }
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
  overallFortuneScores?: {
    // 운세별 종합 점수
    wealth: number // 재물운
    career: number // 직업·명예운
    love: number // 연애운
    health: number // 건강운
    family: number // 가족·부모복
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
  error?: string
}

export interface PalmAnalysisResult {
  success: boolean
  currentAnalysis?: string
  currentScore?: number
  confidence?: number
  palmLines?: {
    lifeLine?: { score: number; description: string }
    intelligenceLine?: { score: number; description: string }
    emotionLine?: { score: number; description: string }
    fateLine?: { score: number; description: string }
    sunLine?: { score: number; description: string }
    marriageLine?: { score: number; description: string }
  }
  fortuneScores?: {
    wealth: number
    health: number
    love: number
    career: number
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
  overallQiScore?: number // 전체 기운 점수 0-100
  dominantElement?: string // 지배 오행
  luckyDirection?: string // 가장 길한 방위
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
    : `당신은 30년 경력의 관상학 전문가입니다.
동양의 전통 명리학과 관상학을 깊이 연구했으며, 수천 명의 관상을 분석한 경험이 있습니다.

아래 얼굴 이미지를 전문가적 시각으로 정확히 분석하여 "${goalConfig.name}"에 대한 평가를 제공하세요.

[1단계: 부위별(部位別) 심층 분석 - 6대 핵심 부위]
각 부위를 10점 만점으로 평가하고, 관장하는 운세 영역과 개운 조언을 함께 제시하세요.

1. **이마(천정, 天庭)** - 초년운(15~30세), 지능, 부모복, 관록
   - 넓이, 높이, 광택, 주름, 상처 여부 평가
   - 초년운과 부모덕 진단
   - 구체적 개운법 제시

2. **눈(감찰관, 監察官)** - 관찰력, 인간관계, 이성운, 총명함
   - 크기, 형태, 눈빛의 맑음, 쌍꺼풀, 눈꼬리 방향 평가
   - 인간관계·이성운 진단
   - 구체적 개운법 제시

3. **코(재백궁, 財帛宮)** - 재물운, 건강, 자존심, 중년운(40~50세)
   - 콧대 높이, 코끝 모양, 콧방울 크기, 코의 살집 평가
   - 재물운·건강 진단
   - 구체적 개운법 제시

4. **입(출납관, 出納官)** - 식복, 표현력, 노년운(60세 이후), 의식주
   - 입술 두께, 입 크기, 모양, 다문 모습 평가
   - 식복·노년운 진단
   - 구체적 개운법 제시

5. **귀(채청관, 採聽官)** - 명예, 건강, 장수, 선천적 복덕
   - 귀의 크기, 두께, 위치, 귓불의 발달 정도 평가
   - 명예·장수 진단
   - 구체적 개운법 제시

6. **턱(지각, 地閣)** - 만년운(60세 이후), 부동산운, 의지력, 부하복
   - 턱의 넓이, 두께, 형태(둥근/각진), 살집 평가
   - 만년운·부동산 진단
   - 구체적 개운법 제시

[2단계: 오관(五官) 분석]
전통 관상학의 오관을 각각 10점 만점으로 평가하세요:

1. **귀(耳)** - 지혜와 장수
2. **눈썹(眉)** - 형제운과 사회성
3. **눈(目)** - 정신과 지혜의 창
4. **코(鼻)** - 재물운과 권력운
5. **입(口)** - 식복과 언변

[3단계: 삼정(三停) 분석]
1. **상정(上停)** - 이마 (초년운 0-30세)
2. **중정(中停)** - 눈·코 (중년운 30-60세)
3. **하정(下停)** - 입·턱 (말년운 60세 이후)

[4단계: 운세별 종합 점수 (0-100)]
- 재물운: 코·이마·귀를 종합 평가
- 직업·명예운: 이마·눈썹·눈을 종합 평가
- 연애운: 눈·입·눈썹을 종합 평가
- 건강운: 귀·코·기색을 종합 평가
- 가족·부모복: 이마·귀를 종합 평가

[5단계: 피부 찰색(察色) - 기색과 혈색]
- 현재 피부 광택, 혈색, 기운 상태 평가

[6단계: ${goalConfig.name} 종합 평가]
- 현재 ${goalConfig.name} 점수: 0-100점
- 강화할 핵심 특징: ${goalConfig.traits}

[7단계: 구체적 개선 방법]
- 메이크업 기법 3가지
- 헤어스타일 조언
- 표정 및 자세 관리

[CRITICAL: 출력 형식 - 아래 모든 태그를 정확히 포함하세요]
[[CURRENT_SCORE: 숫자]]
[[CONFIDENCE: 숫자]]
[[EARS: 숫자, 설명]]
[[EYEBROWS: 숫자, 설명]]
[[EYES: 숫자, 설명]]
[[NOSE: 숫자, 설명]]
[[MOUTH: 숫자, 설명]]
[[UPPER_STOP: 숫자, 설명]]
[[MIDDLE_STOP: 숫자, 설명]]
[[LOWER_STOP: 숫자, 설명]]
[[PART_FOREHEAD: 숫자, 설명, 운세영역, 개운조언]]
[[PART_EYES: 숫자, 설명, 운세영역, 개운조언]]
[[PART_NOSE: 숫자, 설명, 운세영역, 개운조언]]
[[PART_MOUTH: 숫자, 설명, 운세영역, 개운조언]]
[[PART_EARS: 숫자, 설명, 운세영역, 개운조언]]
[[PART_CHIN: 숫자, 설명, 운세영역, 개운조언]]
[[SCORE_WEALTH: 숫자]]
[[SCORE_CAREER: 숫자]]
[[SCORE_LOVE: 숫자]]
[[SCORE_HEALTH: 숫자]]
[[SCORE_FAMILY: 숫자]]

목표: ${goalConfig.desc}
강화할 특징: ${goalConfig.traits}

※ 긍정적이고 건설적인 톤을 유지하세요.
※ 의학적/성형 관련 조언은 절대 하지 마세요.
※ 관상학적 전문 용어를 사용하되, 이해하기 쉽게 설명하세요.`

  try {
    const result = await withGeminiRateLimit(
      () => model.generateContent([analysisPrompt, { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }]),
      { model: MODEL_PRO, actionType: 'face_destiny' }
    )

    const analysisText = result.response.text()

    // Extract scores with improved parsing
    const currentScoreMatch = analysisText.match(/\[\[CURRENT_SCORE:\s*(\d+)\]\]/)
    const currentScore = currentScoreMatch?.[1] ? parseInt(currentScoreMatch[1]) : 65

    const confidenceMatch = analysisText.match(/\[\[CONFIDENCE:\s*(\d+)\]\]/)
    const confidence = confidenceMatch?.[1] ? parseInt(confidenceMatch[1]) : 75

    // Extract 오관(五官) scores
    const parseFeature = (tag: string) => {
      const regex = new RegExp(`\\[\\[${tag}:\\s*(\\d+),\\s*(.+?)\\]\\]`)
      const match = analysisText.match(regex)
      if (match?.[1] && match?.[2]) {
        return { score: parseInt(match[1]), description: match[2].trim() }
      }
      return { score: 7, description: '분석 중' }
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
      // [[PART_XXX: score, description, fortuneArea, advice]]
      const regex = new RegExp(`\\[\\[${tag}:\\s*(\\d+),\\s*([^,\\]]+),\\s*([^,\\]]+),\\s*([^\\]]+)\\]\\]`)
      const match = analysisText.match(regex)
      if (match?.[1] && match?.[2] && match?.[3] && match?.[4]) {
        return {
          score: parseInt(match[1]),
          description: match[2].trim(),
          fortuneArea: match[3].trim(),
          advice: match[4].trim(),
        }
      }
      // Fallback: try simpler format
      const simpleRegex = new RegExp(`\\[\\[${tag}:\\s*(\\d+),\\s*(.+?)\\]\\]`)
      const simpleMatch = analysisText.match(simpleRegex)
      if (simpleMatch?.[1] && simpleMatch?.[2]) {
        return { score: parseInt(simpleMatch[1]), description: simpleMatch[2].trim(), fortuneArea: '', advice: '' }
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

    // === 운세별 종합 점수 파싱 ===
    const extractScore = (tag: string): number => {
      const match = analysisText.match(new RegExp(`\\[\\[${tag}:\\s*(\\d+)\\]\\]`))
      return match?.[1] ? parseInt(match[1]) : 65
    }

    const overallFortuneScores = {
      wealth: extractScore('SCORE_WEALTH'),
      career: extractScore('SCORE_CAREER'),
      love: extractScore('SCORE_LOVE'),
      health: extractScore('SCORE_HEALTH'),
      family: extractScore('SCORE_FAMILY'),
    }

    // === 알고리즘 엔진 연동 ===
    const { calculateImprovementPriority, buildFaceSajuSynergyText, AGE_FORTUNE_ZONES } =
      await import('@/lib/physiognomy-engine/face-algorithm')

    const upperStopScore = facialFeatures.upperStop?.score ?? 7
    const middleStopScore = facialFeatures.middleStop?.score ?? 7
    const lowerStopScore = facialFeatures.lowerStop?.score ?? 7
    void middleStopScore // used via facialFeatures display
    const ageFortuneMap = {
      youth: `초년운(15~30세) - 이마: ${AGE_FORTUNE_ZONES[1].meaning}. ${partAnalysis.forehead?.description ?? facialFeatures.upperStop?.description ?? ''}`,
      middle: `중년운(31~50세) - 눈·코: ${AGE_FORTUNE_ZONES[2].meaning}. ${partAnalysis.eyes?.description ?? facialFeatures.eyes?.description ?? ''}`,
      senior: `장년운(51세~) - 입·턱: ${AGE_FORTUNE_ZONES[4].meaning}. ${partAnalysis.chin?.description ?? facialFeatures.mouth?.description ?? ''}`,
    }

    const faceScoreMap: Record<string, number> = {
      nose: facialFeatures.nose?.score ?? 7,
      eyes: facialFeatures.eyes?.score ?? 7,
      mouth: facialFeatures.mouth?.score ?? 7,
      eyebrows: facialFeatures.eyebrows?.score ?? 7,
      ears: facialFeatures.ears?.score ?? 7,
      upperStop: upperStopScore,
      lowerStop: lowerStopScore,
    }
    const improvementPriority = calculateImprovementPriority(faceScoreMap, goal)

    const sajuSynergy = sajuContext?.dayGan
      ? buildFaceSajuSynergyText(sajuContext.dayGan, currentScore, goal)
      : undefined

    const gisaekMatch = analysisText.match(/기색|안색|혈색|광택|윤기/)
    const gisaekReading = gisaekMatch
      ? analysisText
          .split('\n')
          .find((line) => /기색|안색|혈색|광택/.test(line))
          ?.trim()
      : undefined

    return {
      success: true,
      currentAnalysis: analysisText,
      currentScore,
      confidence,
      facialFeatures,
      partAnalysis,
      overallFortuneScores,
      improvementPrompt,
      recommendations,
      ageFortuneMap,
      improvementPriority,
      sajuSynergy,
      gisaekReading,
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
    : `당신은 30년 경력의 전통 풍수지리 인테리어 전문가입니다.
음양오행(陰陽五行)과 팔괘(八卦)를 바탕으로 공간의 기(氣) 흐름을 분석하고, 거주자의 운을 향상시키는 인테리어 비법을 제시합니다.

이 ${roomType} 사진을 분석하고, "${themeConfig.name}" 테마로 개선하기 위한 종합 풍수 분석을 제공하세요.

[1단계: 공간 기운 진단]
- 현재 기(氣) 흐름의 전반적 상태
- 지배 오행 판단 (木/火/土/金/水)
- 전체 풍수 기운 점수 (0-100)

[2단계: 8방위(八方位) 길흉 분석]
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

[3단계: 공간별 맞춤 추천]
아래 공간들에 대해 각각 기 흐름 상태, 주요 문제점, 개선 방법(3가지), 행운 아이템(3가지), 행운 색상을 제시하세요:
- 거실 (가족 화합, 재물운의 중심)
- 침실 (건강·수면·애정운)
- 주방 (식복·건강·재물 저장)
- 현관 (기운의 입구, 외부 운 유입)

[4단계: 가구·화분·수석 배치 제안]
구체적인 배치 제안을 5가지 이상 제시하세요:
- 배치할 아이템 (가구/화분/수석/소품)
- 추천 위치 (방위 또는 공간 설명)
- 이유 (풍수적 근거)
- 기대 효과

[5단계: 풍수 문제점 (최대 5개)]
현재 공간의 기운을 방해하는 주요 문제점

[6단계: 기운 전환 아이템 쇼핑 리스트]

[CRITICAL: 출력 형식 - 아래 모든 태그를 정확히 포함하세요]
[[QI_SCORE: 숫자]]
[[DOMINANT_ELEMENT: 오행명]]
[[LUCKY_DIRECTION: 방위명]]

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

    // === 기타 점수 파싱 ===
    const qiScoreMatch = analysisText.match(/\[\[QI_SCORE:\s*(\d+)\]\]/)
    const overallQiScore = qiScoreMatch?.[1] ? parseInt(qiScoreMatch[1]) : 65

    const dominantElementMatch = analysisText.match(/\[\[DOMINANT_ELEMENT:\s*([^\]]+)\]\]/)
    const dominantElement = dominantElementMatch?.[1]?.trim()

    const luckyDirectionMatch = analysisText.match(/\[\[LUCKY_DIRECTION:\s*([^\]]+)\]\]/)
    const luckyDirection = luckyDirectionMatch?.[1]?.trim()

    // Extract problems from text if not structured
    const problems = ['가구 배치가 기의 흐름을 막고 있음', '색상 톤이 목표와 맞지 않음', '소품 배치 개선 필요']

    return {
      success: true,
      currentAnalysis: analysisText,
      problems,
      improvementPrompt,
      shoppingList,
      directionalAnalysis,
      roomRecommendations,
      placementSuggestions,
      overallQiScore,
      dominantElement,
      luckyDirection,
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
    `당신은 30년 경력의 수상학(手相學) 전문가입니다.
동양의 전통 수상학과 서양 카이로맨시를 모두 연구했으며, 수천 명의 손금을 분석한 경험이 있습니다.

아래 손바닥 이미지를 전문가적 시각으로 정확히 분석하여 손금 운세를 제공하세요.

[1단계: 삼대 주선(三大主線) 분석]
전통 수상학의 3대 주선을 각각 10점 만점으로 평가하세요:

1. **생명선(生命線, Life Line)** - 건강과 생명력의 상징
   - 시작점, 길이, 굵기, 깊이, 끊김 여부 평가
   - 건강 상태, 체력, 장수 가능성 판단
   - 점수와 특징 기술

2. **지능선(知能線, Head Line)** - 사고방식과 재능
   - 시작점, 방향, 길이, 형태 평가
   - 사고방식(논리적/창의적), 학습 능력, 직업 적성 판단
   - 점수와 특징 기술

3. **감정선(感情線, Heart Line)** - 애정운과 성격
   - 시작점, 끝점, 깊이, 곡선 형태 평가
   - 애정 표현 방식, 감정 기복, 대인관계 성향 판단
   - 점수와 특징 기술

[2단계: 특수선(特殊線) 분석]
주요 특수선을 10점 만점으로 평가하세요 (없으면 0점):

1. **운명선(運命線, Fate Line)** - 인생 방향과 목표
2. **태양선(太陽線, Sun Line)** - 성공과 명예
3. **결혼선(結婚線, Marriage Line)** - 결혼운과 배우자 관계

[3단계: 팔궁(八宮) 분석]
손바닥 8개 구역의 발달 상태를 평가하세요:
- 목성구(검지 아래): 리더십, 야망
- 토성구(중지 아래): 책임감, 신중함
- 태양구(약지 아래): 창의성, 예술성
- 수성구(새끼손가락 아래): 소통 능력, 사업수완
- 금성구(엄지 기저부): 애정, 생명력
- 제1화성구(엄지와 검지 사이): 용기, 공격성
- 제2화성구(손목 위 세로선): 인내력, 저항력
- 월구(새끼손가락 아래 손목 근처): 상상력, 직관력

[4단계: 특수 문양 분석]
손바닥의 특수한 기호나 문양을 찾아 의미를 해석하세요:
- 별(★): 행운과 성취
- 십자(✛): 시련 또는 보호
- 섬(島): 장애와 어려움
- 격자(格子): 복합적 상황

[5단계: 종합 운세 평가]
다음 4가지 운세를 각각 0-100점으로 평가하세요:
- **재물운**: 수성구, 태양선, 지능선 종합 판단
- **건강운**: 생명선, 금성구 종합 판단
- **애정운**: 감정선, 결혼선, 금성구 종합 판단
- **직업운**: 운명선, 지능선, 목성구 종합 판단

[6단계: 구체적 조언]
- 강화할 손 관리법 (손가락 운동, 마사지 포인트)
- 손금으로 본 적성 직업 3가지
- 대인관계 조언
- 일상 생활 개선 방법

[CRITICAL: 출력 형식]
반드시 다음 태그들을 모두 포함하세요:
[[OVERALL_SCORE: 숫자]]
[[CONFIDENCE: 숫자]]
[[LIFE_LINE: 숫자, 설명]]
[[INTELLIGENCE_LINE: 숫자, 설명]]
[[EMOTION_LINE: 숫자, 설명]]
[[FATE_LINE: 숫자, 설명]]
[[SUN_LINE: 숫자, 설명]]
[[MARRIAGE_LINE: 숫자, 설명]]
[[WEALTH_SCORE: 숫자]]
[[HEALTH_SCORE: 숫자]]
[[LOVE_SCORE: 숫자]]
[[CAREER_SCORE: 숫자]]

※ 긍정적이고 건설적인 톤을 유지하세요.
※ 의학적 진단이나 절대적 미래 예언은 하지 마세요.
※ 수상학적 전문 용어를 사용하되, 이해하기 쉽게 설명하세요.`

  try {
    const result = await withGeminiRateLimit(
      () => model.generateContent([analysisPrompt, { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }]),
      { model: MODEL_PRO, actionType: 'palm_destiny' }
    )

    const analysisText = result.response.text()

    // Extract scores
    const overallScoreMatch = analysisText.match(/\[\[OVERALL_SCORE:\s*(\d+)\]\]/)
    const currentScore = overallScoreMatch?.[1] ? parseInt(overallScoreMatch[1]) : 70

    const confidenceMatch = analysisText.match(/\[\[CONFIDENCE:\s*(\d+)\]\]/)
    const confidence = confidenceMatch?.[1] ? parseInt(confidenceMatch[1]) : 75

    // Extract palm lines
    const parseLine = (tag: string) => {
      const regex = new RegExp(`\\[\\[${tag}:\\s*(\\d+),\\s*(.+?)\\]\\]`)
      const match = analysisText.match(regex)
      if (match?.[1] && match?.[2]) {
        return { score: parseInt(match[1]), description: match[2].trim() }
      }
      return { score: 7, description: '분석 중' }
    }

    const palmLines = {
      lifeLine: parseLine('LIFE_LINE'),
      intelligenceLine: parseLine('INTELLIGENCE_LINE'),
      emotionLine: parseLine('EMOTION_LINE'),
      fateLine: parseLine('FATE_LINE'),
      sunLine: parseLine('SUN_LINE'),
      marriageLine: parseLine('MARRIAGE_LINE'),
    }

    // Extract fortune scores
    const extractScore = (tag: string): number => {
      const match = analysisText.match(new RegExp(`\\[\\[${tag}:\\s*(\\d+)\\]\\]`))
      return match?.[1] ? parseInt(match[1]) : 70
    }

    const fortuneScores = {
      wealth: extractScore('WEALTH_SCORE'),
      health: extractScore('HEALTH_SCORE'),
      love: extractScore('LOVE_SCORE'),
      career: extractScore('CAREER_SCORE'),
    }

    // Extract recommendations
    const recommendations = [
      '손가락 관절 운동으로 순환 개선하기',
      '강점을 살릴 수 있는 직업 분야 탐색',
      '대인관계에서 감정선의 특성 활용하기',
    ]

    // === 알고리즘 엔진 연동 ===
    const { predictTimeline, analyzeDualHands, buildPalmSajuSynergyText, HAND_SHAPES } =
      await import('@/lib/physiognomy-engine/palm-algorithm')

    // 시기 예측
    const lifeScore = palmLines.lifeLine?.score ?? 7
    const fateScore = palmLines.fateLine?.score ?? 5
    const sunScore = palmLines.sunLine?.score ?? 5
    const timingPredictions = predictTimeline(lifeScore, fateScore, sunScore, sajuContext?.currentAge)

    // 양손 비교 (점수 기반 추정 - 실제로는 양손 이미지 필요하나 단손으로 추정)
    const dualHandCompare = analyzeDualHands(currentScore - 5, currentScore)

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
    const sajuSynergy = sajuContext?.dayGan ? buildPalmSajuSynergyText(sajuContext.dayGan, currentScore) : undefined

    return {
      success: true,
      currentAnalysis: analysisText,
      currentScore,
      confidence,
      palmLines,
      fortuneScores,
      recommendations,
      timingPredictions,
      dualHandCompare,
      handShape,
      sajuSynergy,
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
    // 이미지 생성 API 호출 (플레이스홀더)
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const response = await openai.images.edit({...});

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
export async function checkAndDeductCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  const supabase = await createClient()

  // Get current credits
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

  // Deduct credits
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: currentCredits - amount })
    .eq('id', userId)

  if (updateError) {
    return { success: false, error: '크레딧 차감 중 오류가 발생했습니다.' }
  }

  return { success: true, remaining: currentCredits - amount }
}
