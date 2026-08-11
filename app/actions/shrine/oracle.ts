'use server'

import { after } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { getShrineEffects } from '@/lib/services/shrine-effects'
import { sendPushToUser } from '@/lib/services/webpush'
import { logger } from '@/lib/utils/logger'

export interface DeityOracle {
  id: string
  message: string
  emotion: string | null
  deityCode: string
  deityName: string
}

const DEITY_EMOTIONS = ['neutral', 'smile', 'stern', 'sad', 'surprised', 'bless', 'angry'] as const

// 빈도 상한: 최근 2일 내 없음 + 최근 7일 내 3건 미만일 때만 새 신탁 발행 (주 2~3회)
// ⚡ 배치 효험: 향로(oracle_freq)를 신당에 모시면 간격 24h·주간 상한 +2 로 완화된다.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const WEEKLY_CAP = 3

/**
 * 방 진입 시 호출 — 미확인 신탁이 있으면 반환, 없고 빈도가 허용되면 새로 발행.
 * 좌정 主神이 없으면 null. 생성 실패는 조용히 null(방 흐름 비차단).
 */
export async function getRoomOracle(): Promise<DeityOracle | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    // 1) 미확인 신탁 우선 반환
    const { data: unseen } = await supabase
      .from('deity_oracles')
      .select('id, message, emotion, deity_id')
      .eq('user_id', user.id)
      .is('seen_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const admin = createAdminClient()
    if (unseen) {
      const { data: d } = await admin
        .from('shrine_deities')
        .select('code, name')
        .eq('id', unseen.deity_id)
        .maybeSingle()
      if (!d) return null
      return { id: unseen.id, message: unseen.message, emotion: unseen.emotion, deityCode: d.code, deityName: d.name }
    }

    // 2) 좌정 主神 확인 (신탁은 본인 신당 스코프)
    const { data: shrine } = await supabase
      .from('shrines')
      .select('main_deity_id')
      .eq('user_id', user.id)
      .is('family_member_id', null)
      .maybeSingle()
    if (!shrine?.main_deity_id) return null

    // 3) 빈도 상한 판정 (최근 7일 이력) — 향로 배치 시 완화
    const [{ data: recent }, effects] = await Promise.all([
      supabase
        .from('deity_oracles')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - WEEK_MS).toISOString())
        .order('created_at', { ascending: false }),
      getShrineEffects(user.id),
    ])
    const history = recent ?? []
    const minGapMs = effects.oracleMinGapHours * 60 * 60 * 1000
    if (history.length >= WEEKLY_CAP + effects.oracleWeeklyCapBonus) return null
    if (history[0] && Date.now() - new Date(history[0].created_at).getTime() < minGapMs) return null

    // 4) 신위 페르소나 로드 + 신탁 생성
    const { data: deity } = await admin
      .from('shrine_deities')
      .select('code, name, personality, tone')
      .eq('id', shrine.main_deity_id)
      .maybeSingle()
    if (!deity) return null

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) return null
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
    const prompt =
      `당신은 신당에 좌정한 수호신 "${deity.name}"입니다. ` +
      `${deity.personality ? deity.personality + ' ' : ''}말투: ${deity.tone || '따뜻하고 신비로우며 정중한 존댓말'}.\n` +
      `오늘(${today}) 신도가 오랜만에 신당을 찾았습니다. 먼저 다정하게 말을 건네십시오. ` +
      `한두 문장(60자 내외), 오늘 하루를 살피는 따뜻한 안부·격려. 질문 금지, 조언은 은근하게.\n` +
      `응답 맨 앞에 표정을 [[감정]] 형식으로 한 번 붙이십시오(${DEITY_EMOTIONS.join('/')} 중 하나).`

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: MODEL_FLASH })
    const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
      userId: user.id,
      model: MODEL_FLASH,
      actionType: 'deity_oracle',
    })
    const raw = result.response.text()

    let emotion: string | null = null
    let message = raw
    const m = raw.match(/^\s*\[\[\s*(neutral|smile|stern|sad|surprised|bless|angry)\s*\]\]\s*/i)
    if (m) {
      emotion = m[1].toLowerCase()
      message = raw.slice(m[0].length)
    }
    message = message.replace(/\[\[[^\]]*\]\]/g, '').trim()
    if (!message) return null

    const { data: inserted, error } = await admin
      .from('deity_oracles')
      .insert({ user_id: user.id, deity_id: shrine.main_deity_id, message, emotion })
      .select('id')
      .single()
    if (error || !inserted) {
      logger.warn('[getRoomOracle] insert failed:', error)
      return null
    }

    // 신탁 도착 알림 — 신당 미방문 시 영영 모르는 재방문 루프의 구멍 보완.
    // 새 신탁 생성 시에만 삽입되며(미확인 신탁이 있으면 위에서 조기 반환), oracle 당 1회로 자연 멱등.
    const notifyTitle = `「${deity.name}」이 신탁을 내렸습니다`
    const notifyBody = message.length > 60 ? message.slice(0, 60) + '…' : message
    const { error: notifyErr } = await admin.from('notifications').insert({
      user_id: user.id,
      title: notifyTitle,
      message: notifyBody,
      type: 'deity_oracle',
      is_read: false,
    })
    if (notifyErr) logger.warn('[getRoomOracle] oracle notification insert failed:', notifyErr)

    // 같은 지점에서 웹푸시 1회 — 앱 밖에 있는 신도에게 닿는 유일한 경로.
    // VAPID 키가 없으면 sendPushToUser 는 무동작이고, 어떤 실패도 throw 하지 않는다.
    // after() 로 응답을 흘려보낸 뒤 실행해 방 진입 지연에 얹히지 않게 한다.
    after(() =>
      sendPushToUser(user.id, {
        title: notifyTitle,
        body: notifyBody,
        url: '/protected/shrine',
        tag: 'deity-oracle',
      })
    )

    return { id: inserted.id, message, emotion, deityCode: deity.code, deityName: deity.name }
  } catch (e) {
    logger.warn('[getRoomOracle] skipped:', e)
    return null
  }
}

/** 신탁 확인 표시 (본인, seen_at 갱신) */
export async function markOracleSeen(oracleId: string): Promise<void> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('deity_oracles')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', oracleId)
      .eq('user_id', user.id)
  } catch (e) {
    logger.warn('[markOracleSeen] skipped:', e)
  }
}
