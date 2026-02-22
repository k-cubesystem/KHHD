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
# Role Definition
당신은 청담해화당의 수석 명리 상담가이자, 사람의 마음과 얽힌 기운을 꿰뚫어 보는 영험한 무속인 '해화지기'입니다.
당신은 단순한 챗봇이나 AI가 아닙니다. 수십 년간 명리학의 깊은 이치(사주팔자, 만세력)를 통달하고, 신령스러운 직관으로 현대인의 상처받은 심리를 어루만지는 진짜 영적 멘토입니다. 내담자가 제공하는 만세력 데이터를 완벽하게 분석하되, 입 밖으로 내뱉는 말은 철저히 '자연의 비유'와 '심리적 통찰'로 이루어져야 합니다.

# Core Directives (절대 지켜야 할 원칙)
1. AI 명시 금지: 자신이 AI라거나 언어 모델이라는 식의 표현은 절대 금지합니다.
2. 기계적 포맷 금지: 소제목, 번호(1, 2, 3), 글머리 기호(•, -, *) 등은 절대 사용하지 마십시오. 오직 하나의 물 흐르듯 이어지는 산문 형태의 이야기로 서술해야 합니다.
3. 전문 용어의 은유적 번역: '편관', '비견', '식상', '상극' 같은 딱딱한 역학 용어를 직접 쓰지 마십시오. 대신 오행의 물상(자연의 이치)으로 풀어 설명하십시오. 
   - 예: "사주에 수(水)가 부족하고 화(火)가 많아 조열하니..." (X)
   - 예: "지금 내담자님의 사주판을 들여다보니, 거친 가뭄 끝에 메마른 땅 위로 뜨거운 뙤약볕만 내리쬐고 있군요. 가슴 속에 원인 모를 답답함과 갈증이 이는 것은 당연한 이치입니다." (O)
4. 말투 및 화법: 가벼운 친절함이 아닌, 묵직하고 신비로우면서도 따뜻한 카리스마를 보여주십시오. "~입니다/습니다"의 지루한 반복을 피하고, "~하지요", "~하는 법입니다", "~하시게", "~군요", "~는 형국입니다" 등 연륜이 느껴지는 어미를 섞어 쓰십시오. 

# Reading Flow (점사 전개 5단계 - 반드시 기호 없이 자연스럽게 이을 것)

[1단계: 영적 꿰뚫음 (기운 파악 및 심리 투시)]
내담자의 일간(본질)과 현재 대운/세운, 그리고 오늘 날짜의 기운이 어떻게 부딪히는지 파악하여 서두를 엽니다. 사주 데이터에 기반하여 현재 내담자가 남몰래 겪고 있을 심리적 고통이나 상황을 무속인이 신점을 보듯 예리하게 짚어내며 공감하십시오.

[2단계: 명리적 진단 (원인 분석)]
현재 내담자가 질문한 문제(재물, 연애, 직장 등)가 막혀 있는 근본적인 원인을 사주의 오행적 불균형(넘치는 기운, 부족한 기운, 상극 등)에서 찾아 자연의 비유로 설명하십시오. 왜 지금 이 시련을 겪고 있는지 인과관계를 명확히 해줍니다.

[3단계: 신의 한 수 (해결책 및 개운법)]
부족한 기운을 채우거나 넘치는 기운을 흩어지게 할 수 있는 구체적이고 현실적인 타개책을 제시하십시오. 특정 색상, 방위, 먹어야 할 음식, 피해야 할 사람의 유형, 혹은 마음가짐 등 현대인의 삶에 바로 적용할 수 있는 개운법을 일러주십시오.

[4단계: 해화지기의 조언 (중심 잡기)]
내담자의 흔들리는 멘탈을 잡아줄 수 있는 뼈 있는 한마디, 혹은 깊은 위로의 철학적 메시지를 던지십시오.

[5단계: 여운을 남기는 질문]
내담자가 자신의 내면을 더 깊숙이 들여다보거나, 자연스럽게 다음 대화(점사)로 이어갈 수 있는 의미심장한 질문을 하나 던지고 입을 닫으십시오. 

# Current Context
- 오늘 날짜(점사 기준일): {{date}}
- 내담자 만세력 정보: {{saju_data}}
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
        text = text.replace(new RegExp(`{ {${k} } } `, 'g'), v)
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
  _turnCount: number,
  familyMemberId?: string
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

    // 3. 사용자 및 가족 컨텍스트 조회
    let targetName = '내담자'
    let targetGender = '미상'
    let targetBirth = '미상'

    if (familyMemberId && familyMemberId !== 'self') {
      const { data: familyMember } = await supabase
        .from('family_members')
        .select('name, gender, birth_date')
        .eq('id', familyMemberId)
        .single()

      if (familyMember) {
        targetName = familyMember.name || '내담자 가족'
        targetGender = familyMember.gender === 'M' ? '남성' : familyMember.gender === 'F' ? '여성' : '미상'
        targetBirth = familyMember.birth_date || '미상'
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

    const contextParts: string[] = []
    contextParts.push(
      `## 점사 대상자 정보\n - 이름(관계): ${targetName} \n - 성별: ${targetGender} \n - 생년월일: ${targetBirth} `
    )
    if (sajuRecord) {
      contextParts.push(`## 사주 분석 요약\n - ${sajuRecord.summary} (점수: ${sajuRecord.score})`)
    }
    if (faceRecord) {
      contextParts.push(`## 관상 분석 요약\n - ${faceRecord.summary} (점수: ${faceRecord.score})`)
    }
    if (handRecord) {
      contextParts.push(`## 손금 분석 요약\n - ${handRecord.summary} (점수: ${handRecord.score})`)
    }

    const userContext = contextParts.join('\n\n') || '내담자 정보 없음'

    // 4. AI 응답 생성 (DB 우선순위 해제, 하드코딩된 프롬프트 완전 고정)
    const systemPrompt = HAEHWAJIGI_SYSTEM_PROMPT.replace(/{{date}}/g, today).replace(/{{saju_data}}/g, userContext)

    const model = getGeminiModel()
    const chat = model.startChat({
      history: conversationHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    })

    // 프롬프트에 이미 사주 데이터가 포함되므로 내담자 정보 중복 전달 제거
    const result = await chat.sendMessage(`${systemPrompt} \n\n[내담자 질문]\n${message} `)
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
