'use server'

import { after } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { getShrineEffects } from '@/lib/services/shrine-effects'
import { sendPushToUser } from '@/lib/services/webpush'
import { AI_DISCLOSURE_MARK } from '@/components/shared/ServiceDisclaimer'
import { oracleVoiceFor } from '@/lib/domain/shrine/oracle-voice'
import type { DayFlow } from '@/lib/domain/fortune/day-map'
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

interface OracleContext {
  /** 프롬프트에 얹을 «오늘의 기운 + 내담자» 블록 */
  block: string
  /** 오늘 말할 결(결정론 변주) */
  angle: string
  /** 호칭·최근 고민 등 개인화 지시 */
  personalHint: string
  /** 오늘 기운에 어울리는 표정 후보 */
  emotionHint: string
}

/**
 * 신탁 재료 모으기 — 그날의 기운(오늘의 지도) + 내담자(이름·기원 단·최근 고민).
 *
 * 🔴 매일 같은 말을 하던 원인이 여기 없던 것들이다. 조회는 전부 방어적이다 —
 *    하나가 비어도 신탁은 나와야 한다(방 진입 흐름을 막지 않는 것이 이 기능의 규율).
 */
async function buildOracleContext(userId: string): Promise<OracleContext> {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const dayKey = kstNow.toISOString().slice(0, 10)

  // 오늘의 기운 — 속풀이 선문안과 «같은 엔진»을 쓴다. 같은 날 두 화면이 다른 말을 하면 안 된다.
  let dayLine = ''
  let flow: DayFlow | null = null
  try {
    const [{ calculateManseBasic }, { deriveDayMap }] = await Promise.all([
      import('@/lib/domain/saju/manse'),
      import('@/lib/domain/fortune/day-map'),
    ])
    const day = calculateManseBasic(dayKey, '12:00').day
    const map = deriveDayMap(day.ganElement, day.jiElement, day.jiHan || day.ji)
    if (map) {
      flow = map.flow
      dayLine = `[오늘의 기운] ${map.headline} — ${map.doLine}. 다만 ${map.avoidLine}.`
    }
  } catch (e) {
    logger.warn('[buildOracleContext] day map skipped:', e)
  }

  // 내담자 — 이름·기원 단·최근 고민 한 줄
  let personalHint = '내담자를 정중히 부르십시오.'
  try {
    const supabase = await createClient()
    const [{ data: profile }, memories] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      import('@/lib/ai/memory').then((m) => m.recallMemoryList(userId, null, 3)),
    ])
    const name = profile?.full_name?.trim()
    const concern = memories.find((m) => m.type === 'concern')?.content?.trim()
    personalHint = [
      name ? `내담자를 "${name}님"이라 부르십시오.` : '내담자를 정중히 부르십시오.',
      concern
        ? `지난 문답에서 "${concern.slice(0, 40)}" 이야기를 했으니 그 결을 살짝 스치십시오(캐묻지는 마십시오).`
        : '',
    ]
      .filter(Boolean)
      .join(' ')
  } catch (e) {
    logger.warn('[buildOracleContext] personal context skipped:', e)
  }

  const voice = oracleVoiceFor(dayKey, flow)
  return {
    block: dayLine || '[오늘의 기운] 고요한 날입니다.',
    angle: voice.angle,
    personalHint,
    emotionHint: voice.emotionHint,
  }
}

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

    // 🔴 신탁이 매일 같은 말을 하던 원인은 «넣어준 것이 넷뿐»이었다(신위 이름·성격·말투·날짜).
    //    실측 34건이 전부 같은 감정(bless)·같은 위로문이었다. 그날의 기운과 내담자를 함께 넣어
    //    소재가 날마다 갈리게 하고, 「질문 금지」를 걷어 문답으로 이어지게 한다(P1-C).
    const context = await buildOracleContext(user.id)
    const prompt =
      `당신은 신당에 좌정한 수호신 "${deity.name}"입니다. ` +
      `${deity.personality ? deity.personality + ' ' : ''}말투: ${deity.tone || '따뜻하고 신비로우며 정중한 존댓말'}.\n` +
      `오늘(${today}) 신도가 신당을 찾았습니다. 먼저 말을 건네십시오.\n` +
      `${context.block}\n` +
      `[오늘 말할 결]: ${context.angle}\n` +
      `두세 문장(80자 내외). 위의 «오늘의 기운»을 근거로 오늘에만 할 수 있는 말을 하십시오 — ` +
      `어제도 통할 막연한 위로("고생했으니 쉬어가라")는 금합니다.\n` +
      `${context.personalHint}\n` +
      `마지막은 **열린 질문 하나**로 닫으십시오(내담자가 답하고 싶어지는 짧은 물음).\n` +
      `사주 용어(일간·일진·오행·천간·지지)는 쓰지 말고 자연의 말로 풀어 쓰십시오.\n` +
      `응답 맨 앞에 표정을 [[감정]] 형식으로 한 번 붙이십시오(${DEITY_EMOTIONS.join('/')} 중 하나). ` +
      `오늘 기운에는 ${context.emotionHint} 쪽이 어울립니다.`

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
    // AI기본법 §31② — 알림·웹푸시는 앱 밖(잠금화면)까지 나가는 반출물이라 화면 고지가 따라가지
    // 않는다. 본문 뒤에 꼬리표를 붙여 결과물 자체에 표시를 남긴다.
    const notifyBody = `${message.length > 60 ? message.slice(0, 60) + '…' : message} — ${AI_DISCLOSURE_MARK}`
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
    // 🔴 클릭 목적지를 신당이 아니라 «속풀이»로 보낸다(P1-C). 신탁은 지금까지 읽고 닫히는 말이었다
    //    (실측 34건 전부 열람·전부 무응답). ?oracle=<id> 로 들어가면 신위가 그 신탁을 되받아 문답을 연다.
    after(() =>
      sendPushToUser(user.id, {
        title: notifyTitle,
        body: notifyBody,
        url: `/protected/ai-shaman?oracle=${inserted.id}`,
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
