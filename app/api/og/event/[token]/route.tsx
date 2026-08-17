import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { maskUsername } from '@/lib/domain/event/reading'
import { logger } from '@/lib/utils/logger'
import { GOLD_500 } from '@/lib/config/design-tokens'

/**
 * 이벤트 결과 카드 — 스레드 발표용 정방형 1080×1080 (Threads 이미지 폭 320~1440 규격 안).
 * DB 조회형 OG 전례(app/api/og/shrine/[userId])를 따른다. 공개 동의 + 승인된 당첨자만 그린다 —
 * 아니면 404. 카드에는 마스킹 아이디·명식·한 줄 요약만 있고 생년월일은 절대 안 나간다.
 * Threads 가 이 URL 을 cURL 로 가져가므로 공개·캐시 가능해야 한다.
 */

export const revalidate = 3600

interface PageProps {
  params: Promise<{ token: string }>
}

export async function GET(_req: NextRequest, { params }: PageProps) {
  try {
    const { token } = await params
    if (!/^[a-f0-9]{24}$/.test(token)) return new Response('Not found', { status: 404 })
    const admin = createAdminClient()
    const { data: w } = await admin
      .from('event_winners')
      .select('draft_status, draft_json, event_entries(threads_username, consent_public), event_rounds(title, topic)')
      .eq('card_token', token)
      .maybeSingle()
    if (!w || w.draft_status !== 'approved') return new Response('Not found', { status: 404 })
    const entry = Array.isArray(w.event_entries) ? w.event_entries[0] : w.event_entries
    if (!entry?.consent_public) return new Response('Not found', { status: 404 })
    const round = Array.isArray(w.event_rounds) ? w.event_rounds[0] : w.event_rounds
    const dj = (w.draft_json ?? {}) as { pillars?: Record<string, string>; dayMaster?: string; headline?: string }

    const fontRes = await fetch('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&display=swap', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const css = await fontRes.text()
    const fontUrl = css.match(/src: url\((.+?)\) format\('opentype'\)/)?.[1] ?? null
    const fontData = fontUrl ? await fetch(fontUrl).then((r) => r.arrayBuffer()) : null
    const fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 700 }[] = fontData
      ? [{ name: 'NotoSerifKR', data: fontData, style: 'normal', weight: 700 }]
      : []

    const GOLD = GOLD_500
    const DARK = '#0A0A08'
    const INK = '#E8E4DC'
    const DIM = '#8C8478'
    const masked = maskUsername(String(entry.threads_username ?? ''))
    const p = dj.pillars ?? {}
    const pillarText = ['year', 'month', 'day', 'time']
      .map((k) => (p[k] ?? '').replace(/\(.*?\)/, ''))
      .filter(Boolean)
      .join(' · ')

    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: DARK,
          backgroundImage: `radial-gradient(ellipse at 50% 20%, rgba(201,168,76,0.10) 0%, transparent 60%)`,
          fontFamily: fontData ? 'NotoSerifKR' : 'serif',
          color: INK,
          border: `3px solid ${GOLD}`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 26, color: GOLD, letterSpacing: 6 }}>
            청담해화당 · {String(round?.title ?? '무료 사주 이벤트')}
          </div>
          <div style={{ fontSize: 40, color: DIM }}>@{masked}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ fontSize: 34, color: DIM, letterSpacing: 2 }}>{pillarText}</div>
          <div style={{ fontSize: 64, lineHeight: 1.3, color: INK, wordBreak: 'keep-all' }}>{dj.headline ?? ''}</div>
          {dj.dayMaster ? <div style={{ fontSize: 30, color: GOLD }}>일간 {dj.dayMaster}</div> : null}
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, color: DIM }}
        >
          <span>만세력으로 세운 명식 · 간이 풀이</span>
          <span style={{ color: GOLD }}>k-haehwadang.com</span>
        </div>
      </div>,
      { width: 1080, height: 1080, fonts }
    )
  } catch (e) {
    logger.error('[og/event] 카드 생성 실패', e instanceof Error ? e.message : String(e))
    return new Response('Error', { status: 500 })
  }
}
