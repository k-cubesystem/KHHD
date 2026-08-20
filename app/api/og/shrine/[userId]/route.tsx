import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getShrineByUserId } from '@/app/actions/shrine/shrine'
import { logger } from '@/lib/utils/logger'
import { GOLD_500 } from '@/lib/config/design-tokens'

// 1시간 ISR 캐시 (Supabase 조회로 인해 Node.js 런타임 사용)
export const revalidate = 3600

interface PageProps {
  params: Promise<{ userId: string }>
}

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { userId } = await params
    const shrine = await getShrineByUserId(userId)

    if (!shrine) {
      return new Response('Shrine not found', { status: 404 })
    }

    const fontRes = await fetch('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&display=swap', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const css = await fontRes.text()
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1] ?? null

    let fontData: ArrayBuffer | null = null
    if (fontUrl) {
      fontData = await fetch(fontUrl).then((r) => r.arrayBuffer())
    }

    const fonts: { name: string; data: ArrayBuffer; style: 'normal'; weight: 700 }[] = []
    if (fontData) {
      fonts.push({ name: 'NotoSerifKR', data: fontData, style: 'normal', weight: 700 })
    }

    const GOLD = GOLD_500
    const DARK = '#0A0804'
    const INK = '#F0ECD8'
    const INK_DIM = '#A89B7A'

    // 12 슬롯 이모지 배열 (없는 슬롯은 빈 문자)
    const slotEmojis = Array.from({ length: 12 }, (_, i) => {
      const item = shrine.shrine_items.find((s) => s.slot_index === i + 1)
      return item?.shrine_item_catalog?.emoji ?? ''
    })

    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: DARK,
          backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 60%), linear-gradient(180deg, #0A0804 0%, #1A1409 50%, #0A0804 100%)`,
          fontFamily: fontData ? 'NotoSerifKR' : 'serif',
          position: 'relative',
        }}
      >
        {/* 상단 금색 보더 */}
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

        {/* 메인 콘텐츠 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '48px 80px',
            gap: 0,
          }}
        >
          {/* 브랜드 + 신당 레이블 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 14, color: `${GOLD}88`, letterSpacing: '0.4em' }}>神 堂</span>
            <div style={{ width: 1, height: 14, background: `${GOLD}44` }} />
            <span style={{ fontSize: 14, color: `${GOLD}66`, letterSpacing: '0.2em' }}>청담해화당</span>
          </div>

          {/* 신당 이름 */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: INK,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {shrine.name}
          </div>

          {/* 소개 */}
          {shrine.description && (
            <div
              style={{
                fontSize: 22,
                color: INK_DIM,
                textAlign: 'center',
                maxWidth: 700,
                lineHeight: 1.5,
                marginBottom: 32,
              }}
            >
              {shrine.description}
            </div>
          )}

          {/* 구분선 */}
          <div
            style={{
              width: 100,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
              marginBottom: 32,
            }}
          />

          {/* 3×4 슬롯 그리드 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              width: 360,
              gap: 0,
            }}
          >
            {slotEmojis.map((emoji, i) => (
              <div
                key={i}
                style={{
                  width: 90,
                  height: 90,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: emoji ? 40 : 20,
                  background: emoji ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${emoji ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.04)'}`,
                  borderRadius: 12,
                  color: emoji ? undefined : `${GOLD}22`,
                }}
              >
                {emoji || '·'}
              </div>
            ))}
          </div>

          {/* 통계 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginTop: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 28, color: GOLD, fontWeight: 700 }}>{shrine.visitor_count}</span>
              <span style={{ fontSize: 14, color: INK_DIM }}>방문</span>
            </div>
            <div style={{ width: 1, height: 36, background: `${GOLD}33` }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 28, color: GOLD, fontWeight: 700 }}>{shrine.wish_count}</span>
              <span style={{ fontSize: 14, color: INK_DIM }}>기원</span>
            </div>
          </div>
        </div>

        {/* 하단 CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 24,
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16, color: `${GOLD}66`, letterSpacing: '0.15em' }}>소원을 기원하세요 🙏</span>
        </div>

        {/* 하단 금색 보더 */}
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
      </div>,
      {
        width: 1200,
        height: 630,
        ...(fonts.length > 0 ? { fonts } : {}),
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('[Shrine OG Error]', msg)
    return new Response('Failed to generate shrine OG image', { status: 500 })
  }
}
