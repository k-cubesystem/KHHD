import { NextRequest, NextResponse } from 'next/server'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { resolveVoiceProfile } from '@/lib/services/voice-profile-store'
import { isKnownVoice, formatPitchHz, parsePitchHz } from '@/lib/domain/shrine/voice-catalog'
import type { VoiceProfile } from '@/lib/domain/shrine/voice-profiles'

// 무료 뉴럴 TTS — Microsoft Edge Read Aloud(edge-tts) 프록시.
//
// - 비용 0원·API 키 불필요(비공식 엔드포인트라 실패 가능 → 클라이언트 useTts 가
//   Web Speech 로 자동 폴백하므로 이 라우트는 최선 노력만 하면 된다).
// - 보이스는 서버가 deityCode → voice-profiles 로만 결정: 클라이언트가 임의
//   보이스·SSML 을 주입할 수 없다(오픈 TTS 프록시 악용 방지의 일부).
// - 로그인 필수 + 길이 상한: 익명 대량 호출로 IP 가 차단당하는 것을 막는다.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_TEXT_LEN = 600

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 })
  }
  if (!isRecord(body) || typeof body.text !== 'string') {
    return NextResponse.json({ error: 'TEXT_REQUIRED' }, { status: 400 })
  }
  const text = body.text.trim().slice(0, MAX_TEXT_LEN)
  if (!text) return NextResponse.json({ error: 'TEXT_EMPTY' }, { status: 400 })
  const deityCode = typeof body.deityCode === 'string' ? body.deityCode : null

  // 기본: 서버가 신위코드로만 프로파일을 정한다(클라가 임의 보이스를 주입 못 하게).
  let profile: VoiceProfile = await resolveVoiceProfile(deityCode)

  // 예외: 어드민 «미리듣기» — 저장 전 값을 그대로 들어봐야 조절이 가능하다.
  //  🔴 admin 확인 후에만 열고, 보이스는 카탈로그 안의 것만 받는다(오픈 프록시 방지).
  if (isRecord(body.preview)) {
    const { data: profileRow } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileRow?.role !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    const pv = body.preview
    const voice = typeof pv.edgeVoice === 'string' && isKnownVoice(pv.edgeVoice) ? pv.edgeVoice : profile.edgeVoice
    const rate = typeof pv.rate === 'number' && pv.rate >= 0.5 && pv.rate <= 2 ? pv.rate : profile.rate
    const pitchHz =
      typeof pv.pitchHz === 'number' ? formatPitchHz(pv.pitchHz) : formatPitchHz(parsePitchHz(profile.edgePitch))
    profile = { ...profile, edgeVoice: voice, rate, edgePitch: pitchHz }
  }

  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(profile.edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(text, { rate: profile.rate, pitch: profile.edgePitch })

    const chunks: Buffer[] = []
    const buf = await new Promise<Buffer>((resolve, reject) => {
      audioStream.on('data', (d: Buffer) => chunks.push(d))
      audioStream.on('close', () => resolve(Buffer.concat(chunks)))
      audioStream.on('error', reject)
    })
    if (buf.length === 0) throw new Error('edge-tts 빈 응답')

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e) {
    // 비공식 엔드포인트 실패는 예상 범주 — 경고만 남기고 클라이언트 폴백에 맡긴다
    logger.warn('[tts] edge-tts 실패 (클라이언트 Web Speech 폴백):', e)
    return NextResponse.json({ error: 'TTS_UPSTREAM_FAILED' }, { status: 502 })
  }
}
