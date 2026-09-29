'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTarget } from '../user/destiny'
import { calculateAge, getSajuData } from '@/lib/domain/saju/saju'
import { buildCheonjiinPrompt } from '@/lib/domain/analysis/cheonjiin-prompt'
import { saveAnalysisHistoryObserved } from '../user/history'
import { recordFortuneEntry, getSelfFamilyMemberId } from '../fortune/fortune'
import { buildMasterPromptForAction } from '@/lib/saju-engine/master-prompt-builder'
import { getCachedAnalysis, isCacheValid } from '@/lib/utils/analysis-cache'
import { getModelConfig } from '@/lib/config/ai-models'
import { generateAIContent } from '@/lib/services/ai-client'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { SAJU_CACHE_HOURS } from '@/lib/domain/payment/cache-windows'
import { chargeFeature } from '@/lib/services/feature-charge'

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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  // AI 가 실패하면 쓴 이용권을 되돌린다. 사용 전 단계에서 나가면 null 이라 아무 일도 없다.
  let refundOnFailure: (() => Promise<void>) | null = null

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
      const cached = await getCachedAnalysis(user.id, targetId, 'SAJU', SAJU_CACHE_HOURS)

      if (cached && isCacheValid(cached, SAJU_CACHE_HOURS)) {
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

    // 2.5 이용권 사용 — 🔴 **여기가 과금의 유일한 지점이다.**
    //
    // 2026-09-01 까지는 화면(saju-result-client)이 차감한 뒤 이 액션을 불렀다. 이 액션은
    // 'use server' export = 공개 엔드포인트이므로, 브라우저에서 직접 부르면 차감 없이
    // 유료 풀이가 나왔다. 화면을 잠가도 서버가 강제하지 않으면 게이트가 아니다.
    //
    // 캐시 확인 **뒤**에 둔 것도 의도다 — 캐시 적중은 새 연산이 아니라 과금하지 않는다.
    // 종전에는 클라가 먼저 차감하고 캐시면 되돌리는 왕복이 있었고, 그 왕복이 사라진다.
    const charge = await chargeFeature({ userId: user.id, featureKey: 'SAJU', costKey: 'saju', label: '사주 풀이' })
    if (!charge.ok) return charge.failure
    refundOnFailure = charge.refundOnFailure

    // 🔴 엣지 분기는 과금 «뒤»다. 엣지 사본(supabase/functions/ai-analysis)에는 이용권 코드가 없어,
    //    분기가 앞에 있으면 플래그를 켜는 순간 유료 풀이가 인증·과금 없이 나간다(image.ts 와 같은 규율).
    if (isEdgeEnabled('ai-analysis')) {
      const edge = await invokeEdgeSafe('ai-analysis', {
        action: 'analyzeCheonjiin',
        targetId,
        additionalData,
        checkOnly,
        skipCache,
        forceRefresh,
      })
      if (!edge?.success) await refundOnFailure?.()
      return edge
    }

    // 3. 나이 계산
    // 명식·오행·대운 데이터는 아래 해화지기 마스터 엔진 프롬프트에서 단일 공급한다
    // (별도 만세력 계산 주입 시 대운 등이 이중·상충되므로 제거)
    const age = calculateAge(target.birth_date)

    // 4. 변수 준비 (천지인 초고도화 데이터 포함)
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
      birthTime: target.birth_time || '시간 미상 (정오 기준 계산)',
      age: age.toString(),

      // 지(地) - 풍수 데이터 (주소)
      homeAddress,
      workAddress: resolvedWorkAddress,

      // 인(人) - 이미지는 multimodal Part로 전달, 텍스트엔 첨부 여부만 표시
      faceImageUrl: imageFlags.hasFaceImage ? '관상 이미지 첨부됨 (별도 이미지 참조)' : '관상 이미지 없음',
      handImageUrl: imageFlags.hasHandImage ? '손금 이미지 첨부됨 (별도 이미지 참조)' : '손금 이미지 없음',

      // 희소성 문구 변주용 씨앗 — 프롬프트에 그대로 실리지 않는다(명식 단일 출처는 마스터 엔진)
      raritySeed: buildRaritySeed(
        target.birth_date,
        target.birth_time,
        target.calendar_type !== 'lunar',
        target.is_leap_month ?? false
      ),
    }

    // 8. 프롬프트 생성 (해화지기 마스터 엔진 연동)
    // 마스터 엔진으로 사주 컨텍스트(신강신약, 십이운성, 신살, 합충형, 물상론) 생성
    const { prompt: engineSystemPrompt } = await buildMasterPromptForAction(
      {
        name: target.name,
        birthDate: target.birth_date,
        birthTime: target.birth_time || '12:00',
        gender: (target.gender || 'male') as 'male' | 'female',
        isSolar: target.calendar_type !== 'lunar',
        isLeapMonth: target.is_leap_month ?? false,
        birthTimeUnknown: !target.birth_time,
      },
      'CHEONJIIN',
      '',
      '',
      '',
      'premium'
    )
    // 엔진 프롬프트를 시스템 역할로 사용하고, 풍수/관상/손금 조건 섹션은 코드에서 추가
    const prompt = buildCheonjiinPrompt(variables, new Date(), imageFlags, engineSystemPrompt)

    const result = await analyzeCheonjiinWithAI(prompt, target, faceImagePart, handImagePart, user.id)

    // 운세 기록은 saveAnalysisHistory 내부에서 자동 처리됨 (recordFortuneEntry 호출)

    return { success: true, data: result, cached: false }
  } catch (error: unknown) {
    logger.error('[CheonjiinAnalysis] Error:', error)
    await refundOnFailure?.()
    const message = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    return { success: false, error: message }
  }
}

/**
 * 희소성 문구 변주의 씨앗 — 팔자 간지 8자.
 * 만세력 계산이 실패해도 풀이 자체는 계속돼야 하므로 생년월일시 문자열로 물러선다.
 */
function buildRaritySeed(birthDate: string, birthTime: string | null, isSolar: boolean, isLeapMonth: boolean): string {
  try {
    return getSajuData(birthDate, birthTime || '12:00', isSolar, isLeapMonth).ganjiList.join('')
  } catch (error: unknown) {
    logger.error('[CheonjiinAnalysis] 희소성 시드 계산 실패 — 생년월일시로 대체:', error)
    return `${birthDate}|${birthTime ?? ''}`
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
  await saveAnalysisHistoryObserved({
    target_id: target.id,
    target_name: target.name,
    target_relation: target.relation_type,
    category: 'SAJU',
    result_json: data,
    summary: (data.summary as string) || '청담해화당 통합분석 결과',
    score: 0,
    model_used: getModelConfig('cheonjiin').model,
    // 기록되는 장 수는 실사용과 같아야 한다 — 숫자를 여기 박지 않고 FEATURE_COST 에서 읽는다.
    talisman_cost: FEATURE_COST.saju.display,
  })

  logger.log('[CheonjiinAnalysis] AI 분석 완료')

  return data
}
