/**
 * 세션 대화 요약기 — 슬라이딩 윈도우 밖(오래된) 메시지를 증분 요약
 *
 * 라이브 컨텍스트는 최근 windowSize개 메시지만 유지하고, 그 이전 메시지는
 * chat_sessions.summary로 접어(fold) 넣는다. 증분 방식이라 매 턴 전체를 다시
 * 요약하지 않고 새로 밀려난 구간만 기존 요약에 통합한다.
 *
 * summarized_message_count: 이미 요약에 접힌 메시지 수(오름차순 오프셋).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { generateAIContent } from '@/lib/services/ai-client'
import { logger } from '@/lib/utils/logger'

const MAX_SUMMARY_LENGTH = 1000

/**
 * 필요 시 세션 요약을 갱신한다. (백그라운드 전용 — after())
 * @param windowSize 라이브 컨텍스트로 유지할 최근 메시지 수
 */
export async function maybeSummarizeSession(sessionId: string, windowSize: number): Promise<void> {
  try {
    const admin = createAdminClient()

    const { data: session } = await admin
      .from('chat_sessions')
      .select('summary, summarized_message_count')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) return

    const { count } = await admin
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
    const total = count ?? 0

    const alreadySummarized = session.summarized_message_count ?? 0
    const foldUpTo = total - windowSize // 윈도우 밖으로 밀려난 지점까지 접는다
    if (foldUpTo <= alreadySummarized) return // 새로 접을 메시지 없음

    // [alreadySummarized, foldUpTo) 구간 로드 (range는 양끝 포함)
    const { data: msgs } = await admin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .range(alreadySummarized, foldUpTo - 1)
    if (!msgs || msgs.length === 0) return

    const newChunk = msgs.map((m) => `${m.role === 'user' ? '내담자' : '상담가'}: ${m.content}`).join('\n')
    const prior = session.summary ? `[기존 요약]\n${session.summary}\n\n` : ''

    const systemPrompt = `당신은 사주 상담 대화를 간결히 요약하는 도구입니다.
기존 요약과 새 대화를 통합하여, 다음 상담 맥락 유지에 필요한 핵심만 250자 이내로 요약하십시오.
내담자의 관심사, 이미 다룬 조언, 진행 상황을 담되 인사말·잡담은 제외하십시오. 요약문만 출력하십시오.`

    const result = await generateAIContent({
      featureKey: 'shaman-chat',
      systemPrompt,
      userPrompt: `${prior}[새 대화]\n${newChunk}`,
      maxTokens: 400,
      temperature: 0.3,
    })

    const summary = result.text.trim().slice(0, MAX_SUMMARY_LENGTH)
    if (!summary) return

    await admin.from('chat_sessions').update({ summary, summarized_message_count: foldUpTo }).eq('id', sessionId)
  } catch (e) {
    logger.warn('[maybeSummarizeSession] failed:', e)
  }
}
