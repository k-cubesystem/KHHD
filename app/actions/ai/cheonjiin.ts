'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { calculateManse, calculateDaewoon } from '@/lib/domain/saju/manse'
import { calculateAge } from '@/lib/domain/saju/saju'
import { formatManseDetails, formatSajuText, formatDaewoon, calculateElements } from '@/lib/utils/manse-formatter'
import { getPromptWithVariables } from '@/lib/utils/prompt-variables'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { saveAnalysisHistory } from '../user/history'
import { recordFortuneEntry, getSelfFamilyMemberId } from '../fortune/fortune'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'

/**
 * 천지인 분석 서버 액션
 * @param targetId - 분석 대상의 ID (본인 또는 가족)
 * @param additionalData - 1회성 수집 데이터 (주소, 이미지 등)
 * @param checkOnly - true면 캐시만 확인하고 반환 (분석 안 함)
 * @param skipCache - true면 캐시 무시하고 새로 분석
 */
export async function analyzeCheonjiinAction(
  targetId: string,
  additionalData?: {
    homeAddress?: string
    workAddress?: string
    faceImageUrl?: string
    handImageUrl?: string
  } | null,
  checkOnly: boolean = false,
  skipCache: boolean = false
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  try {
    // 1. 대상 정보 조회
    const target = await getDestinyTarget(targetId)

    if (!target) {
      return { success: false, error: '분석 대상을 찾을 수 없습니다.' }
    }

    if (!target.birth_date) {
      return {
        success: false,
        error: `생년월일 정보가 없습니다. 프로필 설정에서 생년월일을 입력해주세요.`,
      }
    }

    // 2. 최근 7일 이내 분석 결과 확인 (캐시)
    if (!skipCache) {
      const { data: recentAnalysis, date: cacheDate } = await getRecentAnalysis(targetId)

      if (recentAnalysis) {
        // checkOnly면 캐시 확인만 하고 반환
        if (checkOnly) {
          return { success: true, data: recentAnalysis, cached: true, cacheDate }
        }
        // 일반 모드에서도 캐시 반환 (기존 동작)
        return { success: true, data: recentAnalysis, cached: true, cacheDate }
      }
    }

    // checkOnly인데 캐시가 없으면 cached: false 반환
    if (checkOnly) {
      return { success: true, cached: false }
    }

    // 3. 만세력 계산
    const manse = calculateManse(target.birth_date, target.birth_time || '00:00', 'Asia/Seoul', true)

    // 4. 오행 분포 계산
    const elements = calculateElements(manse)

    // 5. 나이 계산
    const age = calculateAge(target.birth_date)

    // 6. 대운 계산
    const daewoon = calculateDaewoon(
      target.birth_date,
      target.birth_time || '00:00',
      (target.gender || 'male') as 'male' | 'female',
      age,
      'Asia/Seoul'
    )

    // 7. 변수 준비 (천지인 초고도화 데이터 포함)
    // additionalData가 있으면 우선 사용, 없으면 target 데이터 사용
    const workAddress = await getWorkAddress(user.id)

    // 이미지 raw URL (base64 or storage URL)
    const rawFaceImageUrl = additionalData?.faceImageUrl || target.face_image_url || null
    const rawHandImageUrl = additionalData?.handImageUrl || target.hand_image_url || null

    // 멀티모달 API용 이미지 Part 변환 (base64 직접 or storage URL fetch)
    const [faceImagePart, handImagePart] = await Promise.all([
      resolveImagePart(rawFaceImageUrl),
      resolveImagePart(rawHandImageUrl),
    ])

    const homeAddress = additionalData?.homeAddress || target.home_address || '정보 없음'
    const resolvedWorkAddress = additionalData?.workAddress || workAddress || '정보 없음'

    // 이미지/주소 플래그 (프롬프트 조건 분기용) — Part 존재 여부로만 판별
    const imageFlags = {
      hasFaceImage: faceImagePart !== null,
      hasHandImage: handImagePart !== null,
      hasFengshui: homeAddress !== '정보 없음' || resolvedWorkAddress !== '정보 없음',
      hasWorkAddress: resolvedWorkAddress !== '정보 없음',
    }

    const variables = {
      // 기본 정보
      name: target.name,
      gender: target.gender === 'male' ? '남성' : '여성',
      birthDate: target.birth_date,
      birthTime: target.birth_time || '00:00',
      age: age.toString(),

      // 천(天) - 사주 데이터
      saju: formatSajuText(manse),
      manse: formatManseDetails(manse),
      elements: JSON.stringify(elements),
      daewoon: formatDaewoon(daewoon),

      // 지(地) - 풍수 데이터 (주소)
      homeAddress,
      workAddress: resolvedWorkAddress,

      // 인(人) - 이미지는 multimodal Part로 전달, 텍스트엔 첨부 여부만 표시
      faceImageUrl: imageFlags.hasFaceImage ? '관상 이미지 첨부됨 (별도 이미지 참조)' : '관상 이미지 없음',
      handImageUrl: imageFlags.hasHandImage ? '손금 이미지 첨부됨 (별도 이미지 참조)' : '손금 이미지 없음',
    }

    // 8. DB 프롬프트 조회 및 AI 분석
    let prompt: string
    try {
      prompt = await getPromptWithVariables('cheonjiin_analysis', variables)
    } catch (error) {
      // 프롬프트가 DB에 없으면 기본 프롬프트 사용
      console.warn('DB 프롬프트 조회 실패, 기본 프롬프트 사용:', error)
      prompt = getDefaultCheonjiinPrompt(variables, imageFlags)
    }

    const result = await analyzeCheonjiinWithAI(prompt, target, faceImagePart, handImagePart, user.id)

    // 운세 기록 (본인/가족 모두 미션 체크)
    const fortuneMemberId =
      target.target_type === 'family' ? target.id : await getSelfFamilyMemberId().catch(() => null)
    if (fortuneMemberId) {
      await recordFortuneEntry(fortuneMemberId, 'SAJU', fortuneMemberId).catch(() => {})
    }

    return { success: true, data: result, cached: false }
  } catch (error) {
    console.error('[CheonjiinAnalysis] Error:', error)
    const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}

/**
 * 사용자의 회사 주소 조회 (profiles 테이블에서)
 */
async function getWorkAddress(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('work_address').eq('id', userId).single()

  return data?.work_address || null
}

/**
 * 최근 7일 이내 분석 결과 조회 (캐시)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRecentAnalysis(targetId: string): Promise<{ data: any; date: string | null }> {
  const supabase = await createClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data } = await supabase
    .from('analysis_history')
    .select('*')
    .eq('target_id', targetId)
    .eq('category', 'SAJU')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    data: data?.result_json || null,
    date: data?.created_at || null,
  }
}

/**
 * AI 응답 텍스트에서 JSON 추출 (마크다운 코드블록 제거 포함)
 */
function extractJSON(text: string): Record<string, unknown> {
  // ```json ... ``` 또는 ``` ... ``` 블록 제거 시도
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  const raw = codeBlockMatch ? codeBlockMatch[1] : text

  // 첫 { 부터 마지막 } 까지 추출 (앞뒤 쓰레기 텍스트 제거)
  const jsonMatch = raw.match(/\{[\s\S]+\}/)
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.')
  }

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('AI 응답 JSON 파싱 실패: ' + jsonMatch[0].slice(0, 200))
  }
}

/**
 * 이미지 URL을 Gemini inlineData Part로 변환
 * - base64 data URL: 직접 파싱
 * - Supabase storage URL (https://...): fetch → base64 변환
 * - null/undefined: null 반환
 */
async function resolveImagePart(
  imageUrl: string | null | undefined
): Promise<{ mimeType: string; data: string } | null> {
  if (!imageUrl) return null

  // base64 data URL
  const base64Match = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (base64Match) {
    return { mimeType: base64Match[1], data: base64Match[2] }
  }

  // storage URL (https://...) → 서버에서 fetch → base64
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        console.warn('[CheonjiinAnalysis] 이미지 fetch 실패:', response.status, imageUrl)
        return null
      }
      const mimeType = response.headers.get('content-type') || 'image/jpeg'
      const buffer = await response.arrayBuffer()
      const data = Buffer.from(buffer).toString('base64')
      return { mimeType, data }
    } catch (err) {
      console.warn('[CheonjiinAnalysis] 이미지 fetch 오류:', err)
      return null
    }
  }

  return null
}

/**
 * AI를 사용한 천지인 분석 (멀티모달 지원)
 */

async function analyzeCheonjiinWithAI(
  promptText: string,
  target: any,
  faceImagePart?: { mimeType: string; data: string } | null,
  handImagePart?: { mimeType: string; data: string } | null,
  userId?: string
) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error('Google Generative AI API Key is missing')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  console.log('[CheonjiinAnalysis] AI 분석 시작...')

  // 멀티모달 Parts 구성: 텍스트 + 이미지(있는 경우)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = [{ text: promptText }]
  if (faceImagePart) {
    parts.push({ inlineData: faceImagePart })
    console.log('[CheonjiinAnalysis] 관상 이미지 첨부됨')
  }
  if (handImagePart) {
    parts.push({ inlineData: handImagePart })
    console.log('[CheonjiinAnalysis] 손금 이미지 첨부됨')
  }

  const result = await withGeminiRateLimit(() => model.generateContent({ contents: [{ role: 'user', parts }] }), {
    userId,
    model: 'gemini-2.0-flash',
    actionType: 'cheonjiin',
  })
  const text = result.response.text()

  // JSON 파싱 (마크다운 코드블록 제거 후 안전하게 파싱)
  const data = extractJSON(text)

  // analysis_history 저장
  await saveAnalysisHistory({
    target_id: target.id,
    target_name: target.name,
    target_relation: target.relation_type,
    category: 'SAJU',
    result_json: data,
    summary: (data.summary as string) || '천지인 통합 분석 결과',
    score: (data.score as number) || 80,
    model_used: 'gemini-2.0-flash',
    talisman_cost: 3,
  })

  console.log('[CheonjiinAnalysis] AI 분석 완료')

  return data
}

/**
 * 기본 천지인 프롬프트 (DB 조회 실패 시 사용)
 */
function getDefaultCheonjiinPrompt(
  vars: Record<string, string>,
  flags?: { hasFaceImage: boolean; hasHandImage: boolean; hasFengshui: boolean; hasWorkAddress: boolean }
): string {
  // flags가 없으면 (DB 프롬프트 경로 등) 변수 텍스트로 fallback 판별
  const hasFaceImage = flags?.hasFaceImage ?? vars.faceImageUrl !== '관상 이미지 없음'
  const hasHandImage = flags?.hasHandImage ?? vars.handImageUrl !== '손금 이미지 없음'
  const hasFengshui = flags?.hasFengshui ?? vars.homeAddress !== '정보 없음'
  const hasWorkAddress = flags?.hasWorkAddress ?? vars.workAddress !== '정보 없음'

  return `당신은 해화당의 전문 명리학 AI입니다. 사주·풍수·관상·손금을 통합하는 천지인(天地人) 분석을 수행하세요.

## 분석 대상 정보
- 이름: ${vars.name}
- 성별: ${vars.gender}
- 생년월일: ${vars.birthDate}
- 태어난 시간: ${vars.birthTime}
- 사주 팔자: ${vars.saju}
- 만세력 정보: ${vars.manse}
- 오행 분포: ${vars.elements}
- 현재 나이: ${vars.age}세
- 대운 흐름: ${vars.daewoon}

## 풍수 데이터
- 집 주소: ${vars.homeAddress}
- 직장 주소: ${vars.workAddress}

## 이미지 데이터
- 관상(얼굴) 이미지: ${vars.faceImageUrl}
- 손금(손) 이미지: ${vars.handImageUrl}

---

## 서술 원칙 (반드시 준수)

### 오행 비유 서술 (천(天) 섹션 필수)
사주의 일간(日干) 오행을 기반으로 아래 비유 중 하나를 활용하여 감성적으로 서술하세요:
- 木(목): "대나무처럼 유연하게 휘어지지만 꺾이지 않는 사람입니다."
- 火(화): "타오르는 횃불 같은 사람입니다. 어두운 공간에 들어서면 주변이 밝아지고 사람들이 모여듭니다. 그러나 바람이 없으면 쉬 꺼지듯, 자극이 없으면 무기력해집니다."
- 土(토): "넓은 대지 같은 사람입니다. 모든 것을 품지만 스스로는 자리를 옮기지 않습니다."
- 金(금): "잘 벼려진 칼 같은 사람입니다. 한 번 방향을 정하면 거침없이 나아갑니다."
- 水(수): "흐르는 강물 같은 사람입니다. 막히면 돌아가고, 낮은 곳을 채우며 결국 바다에 닿습니다."

element_metaphor 필드에 위 비유를 확장하여 200자 이상 감성적으로 서술하세요.

### 표현 원칙
- "~합니다" 단정보다 "~같습니다", "~을 닮았습니다", "~처럼" 표현을 적극 활용
- 구체적인 비유와 은유로 감성적으로 서술
- 각 본문(content)은 최소 300자 이상

---

## 분석 지침

${
  hasFengshui
    ? `### 풍수(地) 분석
집/직장 주소를 기반으로 방위와 오행 기운을 분석하세요.
- 한국의 지리적 특성과 전통 풍수 원리(배산임수, 오방위)를 적용
- "~가 위치한 지역은 ~의 기운을 품고 있어..." 형식으로 서술`
    : `### 풍수(地) 분석
주소 정보가 없으므로 fengshui 필드를 null로 설정하세요.`
}

${
  hasFaceImage
    ? `### 관상(人) 분석
첨부된 얼굴 이미지를 실제로 분석하세요.
- 이마(관록궁): 직업운·명예운
- 눈(부처궁): 재물운·부부운
- 코(재백궁): 현금운·재물 보관 능력
- 입(처첩궁/식록궁): 인연운·식복
- face_score: 0~100 사이 관상 점수
각 부위는 "~하니 ~운이 ~합니다" 형식으로 구체적으로 서술하세요.`
    : `### 관상(人) 분석
관상 이미지가 없으므로 face_reading 필드를 null로 설정하세요.`
}

${
  hasHandImage
    ? `### 손금(人) 분석
첨부된 손 이미지를 실제로 분석하세요.
- 생명선: 체력·건강·생명력
- 두뇌선: 사고방식·지적 능력
- 감정선: 연애 패턴·감정 표현 방식
- 운명선: 커리어 방향·40대 이후 운
- palm_score: 0~100 사이 손금 점수
각 선은 "~선이 ~하니 ~" 형식으로 구체적으로 서술하세요.`
    : `### 손금(人) 분석
손금 이미지가 없으므로 palm_reading 필드를 null로 설정하세요.`
}

---

## 출력 형식 (반드시 아래 JSON 스키마를 정확히 준수)

\`\`\`json
{
  "summary": "감성적인 한 줄 종합 요약 (비유 포함)",
  "score": 85,
  "cheonScore": 80,
  "jiScore": 75,
  "inScore": 82,
  "cheon": {
    "title": "타고난 운명의 기운",
    "content": "천(天) 분석 본문 (최소 300자, 비유 서술)",
    "element_metaphor": "오행 비유 확장 서술 (200자 이상)",
    "strengths": ["강점1 (구체적으로)", "강점2", "강점3"],
    "weaknesses": ["약점1 (구체적으로)", "약점2"]
  },
  "ji": {
    "title": "땅의 기운과 환경",
    "content": "지(地) 분석 본문 (최소 300자)",
    "daewoon_phase": "현재 대운 단계 설명",
    "lucky_direction": "길한 방위",
    "fengshui": ${
      hasFengshui
        ? `{
      "home_energy": "집 주소 기반 방위 기운 분석 (최소 100자)",
      "work_energy": "${hasWorkAddress ? '직장 주소 기반 방위 기운 분석 (최소 100자)' : '직장 주소 정보 없음'}",
      "advice": "풍수 개선 조언 (인테리어, 방향 등 구체적으로)",
      "lucky_color_for_home": "집에 두면 좋은 색상"
    }`
        : 'null'
    }
  },
  "in": {
    "title": "사람의 기운과 인연",
    "content": "인(人) 분석 본문 (최소 300자)",
    "relationship_advice": "관계 조언 (구체적으로)",
    "noble_person": "귀인의 특징과 만나는 방법",
    "face_reading": ${
      hasFaceImage
        ? `{
      "overall": "전체 관상 인상 (최소 100자)",
      "forehead": "이마 분석 - 관록궁",
      "eyes": "눈 분석 - 부처궁",
      "nose": "코 분석 - 재백궁",
      "mouth": "입 분석 - 처첩궁",
      "face_score": 75
    }`
        : 'null'
    },
    "palm_reading": ${
      hasHandImage
        ? `{
      "overall": "전체 손금 인상 (최소 100자)",
      "life_line": "생명선 분석",
      "head_line": "두뇌선 분석",
      "heart_line": "감정선 분석",
      "fate_line": "운명선 분석",
      "palm_score": 78
    }`
        : 'null'
    }
  },
  "lucky": {
    "color": "행운의 색상",
    "direction": "길한 방위",
    "number": 7,
    "keyword": "핵심 키워드",
    "advice": "감성적인 핵심 조언 한 문장 (비유 포함)"
  }
}
\`\`\`

위 JSON을 정확히 반환하세요. 마크다운 코드블록 없이 순수 JSON만 반환하세요.`
}
