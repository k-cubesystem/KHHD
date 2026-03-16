import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { GOLD_500 } from '@/lib/config/design-tokens'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const title = searchParams.get('title')?.slice(0, 80) || '청담해화당'
    const desc = searchParams.get('desc')?.slice(0, 120) || '당신의 운명을 비춰주는 프리미엄 AI 사주 분석'
    const score = searchParams.get('score')
    const name = searchParams.get('name')?.slice(0, 20) || null
    const category = searchParams.get('category')?.slice(0, 20) || null

    // Use Google Fonts CSS API to load Noto Serif KR
    const fontRes = await fetch('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&display=swap', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const css = await fontRes.text()
    const fontUrl = css.match(/src: url\((.+?)\) format\('opentype'\)/)?.[1] || null

    let fontData: ArrayBuffer | null = null
    if (fontUrl) {
      fontData = await fetch(fontUrl).then((r) => r.arrayBuffer())
    }

    const fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 700 }[] = []
    if (fontData) {
      fonts.push({ name: 'NotoSerifKR', data: fontData, style: 'normal', weight: 700 })
    }

    const GOLD = GOLD_500
    const GOLD_DIM = 'rgba(212,175,55,0.15)'
    const DARK = '#0A0A0A'
    const DARK2 = '#111111'
    const INK = '#F0ECD8'
    const INK_DIM = '#A89B7A'

    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: DARK,
          backgroundImage: `linear-gradient(135deg, ${DARK} 0%, #1A1505 50%, ${DARK2} 100%)`,
          fontFamily: fontData ? 'NotoSerifKR' : 'serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial glow top-left */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: -200,
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)',
          }}
        />
        {/* Subtle radial glow bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Top gold border line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          }}
        />
        {/* Bottom gold border line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          }}
        />
        {/* Left gold border line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 4,
            background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)`,
          }}
        />
        {/* Right gold border line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 4,
            background: `linear-gradient(180deg, transparent, ${GOLD}, transparent)`,
          }}
        />

        {/* Corner ornaments */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            width: 40,
            height: 40,
            borderTop: `2px solid ${GOLD}`,
            borderLeft: `2px solid ${GOLD}`,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 40,
            height: 40,
            borderTop: `2px solid ${GOLD}`,
            borderRight: `2px solid ${GOLD}`,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            width: 40,
            height: 40,
            borderBottom: `2px solid ${GOLD}`,
            borderLeft: `2px solid ${GOLD}`,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            width: 40,
            height: 40,
            borderBottom: `2px solid ${GOLD}`,
            borderRight: `2px solid ${GOLD}`,
            opacity: 0.6,
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '60px 80px',
            gap: 0,
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 36,
                height: 1,
                background: GOLD,
                opacity: 0.7,
              }}
            />
            <span
              style={{
                fontSize: 18,
                color: GOLD,
                letterSpacing: '0.25em',
                fontWeight: 700,
              }}
            >
              청담해화당
            </span>
            <div
              style={{
                width: 36,
                height: 1,
                background: GOLD,
                opacity: 0.7,
              }}
            />
          </div>

          {/* Category badge (if present) */}
          {category && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: GOLD_DIM,
                border: `1px solid rgba(212,175,55,0.4)`,
                borderRadius: 100,
                padding: '6px 22px',
                marginBottom: 22,
              }}
            >
              <span style={{ fontSize: 20, color: GOLD, fontWeight: 700, letterSpacing: '0.1em' }}>{category}</span>
            </div>
          )}

          {/* Main title */}
          <div
            style={{
              fontSize: name ? 52 : 62,
              fontWeight: 700,
              color: INK,
              textAlign: 'center',
              lineHeight: 1.3,
              maxWidth: 880,
              marginBottom: 16,
            }}
          >
            {title}
          </div>

          {/* Score badge */}
          {score && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 10,
                marginBottom: 10,
                backgroundColor: GOLD_DIM,
                border: `1.5px solid ${GOLD}`,
                borderRadius: 60,
                padding: '12px 40px',
              }}
            >
              <span style={{ fontSize: 18, color: GOLD, opacity: 0.8 }}>✦</span>
              <span style={{ fontSize: 38, color: GOLD, fontWeight: 700 }}>{score}점</span>
              <span style={{ fontSize: 18, color: GOLD, opacity: 0.8 }}>✦</span>
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              width: 120,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
              margin: '18px 0',
            }}
          />

          {/* Description */}
          <div
            style={{
              fontSize: 26,
              color: INK_DIM,
              textAlign: 'center',
              maxWidth: 760,
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            {desc}
          </div>
        </div>

        {/* Bottom branding strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 28,
            gap: 8,
          }}
        >
          <span style={{ fontSize: 15, color: 'rgba(212,175,55,0.5)', letterSpacing: '0.15em' }}>haehwadang.com</span>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        ...(fonts.length > 0 ? { fonts } : {}),
      }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('[OG Image Error]', msg)
    return new Response('Failed to generate OG image', { status: 500 })
  }
}
