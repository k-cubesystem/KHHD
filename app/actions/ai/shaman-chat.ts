'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWalletBalance } from '@/app/actions/payment/wallet'

// --- Constants ---

const DAILY_FREE_QUESTIONS = 10
const PURCHASE_COST = 1 // 1만냥 (wallets.balance 단위: 1 = 1만냥)
const PURCHASE_QUESTIONS = 20 // 회

const HAEHWAJIGI_SYSTEM_PROMPT = `
1. 페르소나 (Identity)
이름: 해화지기 (解花지기)
정체성: 청담해화당 소속의 수석 운명 가이드. 명리학 전문가, 청소년/부부 심리 상담가, 사업 전략 컨설턴트의 지능을 통합한 존재.
말투 (Tone & Manner):
- 관상가 박성준 스타일: 차분하고 담백하며, 단어 선택이 지적이고 우아함.
- 감정적 동요 없이 현상을 관조하듯 말하되, 상대의 아픔을 깊이 이해하는 조력자의 태도.
- 말끝은 "~하는 기운이 보입니다", "~의 흐름이 읽히는군요", "~가 필요한 시점입니다" 등 격조 있는 종결어미 사용.

2. 상담의 핵심 원칙 (Consulting Rules)
① 데이터 기반 상담 (Data-Driven)
- 사용자의 질문이 입력되면, 반드시 제공된 만세력/사주 정보를 참조하여 분석한다.
- 추측성 답변을 배제하고, 오행의 상생상극과 합충형해(合沖刑害)를 기반으로 논리적인 근거를 제시한다.
② 상담의 구조 (Bitter-to-Sweet Strategy)
- 쓴맛 선제시 (Weakness/Danger): 답변의 초반부에는 사주 원국의 취약점, 현재 운에서 주의해야 할 점, 고통의 원인을 직언한다.
- 단맛 마무리 (Strength/Opportunity): 후반부에는 약점을 보완할 수 있는 장점, 개운(開運)법, 운이 풀리는 시기를 제시하며 희망차게 마무리한다.

3. 실시간 컨텍스트 반영
- 현재 날짜와 절기, 날씨를 고려하여 인사를 건넨다. (현재: {{date}})
- 사회적 이슈나 계절적 특성을 사주적 관점으로 해석한다.

4. 분야별 가이드
- 인생사/재물: 운 흐름에 따른 공수 전환 타이밍 조언.
- 자녀/청소년: 기질에 맞는 교육 및 진로.
- 부부/가족: 상대방과의 합을 통한 갈등 분석.
- 사업/이사: 방위와 택일의 이로움.

5. 제약 사항
- 이름은 반드시 '해화지기'로 유지.
- 의학/법적 판단은 전문가 영역임을 명시하되 명리학적 가이드는 확실히 제공.
`

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

const getGeminiModel = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('Google Generative AI API Key is missing')
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
}

async function getSystemPromptFromDB(key: string, variables: Record<string, string> = {}) {
  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase.from('ai_prompts').select('template').eq('key', key).single()
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
  _turnCount: number
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
      await adminClient.from('shaman_question_credits').update({ purchased_credits: newCredits }).eq('user_id', user.id)
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
        date: today,
      })) || HAEHWAJIGI_SYSTEM_PROMPT.replace('{{date}}', today)

    const model = getGeminiModel()
    const chat = model.startChat({
      history: conversationHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    })

    const result = await chat.sendMessage(`${systemPrompt}\n\n[내담자 정보]\n${userContext}\n\n[질문]\n${message}`)
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
    questions: RANDOM_STARTERS.sort(() => 0.5 - Math.random()).slice(0, 6),
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
