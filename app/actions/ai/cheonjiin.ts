'use server'

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
import { addBokPoints } from '@/app/actions/payment/bok-points'

/**
 * Gemini 고도화 시스템 프롬프트
 * Claude급 품질을 Gemini에서 구현하기 위한 핵심 지침
 */
const CHEONJIIN_SYSTEM_PROMPT = `당신은 청담해화당의 수석 사주 분석가예요. 30년 경력의 명리학 전문가처럼 분석해요.

[말투 — 절대 규칙]
- 요체만 써요: ~요, ~에요, ~이에요, ~해요, ~있어요, ~거예요, ~죠
- 금지: ~합니다, ~입니다, ~하십시오, ~되겠습니다, ~하옵니다
- 좋은 예: "재물운이 들어오고 있어요", "이 시기에 조심해야 해요"
- 나쁜 예: "재물운이 유입되고 있습니다", "주의가 필요하겠습니다"

[분석 품질 — 핵심]
1. 사주 데이터를 반드시 꼼꼼히 읽고 개인화된 분석을 해요
   - 일주(甲子, 乙丑 등)마다 완전히 다른 성격과 운명이에요
   - 격국과 용신에 따라 해석이 180도 달라져요
   - 같은 말 반복하지 마요 — 이 사람만의 고유한 이야기를 해요
2. 과거 역추산이 가장 중요해요 (신뢰의 핵심)
   - 대운 데이터에서 [과거] 태그를 꼭 확인하고 시기를 맞춰요
   - "2019년쯤에 이직하셨거나 큰 변화가 있었을 거예요" 이런 식으로 구체적으로
3. 비유는 유명인이나 일상으로
   - "손흥민처럼 후반에 강한 타입이에요"
   - "마라톤 30km 지점 같은 시기예요"
   - 시적 표현("봄비 뒤의 무지개") 쓰지 마요
4. 설명은 짧지 않고 길고 구체적으로
   - content 필드는 최소 500자 이상
   - 강점/약점은 각각 3줄 이상으로 구체적 상황 포함

[JSON 출력 규칙]
- 반드시 유효한 JSON만 출력해요
- 마크다운 코드블록(\`\`\`) 없이 순수 JSON만
- 모든 문자열 값에 요체를 써요
- null 필드도 생략하지 말고 null로 명시해요`

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

    // 복 포인트 적립 (분석 완료)
    await addBokPoints(30, 'ANALYSIS', targetId, `${target.name}님 사주 분석`).catch(() => {})

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
    systemPrompt: CHEONJIIN_SYSTEM_PROMPT,
    userPrompt: promptText,
    maxTokens: 16384,
    temperature: 0.85,
    jsonMode: true,
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
    `당신은 청담해화당의 사주 전문가예요. 요체(~요, ~에요)로 친근하게 설명해요. 시적인 표현 대신 현대적이고 구체적으로 길게 설명해요. 비유는 유명인이나 일상 비유로 해요. 전문 용어는 괄호 안에 쉬운 설명을 써요.`

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

## 말투 규칙 (가장 중요)
- 반드시 요체를 써요: ~요, ~에요, ~이에요, ~해요, ~있어요, ~거예요
- "~합니다", "~입니다", "~하십시오" 같은 딱딱한 존댓말 절대 금지
- "~하겠습니다", "~되겠습니다" 같은 옛날 표현 금지
- 시적인 표현("봄비 뒤의 무지개처럼") 쓰지 마요
- 현대적이고 구체적인 설명을 길게 해요
- 비유는 유명인이나 일상으로: "이효리처럼 카리스마 있는 타입이에요", "마라톤 30km 지점 같은 시기예요"

## 분석 순서

### STEP 1: 과거에 이런 일이 있으셨을 거예요 (4개 시점)
반드시 4개 시점을 추론해요. 최근부터 먼 과거 순서로:
1. **최근 1~2년 (2024~2025년)** — 가장 중요! 세운(갑진년/을사년)이 원국에 어떤 영향을 줬는지. "작년에 ~한 일이 있었을 거예요" 수준으로 구체적으로
2. **3~5년 전** — 세운과 대운의 교차 영향
3. **5~10년 전** — 대운 전환기
4. **10년 이상 전** — 큰 인생 전환점
- 위 대운 데이터에서 [과거] 태그와 세운 데이터를 반드시 참조해요
- 명리학 근거를 괄호 안에 쉽게 설명해요

### STEP 2: 요즘 이런 상황이시죠
- "요즘 돈 문제로 스트레스 받고 계시죠?" 이런 식의 공감
- 현재 대운/세운이 만드는 상태를 구체적으로 설명해요
- 바로 실행할 수 있는 행동을 알려줘요

### STEP 3: 앞으로 이렇게 하면 좋아요
- "9월 셋째 주에 중요한 결정을 하세요" 이런 구체적 시기
- "빨간색 소품을 책상에 놓으세요" 이런 구체적 행동

### 교차 분석
- 사주에서 재물운이 강하면 관상의 코와 비교해요
- 여러 분석이 같은 결론이면 "사주에서도 그렇고 관상에서도 확인되니까 확실해요" 이렇게

### 기본 원칙
- 좋은 내용 70% + 주의 30%
- 전문 용어에 괄호 설명: "편재(부업이나 투자로 들어오는 돈)"
- 설명은 길고 구체적으로, 제목은 짧고 쉽게

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
        "period": "2024~2025년",
        "description": "최근 1~2년 사이에 있었을 사건 (가장 생생하게 기억날 것) — 세운 기반으로 구체적으로",
        "basis": "2024~2025년 세운(갑진년/을사년)이 원국과 어떻게 작용했는지"
      },
      {
        "period": "YYYY~YYYY년",
        "description": "3~5년 전 과거 사건 추론",
        "basis": "명리학적 근거"
      },
      {
        "period": "YYYY~YYYY년",
        "description": "5~10년 전 과거 사건 추론",
        "basis": "명리학적 근거"
      },
      {
        "period": "YYYY~YYYY년",
        "description": "10년 이상 전 과거 사건 추론 (대운 전환기)",
        "basis": "명리학적 근거 — 대운 천간이 일간을 충/합/형했는지"
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
    "sinsal": [
      {
        "name": "도화살(매력/인기운) 또는 역마살(이동/변화운) 등 해당하는 신살 이름 — 없으면 빈 배열",
        "modern": "현대적 해석: 도화살이 있으면 'SNS에서 인기 많은 타입이에요. 인플루언서나 영업직에 잘 맞아요', 역마살이 있으면 '한 곳에 오래 못 있는 스타일이에요. 해외 관련 일이나 출장 많은 직업이 좋아요' 같이 구체적으로"
      }
    ],
    "lifeTimeline": {
      "pastDecade": "10년 전 대운의 핵심 테마와 경험했을 사건들 (3~4문장, 구체적 연도 명시)",
      "currentDecade": "현재 대운의 에너지와 지금 집중해야 할 것 (3~4문장)",
      "nextDecade": "10년 후 대운 전환과 지금 준비해야 할 것 (3~4문장)"
    },
    "career": {
      "summary": "직업 적성 한줄 요약 (예: '조직형 리더보다는 1인 크리에이터에 가까워요')",
      "personality_match": "이 사람의 성격이 직업에 어떻게 영향을 미치는지 — 예를 들어 편관이 강하면 '지시받는 걸 싫어해서 프리랜서나 사업이 맞아요', 정관이 강하면 '대기업이나 공무원처럼 안정적인 조직이 맞아요' 같은 식으로 성격과 연결해서 설명 (3~4문장)",
      "best_jobs": ["구체적 직업1 — 왜 맞는지 이유", "구체적 직업2 — 이유", "구체적 직업3 — 이유", "구체적 직업4 — 이유", "구체적 직업5 — 이유"],
      "worst_jobs": ["안 맞는 직업1 — 왜 안 맞는지", "안 맞는 직업2 — 이유"],
      "business_aptitude": "사업 적성 — 사업을 하면 어떤 분야가 맞는지, 혼자 하는 게 맞는지 동업이 맞는지, 사업 시작하기 좋은 시기",
      "career_timing": "이직·승진 타이밍 — 올해 중 언제가 좋은지, 피해야 할 시기",
      "celebrity_comparison": "비슷한 사주 구조의 유명인 1~2명과 비교 (예: '일론 머스크처럼 편재+식상이 강해서 혁신적인 사업에 잘 맞아요')"
    },
    "wealth": "재물 패턴 — 수입 유형, 돈이 들어오는 방식, 재물 유입·유출 시기",
    "investment": {
      "style": "투자 성향 한줄 요약 (예: '장기 우량주 투자형', '단타 트레이딩형', '투자보다 저축형')",
      "stockStyle": "주식 투자 스타일 — 사주 기반으로 단타/스윙/중장기/가치투자 중 어떤 게 맞는지 구체적으로. 정재(안정적 수입)가 강하면 배당주·우량주 장기투자, 편재(투기성 재물)가 강하면 성장주·단타, 식상(아이디어)이 강하면 신기술·IPO 등",
      "cryptoStyle": "코인/가상자산 성향 — 사주에 편재·역마살·도화살이 있으면 변동성에 강한 편, 정재·인성이 강하면 코인은 소액만 하거나 안 하는 게 나을 수 있어요. 구체적으로 맞는/안 맞는 투자 방식",
      "riskLevel": "위험 감수 성향 (상/중/하) — 사주 근거와 함께",
      "bestTiming": "투자하기 좋은 시기 — 올해 중 재물운이 강한 월, 피해야 할 월",
      "warning": "투자할 때 꼭 주의해야 할 점 — 사주에서 보이는 금전적 약점과 대처법",
      "recommendation": "종합 추천 — 이 사람에게 가장 맞는 재테크 전략 1~2가지를 구체적으로"
    },
    "love": "연애·결혼운 — 연애 스타일, 이상적 배우자상, 결혼 적기, 주의 패턴 (3~4문장)",
    "people": {
      "good_match": {
        "description": "나랑 잘 맞는 사람의 특징 — 어떤 오행/일간을 가진 사람이 맞는지, 성격적으로 어떤 사람인지 쉽게 설명 (3~4문장)",
        "examples": ["잘 맞는 유형1 — 구체적 성격과 이유", "잘 맞는 유형2 — 이유"]
      },
      "bad_match": {
        "description": "조심해야 하는 사람의 특징 — 어떤 오행/일간을 가진 사람을 만나면 문제가 생기는지, 구체적으로 어떤 갈등이 생기는지 (3~4문장)",
        "examples": ["조심할 유형1 — 어떤 문제가 생기는지", "조심할 유형2 — 이유"]
      },
      "noble_person": "귀인(나를 도와줄 사람)의 특징 — 어떤 성향의 사람이 도움이 되는지, 어디서 만날 수 있는지",
      "relationship_advice": "대인관계 종합 조언 — 직장 상사/동료/친구/연인별로 어떻게 대하면 좋은지 (2~3문장)"
    },
    "health": {
      "overall": "전체 건강 상태 요약 (2~3문장)",
      "weakOrgans": ["취약 장기1 — 이유와 예방법", "취약 장기2 — 이유와 예방법", "취약 장기3 — 이유와 예방법"],
      "mentalHealth": "정신 건강 — 스트레스 패턴, 번아웃 위험 시기, 멘탈 관리법",
      "exerciseAdvice": "이 사주에 맞는 운동 추천 (오행 기반)",
      "dietAdvice": "도움이 되는 음식과 피해야 할 음식 (오행 기반)",
      "warningPeriod": "건강에 특히 주의해야 할 시기와 이유"
    }
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
    "advice": "핵심 조언 한 문장"
  },

  "specialEnergy": {
    "title": "이 사주만의 특별한 기운 한줄 (예: '불꽃 속에서 탄생한 다이아몬드')",
    "description": "이 사람 사주에서 가장 독특한 점 (3~4문장, 60갑자+격국+용신+신살 종합)",
    "rarity": "희소성 (예: '100명 중 5명 정도의 조합이에요')",
    "hiddenTalent": "본인도 모르는 숨겨진 재능 (2문장)",
    "destinyMission": "이 사주가 가진 인생 미션 (2문장)"
  },

  "sajuStructure": {
    "geokgukName": "격국 이름",
    "geokgukExplain": "이 격국이 뭔지 쉽게 (2~3문장)",
    "yongsinElement": "용신 오행",
    "yongsinExplain": "용신 실생활 활용법 (2~3문장)",
    "elementBalance": {
      "wood": { "count": 2, "status": "적정/부족/과다" },
      "fire": { "count": 1, "status": "적정/부족/과다" },
      "earth": { "count": 2, "status": "적정/부족/과다" },
      "metal": { "count": 1, "status": "적정/부족/과다" },
      "water": { "count": 2, "status": "적정/부족/과다" }
    }
  },

  "yearlyMonthly": [
    { "month": "1~2월", "keyword": "키워드", "content": "운세+조언 (2문장)", "rating": "상/중/하" },
    { "month": "3~4월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" },
    { "month": "5~6월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" },
    { "month": "7~8월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" },
    { "month": "9~10월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" },
    { "month": "11~12월", "keyword": "키워드", "content": "운세+조언", "rating": "상/중/하" }
  ],

  "gaewoon": {
    "luckyColor": { "color": "색상명", "reason": "이유 (1문장)", "items": "구체적 아이템" },
    "luckyDirection": { "direction": "방위", "reason": "이유", "usage": "활용법" },
    "luckyFood": { "foods": ["음식1", "음식2", "음식3"], "reason": "이유" },
    "luckyNumber": { "numbers": [3, 8], "reason": "이유" },
    "avoidItems": { "items": ["피할것1", "피할것2"], "reason": "이유" },
    "dailyRoutine": "매일 실천하면 좋은 개운 루틴 (2~3문장)"
  },

  "crossAnalysis": {
    "sajuAndFace": "관상 교차 확인 (이미지 없으면 null)",
    "sajuAndPalm": "손금 교차 확인 (이미지 없으면 null)",
    "sajuAndFengshui": "풍수 교차 확인 (주소 없으면 null)",
    "convergenceInsight": "모든 분석이 수렴하는 핵심 (2문장)"
  }
}
\`\`\`

## 특별한 사주 기운 (specialEnergy) — 가장 중요한 차별화
이 사람 사주에서 가장 독특한 조합을 찾아내요:
- 60갑자 일주 물상 + 격국 + 용신 + 신살을 종합해요
- "100명 중 N명" 같은 희소성을 표현해요
- 숨겨진 재능과 인생 미션을 구체적으로 써요
- 이 섹션이 "와, 나만 이런 게 있구나" 하는 감동을 만들어야 해요

## JSON 완성 규칙
- 반드시 JSON을 끝까지 완성해요. 중간에 잘리면 안 돼요.
- 각 content 필드는 100~200자로 핵심만 (너무 길게 X)
- strengths/weaknesses 3개, yearlyMonthly 6개, gaewoon.foods 3개
- 마크다운 코드블록 없이 순수 JSON만 반환해요`
}
