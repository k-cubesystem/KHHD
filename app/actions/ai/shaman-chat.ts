'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWalletBalance } from '@/app/actions/payment/wallet'

// --- Constants ---

const DAILY_FREE_QUESTIONS = 10
const PURCHASE_COST = 1 // 1만냥 (wallets.balance 단위: 1 = 1만냥)
const PURCHASE_QUESTIONS = 20 // 회

// --- Helpers ---

const getGeminiModel = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('Google Generative AI API Key is missing')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
}

async function getSystemPromptFromDB(key: string, variables: Record<string, string> = {}) {
  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase
      .from('ai_prompts')
      .select('template')
      .eq('key', key)
      .single()
    if (data?.template) {
      let text = data.template
      for (const [k, v] of Object.entries(variables)) {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), v)
      }
      return text
    }
  } catch (e) {
    console.warn(e)
  }
  return null
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
      supabase
        .from('ai_chat_usage')
        .select('total_turns')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .maybeSingle(),
      supabase
        .from('shaman_question_credits')
        .select('purchased_credits')
        .eq('user_id', user.id)
        .maybeSingle(),
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
    console.error('[getShamanQuestionStatus] Error:', error)
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
    const { data: profileData } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isPrivileged = profileData?.role === 'admin'
    let finalBalance: number = isPrivileged ? 999 : 0

    if (!isPrivileged) {
      // 1. 일반 유저: 지갑 잔액 확인 및 차감
      const { data: wallet } = await adminClient
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle()

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
        console.error('[purchaseShamanQuestions] Wallet update error:', walletError)
        return { success: false, error: '복채 차감 중 오류가 발생했습니다.' }
      }

      await adminClient.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -PURCHASE_COST,
        type: 'USE',
        feature_key: 'SHAMAN_QUESTIONS',
        description: `신당 질문권 ${PURCHASE_QUESTIONS}회 구매 (1만냥)`,
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
    console.error('[purchaseShamanQuestions] Error:', error)
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
  turnCount: number
): Promise<ShamanChatResponse> {
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
        console.error('[sendShamanChatMessage] RPC error:', rpcError)
        // RPC 실패해도 AI 응답은 진행 (non-fatal)
      }
    } else {
      // 구매 질문권 소비 (purchased_credits 감소)
      const newCredits = Math.max(0, status.purchasedCredits - 1)
      await adminClient
        .from('shaman_question_credits')
        .update({ purchased_credits: newCredits })
        .eq('user_id', user.id)
    }

    // 3. 사용자 컨텍스트 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, gender, birth_date, home_address')
      .eq('id', user.id)
      .single()

    const { data: history } = await supabase
      .from('analysis_history')
      .select('category, result_json, summary, score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const sajuRecord = history?.find((h) => h.category === 'SAJU' || h.category === 'TODAY')
    const faceRecord = history?.find((h) => h.category === 'FACE')
    const handRecord = history?.find((h) => h.category === 'HAND')

    const contextParts: string[] = []
    if (profile?.full_name) {
      contextParts.push(
        `## 내담자 기본 정보\n- 이름: ${profile.full_name}\n- 성별: ${profile.gender || '미상'}\n- 생년월일: ${profile.birth_date || '미상'}`
      )
    }
    if (sajuRecord) {
      contextParts.push(`## 사주 분석 요약\n- ${sajuRecord.summary} (점수: ${sajuRecord.score})`)
    }
    if (faceRecord) {
      contextParts.push(`## 관상 분석 요약\n- ${faceRecord.summary} (점수: ${faceRecord.score})`)
    }
    if (handRecord) {
      contextParts.push(`## 손금 분석 요약\n- ${handRecord.summary} (점수: ${handRecord.score})`)
    }

    const userContext = contextParts.join('\n\n') || '내담자 정보 없음'

    // 4. AI 응답 생성
    const systemPrompt =
      (await getSystemPromptFromDB('shaman_chat', {
        name: profile?.full_name || '내담자',
        context: userContext,
      })) ||
      '당신은 해화당의 AI 신당(神堂)을 지키는 멘토입니다. 사주명리학과 명상의 지혜로 내담자의 고민에 깊이 있는 조언을 드리세요. 따뜻하면서도 통찰력 있는 답변을 해주세요.'

    const model = getGeminiModel()
    const chat = model.startChat({
      history: conversationHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    })

    const result = await chat.sendMessage(
      `${systemPrompt}\n\n[내담자 정보]\n${userContext}\n\n[질문]\n${message}`
    )
    const responseText = result.response.text()

    // 5. 추천 질문 생성
    const suggestions: string[] = []
    if (sajuRecord) suggestions.push('제 사주에 맞는 재물 관리법은?')
    if (faceRecord) suggestions.push('관상학적으로 부족한 부분을 어떻게 보완할까요?')
    suggestions.push('올해 가장 조심해야 할 것은?', '이번 달 주요 운세 흐름은?')

    return {
      success: true,
      response: responseText,
      suggestedQuestions: suggestions.slice(0, 3),
    }
  } catch (e: unknown) {
    console.error('[sendShamanChatMessage] Error:', e)
    return { success: false, error: e instanceof Error ? e.message : '오류가 발생했습니다.' }
  }
}

export async function getShamanChatStarters() {
  return {
    success: true,
    questions: [
      '오늘의 총운이 궁금해요',
      '이번 달 재물운 흐름은?',
      '이직하기 좋은 시기가 언제인가요?',
      '올해 연애운과 결혼운 알려줘',
      '건강상 주의해야 할 점은?',
      '꿈해몽 부탁드려요',
    ],
  }
}

/** @deprecated Use getShamanQuestionStatus instead */
export async function getAIChatUsageStatus() {
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
