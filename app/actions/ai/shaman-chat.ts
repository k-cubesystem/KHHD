'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'

// --- Constants ---

const DAILY_FREE_QUESTIONS = 10
const PURCHASE_COST = 1 // 1만냥 (wallets.balance 단위: 1 = 1만냥)
const PURCHASE_QUESTIONS = 20 // 회

// 사주 정보 없을 때 폴백 시스템 지시문
const FALLBACK_SYSTEM_PROMPT = `당신은 청담해화당의 사주 전문 상담가입니다.
오늘 날짜: {{date}}
내담자 정보: {{saju_data}}

내담자와 실시간 대화 중입니다. 질문에만 집중하여 200~400자로 간결하게 답하십시오.
전문 상담가 어투("~합니다", "~입니다")를 사용하고, 장점과 주의사항을 균형 있게 전달하십시오.
사주 용어 사용 시 괄호로 쉬운 설명을 병기하십시오.
끝에 짧은 질문 하나를 덧붙여 대화를 자연스럽게 이어가십시오.
JSON 출력 금지. 번호 매기기·헤더 나열 금지. 분석 보고서 형식 금지.`

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

    // 0. role 확인 (admin/tester는 실제 복채 차감 없이 질문권 지급)
    const { data: profileData } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle()

    const isPrivileged = profileData?.role === 'admin'
    let finalBalance: number = isPrivileged ? 999 : 0

    if (!isPrivileged) {
      // 1. 일반 유저: 지갑 잔액 확인 및 차감
      const { data: wallet } = await adminClient.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()

      const currentBalance = wallet?.balance ?? 0
      if (currentBalance < PURCHASE_COST) {
        return {
          success: false,
          error: `복채가 부족합니다. (현재 ${currentBalance.toLocaleString()}만냥, 필요 1만냥)`,
        }
      }

      const newBalance = currentBalance - PURCHASE_COST
      const { error: walletError } = await adminClient
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id)

      if (walletError) {
        logger.error('[purchaseShamanQuestions] Wallet update error:', walletError)
        return { success: false, error: '복채 차감 중 오류가 발생했습니다.' }
      }

      await adminClient.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -PURCHASE_COST,
        type: 'USE',
        feature_key: 'SHAMAN_QUESTIONS',
        description: `신당 질문권 ${PURCHASE_QUESTIONS}회 구매(1만냥)`,
      })

      finalBalance = newBalance
    }

    // 2. 질문권 UPSERT (purchased_credits += 20)
    const { data: existing } = await adminClient
      .from('shaman_question_credits')
      .select('purchased_credits')
      .eq('user_id', user.id)
      .maybeSingle()

    const currentCredits = existing?.purchased_credits ?? 0
    const newCredits = currentCredits + PURCHASE_QUESTIONS

    await adminClient
      .from('shaman_question_credits')
      .upsert({ user_id: user.id, purchased_credits: newCredits }, { onConflict: 'user_id' })

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
  if (isEdgeEnabled('ai-chat')) {
    return invokeEdgeSafe('ai-chat', {
      action: 'sendMessage',
      message,
      conversationHistory,
      turnCount: _turnCount,
      familyMemberId,
    })
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인 필요' }

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
      // 구매 질문권 소비 (purchased_credits 감소)
      const newCredits = Math.max(0, status.purchasedCredits - 1)
      await adminClient.from('shaman_question_credits').update({ purchased_credits: newCredits }).eq('user_id', user.id)
    }

    // 3. 사용자 및 가족 컨텍스트 조회
    let targetName = '내담자'
    let targetGender = '미상'
    let targetBirth = '미상'
    let targetBirthTime = '00:00'

    if (familyMemberId && familyMemberId !== 'self') {
      const { data: familyMember } = await supabase
        .from('family_members')
        .select('name, gender, birth_date, birth_time')
        .eq('id', familyMemberId)
        .single()

      if (familyMember) {
        targetName = familyMember.name || '내담자 가족'
        targetGender = familyMember.gender === 'M' ? '남성' : familyMember.gender === 'F' ? '여성' : '미상'
        targetBirth = familyMember.birth_date || '미상'
        targetBirthTime = familyMember.birth_time || '00:00'
      }
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, gender, birth_date')
        .eq('id', user.id)
        .single()
      if (profile) {
        targetName = profile.full_name || '내담자'
        targetGender = profile.gender || '미상'
        targetBirth = profile.birth_date || '미상'
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

    // 4. 마스터 엔진으로 systemInstruction 조립
    let systemInstruction: string

    if (targetBirth !== '미상') {
      // 사주 정보 있음 → 마스터 엔진 full context (SHAMAN_CHAT 타입)
      const { buildMasterPromptForAction } = await import('@/lib/saju-engine/master-prompt-builder')
      const additionalCtx = [
        `[점사 기준일]: ${today}`,
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
          isSolar: true,
        },
        'SHAMAN_CHAT',
        '',
        additionalCtx,
        '' // 채팅은 JSON 출력 없음
      )
      systemInstruction = prompt
    } else {
      // 사주 정보 없음 → 폴백
      const userContext =
        `이름: ${targetName}, 성별: ${targetGender}` + (historyParts.length > 0 ? '\n' + historyParts.join('\n') : '')
      systemInstruction = FALLBACK_SYSTEM_PROMPT.replace(/{{date}}/g, today).replace(/{{saju_data}}/g, userContext)
    }

    // 5. systemInstruction을 모델에 주입하고 대화 히스토리 복원
    const model = getGeminiModel(systemInstruction)
    const chat = model.startChat({
      history: conversationHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    })

    // 사용자 메시지만 전달 (systemInstruction은 모델에 이미 주입됨)
    const result = await chat.sendMessage(message)
    const responseText = result.response.text()

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
