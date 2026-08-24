/**
 * 속풀이 문답 파이프라인 — **SSE 라우트(/api/chat/stream) 전용 코어**.
 *
 * 서버 액션은 스트림을 돌려줄 수 없어 스트리밍은 라우트 핸들러가 져야 한다. 그래서 조립(인증·차감·
 * 명식 컨텍스트·페르소나)과 마무리(감정·인연·잔여)를 이 파일로 뽑았다.
 *
 * 🔴 **의도된 중복** — 같은 로직이 app/actions/ai/shaman-chat.ts 에도 있고, 지금은 그게 맞다.
 *    2026-08-22 밤 액션까지 이 파이프라인으로 갈아끼운 채 배포했다가 프로덕션에서 속풀이가 통째로
 *    죽었다(선문안 미표시 + 「질문 횟수 소진」 오판 → alias 롤백). 이후 로컬 프로덕션 빌드로 재현을
 *    시도해 다음을 **모두 실측 기각**했다: 클라 번들 오염(.next/static grep 0건) · 모듈 로드 실패
 *    (SSE 라우트가 인증 없이 400 을 정상 반환) · 액션 매니페스트 오염(server-reference-manifest 정상).
 *    원인이 확정되지 않은 채 «이미 돌아가던 액션 경로»를 다시 이 파일에 묶는 것은 같은 사고를
 *    되풀이하는 길이다. 그래서 **액션은 종전 구현 그대로 두고, 스트리밍만 여기서 돈다.**
 *    → 스트리밍이 프로덕션에서 검증되면 그때 액션을 옮긴다. 그 전까지 두 파일을 **함께** 고칠 것.
 *
 * 🔴 이 파일은 'use server' 가 아니다 — 그래야 상수·동기 함수를 내보낼 수 있고,
 *    무엇보다 여기 함수들이 «공개 엔드포인트»가 되지 않는다(액션 파일의 export 는 전부 공개된다).
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { toGeminiHistory } from '@/lib/domain/chat/history'
import { recallMemories } from '@/lib/ai/memory'
import { guardAiInput } from '@/lib/ai/input-guard'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { getSceneData } from '@/app/actions/shrine/scene'
import { computeEnergy, indexCatalog, ELEMENTS, EL_KO } from '@/lib/domain/shrine/energy'
import { awardDeityBondForUser } from '@/lib/services/deity-bond'
import { bondProgress, BOND_LEVEL_NAMES, type BondLevel } from '@/lib/domain/shrine/deities'
import { DAILY_FREE_QUESTIONS } from '@/lib/domain/chat/constants'
import { getUserRole } from '@/lib/supabase/helpers'
import { hasUnlimitedAccess, UNLIMITED_BALANCE } from '@/lib/auth/privileges'

// --- 상수 (액션·라우트 공용) ---

/** Gemini 에 전달할 최근 메시지 수 (슬라이딩 윈도우) */
export const CHAT_HISTORY_WINDOW = 8
/** 메시지 N개마다 기억 추출 (2msg/턴 → 3턴마다) */
export const MEMORY_EXTRACT_INTERVAL = 6
/** 대화 1회당 좌정 主神에게 적립되는 인연(緣) 포인트 */
export const CHAT_BOND_POINTS = 2

/** 사주 정보 없을 때 폴백 시스템 지시문 */
export const FALLBACK_SYSTEM_PROMPT = `당신은 청담해화당의 사주 전문 상담가입니다.
오늘 날짜: {{date}}
내담자 정보: {{saju_data}}

내담자와 실시간 대화 중입니다. 질문에만 집중하여 200~400자로 간결하게 답하십시오.
전문 상담가 어투("~합니다", "~입니다")를 사용하고, 긍정 70% + 주의 30% 비율로 균형 있게 전달하십시오.
사주 용어 사용 시 괄호로 쉬운 설명을 병기하십시오.

## 대화 이어가기
- 끝에 사주 기반 후속 질문 하나를 덧붙여 대화를 자연스럽게 이어가십시오.
- 예: "혹시 최근 직장에서 변화가 있으셨나요?", "요즘 대인관계에서 스트레스를 받고 계신 건 아닌가요?"
- 모호한 질문을 받으면 "혹시 ~한 상황이신가요?" 하고 구체적 상황을 추론해 맞춰보십시오.
- 시기를 말할 때 "이번 달 셋째 주에 ~하세요"처럼 구체적으로 특정하십시오.

JSON 출력 금지. 번호 매기기·헤더 나열 금지. 분석 보고서 형식 금지.`

export const DEITY_EMOTIONS = ['neutral', 'smile', 'stern', 'sad', 'surprised', 'bless', 'angry'] as const
export type DeityEmotion = (typeof DEITY_EMOTIONS)[number]

/** 응답 맨 앞 [[emotion]] 태그 매칭기 — 스트리밍·비스트리밍이 같은 규칙을 쓴다. */
export const EMOTION_TAG_RE = /^\s*\[\[\s*(neutral|smile|stern|sad|surprised|bless|angry)\s*\]\]\s*/i

export const EMPTY_RESPONSE_FALLBACK = '신탁이 흐릿하게 전해졌습니다. 조금 다르게 다시 여쭤봐 주시겠어요?'

// --- 타입 ---

export interface ShamanChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ShamanQuestionStatus {
  success: boolean
  walletBalance: number
  dailyFreeUsed: number
  dailyFreeTotal: number
  dailyFreeRemaining: number
  /** 광고 리워드 질문권(유효분 합, P1-A) — 소비 순서는 무료 → 광고 → 구매 */
  adCredits: number
  purchasedCredits: number
  totalRemaining: number
  error?: string
}

export type ConsumedFrom = 'free' | 'ad' | 'purchased' | null

/** 조립 결과 — 모델 호출 «직전»까지의 모든 것. 스트리밍/비스트리밍이 여기서 갈린다. */
export interface PreparedChat {
  userId: string
  safeMessage: string
  systemInstruction: string
  geminiHistory: ReturnType<typeof toGeminiHistory>
  deityCode: string | null
  bondDeityId: string | null
  familyMemberId: string | null
  status: ShamanQuestionStatus
  consumedFrom: ConsumedFrom
  refundDate: string
  /** 추천 질문 생성용 — 어떤 분석 기록을 갖고 있는지 */
  records: { saju: boolean; face: boolean; hand: boolean }
}

export type PrepareResult = { ok: true; prepared: PreparedChat } | { ok: false; error: string; noCredits?: boolean }

type ServerClient = Awaited<ReturnType<typeof createClient>>

// --- 내부 헬퍼 ---

export function getGeminiModel(systemInstruction?: string) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('Google Generative AI API Key is missing')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: MODEL_FLASH,
    ...(systemInstruction ? { systemInstruction } : {}),
  })
}

/** 현재 활성 세션(ended_at IS NULL)의 요약을 로드 */
async function loadActiveSessionSummary(supabase: ServerClient, userId: string, fmId: string | null): Promise<string> {
  let q = supabase
    .from('chat_sessions')
    .select('summary')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
  q = fmId ? q.eq('family_member_id', fmId) : q.is('family_member_id', null)
  const { data } = await q.maybeSingle()
  return data?.summary ?? ''
}

/**
 * 신당 3.0 대화 컨텍스트 — 좌정 主神 페르소나 + 신당 기운/용신/신물.
 * 대상(본인/가족) 신당이 있으면 시스템 프롬프트에 얹는다. 반환 mainDeityId 로 대화 후 인연 적립.
 */
async function buildShrineContext(familyMemberId: string | null): Promise<{
  block: string
  mainDeityId: string | null
  deityCode: string | null
} | null> {
  try {
    const scene = await getSceneData(familyMemberId)
    if (!scene) return null

    const catalogById = indexCatalog(scene.catalog)
    const { energy, yongsin } = computeEnergy(scene.profile.base, scene.placements, catalogById)
    const itemNames = scene.placements
      .map((p) => catalogById.get(p.catalogItemId)?.name)
      .filter((n): n is string => !!n)
    const energyLine = ELEMENTS.map((el) => `${EL_KO[el]}${energy[el]}`).join(' ')
    const yongsinKo = EL_KO[scene.profile.yongsin ?? yongsin]

    let deityPersona = ''
    let mainDeityId: string | null = null
    if (scene.mainDeity) {
      const supabase = await createClient()
      const { data } = await supabase
        .from('shrine_deities')
        .select('id, name, personality, tone')
        .eq('code', scene.mainDeity.code)
        .maybeSingle()
      if (data) {
        mainDeityId = data.id

        // 인연(緣) 해금 — 단계에 따라 표정 폭·호칭·심층 주제가 열린다 (bondUnlocks)
        const bond = bondProgress(scene.mainDeity.bondPoints ?? 0)
        const allowedEmotions =
          bond.unlocks.emotions >= 7
            ? DEITY_EMOTIONS
            : (['neutral', 'smile'] as const satisfies readonly DeityEmotion[])
        const bondLines = [
          `이 내담자와의 인연(緣): ${BOND_LEVEL_NAMES[bond.level]} 단계.`,
          bond.unlocks.nickname
            ? '오래 알고 지낸 사이처럼 당신의 말투에 맞는 다정한 호칭으로 내담자를 부르십시오.'
            : '아직 서로를 알아가는 사이 — 호칭은 정중하게 유지하십시오.',
          bond.unlocks.deepTopics
            ? '인연이 깊으니 타고난 근원 기질·평생의 큰 흐름 같은 심층 주제도 먼저 꺼낼 수 있습니다.'
            : '',
        ]
          .filter(Boolean)
          .join(' ')

        deityPersona =
          `당신은 이 신당에 좌정한 수호신 "${data.name}"입니다. ` +
          `${data.personality ? data.personality + ' ' : ''}` +
          `말투: ${data.tone || '따뜻하고 신비로우며 정중한 존댓말'}. ` +
          `${bondLines}\n` +
          `신위로서 첫인칭으로 답하되, 아래 사주·신당 기운을 근거로 조언하십시오.\n` +
          `응답 맨 앞에 당신의 표정을 [[감정]] 형식으로 한 번만 붙이십시오. ` +
          `감정은 ${allowedEmotions.join('/')} 중 내용에 맞는 하나. 예: "[[smile]] 어서 오시게…"`
      }
    }

    const block = [
      deityPersona,
      `[신당] ${scene.shrineName} · 신물: ${itemNames.join(', ') || '아직 없음'} · 기운: ${energyLine} · 용신(부족한 기운): ${yongsinKo}`,
      `가장 부족한 ${yongsinKo} 기운을 채우는 신물·행동을 자연스럽게 권하십시오.`,
    ]
      .filter(Boolean)
      .join('\n')

    return { block, mainDeityId, deityCode: scene.mainDeity?.code ?? null }
  } catch (e) {
    logger.warn('[shaman-chat] shrine context skipped:', e)
    return null
  }
}

// --- 공개 API ---

/**
 * 질문권 현황 — 무료(일일)·광고·구매 세 주머니의 합.
 * 서버 액션 getShamanQuestionStatus 가 이 함수를 그대로 감싼다(단일 출처).
 */
export async function loadQuestionStatus(): Promise<ShamanQuestionStatus> {
  const defaultResult: ShamanQuestionStatus = {
    success: false,
    walletBalance: 0,
    dailyFreeUsed: 0,
    dailyFreeTotal: DAILY_FREE_QUESTIONS,
    dailyFreeRemaining: DAILY_FREE_QUESTIONS,
    adCredits: 0,
    purchasedCredits: 0,
    totalRemaining: DAILY_FREE_QUESTIONS,
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ...defaultResult, error: '로그인이 필요합니다.' }

    const today = new Date().toISOString().split('T')[0]

    const [walletBalance, usageResult, creditsResult, adLedgerResult] = await Promise.all([
      getWalletBalance(), // admin=999, tester=100, 일반=실제 잔액
      supabase.from('ai_chat_usage').select('total_turns').eq('user_id', user.id).eq('usage_date', today).maybeSingle(),
      supabase.from('shaman_question_credits').select('purchased_credits').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('ad_reward_ledger')
        .select('remaining, expires_at')
        .eq('user_id', user.id)
        .eq('status', 'granted')
        .gt('remaining', 0),
    ])
    const dailyFreeUsed = usageResult.data?.total_turns ?? 0
    const purchasedCredits = creditsResult.data?.purchased_credits ?? 0
    const nowMs = Date.now()
    const adCredits = (adLedgerResult.data ?? [])
      .filter((r) => r.expires_at && new Date(r.expires_at as string).getTime() > nowMs)
      .reduce((sum, r) => sum + (r.remaining ?? 0), 0)

    // 마스터: 일일 10회 제한도 개방 (잔액만 무한이고 질문은 막히던 비대칭 해소)
    const role = await getUserRole(supabase, user.id)
    if (hasUnlimitedAccess(role)) {
      return {
        success: true,
        walletBalance,
        dailyFreeUsed,
        dailyFreeTotal: UNLIMITED_BALANCE,
        dailyFreeRemaining: UNLIMITED_BALANCE,
        adCredits,
        purchasedCredits,
        totalRemaining: UNLIMITED_BALANCE,
      }
    }

    const dailyFreeRemaining = Math.max(0, DAILY_FREE_QUESTIONS - dailyFreeUsed)
    const totalRemaining = dailyFreeRemaining + adCredits + purchasedCredits

    return {
      success: true,
      walletBalance,
      dailyFreeUsed,
      dailyFreeTotal: DAILY_FREE_QUESTIONS,
      dailyFreeRemaining,
      adCredits,
      purchasedCredits,
      totalRemaining,
    }
  } catch (error) {
    logger.error('[loadQuestionStatus] Error:', error)
    return { ...defaultResult, error: '상태 조회 중 오류가 발생했습니다.' }
  }
}

/**
 * 모델 호출 직전까지 — 가드·인증·레이트리밋·잔량 확인·질문권 차감·컨텍스트 조립.
 *
 * 🔴 차감이 모델 호출 «앞»에 있는 것은 의도다(동시 요청의 이중 소비 방지). 대신 호출이 실패하면
 *    refundConsumed 로 되돌린다 — 그 짝을 반드시 함께 부를 것.
 */
export async function prepareShamanChat(
  message: string,
  conversationHistory: ShamanChatMessage[],
  familyMemberId?: string
): Promise<PrepareResult> {
  // 입력 가드(S2): 길이 상한 + 프롬프트 인젝션 의심 플래그. 정제된 텍스트만 프롬프트로.
  const guarded = guardAiInput(message)
  if (!guarded.text) return { ok: false, error: '메시지를 입력해주세요.' }
  const safeMessage = guarded.text
  if (guarded.suspicious) {
    logger.warn('[prepareShamanChat] 프롬프트 인젝션 의심 입력 감지', { length: safeMessage.length })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인 필요' }

  // Rate limit(S3): 질문권과 별개의 버스트 방어 — 분당 20회/유저.
  const rl = await rateLimit(`ai-shaman:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 20 })
  if (!rl.success) return { ok: false, error: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }

  const adminClient = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // 1. 질문권 현황 확인
  const status = await loadQuestionStatus()
  if (!status.success) return { ok: false, error: status.error ?? '상태 조회 실패' }
  if (status.totalRemaining <= 0) {
    return {
      ok: false,
      error: '질문 횟수가 모두 소진되었습니다. 복채 1만냥으로 질문권 20회를 충전하세요.',
      noCredits: true,
    }
  }

  // 2. 질문권 소비 (무료 → 광고 → 구매). 성공한 소비처를 기억한다 — 실패 시 되돌린다.
  let consumedFrom: ConsumedFrom = null
  if (status.dailyFreeRemaining > 0) {
    const { error: rpcError } = await adminClient.rpc('record_ai_chat_turn', {
      p_user_id: user.id,
      p_date: today,
      p_talisman_used: 0,
    })
    if (rpcError)
      logger.error('[prepareShamanChat] RPC error:', rpcError) // non-fatal
    else consumedFrom = 'free'
  } else {
    let adConsumed = false
    if (status.adCredits > 0) {
      const { data: adLeft, error: adError } = await adminClient.rpc('consume_ad_credit', { p_user_id: user.id })
      if (adError) logger.error('[prepareShamanChat] ad credit consume error:', adError)
      adConsumed = !adError && typeof adLeft === 'number' && adLeft >= 0
      if (adConsumed) consumedFrom = 'ad'
    }
    if (!adConsumed) {
      const { error: consumeError } = await adminClient.rpc('consume_shaman_credit', { p_user_id: user.id })
      if (consumeError) logger.error('[prepareShamanChat] credit consume error:', consumeError)
      else consumedFrom = 'purchased'
    }
  }

  // 3. 대상(본인/가족) 컨텍스트
  let targetName = '내담자'
  let targetGender = '미상'
  let targetBirth = '미상'
  let targetBirthTime = '00:00'
  let targetIsSolar = true

  if (familyMemberId && familyMemberId !== 'self') {
    const { data: familyMember } = await supabase
      .from('family_members')
      .select('name, gender, birth_date, birth_time, calendar_type')
      .eq('id', familyMemberId)
      .single()
    if (familyMember) {
      targetName = familyMember.name || '내담자 가족'
      targetGender = familyMember.gender === 'M' ? '남성' : familyMember.gender === 'F' ? '여성' : '미상'
      targetBirth = familyMember.birth_date || '미상'
      targetBirthTime = familyMember.birth_time || '00:00'
      targetIsSolar = familyMember.calendar_type !== 'lunar'
    }
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, gender, birth_date, birth_time, calendar_type')
      .eq('id', user.id)
      .single()
    if (profile) {
      targetName = profile.full_name || '내담자'
      targetGender = profile.gender || '미상'
      targetBirth = profile.birth_date || '미상'
      targetBirthTime = profile.birth_time || '00:00'
      targetIsSolar = profile.calendar_type !== 'lunar'
    }
  }

  // analysis_history 의 대상 키는 target_id — 가족은 family_members.id, **본인은 user_id**(NULL 아님).
  const { data: history } = await supabase
    .from('analysis_history')
    .select('category, result_json, summary, score')
    .eq('user_id', user.id)
    .eq('target_id', familyMemberId && familyMemberId !== 'self' ? familyMemberId : user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const sajuRecord = history?.find((h) => h.category === 'SAJU' || h.category === 'TODAY')
  const faceRecord = history?.find((h) => h.category === 'FACE')
  const handRecord = history?.find((h) => h.category === 'HAND')

  const historyParts: string[] = []
  if (sajuRecord) historyParts.push(`[사주 분석 요약] ${sajuRecord.summary} (점수: ${sajuRecord.score})`)
  if (faceRecord) historyParts.push(`[관상 분석 요약] ${faceRecord.summary} (점수: ${faceRecord.score})`)
  if (handRecord) historyParts.push(`[손금 분석 요약] ${handRecord.summary} (점수: ${handRecord.score})`)

  // 3.5 세션 간 장기 기억 + 지난 대화 요약 (병렬)
  const fmId = familyMemberId && familyMemberId !== 'self' ? familyMemberId : null
  const [recalledMemory, sessionSummary] = await Promise.all([
    recallMemories(user.id, fmId, 5),
    loadActiveSessionSummary(supabase, user.id, fmId),
  ])
  const summaryBlock = sessionSummary ? `[지난 대화 요약]\n${sessionSummary}` : ''

  // 4. 마스터 엔진으로 systemInstruction 조립
  let systemInstruction: string
  if (targetBirth !== '미상') {
    const { buildMasterPromptForAction } = await import('@/lib/saju-engine/master-prompt-builder')
    const additionalCtx = [
      `[점사 기준일]: ${today}`,
      recalledMemory,
      summaryBlock,
      historyParts.length > 0 ? `[과거 분석 기록]\n${historyParts.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const { prompt } = await buildMasterPromptForAction(
      {
        name: targetName,
        birthDate: targetBirth,
        birthTime: targetBirthTime,
        gender: targetGender === '남성' ? 'male' : 'female',
        isSolar: targetIsSolar,
      },
      'SHAMAN_CHAT',
      '',
      additionalCtx,
      '' // 채팅은 JSON 출력 없음
    )
    systemInstruction = prompt
  } else {
    const userContext = [
      `이름: ${targetName}, 성별: ${targetGender}`,
      historyParts.length > 0 ? historyParts.join('\n') : '',
      recalledMemory,
      summaryBlock,
    ]
      .filter(Boolean)
      .join('\n')
    systemInstruction = FALLBACK_SYSTEM_PROMPT.replace(/{{date}}/g, today).replace(/{{saju_data}}/g, userContext)
  }

  // 4.5 신당 3.0: 좌정 主神 페르소나 + 신당 기운
  let bondDeityId: string | null = null
  let deityCode: string | null = null
  const shrineCtx = await buildShrineContext(fmId)
  if (shrineCtx) {
    systemInstruction += `\n\n${shrineCtx.block}`
    bondDeityId = shrineCtx.mainDeityId
    deityCode = shrineCtx.deityCode
  }

  // 5. 히스토리 — 🔴 첫 항목은 user 여야 한다. 선문안(assistant)이 먼저 오면 SDK 가 호출 전에 거절해
  //    속풀이가 통째로 죽는다(2026-08-16). 규칙은 lib/domain/chat/history.ts 가 단독으로 든다.
  const geminiHistory = toGeminiHistory(conversationHistory, CHAT_HISTORY_WINDOW, (text) => guardAiInput(text).text)

  return {
    ok: true,
    prepared: {
      userId: user.id,
      safeMessage,
      systemInstruction,
      geminiHistory,
      deityCode,
      bondDeityId,
      familyMemberId: fmId,
      status,
      consumedFrom,
      refundDate: today,
      records: { saju: !!sajuRecord, face: !!faceRecord, hand: !!handRecord },
    },
  }
}

/** 응답 본문에서 감정 태그를 떼고 잔재를 지운다. 스트리밍은 첫 청크에서 이 규칙을 쓴다. */
export function stripEmotionTag(
  rawText: string,
  deityCode: string | null
): { text: string; emotion: DeityEmotion | null } {
  let emotion: DeityEmotion | null = null
  let responseText = rawText
  if (deityCode) {
    const m = rawText.match(EMOTION_TAG_RE)
    if (m) {
      emotion = m[1].toLowerCase() as DeityEmotion
      responseText = rawText.slice(m[0].length)
    }
  }
  const cleaned =
    responseText.replace(/\[\[[^\]]*\]\]/g, '').trim() ||
    rawText.replace(/\[\[[^\]]*\]\]/g, '').trim() ||
    EMPTY_RESPONSE_FALLBACK
  return { text: cleaned, emotion }
}

export interface FinalizeResult {
  responseText: string
  emotion: DeityEmotion | null
  bondLeveledUp: boolean
  bondLevelName?: string
  suggestedQuestions: string[]
  remaining: { free: number; ad: number; purchased: number; total: number }
}

/**
 * 모델 응답 이후 — 감정 파싱·인연 적립·추천 질문·서버 기준 잔여.
 * 스트리밍 경로는 본문을 이미 흘려보냈으므로 responseText 를 다시 쓰진 않지만,
 * 감정/인연/잔여는 같은 계산을 거쳐야 두 경로의 결과가 어긋나지 않는다.
 */
export async function finalizeShamanChat(prepared: PreparedChat, rawText: string): Promise<FinalizeResult> {
  const { text: responseText, emotion } = stripEmotionTag(rawText, prepared.deityCode)

  // 인연(緣) 적립 — 레벨업 여부를 응답에 실어야 하므로 동기 수행(원자 RPC ~수십ms)
  let bondLeveledUp = false
  let bondLevelName: string | undefined
  if (prepared.bondDeityId) {
    try {
      const r = await awardDeityBondForUser(
        prepared.userId,
        prepared.bondDeityId,
        CHAT_BOND_POINTS,
        prepared.familyMemberId
      )
      if (!r.success) logger.warn('[finalizeShamanChat] bond award skipped:', r.error)
      else if (r.leveledUp && typeof r.level === 'number') {
        bondLeveledUp = true
        bondLevelName = BOND_LEVEL_NAMES[r.level as BondLevel]
      }
    } catch (e) {
      logger.warn('[finalizeShamanChat] bond award error:', e)
    }
  }

  // 추천 질문(이어 여쭙기 칩) — 보유한 분석 기록 기반
  const suggestions: string[] = []
  if (prepared.records.saju) suggestions.push('제 사주에서 가장 강한 기운은 무엇인가요?')
  if (prepared.records.face) suggestions.push('관상학적으로 부족한 부분을 어떻게 보완할까요?')
  if (prepared.records.hand) suggestions.push('손금에서 가장 주목해야 할 부분이 있나요?')
  suggestions.push('올해 가장 조심해야 할 것은?', '이번 달 주요 운세 흐름은?', '저에게 맞는 개운법을 알려주세요')

  // 서버 기준 잔여(차감 반영). 마스터(UNLIMITED_BALANCE)는 감산 없이 그대로 내려간다.
  const s = prepared.status
  const free = prepared.consumedFrom === 'free' ? Math.max(0, s.dailyFreeRemaining - 1) : s.dailyFreeRemaining
  const ad = prepared.consumedFrom === 'ad' ? Math.max(0, s.adCredits - 1) : s.adCredits
  const purchased = prepared.consumedFrom === 'purchased' ? Math.max(0, s.purchasedCredits - 1) : s.purchasedCredits

  return {
    responseText,
    emotion,
    bondLeveledUp,
    bondLevelName,
    suggestedQuestions: suggestions.slice(0, 4),
    remaining: { free, ad, purchased, total: free + ad + purchased },
  }
}

/**
 * 모델 호출이 실패했을 때 — 차감한 질문권을 소비처 그대로 되돌린다(P0-F5).
 * 광고 표가 만료로 사라졌으면 구매권 +1 로 갚는다(사용자에게 손해 없는 방향).
 */
export async function refundConsumed(prepared: Pick<PreparedChat, 'userId' | 'consumedFrom' | 'refundDate'>) {
  if (!prepared.consumedFrom) return
  try {
    const adminClient = createAdminClient()
    if (prepared.consumedFrom === 'free') {
      const { error } = await adminClient.rpc('refund_ai_chat_turn', {
        p_user_id: prepared.userId,
        p_date: prepared.refundDate,
      })
      if (error) logger.error('[refundConsumed] 질문권 환급 실패(free):', error)
    } else if (prepared.consumedFrom === 'ad') {
      const { data: adBack, error: adError } = await adminClient.rpc('refund_ad_credit', {
        p_user_id: prepared.userId,
      })
      if (adError || adBack === -1) {
        const { error: fbError } = await adminClient.rpc('add_shaman_credits', {
          p_user_id: prepared.userId,
          p_amount: 1,
        })
        if (fbError) logger.error('[refundConsumed] 광고권 환급 폴백 실패:', fbError, adError)
      }
    } else {
      const { error } = await adminClient.rpc('add_shaman_credits', { p_user_id: prepared.userId, p_amount: 1 })
      if (error) logger.error('[refundConsumed] 질문권 환급 실패(purchased):', error)
    }
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error(String(e)), '[refundConsumed]')
  }
}
