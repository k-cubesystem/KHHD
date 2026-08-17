import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchReplies, fetchInsights, loadThreadsToken, refreshLongLivedToken } from '@/lib/services/threads/client'
import { classifyReply, needsAiClassification, type ReplyClass } from '@/lib/domain/threads/classify'
import { generateAIContent } from '@/lib/services/ai-client'
import { logger } from '@/lib/utils/logger'

/**
 * Threads 동기화 크론 (10분) — 웹훅은 Live Mode+비즈니스 인증이 전제라 폴링으로 간다.
 *
 * 1) 최근 14일 내 발행한 내 글의 최상위 댓글을 긁어 threads_replies 에 적재(멱등: reply_id unique)
 * 2) 새 댓글을 규칙 분류 → 확신 없는 것만 AI 2차
 * 3) apply 분류엔 «신청 안내» 답글 초안을 큐에 넣는다(사람 승인 후 발송 — 자동 발송 아님)
 * 4) 글별 인사이트 갱신(24h 지난 것만)
 * 5) 토큰 만료 7일 전이면 갱신
 *
 * 킬스위치: system_settings.threads_automation_enabled
 * 읽기 예산: 4,800×impressions/24h(최소 48,000) — 10분×글 20개 = 2,880/일이라 여유.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const LOOKBACK_DAYS = 14
const MAX_POSTS_PER_RUN = 20
const AI_CLASSIFY_PER_RUN = 15
const TOKEN_REFRESH_BEFORE_DAYS = 7

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === 'development') logger.warn('[Cron threads-sync] dev — auth skip')
    else return new NextResponse('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()
  const { data: setting } = await admin
    .from('system_settings')
    .select('value')
    .eq('key', 'threads_automation_enabled')
    .single()
  if (!setting || setting.value !== 'true') return NextResponse.json({ message: 'threads automation disabled' })

  const token = await loadThreadsToken()
  if (!token) return NextResponse.json({ message: 'no threads token' })

  const summary = {
    posts: 0,
    newReplies: 0,
    aiClassified: 0,
    queued: 0,
    insights: 0,
    tokenRefreshed: false,
    errors: [] as string[],
  }

  // 5) 토큰 갱신
  if (token.expiresAt.getTime() - Date.now() < TOKEN_REFRESH_BEFORE_DAYS * 86400_000) {
    const r = await refreshLongLivedToken()
    summary.tokenRefreshed = r.ok
    if (!r.ok) {
      summary.errors.push(`token refresh: ${r.error}`)
      logger.error('[threads-sync] 토큰 갱신 실패 — 만료 전 재인증 필요', r.error)
    }
  }

  // 1) 대상 글
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString()
  const { data: posts } = await admin
    .from('threads_posts')
    .select('id, media_id, published_at, insights_at, kind, round_id')
    .eq('status', 'published')
    .not('media_id', 'is', null)
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(MAX_POSTS_PER_RUN)

  for (const p of posts ?? []) {
    summary.posts++
    const mediaId = String(p.media_id)
    const res = await fetchReplies(mediaId)
    if (!res.ok) {
      summary.errors.push(`replies ${mediaId}: ${res.error}`)
      continue
    }
    for (const r of res.data) {
      if (r.is_reply_owned_by_me) continue // 내 답글은 적재하지 않는다
      const cls = classifyReply(r.text)
      const { data: ins, error } = await admin
        .from('threads_replies')
        .insert({
          reply_id: r.id,
          post_id: p.id,
          username: r.username,
          text: r.text,
          replied_at: r.timestamp,
          classification: cls.classification,
          classified_by: 'rule',
          hide_status: r.hide_status,
          raw: r.raw,
        })
        .select('id')
        .maybeSingle()
      if (error) {
        if (error.code !== '23505') summary.errors.push(`insert ${r.id}: ${error.message}`)
        continue // 이미 있음(멱등)
      }
      if (!ins) continue
      summary.newReplies++

      // 2) AI 2차
      let finalClass: ReplyClass = cls.classification
      if (needsAiClassification(cls) && summary.aiClassified < AI_CLASSIFY_PER_RUN) {
        const ai = await aiClassify(r.text ?? '')
        if (ai) {
          finalClass = ai
          summary.aiClassified++
          await admin.from('threads_replies').update({ classification: ai, classified_by: 'ai' }).eq('id', ins.id)
        }
      }

      // 3) 신청 의사 → 안내 답글 초안 큐(발송은 사람이)
      if (finalClass === 'apply' && p.round_id) {
        const draft = await buildApplyReplyDraft(admin, String(p.round_id), r.username, ins.id)
        if (draft) {
          await admin
            .from('threads_reply_queue')
            .insert({ reply_to: ins.id, draft_text: draft.text, variant_key: draft.variant })
          summary.queued++
        }
      }
    }

    // 4) 인사이트 (24h 경과분)
    const stale = !p.insights_at || Date.now() - Date.parse(String(p.insights_at)) > 86400_000
    if (stale) {
      const ins = await fetchInsights(mediaId)
      if (ins.ok) {
        await admin
          .from('threads_posts')
          .update({ insights: ins.data, insights_at: new Date().toISOString() })
          .eq('id', p.id)
        summary.insights++
      }
    }
  }

  return NextResponse.json({ ok: summary.errors.length === 0, ...summary })
}

async function aiClassify(text: string): Promise<ReplyClass | null> {
  try {
    const res = await generateAIContent({
      featureKey: 'threads-classify',
      systemPrompt:
        '스레드 댓글을 다음 중 하나로 분류합니다: apply(이벤트 신청·참여 의사), question(질문), chat(감상·인사·잡담), spam(광고·도배·욕설), other. JSON {"c":"..."} 만 답하세요.',
      userPrompt: text.slice(0, 500),
      maxTokens: 20,
      temperature: 0,
      jsonMode: true,
      actionType: 'threads_classify',
    })
    const parsed = JSON.parse(res.text) as { c?: unknown }
    const c = parsed.c
    if (c === 'apply' || c === 'question' || c === 'chat' || c === 'spam' || c === 'other') return c
    return null
  } catch (e) {
    logger.warn('[threads-sync] AI 분류 실패', e instanceof Error ? e.message : String(e))
    return null
  }
}

/**
 * 신청 안내 답글 초안 — 문안 5종 로테이션 + 댓글 작성자 언급. «반복 콘텐츠» 지표를 피하려는 최소 변주다.
 * 링크는 UTM 을 단다(Track A-1 이 있어야 이 줄이 계측된다).
 */
const APPLY_VARIANTS = [
  (n: string, url: string) =>
    `${n} 반갑습니다 🙂 이번 라운드 신청은 아래 링크에서 받고 있어요. 생년월일과 궁금한 점을 적어주시면 돼요.\n${url}`,
  (n: string, url: string) =>
    `${n} 관심 감사해요. 신청은 스레드 댓글이 아니라 이 페이지에서 받습니다(개인정보라서요).\n${url}`,
  (n: string, url: string) =>
    `${n} 함께해요! 신청 링크 남겨드립니다. 마감 후 결과는 여기 스레드에서 발표할게요.\n${url}`,
  (n: string, url: string) =>
    `${n} 고맙습니다. 아래에서 신청해 주세요 — 궁금한 점을 구체적으로 적어주실수록 풀이가 또렷해져요.\n${url}`,
  (n: string, url: string) => `${n} 저희가 뽑아드릴게요 🙏 신청은 이 링크에서, 발표는 이번 주 토요일이에요.\n${url}`,
]

async function buildApplyReplyDraft(
  admin: ReturnType<typeof createAdminClient>,
  roundId: string,
  username: string | null,
  replyRowId: string
): Promise<{ text: string; variant: string } | null> {
  const { data: round } = await admin.from('event_rounds').select('slug, status').eq('id', roundId).maybeSingle()
  if (!round || round.status !== 'open') return null
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://k-haehwadang.com'
  const url = `${site}/event/${round.slug}?utm_source=threads&utm_medium=reply&utm_campaign=${encodeURIComponent(round.slug)}`
  const name = username ? `@${username}` : '안녕하세요,'
  // 결정론 로테이션 — 같은 댓글엔 같은 문안(재실행 안전), 댓글마다는 다르게
  let h = 0
  for (const ch of replyRowId) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const idx = h % APPLY_VARIANTS.length
  return { text: APPLY_VARIANTS[idx](name, url), variant: `apply-v${idx + 1}` }
}
