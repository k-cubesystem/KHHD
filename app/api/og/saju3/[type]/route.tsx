import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { isTypeSlug, typeBySlug } from '@/lib/domain/saju/saju3'
import { logger } from '@/lib/utils/logger'
import { GOLD_500 } from '@/lib/config/design-tokens'

/**
 * 3초 사주 유형 카드 — 링크 미리보기 1200×630. 정적 10장이라 길게 캐시한다.
 * 스레드·카카오·X 가 cURL 로 가져가므로 공개·무인증.
 *
 * 🔴 Satori 는 자식이 둘 이상인 요소에 flex 를 요구한다 — 텍스트 조각은 미리 한 문자열로 합쳐 둘 것.
 */

export const revalidate = 86400

interface PageProps {
  params: Promise<{ type: string }>
}

export async function GET(_req: NextRequest, { params }: PageProps) {
  try {
    const { type } = await params
    if (!isTypeSlug(type)) return new Response('Not found', { status: 404 })
    const info = typeBySlug(type)

    const fontRes = await fetch('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&display=swap', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const css = await fontRes.text()
    // Google Fonts 는 UA 에 따라 opentype 또는 truetype 으로 내려준다(2026-08 실측 truetype). 둘 다 Satori 가 읽는다.
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1] ?? null
    const fontData = fontUrl ? await fetch(fontUrl).then((r) => r.arrayBuffer()) : null
    const fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 700 }[] = fontData
      ? [{ name: 'NotoSerifKR', data: fontData, style: 'normal', weight: 700 }]
      : []

    const GOLD = GOLD_500
    const DARK = '#0A0A08'
    const INK = '#E8E4DC'
    const DIM = '#8C8478'
    const title = `「${info.title}」`

    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '68px 72px',
          backgroundColor: DARK,
          backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(201,168,76,0.13) 0%, transparent 62%)`,
          fontFamily: fontData ? 'NotoSerifKR' : 'serif',
          color: INK,
          border: `3px solid ${GOLD}`,
        }}
      >
        <div style={{ fontSize: 27, color: GOLD, letterSpacing: 7 }}>내 사주 한 줄</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ fontSize: 82, lineHeight: 1.22, color: INK, wordBreak: 'keep-all' }}>{title}</div>
          <div style={{ fontSize: 30, lineHeight: 1.5, color: DIM, wordBreak: 'keep-all' }}>{info.tagline}</div>
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 23, color: DIM }}
        >
          <span style={{ whiteSpace: 'nowrap' }}>너는? 생년월일만 넣으면 3초</span>
          <span style={{ color: GOLD, whiteSpace: 'nowrap', marginLeft: 24 }}>k-haehwadang.com/saju3</span>
        </div>
      </div>,
      { width: 1200, height: 630, fonts }
    )
  } catch (e) {
    logger.error('[og/saju3] 카드 생성 실패', e instanceof Error ? e.message : String(e))
    return new Response('Error', { status: 500 })
  }
}
