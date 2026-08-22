'use server'

import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { recallMemoryList, extractAndSaveMemories } from '@/lib/ai/memory'
import { buildGreeting, type Greeting } from '@/lib/domain/chat/greeting'
import { maybeSummarizeSession } from '@/lib/ai/summarizer'
import { logger } from '@/lib/utils/logger'
import { logUsage } from '@/lib/services/gemini-rate-limiter'
import { spendBokchae, refundBokchae } from '@/lib/services/bokchae'
import { PAST_SESSIONS_PAGE_SIZE } from '@/lib/domain/chat/constants'
import { MODEL_FLASH } from '@/lib/config/ai-models'
// 조립·마무리는 파이프라인이 단독으로 든다 — 스트리밍 라우트(/api/chat/stream)와 같은 코어를 쓴다.
import {
  prepareShamanChat,
  finalizeShamanChat,
  refundConsumed,
  loadQuestionStatus,
  getGeminiModel,
  CHAT_HISTORY_WINDOW,
  MEMORY_EXTRACT_INTERVAL,
  type ShamanChatMessage,
  type ShamanQuestionStatus,
} from '@/lib/services/shaman-chat-pipeline'

export type { ShamanChatMessage, ShamanQuestionStatus }

// --- Constants ---

const PURCHASE_COST = 1 // 1만냥 (wallets.balance 단위: 1 = 1만냥)
const PURCHASE_QUESTIONS = 20 // 회

// --- Types ---

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
  /** 차감 반영 후 서버 기준 잔여 — 클라 낙관 감소치를 이 값으로 덮어써 desync 를 없앤다(P0-F5). */
  remaining?: { free: number; ad: number; purchased: number; total: number }
}

/** 백그라운드 작업 예약 — 응답 지연 없이 실행 (ZERO-LATENCY). after() 불가 시 폴백. */
function scheduleBackground(fn: () => Promise<void>): void {
  try {
    after(fn)
  } catch {
    void fn().catch(() => {})
  }
}

// --- Core Actions ---

/**
 * 질문권 현황 조회 — 무료(일일)·광고·구매 세 주머니.
 * 계산은 파이프라인(loadQuestionStatus)이 단독으로 든다 — 스트리밍 라우트도 같은 값을 봐야 한다.
 */
export async function getShamanQuestionStatus(): Promise<ShamanQuestionStatus> {
  return loadQuestionStatus()
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
 * 속풀이 문답 전송 — **비스트리밍 경로**(스트리밍은 /api/chat/stream).
 *
 * 조립·마무리·환급은 파이프라인이 진다. 여기 남는 것은 «모델을 한 번 부르고 결과를 담아 보내는 것»뿐 —
 * 두 경로가 갈라지지 않도록 로직을 이 파일에 다시 쓰지 말 것.
 *
 * 클라이언트가 스트리밍을 못 쓰는 상황(구형 브라우저·프록시·플래그 off)의 폴백으로 살아 있다.
 */
export async function sendShamanChatMessage(
  message: string,
  conversationHistory: ShamanChatMessage[],
  _turnCount: number,
  familyMemberId?: string
): Promise<ShamanChatResponse> {
  if (isEdgeEnabled('ai-chat')) {
    // 엣지 ai-chat 엔 신당 3.0(主神 페르소나·감정·인연 적립)이 없다 — 패리티 확보 전까지 로컬 경로 강제.
    logger.warn('[sendShamanChatMessage] EDGE_AI_CHAT 활성 상태지만 신당 3.0 패리티 부재 — 로컬 경로로 처리')
  }

  const prep = await prepareShamanChat(message, conversationHistory, familyMemberId)
  if (!prep.ok) return { success: false, error: prep.error, noCredits: prep.noCredits }
  const prepared = prep.prepared

  try {
    const model = getGeminiModel(prepared.systemInstruction)
    const chat = model.startChat({ history: prepared.geminiHistory })

    const startedAt = Date.now()
    const result = await chat.sendMessage(prepared.safeMessage)
    const rawText = result.response.text()

    // 사용량·비용 계측 (부가 기능 — fire-and-forget)
    const usage = result.response.usageMetadata
    void logUsage({
      userId: prepared.userId,
      model: MODEL_FLASH,
      actionType: 'shaman_chat',
      inputTokens: usage?.promptTokenCount ?? null,
      outputTokens: usage?.candidatesTokenCount ?? null,
      latencyMs: Date.now() - startedAt,
      status: 'success',
    }).catch(() => {})

    const done = await finalizeShamanChat(prepared, rawText)
    return {
      success: true,
      response: done.responseText,
      suggestedQuestions: done.suggestedQuestions,
      remaining: done.remaining,
      deityCode: prepared.deityCode ?? undefined,
      emotion: done.emotion ?? undefined,
      bondLeveledUp: done.bondLeveledUp || undefined,
      bondLevelName: done.bondLevelName,
    }
  } catch (e: unknown) {
    // Error 를 첫 인자로 — logger 가 Sentry captureException 으로 잇는다(스택 보존).
    logger.error(e instanceof Error ? e : new Error(String(e)), '[sendShamanChatMessage]')
    // 차감 후 모델이 실패하면 질문권이 그냥 소실된다 — 소비처 그대로 되돌린다(P0-F5).
    await refundConsumed(prepared)
    // SDK 원문(e.message)은 사용자에게 내보내지 않는다 — 08-16 전면 장애 때 원문이 토스트로 노출됐다.
    return { success: false, error: '신당의 기운이 잠시 흐렸습니다. 잠시 후 다시 여쭤 주십시오.' }
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

export interface ChatOpening {
  success: boolean
  /** 화면에 시차 출력할 오프닝. 실패·비대상이면 undefined. */
  greeting?: Greeting
  error?: string
}

/**
 * 선문안(先問安) — 채팅 입장 시 신위가 먼저 건네는 오프닝을 조립한다.
 *
 * AI 호출 없음(결정론) · 질문 횟수/복채 미차감 — 사용자 발화 없이 소비되는 경로이기 때문이다.
 *
 * DB에 저장하지 않는다(휘발성). 저장하면 재입장마다 인사가 히스토리에 쌓이고,
 * "이미 메시지가 있으니 건너뛴다" 조건에 걸려 두 번째 방문부터는 아예 말을 걸지 못한다.
 * 대신 열 때마다 새로 만들어 대화 맨 아래에 붙인다 — 지금 막 건네는 말이므로 위치도 아래가 맞다.
 *
 * @param options.newChat 사용자가 '새 대화'를 눌러 자리를 새로 편 경우 — 짧게 연다.
 */
export async function getChatOpening(familyMemberId?: string, options?: { newChat?: boolean }): Promise<ChatOpening> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    const fmId = familyMemberId && familyMemberId !== 'self' ? familyMemberId : null

    const sessionQuery = supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (fmId) sessionQuery.eq('family_member_id', fmId)
    else sessionQuery.is('family_member_id', null)
    const { data: activeSession } = await sessionQuery.maybeSingle()

    // 마지막으로 '말을 주고받은' 시각 — 세션 updated_at 이 아니라 메시지 기준이어야 한다.
    // 새 대화를 열면 빈 세션의 updated_at 이 now 라서, 세션 기준이면 첫 방문자도 '이어서'로 오판한다.
    let lastVisitAt: string | null = null
    if (activeSession) {
      const { data: lastMsg } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      lastVisitAt = lastMsg?.created_at ?? null
    }
    // 활성 세션이 비어 있으면(새 대화 직후 등) 직전에 종료된 세션 시각으로 대신한다.
    if (!lastVisitAt) {
      const endedQuery = supabase
        .from('chat_sessions')
        .select('updated_at')
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
      if (fmId) endedQuery.eq('family_member_id', fmId)
      else endedQuery.is('family_member_id', null)
      const { data: endedSession } = await endedQuery.maybeSingle()
      lastVisitAt = endedSession?.updated_at ?? null
    }

    const [memories, profileRes, targetRes] = await Promise.all([
      recallMemoryList(user.id, fmId, 5),
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      fmId
        ? supabase.from('family_members').select('name').eq('id', fmId).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    // 좌정 主神 + 기원 단 (실패해도 오프닝은 나와야 하므로 개별 방어)
    let deityName: string | null = null
    let devotionLevel: number | null = null
    try {
      const { data: shrine } = await supabase
        .from('shrines')
        .select('main_deity_id')
        .eq('user_id', user.id)
        .is('family_member_id', null)
        .maybeSingle()
      if (shrine?.main_deity_id) {
        const { data: deity } = await supabase
          .from('shrine_deities')
          .select('name')
          .eq('id', shrine.main_deity_id)
          .maybeSingle()
        deityName = deity?.name ?? null
      }
    } catch (e) {
      logger.warn('[getChatOpening] deity skipped:', e)
    }
    try {
      const { getDevotionStatus } = await import('@/app/actions/shrine/devotion')
      const devotion = await getDevotionStatus()
      devotionLevel = devotion?.level ?? null
    } catch (e) {
      logger.warn('[getChatOpening] devotion skipped:', e)
    }

    // 「오늘의 지도」 — 그날 일진에서 결정론으로 뽑는 한 줄(AI 호출 0). 첫 마디가 날마다 달라진다.
    // 만세력은 서버 전용(lunar-javascript)이라 동적 로드하고, 실패해도 선문안 자체는 나와야 한다.
    let todayMapLine: string | undefined
    try {
      const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const [{ calculateManseBasic }, { deriveDayMap, dayMapGreetingLine }] = await Promise.all([
        import('@/lib/domain/saju/manse'),
        import('@/lib/domain/fortune/day-map'),
      ])
      // 정오 기준 — 야자시 경계에서 일주가 흔들리는 것을 피한다(/ilgan 과 동일 규율).
      const dayPillar = calculateManseBasic(kstToday, '12:00').day
      const map = deriveDayMap(dayPillar.ganElement, dayPillar.jiElement, dayPillar.jiHan || dayPillar.ji)
      if (map) todayMapLine = dayMapGreetingLine(map, new Date())
    } catch (e) {
      logger.warn('[getChatOpening] day map skipped:', e)
    }

    const greeting = buildGreeting({
      deityName,
      userName: profileRes.data?.full_name ?? null,
      targetName: targetRes.data?.name ?? null,
      lastVisitAt,
      now: new Date().toISOString(),
      memories: memories.map((m) => ({ type: m.type, content: m.content })),
      devotionLevel,
      forceNewChat: options?.newChat === true,
      todayMapLine,
    })

    return { success: true, greeting }
  } catch (e) {
    logger.error(e instanceof Error ? e : new Error(String(e)), '[getChatOpening]')
    return { success: false, error: '오프닝 생성 오류' }
  }
}

export interface PastChatSession {
  id: string
  title: string | null
  summary: string | null
  endedAt: string
  /** true = 보존기간 경과로 원문 정리됨(요약만 보존) */
  purged: boolean
}

/**
 * 종료된 과거 세션 목록 (최신순, 대상별). purged 세션도 목록엔 남는다 — 요약은 영구 보존.
 * search: 제목·요약 부분일치(대소문자 무시). offset: 더보기 페이지네이션.
 */
export async function listPastChatSessions(options?: {
  familyMemberId?: string
  search?: string
  offset?: number
}): Promise<{
  success: boolean
  sessions?: PastChatSession[]
  hasMore?: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '로그인이 필요합니다.' }

    const familyMemberId = options?.familyMemberId
    const fmId = familyMemberId && familyMemberId !== 'self' ? familyMemberId : null
    const offset = Math.max(0, options?.offset ?? 0)
    const search = options?.search?.trim() ?? ''

    let query = supabase
      .from('chat_sessions')
      .select('id, title, summary, ended_at, purged_at')
      .eq('user_id', user.id)
      .not('ended_at', 'is', null)

    query = fmId ? query.eq('family_member_id', fmId) : query.is('family_member_id', null)

    if (search) {
      // PostgREST or 필터 — 쉼표/괄호가 문법 문자라 제거해야 파싱이 깨지지 않는다.
      const safe = search.replace(/[,()*]/g, ' ').trim()
      if (safe) query = query.or(`title.ilike.%${safe}%,summary.ilike.%${safe}%`)
    }

    // 한 건 더 받아서 다음 페이지 존재 여부 판정
    const { data, error } = await query
      .order('ended_at', { ascending: false })
      .range(offset, offset + PAST_SESSIONS_PAGE_SIZE)

    if (error) return { success: false, error: error.message }

    const rows = data ?? []
    const hasMore = rows.length > PAST_SESSIONS_PAGE_SIZE
    return {
      success: true,
      hasMore,
      sessions: rows.slice(0, PAST_SESSIONS_PAGE_SIZE).map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.summary,
        endedAt: s.ended_at as string,
        purged: s.purged_at !== null,
      })),
    }
  } catch (e) {
    logger.error('[listPastChatSessions]', e)
    return { success: false, error: '지난 대화 조회 오류' }
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
    logger.error(e instanceof Error ? e : new Error(String(e)), '[saveChatMessages]')
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
