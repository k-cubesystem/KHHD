import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeAndStoreLongLivedToken } from '@/lib/services/threads/client'
import { logger } from '@/lib/utils/logger'

/**
 * Threads OAuth 콜백 — S1 인증의 마지막 단계. 브라우저 승인 → ?code= 로 돌아오면
 * code → 단기 토큰(1h) → 장기 토큰(60일) 교환 후 threads_tokens 에 저장한다.
 *
 * 보안: 이 라우트는 **관리자 로그인 세션**이 있어야 동작한다. 아니면 누구든 자기 스레드 계정을
 * 우리 앱에 연결해 발송 권한을 가로챌 수 있다. code 는 1시간·1회용이라 URL 로그에 남아도 재사용 불가.
 * 토큰 원문은 응답·로그 어디에도 쓰지 않는다.
 */

export const dynamic = 'force-dynamic'

const REDIRECT_PATH = '/api/threads/callback'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const err = url.searchParams.get('error')
  const errDesc = url.searchParams.get('error_description')

  // 관리자만
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid)
    return NextResponse.redirect(
      new URL(`/auth/login?next=${encodeURIComponent(REDIRECT_PATH + url.search)}`, url.origin)
    )
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', uid).maybeSingle()
  if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

  if (err) return html(`승인이 거절됐어요: ${escapeHtml(err)} ${escapeHtml(errDesc ?? '')}`, false)
  if (!code) return html('code 가 없어요. THREADS-SETUP.md 3단계 URL 로 다시 시작하세요.', false)

  const appId = process.env.THREADS_APP_ID
  const secret = process.env.THREADS_APP_SECRET
  if (!appId || !secret)
    return html('THREADS_APP_ID / THREADS_APP_SECRET 환경변수가 없어요. 설정 후 재배포하세요.', false)

  // code → 단기 토큰
  const redirectUri = `${url.origin}${REDIRECT_PATH}`
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: secret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  })
  let shortToken: string | null = null
  try {
    const res = await fetch('https://graph.threads.net/oauth/access_token', { method: 'POST', body, cache: 'no-store' })
    const json = (await res.json()) as { access_token?: string; error_message?: string; error?: { message?: string } }
    if (!res.ok || !json.access_token) {
      const msg = json.error_message ?? json.error?.message ?? `HTTP ${res.status}`
      logger.error('[threads/callback] 단기 토큰 교환 실패', msg)
      return html(
        `단기 토큰 교환 실패: ${escapeHtml(msg)}<br/>redirect_uri 가 앱 설정과 정확히 같은지 확인하세요: <code>${escapeHtml(redirectUri)}</code>`,
        false
      )
    }
    shortToken = json.access_token
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('[threads/callback] 네트워크 오류', msg)
    return html(`네트워크 오류: ${escapeHtml(msg)}`, false)
  }

  // 단기 → 장기(60일) + 저장
  const stored = await exchangeAndStoreLongLivedToken(shortToken)
  if (!stored.ok) return html(`장기 토큰 저장 실패: ${escapeHtml(stored.error)}`, false)

  return html(
    `연결 완료 — @${escapeHtml(stored.data.username ?? stored.data.threadsUserId)}<br/>토큰 만료: ${stored.data.expiresAt.toLocaleDateString('ko-KR')} (크론이 만료 7일 전 자동 갱신)<br/><br/><a href="/admin/threads">→ /admin/threads 로</a>`,
    true
  )
}

function html(message: string, ok: boolean) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Threads 연결</title><body style="font-family:sans-serif;max-width:560px;margin:60px auto;padding:0 20px;line-height:1.7;background:#0A0A08;color:#E8E4DC"><h1 style="font-size:20px;color:${ok ? '#22c55e' : '#C84040'}">${ok ? '✓ Threads 연결' : '✗ 실패'}</h1><p>${message}</p></body>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
}
