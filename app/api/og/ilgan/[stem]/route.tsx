import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { ILGAN, ELEMENT_COLOR, ELEMENT_HANJA, isIlganSlug } from '@/lib/domain/saju/ilgan'
import { logger } from '@/lib/utils/logger'
import { GOLD_500 } from '@/lib/config/design-tokens'

/**
 * 일간 공유 카드 — 링크 미리보기용 1200×630. 정적 10장이라 길게 캐시한다.
 * 스레드·카카오·X 가 cURL 로 가져가므로 공개·무인증.
 */

export const revalidate = 86400

interface PageProps {
  params: Promise<{ stem: string }>
}

export async function GET(_req: NextRequest, { params }: PageProps) {
  try {
    const { stem } = await params
    if (!isIlganSlug(stem)) return new Response('Not found', { status: 404 })
    const info = ILGAN[stem]

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
    const accent = ELEMENT_COLOR[info.element]
    const elementLine = `${info.polarity}의 ${info.elementKo}(${ELEMENT_HANJA[info.element]})`
    const imageLine = `「${info.image}」`

    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: '56px 64px',
          backgroundColor: DARK,
          backgroundImage: `radial-gradient(ellipse at 20% 50%, ${accent}22 0%, transparent 55%)`,
          fontFamily: fontData ? 'NotoSerifKR' : 'serif',
          color: INK,
          border: `3px solid ${GOLD}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 360,
            fontSize: 300,
            lineHeight: 1,
            color: accent,
          }}
        >
          {info.han}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            paddingLeft: 48,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 26, color: GOLD, letterSpacing: 6 }}>내 일간(日干)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ fontSize: 84, color: INK }}>{info.name}</span>
              <span style={{ fontSize: 40, color: DIM }}>{info.hanja}</span>
            </div>
            {/* Satori: 자식이 둘 이상인 요소는 flex 여야 한다 — 텍스트 조각을 한 문자열로 합친다 */}
            <div style={{ fontSize: 28, color: DIM }}>{elementLine}</div>
          </div>

          <div style={{ fontSize: 44, lineHeight: 1.35, color: GOLD, wordBreak: 'keep-all' }}>{imageLine}</div>

          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 21, color: DIM }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>당신의 일간은? 생년월일만 넣으면 3초</span>
            <span style={{ color: GOLD, whiteSpace: 'nowrap', marginLeft: 24 }}>k-haehwadang.com/ilgan</span>
          </div>
        </div>
      </div>,
      { width: 1200, height: 630, fonts }
    )
  } catch (e) {
    logger.error('[og/ilgan] 카드 생성 실패', e instanceof Error ? e.message : String(e))
    return new Response('Error', { status: 500 })
  }
}
