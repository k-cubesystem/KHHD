'use client'

/**
 * 자사 분석 수집기 — GA4 와 «동승»한다.
 *
 * 왜 따로 모으나: GA4 는 광고차단·ITP 에서 새고, 우리 DB 와 조인이 안 된다(가입·결제·이벤트 응모와
 * 유입을 한 화면에서 못 본다). 이 수집기는 같은 이벤트를 우리 표(page_views·activity_logs·
 * utm_tracking·funnel_events)에도 쌓아 /admin/analytics 가 GA 처럼 읽게 한다.
 *
 * 원칙:
 *  · 실패해도 화면을 안 막는다 — 전부 fire-and-forget, 예외는 삼킨다.
 *  · 개인정보 최소 — 익명 방문자 id(난수)·세션 id·경로·리퍼러 «도메인만». IP 는 서버 지오 헤더로 국가만.
 *  · 방문자 id 는 1년 쿠키(hhd_vid), 세션은 30분 무활동 갱신(sessionStorage), first-touch UTM 은 localStorage.
 *  · 봇은 UA 로 걸러 수집하지 않는다(집계 오염 방지).
 *  · 관리자 화면(/admin) 은 수집하지 않는다.
 */

import { createClient } from '@/lib/supabase/client'

const VID_COOKIE = 'hhd_vid'
const SID_KEY = 'hhd_sid'
const SID_TS_KEY = 'hhd_sid_ts'
const FIRST_TOUCH_KEY = 'hhd_first_touch'
const SESSION_GAP_MS = 30 * 60 * 1000
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>

function rand(len = 20): string {
  const a = new Uint8Array(len)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => (b % 36).toString(36)).join('')
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m ? decodeURIComponent(m[1]) : null
}

function writeCookie(name: string, value: string, days: number) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax${secure}`
}

function isBot(): boolean {
  return /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom/i.test(navigator.userAgent)
}

function deviceKind(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet'
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile'
  return 'desktop'
}

/** 방문자 id — 없으면 발급. 신규 여부를 함께 돌려준다(첫 페이지뷰의 is_new). */
function visitor(): { id: string; isNew: boolean } {
  const cur = readCookie(VID_COOKIE)
  if (cur && cur.length >= 8) {
    writeCookie(VID_COOKIE, cur, 365) // 만료 연장
    return { id: cur, isNew: false }
  }
  const id = `v${rand(19)}`
  writeCookie(VID_COOKIE, id, 365)
  return { id, isNew: true }
}

/** 세션 id — 30분 무활동이면 새로 발급. */
function session(): string {
  try {
    const now = Date.now()
    const sid = sessionStorage.getItem(SID_KEY)
    const ts = Number(sessionStorage.getItem(SID_TS_KEY) ?? 0)
    if (sid && now - ts < SESSION_GAP_MS) {
      sessionStorage.setItem(SID_TS_KEY, String(now))
      return sid
    }
    const fresh = `s${rand(19)}`
    sessionStorage.setItem(SID_KEY, fresh)
    sessionStorage.setItem(SID_TS_KEY, String(now))
    return fresh
  } catch {
    return `s${rand(19)}`
  }
}

function currentUtm(): Utm {
  const p = new URLSearchParams(location.search)
  const out: Utm = {}
  for (const k of UTM_KEYS) {
    const v = p.get(k)
    if (v) out[k] = v.slice(0, 120)
  }
  return out
}

/** first-touch UTM — 처음 잡힌 값을 보존한다. 재방문의 UTM 은 세션 단위(page_views)에만 남는다. */
function firstTouch(): Utm | null {
  try {
    const stored = localStorage.getItem(FIRST_TOUCH_KEY)
    if (stored) return JSON.parse(stored) as Utm
    const now = currentUtm()
    if (Object.keys(now).length === 0) return null
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(now))
    return now
  } catch {
    return null
  }
}

function referrerHost(): string | null {
  try {
    if (!document.referrer) return null
    const h = new URL(document.referrer).hostname
    return h === location.hostname ? null : h.slice(0, 100)
  } catch {
    return null
  }
}

let lastPath = ''

/** 페이지뷰 — 라우트가 바뀔 때마다 한 번. 같은 경로 연속 호출은 무시. */
export function collectPageView(path: string) {
  if (typeof window === 'undefined') return
  if (path === lastPath) return
  lastPath = path
  if (path.startsWith('/admin')) return
  if (isBot()) return
  try {
    const v = visitor()
    const sid = session()
    const utm = currentUtm()
    const ft = firstTouch()
    const supabase = createClient()
    void supabase
      .rpc('track_page_view', {
        p_visitor_id: v.id,
        p_session_id: sid,
        p_path: path.slice(0, 200),
        p_referrer_host: referrerHost(),
        p_utm: Object.keys(utm).length ? utm : null,
        p_device: deviceKind(),
        p_country: null, // 서버 지오는 후속(엣지 헤더 릴레이) — 지금은 국가 미수집
        p_is_new: v.isNew,
      })
      .then(
        () => undefined,
        () => undefined
      )
    // 퍼널 앞단(1·2)은 GA 이벤트가 없어 경로로 잡는다. 뒷단(3~7)은 ga4.ts 의 FUNNEL_BY_ACTION.
    if (path === '/') collectFunnel('landing_view', 1)
    else if (path.startsWith('/auth/sign-up')) collectFunnel('signup_start', 2)
    // 첫 유입 1회 기록 — UTM 이 있든 없든(direct 도 유입이다). RPC 가 visitor 당 1행을 보장.
    if (v.isNew || ft) {
      void supabase
        .rpc('track_first_touch', {
          p_visitor_id: v.id,
          p_utm: ft ?? {},
          p_landing_page: path.slice(0, 200),
          p_referrer: referrerHost(),
        })
        .then(
          () => undefined,
          () => undefined
        )
    }
  } catch {
    /* 수집 실패는 화면과 무관 */
  }
}

/** 행동 이벤트 — GA.trackEvent 와 같은 이름·카테고리로 들어온다. */
export function collectEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window === 'undefined') return
  if (isBot()) return
  try {
    const v = visitor()
    const sid = session()
    const supabase = createClient()
    void supabase
      .rpc('track_activity', {
        p_visitor_id: v.id,
        p_session_id: sid,
        p_type: action.slice(0, 60),
        p_category: category.slice(0, 60),
        p_description: label ? label.slice(0, 200) : null,
        p_metadata: value !== undefined ? { value } : null,
      })
      .then(
        () => undefined,
        () => undefined
      )
  } catch {
    /* noop */
  }
}

/** 퍼널 단계 — 순번은 FUNNEL 정의가 단일 출처(lib/analytics/funnel.ts). */
export function collectFunnel(eventName: string, step: number, metadata?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (isBot()) return
  try {
    const supabase = createClient()
    void supabase
      .rpc('track_funnel', {
        p_event_name: eventName,
        p_step: step,
        p_metadata: metadata ?? null,
        p_session_id: session(),
      })
      .then(
        () => undefined,
        () => undefined
      )
  } catch {
    /* noop */
  }
}

/** 가입 귀속용 — 서버 액션이 쿠키를 못 읽는 경우(OAuth 콜백 등)를 위해 방문자 id 를 노출. */
export function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null
  return readCookie(VID_COOKIE)
}
