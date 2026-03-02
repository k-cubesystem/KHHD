import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = '청담해화당 - Premium 운명 공학 SaaS'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const GOLD = '#D4AF37'
  const GOLD_DIM = 'rgba(212,175,55,0.12)'
  const DARK = '#0A0A0A'
  const INK = '#F0ECD8'
  const INK_DIM = '#A89B7A'

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DARK,
        backgroundImage: `linear-gradient(135deg, #0A0A0A 0%, #1A1505 50%, #111111 100%)`,
        fontFamily: 'serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Radial glow top-left */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -200,
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)',
        }}
      />
      {/* Radial glow bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Gold border lines */}
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
          width: 50,
          height: 50,
          borderTop: `2px solid ${GOLD}`,
          borderLeft: `2px solid ${GOLD}`,
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 50,
          height: 50,
          borderTop: `2px solid ${GOLD}`,
          borderRight: `2px solid ${GOLD}`,
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          width: 50,
          height: 50,
          borderBottom: `2px solid ${GOLD}`,
          borderLeft: `2px solid ${GOLD}`,
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 50,
          height: 50,
          borderBottom: `2px solid ${GOLD}`,
          borderRight: `2px solid ${GOLD}`,
          opacity: 0.55,
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          padding: '0 80px',
        }}
      >
        {/* Brand line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 48, height: 1, background: GOLD, opacity: 0.7 }} />
          <span style={{ fontSize: 20, color: GOLD, letterSpacing: '0.3em', fontWeight: 700 }}>HAEHWADANG</span>
          <div style={{ width: 48, height: 1, background: GOLD, opacity: 0.7 }} />
        </div>

        {/* Hanja / Korean title */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: INK,
            letterSpacing: '0.12em',
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          청담해화당
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: GOLD,
            letterSpacing: '0.08em',
            textAlign: 'center',
            marginBottom: 28,
            fontWeight: 700,
          }}
        >
          Premium 운명 공학 SaaS
        </div>

        {/* Divider */}
        <div
          style={{
            width: 160,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            marginBottom: 28,
          }}
        />

        {/* Description */}
        <div
          style={{
            fontSize: 26,
            color: INK_DIM,
            textAlign: 'center',
            lineHeight: 1.7,
            maxWidth: 800,
          }}
        >
          전통 명리학과 현대 데이터 사이언스의 결합
          <br />
          AI 마스터의 정교한 운명 분석 리포트
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 36,
          }}
        >
          {['사주팔자', '궁합', '관상', '손금', '풍수'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: GOLD_DIM,
                border: `1px solid rgba(212,175,55,0.35)`,
                borderRadius: 100,
                padding: '8px 20px',
              }}
            >
              <span style={{ fontSize: 18, color: GOLD, fontWeight: 700 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom domain */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16, color: 'rgba(212,175,55,0.45)', letterSpacing: '0.15em' }}>haehwadang.com</span>
      </div>
    </div>,
    { ...size }
  )
}
