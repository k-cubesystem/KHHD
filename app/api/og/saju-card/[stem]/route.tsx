import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { ILGAN, ELEMENT_COLOR, ELEMENT_HANJA, isIlganSlug } from '@/lib/domain/saju/ilgan'
import { logger } from '@/lib/utils/logger'
import { GOLD_500 } from '@/lib/config/design-tokens'

/**
 * 일간 세로 공유 카드 — 인스타 스토리·릴스용 9:16 (1080×1920).
 * 가로판(og/ilgan)과 같은 데이터(정적 10장·비개인정보)라 길게 캐시하고 공개·무인증.
 * 🔴 폰트는 opentype|truetype 둘 다 허용(2026-08 OG 폰트 회귀 전례).
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '110px 90px 96px',
          backgroundColor: DARK,
          backgroundImage: `radial-gradient(ellipse at 50% 32%, ${accent}26 0%, transparent 58%)`,
          fontFamily: fontData ? 'NotoSerifKR' : 'serif',
          color: INK,
          border: `6px solid ${GOLD}`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <div style={{ fontSize: 40, color: GOLD, letterSpacing: 14 }}>청담해화당</div>
          <div style={{ fontSize: 34, color: DIM, letterSpacing: 8 }}>내 일간(日干)</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
          <div style={{ display: 'flex', fontSize: 460, lineHeight: 1, color: accent }}>{info.han}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
            <span style={{ fontSize: 108, color: INK }}>{info.name}</span>
            <span style={{ fontSize: 56, color: DIM }}>{info.hanja}</span>
          </div>
          <div style={{ display: 'flex', fontSize: 40, color: DIM }}>{elementLine}</div>
          <div
            style={{
              display: 'flex',
              fontSize: 58,
              lineHeight: 1.4,
              color: GOLD,
              wordBreak: 'keep-all',
              textAlign: 'center',
              maxWidth: 820,
            }}
          >
            {imageLine}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 30, color: DIM }}>당신의 일간은? 생년월일만 넣으면 3초</div>
          <div style={{ display: 'flex', fontSize: 34, color: GOLD }}>k-haehwadang.com/ilgan</div>
          <div style={{ display: 'flex', fontSize: 24, color: DIM, marginTop: 10 }}>
            AI 풀이 · 전통 명리의 상(象)이며 사람을 단정하지 않습니다
          </div>
        </div>
      </div>,
      { width: 1080, height: 1920, fonts }
    )
  } catch (e) {
    logger.error('[og/saju-card] 카드 생성 실패', e instanceof Error ? e.message : String(e))
    return new Response('Error', { status: 500 })
  }
}
