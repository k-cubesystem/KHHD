import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { drawWinners, makeDrawSeed, type DrawCandidate } from '@/lib/domain/event/draw'
import { generateEventReading, maskUsername, type EventTopic } from '@/lib/domain/event/reading'
import { logger } from '@/lib/utils/logger'

/**
 * 이벤트 추첨·초안 서비스 — 크론(event-draw)과 어드민 «지금 추첨»이 공유한다.
 * 라우트 파일은 HTTP 핸들러만 export 할 수 있어 여기로 뺐다.
 */

/** 라운드 추첨 — 멱등(이미 drawn 이면 무동작). 어드민 수동 트리거와 크론이 공유. */
export async function runDrawForRound(
  roundId: string
): Promise<{ ok: true; winners: number; seed: string } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { data: round } = await admin
    .from('event_rounds')
    .select('id, status, closes_at, winner_count')
    .eq('id', roundId)
    .maybeSingle()
  if (!round) return { ok: false, error: '라운드 없음' }
  if (round.status !== 'open' && round.status !== 'closed')
    return { ok: false, error: `상태 ${round.status} — 추첨 대상 아님` }

  // 마감 처리(추첨 중 응모가 끼어들지 않게)
  await admin.from('event_rounds').update({ status: 'closed' }).eq('id', roundId)

  const { data: entries } = await admin
    .from('event_entries')
    .select('id, question, user_id')
    .eq('round_id', roundId)
    .eq('status', 'received')
  const candidates: DrawCandidate[] = (entries ?? []).map((e) => ({
    id: String(e.id),
    question: String(e.question ?? ''),
    isMember: !!e.user_id,
  }))
  const seed = makeDrawSeed(roundId, String(round.closes_at))
  const result = drawWinners(candidates, Number(round.winner_count), seed)

  if (result.winners.length > 0) {
    const { error } = await admin
      .from('event_winners')
      .insert(result.winners.map((w) => ({ round_id: roundId, entry_id: w.id, rank: w.rank })))
    if (error) return { ok: false, error: `winners insert: ${error.message}` }
    await admin
      .from('event_entries')
      .update({ status: 'selected' })
      .in(
        'id',
        result.winners.map((w) => w.id)
      )
  }
  await admin
    .from('event_rounds')
    .update({ status: 'drawn', draw_seed: seed, drawn_at: new Date().toISOString() })
    .eq('id', roundId)
  return { ok: true, winners: result.winners.length, seed }
}

/** 당첨자 1명의 간이 풀이 초안. 실패해도 failed 로 남겨 어드민에서 재시도한다. */
export async function generateDraftForWinner(winnerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { data: w } = await admin
    .from('event_winners')
    .select('id, entry_id, round_id, draft_status')
    .eq('id', winnerId)
    .maybeSingle()
  if (!w) return { ok: false, error: '당첨자 없음' }
  if (w.draft_status !== 'pending' && w.draft_status !== 'failed') return { ok: false, error: `상태 ${w.draft_status}` }

  await admin.from('event_winners').update({ draft_status: 'generating' }).eq('id', winnerId)
  try {
    const [{ data: entry }, { data: round }] = await Promise.all([
      admin
        .from('event_entries')
        .select('threads_username, birth_date, birth_time, gender, question')
        .eq('id', w.entry_id)
        .single(),
      admin.from('event_rounds').select('topic').eq('id', w.round_id).single(),
    ])
    if (!entry || !round) throw new Error('응모/라운드 조회 실패')
    const draft = await generateEventReading({
      topic: String(round.topic) as EventTopic,
      birthDate: String(entry.birth_date),
      birthTime: entry.birth_time ? String(entry.birth_time).slice(0, 5) : null,
      gender: entry.gender as 'male' | 'female' | 'other',
      question: String(entry.question),
      displayName: maskUsername(String(entry.threads_username)),
    })
    await admin
      .from('event_winners')
      .update({
        draft_reading: draft.reading,
        draft_json: {
          pillars: draft.pillars,
          dayMaster: draft.dayMaster,
          headline: draft.headline,
          model: draft.model,
        },
        draft_status: 'ready',
      })
      .eq('id', winnerId)
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('[event-draw] 초안 생성 실패', winnerId, msg)
    await admin.from('event_winners').update({ draft_status: 'failed' }).eq('id', winnerId)
    return { ok: false, error: msg }
  }
}
