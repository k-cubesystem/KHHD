'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { recallMemories, extractAndSaveMemories } from '@/lib/ai/memory'
import { maybeSummarizeSession } from '@/lib/ai/summarizer'
import { guardAiInput } from '@/lib/ai/input-guard'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'
import { getSceneData } from '@/app/actions/shrine/scene'
import { computeEnergy, indexCatalog, ELEMENTS, EL_KO } from '@/lib/domain/shrine/energy'
import { awardDeityBondForUser } from '@/lib/services/deity-bond'
import { spendBokchae, refundBokchae } from '@/lib/services/bokchae'
import { bondProgress, BOND_LEVEL_NAMES, type BondLevel } from '@/lib/domain/shrine/deities'

// --- Constants ---

const DAILY_FREE_QUESTIONS = 10
const PURCHASE_COST = 1 // 1만냥 (wallets.balance 단위: 1 = 1만냥)
const PURCHASE_QUESTIONS = 20 // 회
const CHAT_HISTORY_WINDOW = 8 // Gemini에 전달할 최근 메시지 수 (슬라이딩 윈도우)
const MEMORY_EXTRACT_INTERVAL = 6 // 메시지 N개마다 기억 추출 (2msg/턴 → 3턴마다)

// 사주 정보 없을 때 폴백 시스템 지시문
const FALLBACK_SYSTEM_PROMPT = `당신은 청담해화당의 사주 전문 상담가입니다.
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

// 대화 1회당 좌정 主神에게 적립되는 인연(緣) 포인트
const CHAT_BOND_POINTS = 2

/**
 * 신당 3.0 대화 컨텍스트 — 좌정 主神 페르소나 + 신당 기운/용신/신물.
 * (구 shrine-chat 통합) 대상(본인/가족) 신당이 있으면 시스템 프롬프트에 얹는다.
 * 가족 대화면 그 가족 신당의 主神·인연 스코프 적용. 반환 mainDeityId 로 대화 후 인연 적립.
 */
const DEITY_EMOTIONS = ['neutral', 'smile', 'stern', 'sad', 'surprised', 'bless', 'angry'] as const
type DeityEmotion = (typeof DEITY_EMOTIONS)[number]

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
    logger.warn('[sendShamanChatMessage] shrine context skipped:', e)
    return null
  }
}

const RANDOM_STARTERS = [
  '오늘의 총운이 궁금해요',
  '이번 달 재물운 흐름은?',
  '이직하기 좋은 시기가 언제인가요?',
  '올해 연애운과 결혼운 알려줘',
  '건강상 주의해야 할 점은?',
  '꿈해몽 부탁드려요',
  '나에게 맞는 행운의 색깔은?',
  '시험 합격운이 있을까요?',
  '이사 가기 좋은 방향은?',
  '사업을 시작해도 될까요?',
  '자녀 진로 상담 부탁해요',
  '부부 갈등 해결책이 있을까요?',
  '올해 삼재에 해당하나요?',
  '귀인을 만날 수 있을까요?',
  '재물운이 좋아지는 습관은?',
]

// --- Helpers ---

const getGeminiModel = (systemInstruction?: string) => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('Google Generative AI API Key is missing')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: MODEL_FLASH,
    ...(systemInstruction ? { systemInstruction } : {}),
  })
}

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** 백그라운드 작업 예약 — 응답 지연 없이 실행 (ZERO-LATENCY). after() 불가 시 폴백. */
function scheduleBackground(fn: () => Promise<void>): void {
  try {
    after(fn)
  } catch {
    void fn().catch(() => {})
  }
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

// --- Types ---

export interface ShamanChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ShamanChatResponse {
  success: boolean
  response?: string
  error?: string
  suggestedQuestions?: string[]
  noCredits?: boolean
  /** 좌정 主神 코드 (신당 3.0 대화 시 표정 세트 경로용) */
  deityCode?: string
  /** 신위 표정 (neutral/smile/stern/sad/surprised/bless/angry) */
  emotion?: string
  /** 이번 대화로 인연(緣) 단계가 올랐는지 — true면 클라 레벨업 연출 */
  bondLeveledUp?: boolean
  /** 현재 인연 단계명 (레벨업 연출용) */
  bondLevelName?: string
}

export interface ShamanQuestionStatus {
  success: boolean
  walletBalance: number
  dailyFreeUsed: number
  dailyFreeTotal: number
  dailyFreeRemaining: number
  purchasedCredits: number
  totalRemaining: number
  error?: string
}

// --- Core Actions ---

/**
 * 신당 질문권 현황 조회
 * - walletBalance: 현재 보유 복채 (냥)
 * - dailyFreeRemaining: 오늘 남은 무료 질문권 (최대 10개, 자정 리셋)
 * - purchasedCredits: 구매한 누적 질문권
 * - totalRemaining: 총 사용 가능 질문 수
 */
export async function getShamanQuestionStatus(): Promise<ShamanQuestionStatus> {
  const defaultResult: ShamanQuestionStatus = {
    success: false,
    walletBalance: 0,
    dailyFreeUsed: 0,
    dailyFreeTotal: DAILY_FREE_QUESTIONS,
    dailyFreeRemaining: DAILY_FREE_QUESTIONS,
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

    // 병렬 조회: 지갑 잔액(role 특수처리 포함) + 오늘 사용 횟수 + 구매 질문권
    const [walletBalance, usageResult, creditsResult] = await Promise.all([
      getWalletBalance(), // admin=999, tester=100, 일반=실제 잔액
      supabase.from('ai_chat_usage').select('total_turns').eq('user_id', user.id).eq('usage_date', today).maybeSingle(),
      supabase.from('shaman_question_credits').select('purchased_credits').eq('user_id', user.id).maybeSingle(),
    ])
    const dailyFreeUsed = usageResult.data?.total_turns ?? 0
    const dailyFreeRemaining = Math.max(0, DAILY_FREE_QUESTIONS - dailyFreeUsed)
    const purchasedCredits = creditsResult.data?.purchased_credits ?? 0
    const totalRemaining = dailyFreeRemaining + purchasedCredits

    return {
      success: true,
      walletBalance,
      dailyFreeUsed,
      dailyFreeTotal: DAILY_FREE_QUESTIONS,
      dailyFreeRemaining,
      purchasedCredits,
      totalRemaining,
    }
  } catch (error) {
    logger.error('[getShamanQuestionStatus] Error:', error)
    return { ...defaultResult, error: '상태 조회 중 오류가 발생했습니다.' }
  }
}

/**
 * 질문권 구매: 1만냥 → +20회
 */
export async function purchaseShamanQuestions(): Promise<{
  success: boolean
  error?: string
  newPurchasedCredits?: number
  remainingBalance?: number
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    const adminClient = createAdminClient()

    // 0. role 확인 (admin은 실제 복채 차감 없이 질문권 지급)
    const { data: profileData } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle()

    const isPrivileged = profileData?.role === 'admin'
    let finalBalance: number = isPrivileged ? 999 : 0

    if (!isPrivileged) {
      // 1. 복채 차감 — 원자 RPC(deduct_wallet_balance) 경유. read-then-write 레이스 제거.
      const res = await spendBokchae(
        PURCHASE_COST,
        `신당 질문권 ${PURCHASE_QUESTIONS}회 구매(1만냥)`,
        'SHAMAN_QUESTIONS'
      )
      if (!res.success) {
        if (res.error === 'INSUFFICIENT_BOKCHAE') {
          return { success: false, error: '복채가 부족합니다. (질문권 20회 = 1만냥)' }
        }
        return { success: false, error: '복채 차감 중 오류가 발생했습니다.' }
      }
      finalBalance = res.balance ?? 0
    }

    // 2. 질문권 적립 — 원자 RPC (증분 UPSERT)
    const { data: newCredits, error: creditError } = await adminClient.rpc('add_shaman_credits', {
      p_user_id: user.id,
      p_amount: PURCHASE_QUESTIONS,
    })
    if (creditError || typeof newCredits !== 'number' || newCredits < 0) {
      logger.error('[purchaseShamanQuestions] credit grant failed:', creditError)
      // 차감됐는데 지급 실패 → 환불
      if (!isPrivileged) await refundBokchae(user.id, PURCHASE_COST, '신당 질문권 구매 취소 환불')
      return { success: false, error: '질문권 지급 중 오류가 발생했습니다.' }
    }

    return {
      success: true,
      newPurchasedCredits: newCredits,
      remainingBalance: finalBalance,
    }
  } catch (error) {
    logger.error('[purchaseShamanQuestions] Error:', error)
    return { success: false, error: '질문권 구매 중 오류가 발생했습니다.' }
  }
}

/**
 * 신당 채팅 메시지 전송
 * - 질문권 없으면 에러 반환 (noCredits: true)
 * - 소비 순서: 일일 무료 → 구매 질문권
 * - 메시지당 별도 복채 차감 없음 (질문권 기반)
 */
export async function sendShamanChatMessage(
  message: string,
  conversationHistory: ShamanChatMessage[],
  _turnCount: number,
  familyMemberId?: string
): Promise<ShamanChatResponse> {
  // 입력 가드(S2): 길이 상한 + 프롬프트 인젝션 의심 플래그. 정제된 텍스트만 프롬프트로.
  const guarded = guardAiInput(message)
  if (!guarded.text) return { success: false, error: '메시지를 입력해주세요.' }
  const safeMessage = guarded.text
  if (guarded.suspicious) {
    logger.warn('[sendShamanChatMessage] 프롬프트 인젝션 의심 입력 감지', { length: safeMessage.length })
  }

  if (isEdgeEnabled('ai-chat')) {
    // 엣지 ai-chat엔 신당 3.0(主神 페르소나·감정·인연 적립)이 없다 — 패리티 확보 전까지 로컬 경로 강제.
    // 엣지로 보내면 신당 통합이 조용히 전부 사라지므로 위임하지 않는다.
    logger.warn('[sendShamanChatMessage] EDGE_AI_CHAT 활성 상태지만 신당 3.0 패리티 부재 — 로컬 경로로 처리')
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인 필요' }

    // Rate limit(S3): 질문권과 별개의 버스트 방어 — 분당 20회/유저.
    const rl = await rateLimit(`ai-shaman:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 20 })
    if (!rl.success) return { success: false, error: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.' }

    const adminClient = createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // 1. 질문권 현황 확인
    const status = await getShamanQuestionStatus()
    if (!status.success) return { success: false, error: status.error }

    if (status.totalRemaining <= 0) {
      return {
        success: false,
        error: '질문 횟수가 모두 소진되었습니다. 복채 1만냥으로 질문권 20회를 충전하세요.',
        noCredits: true,
      }
    }

    // 2. 질문권 소비 (일일권 먼저, 소진 시 구매권)
    if (status.dailyFreeRemaining > 0) {
      // 일일 무료 질문 소비 (total_turns 증가)
      const { error: rpcError } = await adminClient.rpc('record_ai_chat_turn', {
        p_user_id: user.id,
        p_date: today,
        p_talisman_used: 0,
      })
      if (rpcError) {
        logger.error('[sendShamanChatMessage] RPC error:', rpcError)
        // RPC 실패해도 AI 응답은 진행 (non-fatal)
      }
    } else {
      // 구매 질문권 소비 — 원자 RPC (동시 요청 시 단일 차감 레이스 제거)
      const { error: consumeError } = await adminClient.rpc('consume_shaman_credit', { p_user_id: user.id })
      if (consumeError) logger.error('[sendShamanChatMessage] credit consume error:', consumeError)
    }

    // 3. 사용자 및 가족 컨텍스트 조회
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

    let historyQuery = supabase
      .from('analysis_history')
      .select('category, result_json, summary, score')
      .eq('user_id', user.id)

    if (familyMemberId && familyMemberId !== 'self') {
      historyQuery = historyQuery.eq('family_member_id', familyMemberId)
    } else {
      historyQuery = historyQuery.is('family_member_id', null)
    }

    const { data: history } = await historyQuery.order('created_at', { ascending: false }).limit(10)

    const sajuRecord = history?.find((h) => h.category === 'SAJU' || h.category === 'TODAY')
    const faceRecord = history?.find((h) => h.category === 'FACE')
    const handRecord = history?.find((h) => h.category === 'HAND')

    const historyParts: string[] = []
    if (sajuRecord) historyParts.push(`[사주 분석 요약] ${sajuRecord.summary} (점수: ${sajuRecord.score})`)
    if (faceRecord) historyParts.push(`[관상 분석 요약] ${faceRecord.summary} (점수: ${faceRecord.score})`)
    if (handRecord) historyParts.push(`[손금 분석 요약] ${handRecord.summary} (점수: ${handRecord.score})`)

    // 3.5 세션 간 장기 기억 + 지난 대화 요약 로드 (병렬)
    const fmId = familyMemberId && familyMemberId !== 'self' ? familyMemberId : null
    const [recalledMemory, sessionSummary] = await Promise.all([
      recallMemories(user.id, fmId, 5),
      loadActiveSessionSummary(supabase, user.id, fmId),
    ])
    const summaryBlock = sessionSummary ? `[지난 대화 요약]\n${sessionSummary}` : ''

    // 4. 마스터 엔진으로 systemInstruction 조립
    let systemInstruction: string

    if (targetBirth !== '미상') {
      // 사주 정보 있음 → 마스터 엔진 full context (SHAMAN_CHAT 타입)
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
      // 사주 정보 없음 → 폴백
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

    // 4.5 신당 3.0 통합: 대상(본인/가족) 신당의 좌정 主神 페르소나 + 신당 기운을 얹는다.
    //     가족 신당이 아직 없으면(주신 미좌정) 컨텍스트 없이 진행 — 신당 첫 진입 시 강신으로 생성됨.
    let bondDeityId: string | null = null
    let deityCode: string | null = null
    const shrineCtx = await buildShrineContext(fmId)
    if (shrineCtx) {
      systemInstruction += `\n\n${shrineCtx.block}`
      bondDeityId = shrineCtx.mainDeityId
      deityCode = shrineCtx.deityCode
    }

    // 5. systemInstruction을 모델에 주입하고 대화 히스토리 복원
    const model = getGeminiModel(systemInstruction)
    // 슬라이딩 윈도우: 최근 N개 메시지만 전달 (그 이전 맥락은 요약·기억으로 대체)
    const windowedHistory = conversationHistory.slice(-CHAT_HISTORY_WINDOW)
    const chat = model.startChat({
      // 클라이언트가 넘긴 히스토리도 길이 컷(토큰 폭탄/히스토리 경유 인젝션 방어).
      history: windowedHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: guardAiInput(msg.content).text }],
      })),
    })

    // 사용자 메시지만 전달 (systemInstruction은 모델에 이미 주입됨). 가드 통과한 safeMessage 사용.
    const result = await chat.sendMessage(safeMessage)
    const rawText = result.response.text()

    // 신위 감정 태그 파싱: 응답 앞 [[emotion]] → emotion 추출 후 본문에서 제거
    let emotion: DeityEmotion | null = null
    let responseText = rawText
    if (deityCode) {
      const m = rawText.match(/^\s*\[\[\s*(neutral|smile|stern|sad|surprised|bless|angry)\s*\]\]\s*/i)
      if (m) {
        emotion = m[1].toLowerCase() as DeityEmotion
        responseText = rawText.slice(m[0].length)
      }
    }
    // 태그 잔재(있을 수 있는 다른 [[...]]) 제거 — 폴백도 태그 제거본 기준(원문 폴백이면 태그가 노출됨)
    responseText =
      responseText.replace(/\[\[[^\]]*\]\]/g, '').trim() ||
      rawText.replace(/\[\[[^\]]*\]\]/g, '').trim() ||
      '신탁이 흐릿하게 전해졌습니다. 조금 다르게 다시 여쭤봐 주시겠어요?'

    // 신당 3.0: 좌정 主神과의 대화면 인연(緣) 적립 — 응답 후 백그라운드(freeze 방지)
    // 인연(緣) 적립 — 레벨업 여부를 응답에 실어야 하므로 동기 수행(원자 RPC ~수십ms, 응답 대비 미미)
    let bondLeveledUp = false
    let bondLevelName: string | undefined
    if (bondDeityId) {
      try {
        const r = await awardDeityBondForUser(user.id, bondDeityId, CHAT_BOND_POINTS, fmId)
        if (!r.success) {
          logger.warn('[sendShamanChatMessage] bond award skipped:', r.error)
        } else if (r.leveledUp && typeof r.level === 'number') {
          bondLeveledUp = true
          bondLevelName = BOND_LEVEL_NAMES[r.level as BondLevel]
        }
      } catch (e) {
        logger.warn('[sendShamanChatMessage] bond award error:', e)
      }
    }

    // 6. 추천 질문 생성 (과거 분석 기록 기반)
    const suggestions: string[] = []
    if (sajuRecord) suggestions.push('제 사주에서 가장 강한 기운은 무엇인가요?')
    if (faceRecord) suggestions.push('관상학적으로 부족한 부분을 어떻게 보완할까요?')
    if (handRecord) suggestions.push('손금에서 가장 주목해야 할 부분이 있나요?')
    suggestions.push('올해 가장 조심해야 할 것은?', '이번 달 주요 운세 흐름은?', '저에게 맞는 개운법을 알려주세요')

    return {
      success: true,
      response: responseText,
      suggestedQuestions: suggestions.slice(0, 4),
      deityCode: deityCode ?? undefined,
      emotion: emotion ?? undefined,
      bondLeveledUp: bondLeveledUp || undefined,
      bondLevelName,
    }
  } catch (e: unknown) {
    logger.error('[sendShamanChatMessage] Error:', e)
    return { success: false, error: e instanceof Error ? e.message : '오류가 발생했습니다.' }
  }
}

export async function getShamanChatStarters() {
  if (isEdgeEnabled('ai-chat')) {
    return invokeEdgeSafe('ai-chat', { action: 'getChatStarters' })
  }
  return {
    success: true,
    questions: RANDOM_STARTERS.sort(() => 0.5 - Math.random()).slice(0, 6),
  }
}

// ─── Chat Session Persistence ─────────────────────────────────────────────────

export interface ChatSession {
  id: string
  title: string | null
  family_member_id: string | null
  created_at: string
  updated_at: string
  message_count?: number
}

/**
 * 현재 유저의 가장 최근 활성 세션을 가져오거나 없으면 새로 만든다.
 * ended_at IS NULL 인 세션을 '활성' 세션으로 본다.
 */
export async function getOrCreateChatSession(familyMemberId?: string): Promise<{
  success: boolean
  sessionId?: string
  isNew?: boolean
  error?: string
}> {
  if (isEdgeEnabled('ai-chat')) {
    return invokeEdgeSafe('ai-chat', { action: 'getOrCreateSession', familyMemberId })
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    const fmId = familyMemberId && familyMemberId !== 'self' ? familyMemberId : null

    // 기존 활성 세션 조회 (같은 family_member_id 기준)
    const query = supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (fmId) {
      query.eq('family_member_id', fmId)
    } else {
      query.is('family_member_id', null)
    }

    const { data: existing } = await query.maybeSingle()
    if (existing) {
      return { success: true, sessionId: existing.id, isNew: false }
    }

    // 새 세션 생성
    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, family_member_id: fmId })
      .select('id')
      .single()

    if (error || !newSession) {
      return { success: false, error: '세션 생성 실패' }
    }
    return { success: true, sessionId: newSession.id, isNew: true }
  } catch (e) {
    logger.error('[getOrCreateChatSession]', e)
    return { success: false, error: '세션 조회 오류' }
  }
}

/**
 * 세션 메시지 목록 로드 (오름차순)
 */
export async function loadChatSessionMessages(sessionId: string): Promise<{
  success: boolean
  messages?: ShamanChatMessage[]
  error?: string
}> {
  if (isEdgeEnabled('ai-chat')) {
    return invokeEdgeSafe('ai-chat', { action: 'loadMessages', sessionId })
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) return { success: false, error: error.message }

    const messages: ShamanChatMessage[] = (data ?? []).map((row) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: row.created_at,
    }))

    return { success: true, messages }
  } catch (e) {
    logger.error('[loadChatSessionMessages]', e)
    return { success: false, error: '메시지 로드 오류' }
  }
}

/**
 * 메시지 2개(user + assistant)를 DB에 저장한다.
 * 첫 user 메시지이면 세션 title도 업데이트.
 */
export async function saveChatMessages(
  sessionId: string,
  userMessage: ShamanChatMessage,
  assistantMessage: ShamanChatMessage,
  isFirstMessage: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const rows = [
      { session_id: sessionId, role: userMessage.role, content: userMessage.content },
      { session_id: sessionId, role: assistantMessage.role, content: assistantMessage.content },
    ]

    const { error } = await adminClient.from('chat_messages').insert(rows)
    if (error) return { success: false, error: error.message }

    // 첫 메시지면 세션 title 설정
    if (isFirstMessage) {
      const title = userMessage.content.slice(0, 30)
      await adminClient.from('chat_sessions').update({ title }).eq('id', sessionId)
    }

    // 백그라운드: 요약 갱신 + 주기적 기억 추출 (응답 지연 없음)
    scheduleBackground(async () => {
      await maybeSummarizeSession(sessionId, CHAT_HISTORY_WINDOW)
      const { count } = await adminClient
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
      if ((count ?? 0) % MEMORY_EXTRACT_INTERVAL === 0) {
        await extractAndSaveMemories(sessionId)
      }
    })

    return { success: true }
  } catch (e) {
    logger.error('[saveChatMessages]', e)
    return { success: false, error: '메시지 저장 오류' }
  }
}

/**
 * 현재 활성 세션을 종료(ended_at 설정)하고 새 세션 ID를 반환.
 * "새 대화 시작" 버튼 클릭 시 호출.
 */
export async function endAndCreateNewSession(
  currentSessionId: string,
  familyMemberId?: string
): Promise<{ success: boolean; newSessionId?: string; error?: string }> {
  if (isEdgeEnabled('ai-chat')) {
    return invokeEdgeSafe('ai-chat', { action: 'endSession', currentSessionId, familyMemberId })
  }
  try {
    const adminClient = createAdminClient()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    // 현재 세션 종료
    await adminClient.from('chat_sessions').update({ ended_at: new Date().toISOString() }).eq('id', currentSessionId)

    // 종료되는 세션에서 마지막 기억 추출 (백그라운드)
    scheduleBackground(() => extractAndSaveMemories(currentSessionId))

    // 새 세션 생성
    const fmId = familyMemberId && familyMemberId !== 'self' ? familyMemberId : null
    const { data: newSession, error } = await adminClient
      .from('chat_sessions')
      .insert({ user_id: user.id, family_member_id: fmId })
      .select('id')
      .single()

    if (error || !newSession) return { success: false, error: '새 세션 생성 실패' }

    return { success: true, newSessionId: newSession.id }
  } catch (e) {
    logger.error('[endAndCreateNewSession]', e)
    return { success: false, error: '세션 전환 오류' }
  }
}

/** @deprecated Use getShamanQuestionStatus instead */
export async function getAIChatUsageStatus() {
  if (isEdgeEnabled('ai-chat')) {
    return invokeEdgeSafe('ai-chat', { action: 'getUsageStatus' })
  }
  const status = await getShamanQuestionStatus()
  return {
    success: status.success,
    isPro: false,
    remaining: status.totalRemaining,
    total: status.dailyFreeTotal,
    used: status.dailyFreeUsed,
    error: status.error,
  }
}
