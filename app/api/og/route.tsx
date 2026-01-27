import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Dynamic params
        const title = searchParams.get('title')?.slice(0, 100) || '청담해화당';
        const description = searchParams.get('desc')?.slice(0, 100) || '당신의 운명을 비춰주는 프리미엄 사주 분석';
        const score = searchParams.get('score');

        // Font loading (Noto Serif KR Bold)
        const fontData = await fetch(
            new URL('https://github.com/google/fonts/raw/main/ofl/notoserifkr/NotoSerifKR-Bold.otf', import.meta.url)
        ).then((res) => res.arrayBuffer());

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#1C1C1E', // Ink-900
                        backgroundImage: 'linear-gradient(to bottom right, #1C1C1E, #2A2A2D)',
                        border: '24px solid #D4AF37', // Zen Gold
                        color: '#F5F5F0',
                        fontFamily: '"Noto Serif KR"',
                        position: 'relative',
                    }}
                >
                    {/* Decorative Pattern Overlay (Abstract) */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(212, 175, 55, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(212, 175, 55, 0.1) 2%, transparent 0%)',
                            backgroundSize: '100px 100px',
                            opacity: 0.5,
                        }}
                    />

                    {/* Logo / Brand */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40, borderBottom: '2px solid #D4AF37', paddingBottom: 10 }}>
                        <span style={{ fontSize: 32, color: '#D4AF37', fontWeight: 900, letterSpacing: '-0.02em' }}>청담해화당 (Haehwadang)</span>
                    </div>

                    {/* Main Title */}
                    <div style={{
                        fontSize: 70,
                        fontWeight: 900,
                        textAlign: 'center',
                        maxWidth: '80%',
                        lineHeight: 1.2,
                        textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                        backgroundImage: 'linear-gradient(to bottom, #FFFFFF, #E5E5E5)',
                        backgroundClip: 'text',
                        color: 'transparent',
                    }}>
                        {title}
                    </div>

                    {/* Optional Score Badge */}
                    {score && (
                        <div style={{
                            marginTop: 30,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(212, 175, 55, 0.2)',
                            border: '2px solid #D4AF37',
                            borderRadius: 50,
                            padding: '10px 30px',
                        }}>
                            <span style={{ fontSize: 36, color: '#D4AF37', fontWeight: 900 }}>{score}점</span>
                        </div>
                    )}

                    {/* Description */}
                    <div style={{
                        fontSize: 32,
                        marginTop: score ? 30 : 40,
                        color: '#A1A1AA',
                        textAlign: 'center',
                        maxWidth: '70%',
                        fontWeight: 400
                    }}>
                        {description}
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
                fonts: [
                    {
                        name: 'Noto Serif KR',
                        data: fontData,
                        style: 'normal',
                        weight: 700,
                    },
                ],
            },
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
