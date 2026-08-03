'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/supabase/helpers'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { EPISODE_PAGE_MAX, toEpisodeAccess, validateEpisode, type EpisodeAccess } from '@/lib/domain/webtoon/episode'
import { STORY_REPLY_MAX, isStoryStatus, type StoryStatus } from '@/lib/domain/webtoon/story'

/**
 * 웹툰 운영 — 회차 등록·본문 교체·사연 회신·댓글 가림 해제.
 *
 * ⚠️ 이 파일도 `'use server'` — 모든 export 가 **공개 엔드포인트**다. 화면이 어드민 안에 있다는
 *    사실은 아무것도 막아 주지 않는다. 그래서 관문이 둘이다:
 *      1. 아래 requireAdmin() — 화면에 뜻이 통하는 에러를 돌려주기 위한 것
 *      2. RLS `is_admin()` — **진짜 방어**. 1을 빠뜨려도 DB 가 막는다(20260803_webtoon_admin.sql)
 * ⚠️ 회차·본문·댓글은 사용자 클라이언트로 쓴다(2가 살아 있게). **사연만 service_role** 이다 —
 *    사연 표는 원문과 연락처가 함께 있는 유일한 자리라, 브라우저 세션으로 전체가 조회되는 길을
 *    만들지 않기로 했다(lib/domain/webtoon/story.ts 머리말).
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  return (await getUserRole(supabase, user.id)) === 'admin'
}

export interface AdminResult {
  success: boolean
  error?: 'FORBIDDEN' | 'INVALID' | 'NOT_FOUND' | 'FAILED'
  message?: string
}

const FORBIDDEN: AdminResult = { success: false, error: 'FORBIDDEN', message: '권한이 없습니다' }

// ─── 회차 ────────────────────────────────────────────────────

export interface AdminEpisodeRow {
  id: string
  no: number
  title: string
  summary: string | null
  thumbUrl: string | null
  access: EpisodeAccess
  /** null 이면 초안 — 목록에도 뷰어에도 뜨지 않는다 */
  publishedAt: string | null
  pageCount: number
  commentCount: number
}

/** 운영 목록 — **초안까지 전부**. 공개 정책은 published 만 통과시키므로 여기서만 보인다. */
export async function listAdminEpisodes(): Promise<AdminEpisodeRow[]> {
  if (!(await requireAdmin())) return []
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('webtoon_episodes')
      .select('id, no, title, summary, thumb_url, access, published_at')
      .order('no', { ascending: false })
    if (error) {
      logger.warn('[admin/webtoon] 회차 목록 조회 실패:', error)
      return []
    }

    const rows = (data ?? []).filter(isRecord)
    const ids = rows.map((r) => String(r.id))
    if (ids.length === 0) return []

    // 컷 수·댓글 수는 회차마다 세면 N+1 이 된다. 두 번 읽고 여기서 센다.
    const admin = createAdminClient()
    const [{ data: pages }, { data: comments }] = await Promise.all([
      admin.from('webtoon_episode_pages').select('episode_id').in('episode_id', ids),
      admin.from('webtoon_comments').select('episode_id').in('episode_id', ids).is('deleted_at', null),
    ])
    const count = (list: unknown, id: string): number =>
      Array.isArray(list) ? list.filter((r) => isRecord(r) && r.episode_id === id).length : 0

    return rows.map((r) => ({
      id: String(r.id),
      no: typeof r.no === 'number' ? r.no : 0,
      title: String(r.title ?? ''),
      summary: typeof r.summary === 'string' ? r.summary : null,
      thumbUrl: typeof r.thumb_url === 'string' ? r.thumb_url : null,
      access: toEpisodeAccess(r.access),
      publishedAt: typeof r.published_at === 'string' ? r.published_at : null,
      pageCount: count(pages, String(r.id)),
      commentCount: count(comments, String(r.id)),
    }))
  } catch (e) {
    logger.warn('[admin/webtoon] 회차 목록 예외:', e)
    return []
  }
}

export interface SaveEpisodeInput {
  no: number
  title: string
  summary: string
  access: EpisodeAccess
  thumbUrl: string
  /** ISO 문자열이면 공개, 빈 문자열이면 초안으로 되돌린다 */
  publishedAt: string
}

export interface SaveEpisodeResult extends AdminResult {
  episodeId?: string
}

/** 회차 등록·수정. `no` 가 열쇠라 같은 번호를 다시 저장하면 덮어쓴다. */
export async function saveEpisode(input: SaveEpisodeInput): Promise<SaveEpisodeResult> {
  if (!(await requireAdmin())) return FORBIDDEN

  const draft = {
    no: Number(input?.no),
    title: String(input?.title ?? ''),
    summary: String(input?.summary ?? ''),
    access: toEpisodeAccess(input?.access),
    publishedAt: String(input?.publishedAt ?? ''),
  }
  const issues = validateEpisode(draft)
  if (issues.length > 0) return { success: false, error: 'INVALID', message: issues[0].message }

  const publishedAt = draft.publishedAt.trim()
  if (publishedAt && Number.isNaN(Date.parse(publishedAt)))
    return { success: false, error: 'INVALID', message: '공개 시각을 읽을 수 없습니다' }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('webtoon_episodes')
      .upsert(
        {
          no: draft.no,
          title: draft.title.trim(),
          summary: draft.summary.trim() || null,
          access: draft.access,
          thumb_url: String(input?.thumbUrl ?? '').trim() || null,
          published_at: publishedAt || null,
        },
        { onConflict: 'no' }
      )
      .select('id')
      .single()
    if (error || !data) {
      logger.warn('[admin/webtoon] 회차 저장 실패:', error)
      return { success: false, error: 'FAILED', message: '저장하지 못했습니다' }
    }
    revalidatePath('/protected/webtoon')
    revalidatePath('/admin/webtoon')
    return { success: true, episodeId: String(data.id) }
  } catch (e) {
    logger.error('[admin/webtoon] 회차 저장 예외:', e)
    return { success: false, error: 'FAILED' }
  }
}

/** 회차 삭제 — 본문 페이지는 FK cascade 가 함께 지운다. 버킷 파일은 남는다(되살릴 여지). */
export async function deleteEpisode(episodeId: string): Promise<AdminResult> {
  if (!(await requireAdmin())) return FORBIDDEN
  if (typeof episodeId !== 'string' || episodeId.length === 0) return { success: false, error: 'NOT_FOUND' }
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('webtoon_episodes').delete().eq('id', episodeId)
    if (error) {
      logger.warn('[admin/webtoon] 회차 삭제 실패:', error)
      return { success: false, error: 'FAILED' }
    }
    revalidatePath('/protected/webtoon')
    revalidatePath('/admin/webtoon')
    return { success: true }
  } catch (e) {
    logger.error('[admin/webtoon] 회차 삭제 예외:', e)
    return { success: false, error: 'FAILED' }
  }
}

export interface EpisodeCutInput {
  path: string
  w: number
  h: number
}

/**
 * 본문 컷 목록 교체 — 브라우저가 버킷에 올린 뒤 경로만 넘긴다.
 *
 * ⚠️ 지우고 넣지 **않는다**. 먼저 새 목록을 덮어쓰고, 남은 꼬리(옛 회차가 더 길었던 만큼)만
 *    지운다. 순서를 반대로 하면 넣기가 실패했을 때 회차 본문이 통째로 사라진다.
 */
export async function saveEpisodePages(episodeId: string, cuts: EpisodeCutInput[]): Promise<AdminResult> {
  if (!(await requireAdmin())) return FORBIDDEN
  if (typeof episodeId !== 'string' || episodeId.length === 0) return { success: false, error: 'NOT_FOUND' }
  if (!Array.isArray(cuts)) return { success: false, error: 'INVALID' }
  if (cuts.length > EPISODE_PAGE_MAX)
    return { success: false, error: 'INVALID', message: `한 화는 ${EPISODE_PAGE_MAX}컷까지입니다` }

  const rows = cuts
    .filter((c) => isRecord(c) && typeof c.path === 'string' && c.path.length > 0)
    .filter((c) => Number.isFinite(c.w) && Number.isFinite(c.h) && c.w > 0 && c.h > 0)
    .map((c, idx) => ({
      episode_id: episodeId,
      idx,
      path: c.path,
      w: Math.round(c.w),
      h: Math.round(c.h),
    }))
  if (rows.length !== cuts.length) return { success: false, error: 'INVALID', message: '컷 정보가 올바르지 않습니다' }

  try {
    const supabase = await createClient()
    if (rows.length > 0) {
      const { error } = await supabase.from('webtoon_episode_pages').upsert(rows, { onConflict: 'episode_id,idx' })
      if (error) {
        logger.warn('[admin/webtoon] 본문 저장 실패:', error)
        return { success: false, error: 'FAILED', message: '본문을 저장하지 못했습니다' }
      }
    }
    // 꼬리 정리 — 옛 회차가 더 길었다면 남은 컷을 지운다
    const { error: trimError } = await supabase
      .from('webtoon_episode_pages')
      .delete()
      .eq('episode_id', episodeId)
      .gte('idx', rows.length)
    if (trimError) logger.warn('[admin/webtoon] 옛 컷 정리 실패(비치명):', trimError)

    revalidatePath('/protected/webtoon')
    revalidatePath('/admin/webtoon')
    return { success: true }
  } catch (e) {
    logger.error('[admin/webtoon] 본문 저장 예외:', e)
    return { success: false, error: 'FAILED' }
  }
}

/** 편집 화면이 지금 걸려 있는 컷을 다시 그릴 수 있게 경로만 돌려준다(주소가 아니라 경로다). */
export async function listEpisodeCuts(episodeId: string): Promise<EpisodeCutInput[]> {
  if (!(await requireAdmin())) return []
  if (typeof episodeId !== 'string' || episodeId.length === 0) return []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('webtoon_episode_pages')
      .select('idx, path, w, h')
      .eq('episode_id', episodeId)
      .order('idx', { ascending: true })
    return (data ?? [])
      .filter(isRecord)
      .filter((r) => typeof r.path === 'string' && typeof r.w === 'number' && typeof r.h === 'number')
      .map((r) => ({ path: String(r.path), w: Number(r.w), h: Number(r.h) }))
  } catch (e) {
    logger.warn('[admin/webtoon] 컷 목록 예외:', e)
    return []
  }
}

// ─── 사연 ────────────────────────────────────────────────────

export interface AdminStoryRow {
  id: string
  title: string
  body: string
  contactName: string
  contactPhone: string
  contactKakao: string | null
  status: StoryStatus
  replyNote: string | null
  repliedAt: string | null
  createdAt: string
}

/**
 * 사연 목록 — **연락처를 포함한다**. 회신하려면 봐야 하기 때문이다.
 *
 * ⚠️ service_role 로 읽는다. 이 표에는 어드민용 RLS 정책을 만들지 않았다 — 정책을 만들면
 *    브라우저 세션 하나로 전체 사연을 긁을 수 있는 길이 생긴다.
 */
export async function listAdminStories(): Promise<AdminStoryRow[]> {
  if (!(await requireAdmin())) return []
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('webtoon_story_submissions')
      .select('id, title, body, contact_name, contact_phone, contact_kakao, status, reply_note, replied_at, created_at')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) {
      logger.warn('[admin/webtoon] 사연 목록 조회 실패:', error)
      return []
    }
    return (data ?? []).filter(isRecord).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      body: String(r.body ?? ''),
      contactName: String(r.contact_name ?? ''),
      contactPhone: String(r.contact_phone ?? ''),
      contactKakao: typeof r.contact_kakao === 'string' && r.contact_kakao.trim() ? r.contact_kakao : null,
      status: isStoryStatus(r.status) ? r.status : 'received',
      replyNote: typeof r.reply_note === 'string' && r.reply_note.trim() ? r.reply_note : null,
      repliedAt: typeof r.replied_at === 'string' ? r.replied_at : null,
      createdAt: String(r.created_at ?? ''),
    }))
  } catch (e) {
    logger.warn('[admin/webtoon] 사연 목록 예외:', e)
    return []
  }
}

/**
 * 상태와 회신 한마디를 함께 저장한다.
 *
 * ⚠️ 회신을 지우는 것도 허용한다(빈 문자열). 잘못 쓴 말을 못 지우게 하면 운영자가 DB 를 다시 열게
 *    되고, 그러면 이 화면을 만든 뜻이 없어진다. 지우면 `replied_at` 도 함께 비운다.
 */
export async function updateStory(input: { id: string; status: StoryStatus; replyNote: string }): Promise<AdminResult> {
  if (!(await requireAdmin())) return FORBIDDEN
  const id = String(input?.id ?? '')
  if (id.length === 0) return { success: false, error: 'NOT_FOUND' }
  if (!isStoryStatus(input?.status)) return { success: false, error: 'INVALID', message: '상태가 올바르지 않습니다' }

  const note = String(input?.replyNote ?? '').trim()
  if (note.length > STORY_REPLY_MAX)
    return { success: false, error: 'INVALID', message: `회신은 ${STORY_REPLY_MAX}자까지입니다` }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('webtoon_story_submissions')
      .update({
        status: input.status,
        reply_note: note || null,
        replied_at: note ? new Date().toISOString() : null,
      })
      .eq('id', id)
    if (error) {
      logger.warn('[admin/webtoon] 사연 갱신 실패:', error)
      return { success: false, error: 'FAILED' }
    }
    revalidatePath('/protected/webtoon')
    revalidatePath('/admin/webtoon/stories')
    return { success: true }
  } catch (e) {
    logger.error('[admin/webtoon] 사연 갱신 예외:', e)
    return { success: false, error: 'FAILED' }
  }
}

// ─── 댓글 ────────────────────────────────────────────────────

export interface AdminCommentRow {
  id: string
  episodeNo: number
  body: string
  hidden: boolean
  reportCount: number
  createdAt: string
}

/** 가려진 댓글 — 신고 3건이 자동으로 가린 것들이다. 사람이 다시 보고 되돌릴 수 있어야 한다. */
export async function listHiddenComments(): Promise<AdminCommentRow[]> {
  if (!(await requireAdmin())) return []
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('webtoon_comments')
      .select('id, body, hidden_at, created_at, episode_id, webtoon_episodes(no)')
      .not('hidden_at', 'is', null)
      .is('deleted_at', null)
      .order('hidden_at', { ascending: false })
      .limit(200)
    if (error) {
      logger.warn('[admin/webtoon] 가려진 댓글 조회 실패:', error)
      return []
    }

    const rows = (data ?? []).filter(isRecord)
    const ids = rows.map((r) => String(r.id))
    const { data: reports } = ids.length
      ? await admin.from('webtoon_comment_reports').select('comment_id').in('comment_id', ids)
      : { data: [] }

    return rows.map((r) => {
      const ep: unknown = r.webtoon_episodes
      return {
        id: String(r.id),
        episodeNo: isRecord(ep) && typeof ep.no === 'number' ? ep.no : -1,
        body: String(r.body ?? ''),
        hidden: true,
        reportCount: Array.isArray(reports) ? reports.filter((x) => isRecord(x) && x.comment_id === r.id).length : 0,
        createdAt: String(r.created_at ?? ''),
      }
    })
  } catch (e) {
    logger.warn('[admin/webtoon] 가려진 댓글 예외:', e)
    return []
  }
}

/** 가림 되돌리기 — 지우는 일이 아니므로 되돌릴 수 있다. RLS(is_admin) 가 최종 관문이다. */
export async function setCommentHidden(commentId: string, hidden: boolean): Promise<AdminResult> {
  if (!(await requireAdmin())) return FORBIDDEN
  if (typeof commentId !== 'string' || commentId.length === 0) return { success: false, error: 'NOT_FOUND' }
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('webtoon_comments')
      .update({ hidden_at: hidden ? new Date().toISOString() : null })
      .eq('id', commentId)
    if (error) {
      logger.warn('[admin/webtoon] 댓글 가림 변경 실패:', error)
      return { success: false, error: 'FAILED' }
    }
    revalidatePath('/protected/webtoon')
    revalidatePath('/admin/webtoon/stories')
    return { success: true }
  } catch (e) {
    logger.error('[admin/webtoon] 댓글 가림 예외:', e)
    return { success: false, error: 'FAILED' }
  }
}
