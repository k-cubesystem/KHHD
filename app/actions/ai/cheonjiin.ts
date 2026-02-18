'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { calculateManse, calculateDaewoon } from '@/lib/domain/saju/manse'
import { calculateAge } from '@/lib/domain/saju/saju'
import {
  formatManseDetails,
  formatSajuText,
  formatDaewoon,
  calculateElements,
} from '@/lib/utils/manse-formatter'
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
    const manse = calculateManse(
      target.birth_date,
      target.birth_time || '00:00',
      'Asia/Seoul',
      true
    )

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

    // 이미지 raw URL (base64 or storage URL) - 텍스트 프롬프트에 직접 주입하지 않음
    const rawFaceImageUrl = additionalData?.faceImageUrl || target.face_image_url || null
    const rawHandImageUrl = additionalData?.handImageUrl || target.hand_image_url || null

    // base64 이미지 데이터 추출 (멀티모달 API용)
    const faceImagePart = extractBase64ImagePart(rawFaceImageUrl)
    const handImagePart = extractBase64ImagePart(rawHandImageUrl)

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
      homeAddress: additionalData?.homeAddress || target.home_address || '정보 없음',
      workAddress: additionalData?.workAddress || workAddress || '정보 없음',

      // 인(人) - 관상·손금 데이터 (이미지는 텍스트 대신 플래그만, 실제 이미지는 multimodal Part로 전달)
      faceImageUrl: faceImagePart
        ? '관상 이미지 첨부됨 (별도 이미지 참조)'
        : rawFaceImageUrl
          ? '이미지 URL 제공됨'
          : '관상 이미지 없음',
      handImageUrl: handImagePart
        ? '손금 이미지 첨부됨 (별도 이미지 참조)'
        : rawHandImageUrl
          ? '이미지 URL 제공됨'
          : '손금 이미지 없음',
    }

    // 8. DB 프롬프트 조회 및 AI 분석
    let prompt: string
    try {
      prompt = await getPromptWithVariables('cheonjiin_analysis', variables)
    } catch (error) {
      // 프롬프트가 DB에 없으면 기본 프롬프트 사용
      console.warn('DB 프롬프트 조회 실패, 기본 프롬프트 사용:', error)
      prompt = getDefaultCheonjiinPrompt(variables)
    }

    const result = await analyzeCheonjiinWithAI(
      prompt,
      target,
      faceImagePart,
      handImagePart,
      user.id
    )

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
 * base64 데이터 URL에서 Gemini inlineData Part 추출
 * "data:image/jpeg;base64,..." → { mimeType, data } 또는 null
 */
function extractBase64ImagePart(
  imageUrl: string | null | undefined
): { mimeType: string; data: string } | null {
  if (!imageUrl) return null
  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
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
  const parts: any[] = [{ text: promptText }]
  if (faceImagePart) {
    parts.push({ inlineData: faceImagePart })
    console.log('[CheonjiinAnalysis] 관상 이미지 첨부됨')
  }
  if (handImagePart) {
    parts.push({ inlineData: handImagePart })
    console.log('[CheonjiinAnalysis] 손금 이미지 첨부됨')
  }

  const result = await withGeminiRateLimit(
    () => model.generateContent({ contents: [{ role: 'user', parts }] }),
    { userId, model: 'gemini-2.0-flash', actionType: 'cheonjiin' }
  )
  const text = result.response.text()

  // JSON 파싱
  const data = JSON.parse(text)

  // analysis_history 저장
  await saveAnalysisHistory({
    target_id: target.id,
    target_name: target.name,
    target_relation: target.relation_type,
    category: 'SAJU',
    result_json: data,
    summary: data.summary || '천지인 통합 분석 결과',
    score: data.score || 80,
    model_used: 'gemini-2.0-flash',
    talisman_cost: 3,
  })

  console.log('[CheonjiinAnalysis] AI 분석 완료')

  return data
}

/**
 * 기본 천지인 프롬프트 (DB 조회 실패 시 사용)
 */
function getDefaultCheonjiinPrompt(vars: Record<string, string>): string {
  return `당신은 해화당의 전문 명리학 AI입니다.

## 분석 대상 정보
- 이름: ${vars.name}
- 성별: ${vars.gender}
- 생년월일: ${vars.birthDate}
- 태어난 시간: ${vars.birthTime}
- 사주 팔자: ${vars.saju}
- 만세력 정보: ${vars.manse}
- 현재 나이: ${vars.age}세

## 천지인(天地人) 분석 구조

### 1. 천(天) - 타고난 운명
사주 원국 분석, 오행 균형, 십신 구조, 선천적 재능 분석

### 2. 지(地) - 현실과 환경
대운 흐름, 현재 년운/월운, 재물운, 직업운, 풍수 방향 권장

### 3. 인(人) - 관계와 연결
배우자운, 자녀운, 인간관계 패턴, 귀인 방향, 갈등 해소법

## 출력 형식 (JSON)
{
  "summary": "한 줄 종합 요약",
  "score": 85,
  "cheon": {
    "title": "타고난 운명",
    "content": "천(天) 분석 본문 500자",
    "strengths": ["강점1", "강점2", "강점3"],
    "weaknesses": ["약점1", "약점2"]
  },
  "ji": {
    "title": "현실과 환경",
    "content": "지(地) 분석 본문 500자",
    "daewoon_phase": "현재 대운 단계",
    "lucky_direction": "북쪽"
  },
  "in": {
    "title": "관계와 연결",
    "content": "인(人) 분석 본문 500자",
    "relationship_advice": "관계 조언",
    "noble_person": "귀인의 특징"
  },
  "lucky": {
    "color": "푸른색",
    "direction": "북쪽",
    "number": 7,
    "advice": "핵심 조언 한 문장"
  }
}`
}
