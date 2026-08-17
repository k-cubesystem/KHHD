import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

/**
 * Threads API 클라이언트 (Meta Threads Graph API v1.0).
 *
 * 설계 원칙 — webpush.ts 와 같은 결이다.
 *  · 토큰이 없으면 «완전한 무동작». 크론·액션은 disabled 를 받고 조용히 돌아간다.
 *  · 어떤 실패도 throw 하지 않는다. 결과 객체로 돌려주고 threads_api_logs 에 남긴다.
 *  · 토큰은 threads_tokens(1행)에 있고 service_role 만 읽는다(RLS 정책 없음).
 *
 * API 사실 (docs 2026-08-17 확인 — PLAN-threads-event-automation-v1.md §5):
 *  · 게시는 2단계: POST /{user}/threads(컨테이너) → 30초 권장 대기 → POST /{user}/threads_publish
 *  · 텍스트만이면 auto_publish_text=true 로 1단계 즉시 게시 가능
 *  · 미디어는 공개 URL 만(업로드 API 없음). 이미지 8MB·폭 320~1440 / 영상 5분·1GB
 *  · 텍스트 500자(이모지는 UTF-8 바이트 계산). 링크 5개 초과 시 실패
 *  · 댓글: GET /{media}/replies(최상위) — username 은 공개 계정만 온다
 *  · 답글: POST /{user}/threads + reply_to_id → publish
 *  · 한도(24h 이동창): 게시 250 · 답글 1,000 · 삭제 100 · 읽기 4,800×impressions
 *  · 장기 토큰 60일. 24h 경과·만료 전에만 갱신 가능(놓치면 브라우저 재인증)
 */

const GRAPH = 'https://graph.threads.net/v1.0'
export const THREADS_TEXT_MAX = 500
/** 컨테이너 생성 후 publish 까지 권장 대기(ms). 문서: "평균 30초". 텍스트는 즉시 가능하니 미디어만 기다린다. */
const MEDIA_SETTLE_MS = 30_000
/** 컨테이너 상태 폴링 — 문서: 1분 간격 최대 5분. 여기서는 5초 간격 최대 60초(서버리스 60초 상한). */
const CONTAINER_POLL_MS = 5_000
const CONTAINER_POLL_MAX = 11

export type ThreadsMediaType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL'

export interface ThreadsToken {
  threadsUserId: string
  username: string | null
  accessToken: string
  expiresAt: Date
}

export type ThreadsResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number; disabled?: boolean }

export interface ThreadsReply {
  id: string
  text: string | null
  username: string | null
  timestamp: string | null
  permalink: string | null
  hide_status: string | null
  is_reply_owned_by_me?: boolean
  raw: Record<string, unknown>
}

export interface ThreadsInsights {
  views?: number
  likes?: number
  replies?: number
  reposts?: number
  quotes?: number
  shares?: number
}

// ────────────────────────────────────────────────────────────────
// 토큰
// ────────────────────────────────────────────────────────────────

/** 저장된 장기 토큰. 없거나 만료면 null — «Threads 꺼짐» 상태다. */
export async function loadThreadsToken(): Promise<ThreadsToken | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('threads_tokens')
    .select('threads_user_id, username, access_token, expires_at')
    .eq('id', 1)
    .maybeSingle()
  if (error || !data) return null
  const expiresAt = new Date(data.expires_at)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return null
  return {
    threadsUserId: String(data.threads_user_id),
    username: data.username ? String(data.username) : null,
    accessToken: String(data.access_token),
    expiresAt,
  }
}

/** 단기 토큰(OAuth code 교환 결과)을 장기 토큰으로 바꿔 저장한다 — S1 인증 마지막 단계. */
export async function exchangeAndStoreLongLivedToken(shortLivedToken: string): Promise<ThreadsResult<ThreadsToken>> {
  const secret = process.env.THREADS_APP_SECRET
  if (!secret) return { ok: false, error: 'THREADS_APP_SECRET 미설정', disabled: true }
  const url = `${GRAPH}/access_token?grant_type=th_exchange_token&client_secret=${encodeURIComponent(secret)}&access_token=${encodeURIComponent(shortLivedToken)}`
  const res = await callJson<{ access_token?: string; expires_in?: number }>('refresh', url, { method: 'GET' })
  if (!res.ok) return res
  const { access_token, expires_in } = res.data
  if (!access_token) return { ok: false, error: '장기 토큰 응답에 access_token 없음' }
  return storeToken(access_token, expires_in ?? 60 * 24 * 3600)
}

/** 장기 토큰 갱신 — 24h 지났고 만료 전이어야 한다. 크론이 만료 7일 전부터 시도한다. */
export async function refreshLongLivedToken(): Promise<ThreadsResult<ThreadsToken>> {
  const cur = await loadThreadsToken()
  if (!cur) return { ok: false, error: '토큰 없음/만료', disabled: true }
  const url = `${GRAPH}/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(cur.accessToken)}`
  const res = await callJson<{ access_token?: string; expires_in?: number }>('refresh', url, { method: 'GET' })
  if (!res.ok) return res
  const { access_token, expires_in } = res.data
  if (!access_token) return { ok: false, error: '갱신 응답에 access_token 없음' }
  return storeToken(access_token, expires_in ?? 60 * 24 * 3600, cur)
}

async function storeToken(
  accessToken: string,
  expiresInSec: number,
  prev?: ThreadsToken
): Promise<ThreadsResult<ThreadsToken>> {
  // 내 프로필로 user id·username 확정 (토큰 유효성 검증 겸)
  const me = await callJson<{ id?: string; username?: string }>(
    'me',
    `${GRAPH}/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
    { method: 'GET' }
  )
  if (!me.ok) return me
  const threadsUserId = me.data.id ?? prev?.threadsUserId
  if (!threadsUserId) return { ok: false, error: '프로필 응답에 id 없음' }
  const expiresAt = new Date(Date.now() + expiresInSec * 1000)
  const admin = createAdminClient()
  const { error } = await admin.from('threads_tokens').upsert(
    {
      id: 1,
      threads_user_id: threadsUserId,
      username: me.data.username ?? prev?.username ?? null,
      access_token: accessToken,
      expires_at: expiresAt.toISOString(),
      refreshed_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) return { ok: false, error: `토큰 저장 실패: ${error.message}` }
  return { ok: true, data: { threadsUserId, username: me.data.username ?? null, accessToken, expiresAt } }
}

// ────────────────────────────────────────────────────────────────
// 게시
// ────────────────────────────────────────────────────────────────

export interface PublishInput {
  text: string
  mediaType?: ThreadsMediaType
  /** IMAGE 면 image_url, VIDEO 면 video_url — 공개 URL 이어야 한다 */
  mediaUrl?: string
  replyToId?: string
  /** 링크 첨부(TEXT 전용) */
  linkAttachment?: string
  replyControl?: 'everyone' | 'accounts_you_follow' | 'mentioned_only' | 'parent_post_author_only' | 'followers_only'
}

export interface PublishOutput {
  mediaId: string
  containerId: string
}

/** 글·답글 게시. 실패는 결과로 돌려주고 threads_api_logs 에 남긴다. */
export async function publishThread(input: PublishInput): Promise<ThreadsResult<PublishOutput>> {
  const token = await loadThreadsToken()
  if (!token) return { ok: false, error: 'Threads 토큰 없음 — 인증(S1) 먼저', disabled: true }
  const textErr = validateText(input.text)
  if (textErr) return { ok: false, error: textErr }

  const mediaType: ThreadsMediaType = input.mediaType ?? 'TEXT'
  const params = new URLSearchParams({ media_type: mediaType, text: input.text, access_token: token.accessToken })
  if (mediaType === 'IMAGE' && input.mediaUrl) params.set('image_url', input.mediaUrl)
  if (mediaType === 'VIDEO' && input.mediaUrl) params.set('video_url', input.mediaUrl)
  if ((mediaType === 'IMAGE' || mediaType === 'VIDEO') && !input.mediaUrl) {
    return { ok: false, error: `${mediaType} 는 mediaUrl 필수` }
  }
  if (input.replyToId) params.set('reply_to_id', input.replyToId)
  if (input.linkAttachment && mediaType === 'TEXT') params.set('link_attachment', input.linkAttachment)
  if (input.replyControl) params.set('reply_control', input.replyControl)
  // 텍스트는 1단계에서 바로 게시할 수 있다(auto_publish_text). 미디어는 컨테이너가 «준비»돼야 한다.
  if (mediaType === 'TEXT') params.set('auto_publish_text', 'true')

  const created = await callJson<{ id?: string }>('publish', `${GRAPH}/${token.threadsUserId}/threads`, {
    method: 'POST',
    body: params,
  })
  if (!created.ok) return created
  const containerId = created.data.id
  if (!containerId) return { ok: false, error: '컨테이너 id 없음' }

  if (mediaType === 'TEXT') {
    // auto_publish_text: 반환 id 가 곧 media id
    return { ok: true, data: { mediaId: containerId, containerId } }
  }

  // 미디어: 준비 대기 → publish
  const ready = await waitContainerReady(containerId, token.accessToken)
  if (!ready.ok) return ready
  const pub = await callJson<{ id?: string }>('publish', `${GRAPH}/${token.threadsUserId}/threads_publish`, {
    method: 'POST',
    body: new URLSearchParams({ creation_id: containerId, access_token: token.accessToken }),
  })
  if (!pub.ok) return pub
  if (!pub.data.id) return { ok: false, error: 'publish 응답에 id 없음' }
  return { ok: true, data: { mediaId: pub.data.id, containerId } }
}

async function waitContainerReady(containerId: string, accessToken: string): Promise<ThreadsResult<true>> {
  await sleep(MEDIA_SETTLE_MS)
  for (let i = 0; i < CONTAINER_POLL_MAX; i++) {
    const st = await callJson<{ status?: string; error_message?: string }>(
      'container',
      `${GRAPH}/${containerId}?fields=status,error_message&access_token=${encodeURIComponent(accessToken)}`,
      { method: 'GET' }
    )
    if (!st.ok) return st
    const s = st.data.status
    if (s === 'FINISHED') return { ok: true, data: true }
    if (s === 'ERROR' || s === 'EXPIRED') return { ok: false, error: `컨테이너 ${s}: ${st.data.error_message ?? ''}` }
    await sleep(CONTAINER_POLL_MS)
  }
  return { ok: false, error: '컨테이너 준비 시간 초과(60초) — 미디어가 크거나 URL 접근 불가' }
}

/** 게시 텍스트 검증 — 500자·링크 5개. 이모지는 UTF-8 바이트로 세는 문서 규칙을 따른다. */
export function validateText(text: string): string | null {
  const bytesAware = countThreadsChars(text)
  if (bytesAware > THREADS_TEXT_MAX) return `본문 ${bytesAware}자 — 상한 ${THREADS_TEXT_MAX}`
  const links = (text.match(/https?:\/\/\S+/g) ?? []).length
  if (links > 5) return `링크 ${links}개 — 상한 5`
  return null
}

/** Threads 는 이모지 등 비 BMP 문자를 UTF-8 바이트 수로 센다. 보수적으로 코드포인트가 아니라 UTF-8 길이를 쓴다. */
export function countThreadsChars(text: string): number {
  let n = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    // ASCII·한글(3바이트)은 «1글자»로 취급되지만, 문서가 명시한 것은 이모지=UTF-8 바이트다.
    // 관찰상 한글은 1자로 계산되므로 BMP 는 1, 그 밖(이모지 등)은 UTF-8 바이트(4)로 센다.
    n += cp > 0xffff ? 4 : 1
  }
  return n
}

// ────────────────────────────────────────────────────────────────
// 댓글 · 인사이트
// ────────────────────────────────────────────────────────────────

const REPLY_FIELDS = 'id,text,username,timestamp,permalink,hide_status,is_reply_owned_by_me,media_type'

/** 내 글의 최상위 댓글 전부(페이지네이션 따라감). 상한 500건 — 그 이상이면 폴링 간격을 줄일 일이다. */
export async function fetchReplies(mediaId: string): Promise<ThreadsResult<ThreadsReply[]>> {
  const token = await loadThreadsToken()
  if (!token) return { ok: false, error: 'Threads 토큰 없음', disabled: true }
  const out: ThreadsReply[] = []
  let url: string | null =
    `${GRAPH}/${mediaId}/replies?fields=${REPLY_FIELDS}&limit=100&access_token=${encodeURIComponent(token.accessToken)}`
  while (url && out.length < 500) {
    const page: ThreadsResult<{ data?: Array<Record<string, unknown>>; paging?: { next?: string } }> = await callJson(
      'replies',
      url,
      { method: 'GET' }
    )
    if (!page.ok) return page
    for (const r of page.data.data ?? []) out.push(toReply(r))
    url = page.data.paging?.next ?? null
  }
  return { ok: true, data: out }
}

function toReply(r: Record<string, unknown>): ThreadsReply {
  const s = (k: string): string | null => (typeof r[k] === 'string' ? (r[k] as string) : null)
  return {
    id: String(r.id ?? ''),
    text: s('text'),
    username: s('username'),
    timestamp: s('timestamp'),
    permalink: s('permalink'),
    hide_status: s('hide_status'),
    is_reply_owned_by_me: typeof r.is_reply_owned_by_me === 'boolean' ? r.is_reply_owned_by_me : undefined,
    raw: r,
  }
}

/** 내 글 최상위 댓글 숨김/해제. */
export async function hideReply(replyId: string, hide: boolean): Promise<ThreadsResult<true>> {
  const token = await loadThreadsToken()
  if (!token) return { ok: false, error: 'Threads 토큰 없음', disabled: true }
  const res = await callJson<{ success?: boolean }>('hide', `${GRAPH}/${replyId}/manage_reply`, {
    method: 'POST',
    body: new URLSearchParams({ hide: String(hide), access_token: token.accessToken }),
  })
  if (!res.ok) return res
  return { ok: true, data: true }
}

/** 게시물 인사이트. views·shares 는 문서상 "in development" 라 없을 수 있다. */
export async function fetchInsights(mediaId: string): Promise<ThreadsResult<ThreadsInsights>> {
  const token = await loadThreadsToken()
  if (!token) return { ok: false, error: 'Threads 토큰 없음', disabled: true }
  const res = await callJson<{
    data?: Array<{ name?: string; values?: Array<{ value?: number }>; total_value?: { value?: number } }>
  }>(
    'insights',
    `${GRAPH}/${mediaId}/insights?metric=views,likes,replies,reposts,quotes,shares&access_token=${encodeURIComponent(token.accessToken)}`,
    { method: 'GET' }
  )
  if (!res.ok) return res
  const out: ThreadsInsights = {}
  for (const m of res.data.data ?? []) {
    const name = m.name as keyof ThreadsInsights | undefined
    const v = m.total_value?.value ?? m.values?.[0]?.value
    if (name && typeof v === 'number') out[name] = v
  }
  return { ok: true, data: out }
}

/** 계정 팔로워 수(주간 보고서용). */
export async function fetchFollowersCount(): Promise<ThreadsResult<number>> {
  const token = await loadThreadsToken()
  if (!token) return { ok: false, error: 'Threads 토큰 없음', disabled: true }
  const res = await callJson<{ data?: Array<{ name?: string; total_value?: { value?: number } }> }>(
    'insights',
    `${GRAPH}/${token.threadsUserId}/threads_insights?metric=followers_count&access_token=${encodeURIComponent(token.accessToken)}`,
    { method: 'GET' }
  )
  if (!res.ok) return res
  const v = res.data.data?.find((d) => d.name === 'followers_count')?.total_value?.value
  return { ok: true, data: typeof v === 'number' ? v : 0 }
}

/** 게시/답글 한도 사용량 — 어드민 대시보드 표시용. */
export async function fetchPublishingLimit(): Promise<ThreadsResult<Record<string, unknown>>> {
  const token = await loadThreadsToken()
  if (!token) return { ok: false, error: 'Threads 토큰 없음', disabled: true }
  return callJson(
    'limit',
    `${GRAPH}/${token.threadsUserId}/threads_publishing_limit?fields=quota_usage,config,reply_quota_usage,reply_config&access_token=${encodeURIComponent(token.accessToken)}`,
    { method: 'GET' }
  )
}

// ────────────────────────────────────────────────────────────────
// 공용 호출 — throw 하지 않고 로그를 남긴다
// ────────────────────────────────────────────────────────────────

async function callJson<T>(
  op: string,
  url: string,
  init: { method: 'GET' | 'POST'; body?: URLSearchParams }
): Promise<ThreadsResult<T>> {
  let status = 0
  try {
    const res = await fetch(url, {
      method: init.method,
      body: init.body,
      headers: init.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      cache: 'no-store',
    })
    status = res.status
    const text = await res.text()
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    if (!res.ok) {
      const msg = extractError(json) ?? `HTTP ${res.status}`
      await logApi(op, false, status, { url: redact(url), msg })
      return { ok: false, error: msg, status }
    }
    await logApi(op, true, status, null)
    return { ok: true, data: (json ?? {}) as T }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('[threads] 네트워크 오류', op, msg)
    await logApi(op, false, status, { url: redact(url), msg })
    return { ok: false, error: msg, status }
  }
}

function extractError(json: unknown): string | null {
  if (typeof json !== 'object' || json === null) return null
  const err = (json as { error?: unknown }).error
  if (typeof err !== 'object' || err === null) return null
  const m = (err as { message?: unknown }).message
  const c = (err as { code?: unknown }).code
  return typeof m === 'string' ? `${m}${c !== undefined ? ` (code ${String(c)})` : ''}` : null
}

/** 로그에 토큰이 남지 않게 한다. */
function redact(url: string): string {
  return url.replace(/access_token=[^&]+/g, 'access_token=***').replace(/client_secret=[^&]+/g, 'client_secret=***')
}

async function logApi(op: string, ok: boolean, httpStatus: number, detail: Record<string, unknown> | null) {
  try {
    const admin = createAdminClient()
    await admin.from('threads_api_logs').insert({ op, ok, http_status: httpStatus || null, detail })
  } catch (e) {
    logger.warn('[threads] api 로그 기록 실패', e instanceof Error ? e.message : String(e))
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
