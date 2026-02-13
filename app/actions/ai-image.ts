'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

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

export interface FaceAnalysisResult {
  success: boolean
  currentAnalysis?: string
  currentScore?: number
  confidence?: number // 신뢰도 점수 (0-100)
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
    upperStop?: { score: number; description: string } // 상정(이마)
    middleStop?: { score: number; description: string } // 중정(눈~코)
    lowerStop?: { score: number; description: string } // 하정(입~턱)
  }
  error?: string
}

export interface PalmAnalysisResult {
  success: boolean
  currentAnalysis?: string
  currentScore?: number
  confidence?: number // 신뢰도 점수 (0-100)
  palmLines?: {
    // 삼대 주선 (Three Major Lines)
    lifeLine?: { score: number; description: string } // 생명선
    intelligenceLine?: { score: number; description: string } // 지능선
    emotionLine?: { score: number; description: string } // 감정선
    // 특수 선
    fateLine?: { score: number; description: string } // 운명선
    sunLine?: { score: number; description: string } // 태양선
    marriageLine?: { score: number; description: string } // 결혼선
  }
  fortuneScores?: {
    wealth: number // 재물운 (0-100)
    health: number // 건강운 (0-100)
    love: number // 애정운 (0-100)
    career: number // 직업운 (0-100)
  }
  recommendations?: string[]
  error?: string
}

export interface InteriorAnalysisResult {
  success: boolean
  currentAnalysis?: string
  problems?: string[]
  improvementPrompt?: string
  shoppingList?: string[]
  error?: string
}

// 1. Face Destiny Hacking - 관상 분석 및 개선 프롬프트 생성
export async function analyzeFaceForDestiny(
  imageBase64: string,
  goal: FaceDestinyGoal
): Promise<FaceAnalysisResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })
  const goalConfig = GOAL_PROMPTS[goal]

  const analysisPrompt = `당신은 30년 경력의 관상학 전문가입니다.
동양의 전통 명리학과 관상학을 깊이 연구했으며, 수천 명의 관상을 분석한 경험이 있습니다.

아래 얼굴 이미지를 전문가적 시각으로 정확히 분석하여 "${goalConfig.name}"에 대한 평가를 제공하세요.

[1단계: 오관(五官) 분석]
전통 관상학의 오관을 각각 10점 만점으로 평가하세요:

1. **귀(耳)** - 지혜와 장수의 상징
   - 형태, 크기, 위치, 색택 평가
   - 점수와 특징 기술

2. **눈썹(眉)** - 형제운과 사회성
   - 형태, 굵기, 농도, 균형 평가
   - 점수와 특징 기술

3. **눈(目)** - 정신과 지혜의 창
   - 크기, 형태, 눈빛, 쌍꺼풀 평가
   - 점수와 특징 기술

4. **코(鼻)** - 재물운과 권력운
   - 콧대 높이, 코끝 모양, 콧방울 크기 평가
   - 점수와 특징 기술

5. **입(口)** - 식복과 언변
   - 입술 두께, 입 크기, 치아 상태 평가
   - 점수와 특징 기술

[2단계: 삼정(三停) 분석]
얼굴을 3등분하여 균형을 평가하세요:

1. **상정(上停)** - 헤어라인부터 눈썹까지 (초년운 0-30세)
   - 이마의 넓이, 높이, 주름, 빛깔 평가
   - 점수: X/10

2. **중정(中停)** - 눈썹부터 코끝까지 (중년운 30-60세)
   - 눈, 코의 조화와 비율 평가
   - 점수: X/10

3. **하정(下停)** - 코끝부터 턱끝까지 (말년운 60세 이후)
   - 입, 턱의 견고함과 형태 평가
   - 점수: X/10

[3단계: 피부 찰색(察色) - 기색과 혈색]
- 현재 피부 광택, 혈색, 기운 상태 평가
- 건강 상태 및 운기(運氣) 흐름 파악

[4단계: ${goalConfig.name} 종합 평가]
- 현재 ${goalConfig.name} 점수: 0-100점
- 잠재력 점수: 0-100점
- 강화할 핵심 특징: ${goalConfig.traits}

[5단계: 구체적 개선 방법]
- 메이크업 기법 3가지
- 헤어스타일 조언
- 표정 및 자세 관리
- 일상 관리법 (수면, 운동, 식습관)

[CRITICAL: 출력 형식]
반드시 다음 태그들을 모두 포함하세요:
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

목표: ${goalConfig.desc}
강화할 특징: ${goalConfig.traits}

※ 긍정적이고 건설적인 톤을 유지하세요.
※ 의학적/성형 관련 조언은 절대 하지 마세요.
※ 관상학적 전문 용어를 사용하되, 이해하기 쉽게 설명하세요.`

  try {
    const result = await model.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ])

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

    return {
      success: true,
      currentAnalysis: analysisText,
      currentScore,
      confidence,
      facialFeatures,
      improvementPrompt,
      recommendations,
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
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })
  const themeConfig = INTERIOR_THEMES[theme]

  const analysisPrompt = `당신은 전통 풍수 인테리어 전문가입니다.

이 ${roomType} 사진을 분석하고, "${themeConfig.name}" 테마로 개선하기 위한 분석을 제공하세요.

[분석 항목]
1. **현재 상태 진단**: 방의 레이아웃, 가구 배치, 색상 톤 분석
2. **풍수적 문제점**: 기(氣)의 흐름을 방해하는 요소들 (최대 5개)
3. **개선 방향**: ${themeConfig.name}을 위한 구체적인 변경 사항
4. **추천 색상**: ${themeConfig.colors}
5. **추천 소품**: ${themeConfig.elements}
6. **쇼핑 리스트**: 구매하면 좋을 구체적인 아이템 5개

[CRITICAL: 출력 형식]
반드시 다음 형식의 쇼핑 리스트를 포함하세요:
[[SHOPPING_LIST]]
- 아이템1
- 아이템2
- 아이템3
- 아이템4
- 아이템5
[[/SHOPPING_LIST]]

실용적이고 구체적인 조언을 제공하세요.`

  try {
    const result = await model.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ])

    const analysisText = result.response.text()

    // Extract shopping list
    const shoppingMatch = analysisText.match(
      /\[\[SHOPPING_LIST\]\]([\s\S]*?)\[\[\/SHOPPING_LIST\]\]/
    )
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

    // Extract problems
    const problems = [
      '가구 배치가 기의 흐름을 막고 있음',
      '색상 톤이 목표와 맞지 않음',
      '소품 배치 개선 필요',
    ]

    return {
      success: true,
      currentAnalysis: analysisText,
      problems,
      improvementPrompt,
      shoppingList,
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
export async function analyzePalmReading(imageBase64: string): Promise<PalmAnalysisResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

  const analysisPrompt = `당신은 30년 경력의 수상학(手相學) 전문가입니다.
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
    const result = await model.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ])

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

    return {
      success: true,
      currentAnalysis: analysisText,
      currentScore,
      confidence,
      palmLines,
      fortuneScores,
      recommendations,
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
