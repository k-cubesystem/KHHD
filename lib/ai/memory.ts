/**
 * AI 장기 기억 — 세션 간 내담자 맥락 유지
 *
 * recallMemories: 다음 대화 프롬프트에 주입할 기억 top-N 조회
 * extractAndSaveMemories: 대화에서 기억할 사실을 FLASH로 추출·저장 (백그라운드 전용)
 *
 * 쓰기는 service_role(admin client)로만 수행 — RLS는 본인 SELECT/DELETE만 허용.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { generateAIContent } from '@/lib/services/ai-client'
import { logger } from '@/lib/utils/logger'

const MAX_MEMORIES_PER_TARGET = 30
const RECALL_LIMIT = 5
const MAX_EXTRACT_PER_RUN = 3

type MemoryType = 'profile_fact' | 'concern' | 'consultation_summary'

const TYPE_LABEL: Record<MemoryType, string> = {
  profile_fact: '프로필',
  concern: '고민',
  consultation_summary: '지난 상담',
}

interface ExtractedMemory {
  type: MemoryType
  content: string
  importance: number
}

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * 대상(본인 또는 특정 가족)의 기억 top-N을 프롬프트용 텍스트로 반환.
 * 조회된 기억의 last_referenced_at을 비차단으로 갱신한다.
 */
export async function recallMemories(
  userId: string,
  familyMemberId: string | null,
  limit: number = RECALL_LIMIT
): Promise<string> {
  try {
    const admin = createAdminClient()
    let query = admin
      .from('user_ai_memory')
      .select('id, memory_type, content, importance')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
      .order('last_referenced_at', { ascending: false })
      .limit(limit)

    query = familyMemberId ? query.eq('family_member_id', familyMemberId) : query.is('family_member_id', null)

    const { data } = await query
    if (!data || data.length === 0) return ''

    // 참조 시각 갱신 (비차단)
    const ids = data.map((m) => m.id)
    void admin
      .from('user_ai_memory')
      .update({ last_referenced_at: new Date().toISOString() })
      .in('id', ids)
      .then(
        () => {},
        () => {}
      )

    const lines = data.map((m) => {
      const label = TYPE_LABEL[m.memory_type as MemoryType] ?? '기타'
      return `- (${label}) ${m.content}`
    })
    return `[기억된 내담자 맥락 — 지난 상담에서 파악한 정보]\n${lines.join('\n')}`
  } catch (e) {
    logger.warn('[recallMemories] failed:', e)
    return ''
  }
}

/**
 * 세션 대화에서 오래 기억할 사실을 추출해 저장한다. (백그라운드 전용 — after())
 * 중복은 정규화 비교로 스킵, 대상당 상한(30) 초과 시 importance 낮은 순으로 정리.
 */
export async function extractAndSaveMemories(sessionId: string): Promise<void> {
  try {
    const admin = createAdminClient()

    const { data: session } = await admin
      .from('chat_sessions')
      .select('user_id, family_member_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) return

    const { data: msgs } = await admin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!msgs || msgs.length < 2) return

    const transcript = [...msgs]
      .reverse()
      .map((m) => `${m.role === 'user' ? '내담자' : '상담가'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `당신은 상담 기록에서 다음 상담에 기억할 가치가 있는 핵심 사실만 추출하는 분석기입니다.
다음 대화에서 내담자에 대해 오래 기억할 사실을 최대 ${MAX_EXTRACT_PER_RUN}개 뽑아 JSON으로만 출력하십시오.

분류:
- profile_fact: 직업/가족/상황 등 지속되는 사실 (예: "이직 준비 중", "고3 자녀 있음")
- concern: 반복되는 핵심 고민 주제 (예: "재물운 불안")
- consultation_summary: 이번 상담의 핵심 결론 한 줄

규칙:
- 각 content는 40자 이내 한 문장.
- 일시적 잡담·인사·모호한 내용은 제외. 기억할 것이 없으면 빈 배열.
- importance는 1~10 (지속성·중요도가 높을수록 큼).

출력 형식: {"memories":[{"type":"profile_fact","content":"...","importance":7}]}`

    const result = await generateAIContent({
      featureKey: 'shaman-chat',
      systemPrompt,
      userPrompt: transcript,
      jsonMode: true,
      maxTokens: 512,
      temperature: 0.3,
    })

    const extracted = parseExtracted(result.text)
    if (extracted.length === 0) return

    // 기존 기억 로드 (중복 방지 + 상한 계산)
    let existingQuery = admin.from('user_ai_memory').select('id, content').eq('user_id', session.user_id)
    existingQuery = session.family_member_id
      ? existingQuery.eq('family_member_id', session.family_member_id)
      : existingQuery.is('family_member_id', null)
    const { data: existing } = await existingQuery
    const existingContents = new Set((existing ?? []).map((e) => normalizeContent(e.content)))

    const toInsert = extracted
      .filter((m) => !existingContents.has(normalizeContent(m.content)))
      .map((m) => ({
        user_id: session.user_id,
        family_member_id: session.family_member_id,
        memory_type: m.type,
        content: m.content.slice(0, 300),
        importance: m.importance,
        source_session_id: sessionId,
      }))

    if (toInsert.length === 0) return

    await admin.from('user_ai_memory').insert(toInsert)

    const total = (existing?.length ?? 0) + toInsert.length
    if (total > MAX_MEMORIES_PER_TARGET) {
      await pruneMemories(admin, session.user_id, session.family_member_id, total - MAX_MEMORIES_PER_TARGET)
    }
  } catch (e) {
    logger.warn('[extractAndSaveMemories] failed:', e)
  }
}

// ─── 내부 헬퍼 ──────────────────────────────────────────────

function isMemoryType(v: unknown): v is MemoryType {
  return v === 'profile_fact' || v === 'concern' || v === 'consultation_summary'
}

function parseExtracted(text: string): ExtractedMemory[] {
  try {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()
    const parsed: unknown = JSON.parse(cleaned)
    if (typeof parsed !== 'object' || parsed === null) return []
    const raw = (parsed as Record<string, unknown>).memories
    if (!Array.isArray(raw)) return []

    const out: ExtractedMemory[] = []
    for (const item of raw) {
      if (typeof item !== 'object' || item === null) continue
      const rec = item as Record<string, unknown>
      if (!isMemoryType(rec.type)) continue
      if (typeof rec.content !== 'string' || rec.content.trim().length === 0) continue
      const importance =
        typeof rec.importance === 'number' && rec.importance >= 1 && rec.importance <= 10
          ? Math.round(rec.importance)
          : 5
      out.push({ type: rec.type, content: rec.content.trim(), importance })
    }
    return out.slice(0, MAX_EXTRACT_PER_RUN)
  } catch {
    return []
  }
}

function normalizeContent(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

async function pruneMemories(
  admin: AdminClient,
  userId: string,
  familyMemberId: string | null,
  removeCount: number
): Promise<void> {
  let q = admin
    .from('user_ai_memory')
    .select('id')
    .eq('user_id', userId)
    .order('importance', { ascending: true })
    .order('last_referenced_at', { ascending: true })
    .limit(removeCount)
  q = familyMemberId ? q.eq('family_member_id', familyMemberId) : q.is('family_member_id', null)

  const { data } = await q
  if (data && data.length > 0) {
    await admin
      .from('user_ai_memory')
      .delete()
      .in(
        'id',
        data.map((r) => r.id)
      )
  }
}
