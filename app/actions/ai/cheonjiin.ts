'use server'

// Vercel Serverless Function timeout (Pro: 최대 300초)
export const maxDuration = 60

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDestinyTarget } from '../user/destiny'
import { calculateManse, calculateDaewoon } from '@/lib/domain/saju/manse'
import { calculateAge } from '@/lib/domain/saju/saju'
import { formatManseDetails, formatSajuText, formatDaewoon, calculateElements } from '@/lib/utils/manse-formatter'
import { saveAnalysisHistory } from '../user/history'
import { recordFortuneEntry, getSelfFamilyMemberId } from '../fortune/fortune'
import { buildMasterPromptForAction } from '@/lib/saju-engine/master-prompt-builder'
import { getCachedAnalysis, isCacheValid } from '@/lib/utils/analysis-cache'
import { getModelConfig } from '@/lib/config/ai-models'
import { generateAIContent } from '@/lib/services/ai-client'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'

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
  skipCache: boolean = false,
  forceRefresh: boolean = false // alias for skipCache; pass true to bypass 24h cache
) {
  if (isEdgeEnabled('ai-analysis')) {
    return invokeEdgeSafe('ai-analysis', {
      action: 'analyzeCheonjiin',
      targetId,
      additionalData,
      checkOnly,
      skipCache,
      forceRefresh,
    })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  try {
    // 1. 대상 정보 조회 + 주소 병렬 조회
    const [target, workAddress] = await Promise.all([getDestinyTarget(targetId), getWorkAddress(user.id)])

    if (!target) {
      return { success: false, error: '분석 대상을 찾을 수 없습니다.' }
    }

    if (!target.birth_date) {
      return {
        success: false,
        error: `생년월일 정보가 없습니다. 프로필 설정에서 생년월일을 입력해주세요.`,
      }
    }

    // 2. 최근 캐시 확인 (skipCache 또는 forceRefresh가 아닐 때)
    if (!skipCache && !forceRefresh) {
      const cached = await getCachedAnalysis(user.id, targetId, 'SAJU', 24)

      if (cached && isCacheValid(cached, 24)) {
        logger.log(`[CheonjiinAnalysis] 캐시 적중 (${cached.created_at}) - AI 호출 생략`)

        // 캐시 반환 시에도 fortune_journal 업데이트 (UPSERT이므로 중복 안전)
        const fortuneMemberId = targetId // target_type 판별 전이므로 targetId 사용
        try {
          const selfId = await getSelfFamilyMemberId()
          const memberId = selfId || fortuneMemberId
          if (memberId) {
            await recordFortuneEntry(memberId, 'SAJU', cached.id || memberId, 100)
          }
        } catch (e) {
          logger.error('[CheonjiinAnalysis] 캐시 fortune_journal 기록 실패:', e)
        }

        if (checkOnly) {
          return { success: true, data: cached.result_json, cached: true, cacheDate: cached.created_at }
        }
        return { success: true, data: cached.result_json, cached: true, cacheDate: cached.created_at }
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

    // 8. 프롬프트 생성 (해화지기 마스터 엔진 연동)
    // 마스터 엔진으로 사주 컨텍스트(신강신약, 십이운성, 신살, 합충형, 물상론) 생성
    const { prompt: engineSystemPrompt } = await buildMasterPromptForAction(
      {
        name: target.name,
        birthDate: target.birth_date,
        birthTime: target.birth_time || '00:00',
        gender: (target.gender || 'male') as 'male' | 'female',
        isSolar: target.calendar_type !== 'lunar',
      },
      'CHEONJIIN',
      '',
      '',
      ''
    )
    // 엔진 프롬프트를 시스템 역할로 사용하고, 풍수/관상/손금 조건 섹션은 코드에서 추가
    const prompt = getDefaultCheonjiinPrompt(variables, imageFlags, engineSystemPrompt)

    const result = await analyzeCheonjiinWithAI(prompt, target, faceImagePart, handImagePart, user.id)

    // 운세 기록은 saveAnalysisHistory 내부에서 자동 처리됨 (recordFortuneEntry 호출)

    return { success: true, data: result, cached: false }
  } catch (error: unknown) {
    logger.error('[CheonjiinAnalysis] Error:', error)
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
 * DB에서 천지인 시스템 프롬프트 조회 (관리자 페이지에서 편집 가능)
 */
async function getCheonjiinSystemPrompt(): Promise<string | null> {
  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase.from('ai_prompts').select('template').eq('key', 'cheonjiin_analysis').single()
    return data?.template || null
  } catch (e) {
    logger.warn('[CheonjiinAnalysis] DB 프롬프트 로드 실패:', e)
    return null
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
        logger.warn('[CheonjiinAnalysis] 이미지 fetch 실패:', response.status, imageUrl)
        return null
      }
      const mimeType = response.headers.get('content-type') || 'image/jpeg'
      const buffer = await response.arrayBuffer()
      const data = Buffer.from(buffer).toString('base64')
      return { mimeType, data }
    } catch (err) {
      logger.warn('[CheonjiinAnalysis] 이미지 fetch 오류:', err)
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
  target: NonNullable<Awaited<ReturnType<typeof getDestinyTarget>>>,
  faceImagePart?: { mimeType: string; data: string } | null,
  handImagePart?: { mimeType: string; data: string } | null,
  _userId?: string
) {
  logger.log('[CheonjiinAnalysis] AI 분석 시작 (Claude)...')

  // 멀티모달 이미지 구성
  const images: Array<{ mimeType: string; data: string }> = []
  if (faceImagePart) {
    images.push(faceImagePart)
    logger.log('[CheonjiinAnalysis] 관상 이미지 첨부됨')
  }
  if (handImagePart) {
    images.push(handImagePart)
    logger.log('[CheonjiinAnalysis] 손금 이미지 첨부됨')
  }

  const aiResult = await generateAIContent({
    featureKey: 'cheonjiin',
    systemPrompt:
      '당신은 30년 경력의 사주명리학·관상학·풍수학 통합 전문가입니다. 백운산·강헌·도원 수준의 깊이 있는 인생 풀이를 제공합니다. 당신의 핵심 능력은 "과거를 먼저 맞추고, 현재를 공감한 뒤, 미래를 처방하는 것"입니다. 대운과 세운의 충(衝)/합(合)/형(刑) 발생 시점을 역산하여 과거 사건을 정확히 추론하고, 사주·관상·풍수 데이터를 교차 검증하여 다중 근거로 분석합니다. 긍정 70% + 주의 30%의 균형 잡힌 분석. 반드시 유효한 JSON만 출력하십시오.',
    userPrompt: promptText,
    maxTokens: 8192,
    images: images.length > 0 ? images : undefined,
  })
  const text = aiResult.text

  // JSON 파싱 (마크다운 코드블록 제거 후 안전하게 파싱)
  const data = extractJSON(text)

  // analysis_history 저장
  await saveAnalysisHistory({
    target_id: target.id,
    target_name: target.name,
    target_relation: target.relation_type,
    category: 'SAJU',
    result_json: data,
    summary: (data.summary as string) || '청담해화당 통합분석 결과',
    score: 0,
    model_used: getModelConfig('cheonjiin').model,
    talisman_cost: 3,
  })

  logger.log('[CheonjiinAnalysis] AI 분석 완료')

  return data
}

/**
 * 기본 천지인 프롬프트 생성
 * @param dbSystemPrompt - DB에서 로드한 시스템 역할 정의 (없으면 기본값 사용)
 */
function getDefaultCheonjiinPrompt(
  vars: Record<string, string>,
  flags?: { hasFaceImage: boolean; hasHandImage: boolean; hasFengshui: boolean; hasWorkAddress: boolean },
  dbSystemPrompt?: string | null
): string {
  // flags가 없으면 변수 텍스트로 fallback 판별
  const hasFaceImage = flags?.hasFaceImage ?? vars.faceImageUrl !== '관상 이미지 없음'
  const hasHandImage = flags?.hasHandImage ?? vars.handImageUrl !== '손금 이미지 없음'
  const hasFengshui = flags?.hasFengshui ?? vars.homeAddress !== '정보 없음'
  const hasWorkAddress = flags?.hasWorkAddress ?? vars.workAddress !== '정보 없음'

  // DB 시스템 프롬프트가 있으면 사용, 없으면 기본 역할 정의 사용
  const systemRole =
    dbSystemPrompt ||
    `당신은 해화당의 전문 명리학 상담가입니다. 사주·풍수·관상·손금을 통합하는 천지인(天地人) 분석을 수행합니다. 명확하고 실용적인 분석을 제공하세요. 전문 용어 사용 시 괄호 안에 쉬운 설명을 덧붙이세요.`

  return `${systemRole}

---

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

## 분석 순서 — "과거 역추산 -> 현재 공감 -> 미래 처방" 3단계 신뢰 공식

### STEP 1: 과거 역추산 (가장 중요 — 반드시 첫 번째로 분석)
대운과 세운의 충(衝)/합(合)/형(刑) 발생 시점을 역산하여 과거 3개 시점의 주요 사건을 추론하세요.
- 각 시점에 "~년경"으로 시기를 특정하세요
- "직업 변화", "이별/관계 변화", "건강 이슈", "이사/이동", "새로운 시작" 등 구체적 카테고리로
- 명리학적 근거를 반드시 포함하세요 (어떤 충/합이 발생했는지)
- 이 섹션이 사용자에게 "이걸 어떻게 알지?" 하는 소름 경험을 만들어야 합니다
- 위 대운 흐름 데이터에서 [과거] 태그가 붙은 대운을 참조하세요

### STEP 2: 현재 공감 (두 번째)
- "지금 ~하고 계시죠" 수준의 2인칭 공감 표현
- 현재 대운과 세운이 만들어내는 에너지 상태를 구체적으로 서술
- 명리학적 근거 포함
- 즉시 실행 가능한 행동 조언 (시기 포함)

### STEP 3: 미래 처방 (세 번째)
- "7월 셋째 주에 중요한 결정을 내리세요" 수준의 구체적 시기
- 행동 처방: "빨간색 소품을 놓으세요", "서쪽 방향 피하세요"

### 교차 분석 원칙
- 사주에서 재물운이 강하면 관상의 코(재백궁)와 교차 검증하세요
- 사주에서 도화살이 있으면 관상의 입(처첩궁)과 교차하세요
- 풍수 방위와 사주 용신 방위가 일치하면 강조, 불일치하면 조정 방안 제시
- 예: "사주에서 재물운이 강한데 관상에서도 코가 풍만합니다 — 이중으로 확인되는 재물복입니다"

### 기본 원칙
- 강점 70% + 약점/주의 30% (7:3 법칙)
- 전문 용어는 괄호 안에 쉬운 설명: "편관(偏官, 통제력과 추진력을 나타내는 기운)"
- 시적 전환으로 섹션을 연결: "봄비 뒤의 무지개처럼"
- 실생활에 적용할 수 있는 구체적 조언을 포함하세요.

${
  hasFengshui
    ? `### 풍수(地) 분석
집/직장 주소를 기반으로 방위와 오행 기운을 분석하세요.
- 한국의 지리적 특성과 전통 풍수 원리(배산임수, 오방위)를 적용
- 구체적 개선 방안(인테리어, 방위, 색상 등)을 실용적으로 제시`
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
각 부위의 특징과 그것이 의미하는 바를 명확히 서술하세요.`
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
각 선의 형태와 의미를 명확히 서술하세요.`
    : `### 손금(人) 분석
손금 이미지가 없으므로 palm_reading 필드를 null로 설정하세요.`
}

---

## 출력 형식 (반드시 아래 JSON 스키마를 정확히 준수)

\`\`\`json
{
  "summary": "한 줄 종합 요약 (핵심 특성 중심, 명확하게)",

  "pastRetrograde": {
    "events": [
      {
        "period": "YYYY~YYYY년",
        "description": "그 시기에 일어났을 구체적 사건 추론 (직업 변화/이별/건강/이사/새로운 시작 등)",
        "basis": "명리학적 근거 — 어떤 대운 천간이 일간을 충/합/형했는지"
      },
      {
        "period": "YYYY~YYYY년",
        "description": "두 번째 과거 사건 추론",
        "basis": "명리학적 근거"
      },
      {
        "period": "YYYY~YYYY년",
        "description": "세 번째 과거 사건 추론",
        "basis": "명리학적 근거"
      }
    ],
    "accuracyHook": "위의 내용 중 맞는 것이 있다면, 아래 미래 분석의 정확도도 높습니다. 같은 명리 원리로 과거와 미래를 함께 읽기 때문입니다."
  },

  "currentSituation": {
    "description": "지금 이 사람이 겪고 있을 상황을 2인칭으로 공감 (3~4문장)",
    "basis": "현재 세운/대운에서 어떤 십성이 작용하는지 명리학적 근거",
    "advice": "지금 당장 실행할 수 있는 구체적 행동 조언 (시기 포함)"
  },

  "cheon": {
    "title": "천(天) 분석 제목",
    "content": "천(天) 분석 본문 (최소 500자. 격국·용신·십성을 활용한 깊이 있는 분석. 이 사람의 타고난 그릇, 인생의 방향성, 핵심 재능과 한계를 현대적으로 풀이)",
    "geokguk": "격국 이름과 의미 (예: 정관격 — 조직 안에서 성과를 내는 구조)",
    "yongsin": "용신 오행과 실생활 활용법",
    "strengths": ["강점1 — 어떤 상황에서 발현되는지 구체적으로", "강점2", "강점3", "강점4", "강점5"],
    "weaknesses": ["약점1 — 실제 문제 상황과 보완법까지 포함", "약점2", "약점3", "약점4", "약점5"],
    "lifeTimeline": {
      "pastDecade": "10년 전 대운의 핵심 테마와 경험했을 사건들 (3~4문장, 구체적 연도 명시)",
      "currentDecade": "현재 대운의 에너지와 지금 집중해야 할 것 (3~4문장)",
      "nextDecade": "10년 후 대운 전환과 지금 준비해야 할 것 (3~4문장)"
    },
    "career": "직업 적성 — 구체적 직종 5개 이상, 사업 적성, 이직·승진 시기 판단",
    "wealth": "재물 패턴 — 수입 유형, 투자 적성, 재물 유입·유출 시기",
    "love": "연애·결혼운 — 연애 스타일, 이상적 배우자상, 결혼 적기, 주의 패턴",
    "health": "건강 — 취약 장기 3~4개, 시기별 주의사항, 예방 생활습관"
  },
  "ji": {
    "title": "지(地) 분석 제목",
    "content": "지(地) 분석 본문 (최소 300자, 대운·환경 분석)",
    "strengths": ["강점1", "강점2"],
    "weaknesses": ["약점1", "약점2"],
    "daewoon_phase": "현재 대운 단계 설명",
    "lucky_direction": "길한 방위",
    "fengshui": ${
      hasFengshui
        ? `{
      "home_energy": "집 주소 기반 방위 기운 분석 (최소 100자, 실용적 조언 포함)",
      "work_energy": "${hasWorkAddress ? '직장 주소 기반 방위 기운 분석 (최소 100자, 실용적 조언 포함)' : '직장 주소 정보 없음'}",
      "advice": "풍수 개선 조언 (인테리어, 방향 등 실행 가능한 수준으로)",
      "lucky_color_for_home": "집에 두면 좋은 색상"
    }`
        : 'null'
    }
  },
  "in": {
    "title": "인(人) 분석 제목",
    "content": "인(人) 분석 본문 (최소 300자, 대인관계·인연 분석)",
    "strengths": ["강점1", "강점2"],
    "weaknesses": ["약점1", "약점2"],
    "relationship_advice": "관계 조언 (구체적 행동 제안)",
    "noble_person": "귀인의 특징과 만나는 방법",
    "face_reading": ${
      hasFaceImage
        ? `{
      "overall": "전체 관상 인상 (최소 100자)",
      "forehead": "이마 분석 - 관록궁(직업운·명예운)",
      "eyes": "눈 분석 - 부처궁(재물운·부부운)",
      "nose": "코 분석 - 재백궁(현금운)",
      "mouth": "입 분석 - 처첩궁(인연운·식복)"
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
      "fate_line": "운명선 분석"
    }`
        : 'null'
    }
  },
  "lucky": {
    "color": "행운의 색상",
    "direction": "길한 방위",
    "number": 7,
    "keyword": "핵심 키워드",
    "advice": "핵심 조언 한 문장 (구체적 행동 제안)"
  },

  "crossAnalysis": {
    "sajuAndFace": "사주 데이터와 관상 데이터가 교차 확인하는 포인트 (예: '사주에서 재물운이 강한데 관상에서도 코가 풍만합니다'). 관상 이미지가 없으면 null",
    "sajuAndPalm": "사주와 손금이 교차 확인하는 포인트. 손금 이미지가 없으면 null",
    "sajuAndFengshui": "사주 용신 방위와 풍수 분석이 교차하는 포인트. 주소 정보가 없으면 null",
    "convergenceInsight": "모든 분석이 수렴하는 핵심 메시지 (천지인이 가리키는 하나의 방향, 2~3문장)"
  }
}
\`\`\`

위 JSON을 정확히 반환하세요. 마크다운 코드블록 없이 순수 JSON만 반환하세요.`
}
