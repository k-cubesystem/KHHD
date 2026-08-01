'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'
import { formatKstDate } from '@/lib/utils'
import { COMMENT_PER_EPISODE_LIMIT, COMMENT_RATE_PER_MIN, validateComment } from '@/lib/domain/webtoon/comment'
import { STORY_DAILY_LIMIT, isStoryStatus, validateStory, type StoryStatus } from '@/lib/domain/webtoon/story'
import { REPORT_NOTE_MAX, isReportReason } from '@/lib/domain/webtoon/report'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { notifyStorySubmission } from '@/lib/services/story-mail'

/**
 * 웹툰 — 회차 · 댓글 · 「내 이야기」 접수.
 *
 * ⚠️ 이 파일은 `'use server'` — 모든 export 가 로그인 유저의 **공개 엔드포인트**다.
 *    그래서 재화 지급·권한 상승 함수를 두지 않고, 사연 조회는 **언제나 본인 것만** 돌려준다.
 * ⚠️ 회차·댓글은 공개, 사연은 비공개다. 세 표의 공개 범위가 서로 다르다는 것이 이 모듈의 핵심이라
 *    함수마다 어느 쪽인지 주석으로 못박는다.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

// ─── 회차 (공개) ─────────────────────────────────────────────

export interface WebtoonEpisode {
  id: string
  no: number
  title: string
  summary: string | null
  thumbUrl: string | null
  publishedAt: string
}

function toEpisode(row: unknown): WebtoonEpisode | null {
  if (!isRecord(row)) return null
  if (typeof row.id !== 'string' || typeof row.no !== 'number' || typeof row.title !== 'string') return null
  if (typeof row.published_at !== 'string') return null
  return {
    id: row.id,
    no: row.no,
    title: row.title,
    summary: typeof row.summary === 'string' ? row.summary : null,
    thumbUrl: typeof row.thumb_url === 'string' ? row.thumb_url : null,
    publishedAt: row.published_at,
  }
}

/** 공개된 회차 목록(최신순). RLS 가 미공개를 이미 거르므로 여기서 다시 세지 않는다. */
export async function listEpisodes(): Promise<WebtoonEpisode[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('webtoon_episodes')
      .select('id, no, title, summary, thumb_url, published_at')
      .order('no', { ascending: false })
    if (error) {
      logger.warn('[webtoon] 회차 목록 조회 실패:', error)
      return []
    }
    return (data ?? []).map(toEpisode).filter((e): e is WebtoonEpisode => e !== null)
  } catch (e) {
    logger.warn('[webtoon] 회차 목록 예외(비치명):', e)
    return []
  }
}

/** 회차 하나. 미공개거나 없으면 null(RLS 가 판정한다). */
export async function getEpisode(no: number): Promise<WebtoonEpisode | null> {
  if (!Number.isFinite(no) || no <= 0) return null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('webtoon_episodes')
      .select('id, no, title, summary, thumb_url, published_at')
      .eq('no', Math.floor(no))
      .maybeSingle()
    return toEpisode(data)
  } catch (e) {
    logger.warn('[webtoon] 회차 조회 예외(비치명):', e)
    return null
  }
}

// ─── 댓글 (공개) ─────────────────────────────────────────────

export interface WebtoonComment {
  id: string
  body: string
  authorName: string | null
  /** 내가 쓴 것인가 — 지우기 버튼을 그릴지 정한다(권한 판정은 서버가 다시 한다) */
  mine: boolean
  createdAt: string
}

/**
 * 회차 댓글(최신순).
 *
 * ⚠️ 작성자 정보는 **공개 이름 하나뿐**이다. user_id 를 내려보내면 화면·공유 스냅샷에 계정
 *    식별자가 남는다 — 내 것인지 여부는 서버가 판정해 boolean 으로만 준다.
 */
export interface CommentPage {
  items: WebtoonComment[]
  /**
   * 서버가 읽은 시각 — 'n분 전'의 기준이다.
   *
   * ⚠️ 화면에서 Date.now() 를 부르지 않는 이유가 둘이다: SSR 결과와 클라 시계가 어긋나 하이드레이션이
   *    깨지고, 렌더 중 비순수 호출은 리렌더마다 값이 달라진다(react-hooks/purity). 시각은 여기서 한 번만 읽는다.
   */
  nowMs: number
}

export async function listComments(episodeId: string, limit = 100): Promise<CommentPage> {
  const nowMs = Date.now()
  if (typeof episodeId !== 'string' || episodeId.length === 0) return { items: [], nowMs }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('webtoon_comments')
      .select('id, body, user_id, created_at, profiles(full_name)')
      .eq('episode_id', episodeId)
      .is('deleted_at', null)
      .is('hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(200, Math.floor(limit))))

    if (error) {
      logger.warn('[webtoon] 댓글 조회 실패:', error)
      return { items: [], nowMs }
    }

    const items = (data ?? []).map((r) => {
      const prof: unknown = (r as Record<string, unknown>).profiles
      const name = isRecord(prof) && typeof prof.full_name === 'string' ? prof.full_name : null
      return {
        id: String(r.id),
        body: String(r.body),
        authorName: name,
        mine: user != null && r.user_id === user.id,
        createdAt: String(r.created_at),
      }
    })
    return { items, nowMs }
  } catch (e) {
    logger.warn('[webtoon] 댓글 조회 예외(비치명):', e)
    return { items: [], nowMs }
  }
}

export interface CommentResult {
  success: boolean
  error?: 'UNAUTHORIZED' | 'RATE_LIMITED' | 'INVALID' | 'TOO_MANY' | 'NOT_FOUND' | 'FAILED'
  message?: string
}

/**
 * 댓글 달기 — **RLS 가 최종 관문**이다.
 *
 * ⚠️ 사용자 클라이언트로 INSERT 한다(admin 이 아니다). 정책의 `with check (auth.uid() = user_id)`
 *    가 남의 이름으로 쓰는 길을 막고, 같은 정책이 미공개 회차에 다는 것도 막는다 —
 *    여기서 admin 을 쓰면 그 두 관문이 통째로 사라진다.
 */
export async function addComment(episodeId: string, body: string): Promise<CommentResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const issue = validateComment(typeof body === 'string' ? body : '')
  if (issue) return { success: false, error: 'INVALID', message: issue.message }
  if (typeof episodeId !== 'string' || episodeId.length === 0) return { success: false, error: 'NOT_FOUND' }

  const rl = await rateLimit(`webtoon-comment:${user.id}`, {
    interval: 60_000,
    uniqueTokenPerInterval: COMMENT_RATE_PER_MIN,
  })
  if (!rl.success) return { success: false, error: 'RATE_LIMITED' }

  // 한 회차 도배 방지 — 상한은 도메인이 정한다
  const { count } = await supabase
    .from('webtoon_comments')
    .select('id', { count: 'exact', head: true })
    .eq('episode_id', episodeId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
  if ((count ?? 0) >= COMMENT_PER_EPISODE_LIMIT) return { success: false, error: 'TOO_MANY' }

  const { error } = await supabase
    .from('webtoon_comments')
    .insert({ episode_id: episodeId, user_id: user.id, body: body.trim() })
  if (error) {
    logger.warn('[webtoon] 댓글 저장 실패:', error)
    return { success: false, error: 'FAILED' }
  }

  revalidatePath('/protected/webtoon')
  return { success: true }
}

/** 내 댓글 지우기 — 소프트 삭제. 정책이 본인 것만 통과시킨다. */
export async function removeComment(commentId: string): Promise<CommentResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }
  if (typeof commentId !== 'string' || commentId.length === 0) return { success: false, error: 'NOT_FOUND' }

  const { error } = await supabase
    .from('webtoon_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', user.id)
  if (error) {
    logger.warn('[webtoon] 댓글 삭제 실패:', error)
    return { success: false, error: 'FAILED' }
  }
  revalidatePath('/protected/webtoon')
  return { success: true }
}

// ─── 「내 이야기」 접수 (비공개) ──────────────────────────────

export interface MyStoryRow {
  id: string
  title: string
  status: StoryStatus
  createdAt: string
  /** 운영자가 남긴 회신 한마디 — 읽었으면 답한다는 약속의 실체 */
  replyNote: string | null
}

/**
 * **내 접수만** 돌려준다. 남의 사연은 이 앱 어디에서도 조회되지 않는다 —
 * 목록도 개수도 없다(있으면 "몇 명이 뭘 보냈다"가 새기 시작한다).
 *
 * ⚠️ 연락처는 담지 않는다. 접수 확인 화면에서조차 되보여 주지 않는 것이 이 표의 규율이다.
 */
export async function listMyStories(): Promise<MyStoryRow[]> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('webtoon_story_submissions')
      .select('id, title, status, created_at, reply_note')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      logger.warn('[webtoon] 내 사연 조회 실패:', error)
      return []
    }
    return (data ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title),
      status: isStoryStatus(r.status) ? r.status : 'received',
      createdAt: String(r.created_at),
      replyNote: typeof r.reply_note === 'string' && r.reply_note.trim() ? r.reply_note : null,
    }))
  } catch (e) {
    logger.warn('[webtoon] 내 사연 예외(비치명):', e)
    return []
  }
}

export interface StoryGateInfo {
  /** 멤버십 회원인가 — **제작(선정) 자격**의 기준이다. 접수는 누구나 할 수 있다 */
  member: boolean
}

/**
 * 접수 전 안내용 조회 — **제작 자격을 보내기 전에** 알리기 위한 것이다.
 * 다 쓰고 보낸 뒤에 "회원이 아니라 그릴 수 없다"고 알리면 사람의 시간을 받은 것이 된다.
 */
export async function getStoryGate(): Promise<StoryGateInfo> {
  try {
    const membership = await getCurrentUserMembership()
    return { member: membership != null }
  } catch (e) {
    logger.warn('[webtoon] 멤버십 조회 예외(비치명):', e)
    // 모르면 **비회원으로 본다** — 회원이라고 잘못 말하면 그려질 수 없는 사람에게 그려진다고 한 것이 된다
    return { member: false }
  }
}

export interface SubmitStoryResult {
  success: boolean
  error?: 'UNAUTHORIZED' | 'RATE_LIMITED' | 'INVALID' | 'DAILY_LIMIT' | 'FAILED'
  message?: string
  /** 알림 메일이 실제로 나갔는가 — 화면이 "메일도 갔다"고 단정하지 않게 */
  notified?: boolean
}

/**
 * 사연 접수.
 *
 * ⚠️ 순서가 중요하다: **저장 → 알림**이다. 알림을 먼저 하거나 알림 실패로 저장을 되돌리면
 *    사람이 오래 쓴 글이 사라진다. 메일은 실패해도 접수는 남는다.
 * ⚠️ 접수는 service_role RPC 로만 한다 — 쓰기 정책을 주면 하루 상한을 우회할 수 있다.
 */
export async function submitStory(input: {
  title: string
  body: string
  contactName: string
  contactPhone: string
  contactKakao: string
}): Promise<SubmitStoryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const draft = {
    title: String(input?.title ?? ''),
    body: String(input?.body ?? ''),
    contactName: String(input?.contactName ?? ''),
    contactPhone: String(input?.contactPhone ?? ''),
    contactKakao: String(input?.contactKakao ?? ''),
  }
  const issues = validateStory(draft)
  if (issues.length > 0) return { success: false, error: 'INVALID', message: issues[0].message }

  const rl = await rateLimit(`webtoon-story:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 3 })
  if (!rl.success) return { success: false, error: 'RATE_LIMITED' }

  // ⚠️ 접수에 값을 받지 않는다(CEO 2026-08-01). 제작 자격만 멤버십으로 좁혔으므로,
  //    값을 그대로 두면 **그려질 수 없는 사람에게 값을 받는** 구조가 된다 — 그건 어떤 문구로도
  //    정당화되지 않는다. 자격은 폼이 보내기 전에 알리고, 여기서는 받기만 한다.
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('submit_webtoon_story', {
    p_user_id: user.id,
    p_title: draft.title,
    p_body: draft.body,
    p_contact_name: draft.contactName,
    p_contact_phone: draft.contactPhone,
    p_contact_kakao: draft.contactKakao,
    p_today: formatKstDate(),
    p_daily_limit: STORY_DAILY_LIMIT,
    p_paid_amount: 0,
  })

  const row: unknown = error ? null : Array.isArray(data) ? data[0] : data
  const allowed = isRecord(row) && row.allowed === true
  if (!allowed) {
    if (error) {
      logger.error('[webtoon] 사연 접수 RPC 실패:', error)
      return { success: false, error: 'FAILED' }
    }
    return { success: false, error: 'DAILY_LIMIT' }
  }
  const submissionId = isRecord(row) && typeof row.submission_id === 'string' ? row.submission_id : ''

  // 접수는 끝났다. 여기부터는 **알림**이라 실패해도 성공을 돌려준다.
  const notified = await notifyStorySubmission({
    submissionId,
    title: draft.title,
    no: isRecord(row) && typeof row.today_count === 'number' ? row.today_count : null,
    receivedAt: new Date().toISOString(),
    bodyLength: draft.body.trim().length,
  })
  if (notified && submissionId) {
    await admin
      .from('webtoon_story_submissions')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', submissionId)
  }

  revalidatePath('/protected/webtoon')
  return { success: true, notified }
}

// ─── 댓글 신고 (CEO 2026-08-01) ──────────────────────────────

export interface ReportResult {
  success: boolean
  error?: 'UNAUTHORIZED' | 'INVALID' | 'ALREADY' | 'RATE_LIMITED' | 'FAILED'
}

/**
 * 댓글 신고 — 익명 접수. 여러 건이 쌓이면 **트리거가** 가린다.
 *
 * ⚠️ 가림 판정을 여기서 하지 않는다. 액션이 세면 클라이언트 경로마다 셈이 갈리고,
 *    무엇보다 신고 두 건이 동시에 오면 둘 다 "아직 2건"으로 읽는다. 판정은 트리거 한 곳이다.
 * ⚠️ 사용자 클라이언트로 INSERT 한다 — 정책의 with check (auth.uid() = reporter_id) 가
 *    남의 이름으로 신고하는 길을 막는다(admin 을 쓰면 그 관문이 사라진다).
 */
export async function reportComment(commentId: string, reason: string, note = ''): Promise<ReportResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }
  if (typeof commentId !== 'string' || commentId.length === 0) return { success: false, error: 'INVALID' }
  if (!isReportReason(reason)) return { success: false, error: 'INVALID' }

  const rl = await rateLimit(`webtoon-report:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 10 })
  if (!rl.success) return { success: false, error: 'RATE_LIMITED' }

  const trimmed = typeof note === 'string' ? note.trim().slice(0, REPORT_NOTE_MAX) : ''
  const { error } = await supabase.from('webtoon_comment_reports').insert({
    comment_id: commentId,
    reporter_id: user.id,
    reason,
    note: trimmed.length > 0 ? trimmed : null,
  })
  if (error) {
    // 유니크 위반 = 이미 신고한 댓글. 이유를 구분해 알린다(같은 말을 두 번 하게 두지 않는다)
    if (error.code === '23505') return { success: false, error: 'ALREADY' }
    logger.warn('[webtoon] 신고 저장 실패:', error)
    return { success: false, error: 'FAILED' }
  }
  return { success: true }
}
