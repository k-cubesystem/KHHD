'use server'

/**
 * 초하루 의례 루프 서버 액션.
 * 설계: docs/designs/ritual-loop-traditional-rollout.md
 *
 *   [클라] ──getRitualState──▶ 창 판정(서버 KST 단일 함수) + 카드(결정론 선표시)
 *     │                          │
 *     ├──enhanceRitualCard────▶ FLASH 1줄 (실패 시 null → 클라는 폴백 유지, 1A)
 *     ├──enterRitual──────────▶ enter_ritual RPC (service_role, 창 내에만)
 *     ├──completeRitual───────▶ complete_ritual RPC (기록+적립 원자, 멱등)
 *     └──optInRitualPush──────▶ push_subscriptions.topics += 'ritual' (V2)
 *
 * 쓰기 RPC 는 service_role 전용(V1) — 이 파일이 유일한 호출 경로이며,
 * 창·서수 인자는 전부 서버가 계산한다. 클라이언트 입력은 소원 갈래 하나뿐이다(7A·9A — uuid 배열·소원 원문은 받지 않는다).
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/utils/logger'
import { rateLimit } from '@/lib/utils/rate-limit'
import { withGeminiRateLimit } from '@/lib/services/gemini-rate-limiter'
import { getPromptByKey } from '@/lib/ai/prompt-loader'
import { MODEL_FLASH } from '@/lib/config/ai-models'
import { calculateManse } from '@/lib/domain/saju/manse'
import {
  getRitualWindow,
  RITUAL_PUSH_TOPIC,
  isRitualWishCategory,
  type RitualWindow,
  type RitualWishCategory,
} from '@/lib/domain/ritual/lunar-window'
import { ritualFallbackLine } from '@/lib/domain/ritual/fallback-line'
import { buildLedger, type Ledger } from '@/lib/domain/ritual/ledger'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

const SELF_CARD_ID = '00000000-0000-0000-0000-000000000000'

export interface RitualCard {
  /** family_member_id, 본인은 null */
  memberId: string | null
  name: string
  relationship: string | null
  /** 결정론 폴백 1줄 — 항상 존재 (1A: 의례는 AI 에 블로킹되지 않는다) */
  line: string
  /** AI 캐시가 이미 있으면 서버에서 실어 보낸다 */
  aiLine: string | null
}

export interface RitualState {
  enabled: boolean
  window: RitualWindow
  /** 이번 달 진입 여부 (entered_at 존재) */
  entered: boolean
  /** 이번 달 완주 여부 — true 면 클라는 장부로 직행 (D3) */
  completed: boolean
  /** 본인 명식(birth_date) 존재 여부 — 없으면 명식 유도 카드 (4A) */
  hasBirth: boolean
  cards: RitualCard[]
  ledger: Ledger
  /** ritual 토픽 옵트인 여부 (구독 자체가 없으면 false) */
  pushOptedIn: boolean
  /** 웹푸시 구독 행 존재 여부 */
  hasPushSubscription: boolean
}

export type RitualErrorCode =
  | 'UNAUTHORIZED'
  | 'DISABLED'
  | 'OUT_OF_WINDOW'
  | 'RATE_LIMITED'
  | 'WISH_REQUIRED'
  | 'FAILED'

async function isRitualEnabled(): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('system_settings').select('value').eq('key', 'ritual_enabled').maybeSingle()
    // 행이 없으면 켜진 것으로 본다 (킬스위치는 명시적 false 만 차단)
    return data?.value !== 'false'
  } catch (err) {
    logger.warn('[ritual] 킬스위치 조회 실패 — 기본 허용', err)
    return true
  }
}

/**
 * 킬스위치 조회 — **진입 동선 컴포넌트 전용** 얇은 액션.
 *
 * 배너(대시보드)와 초하루 안내(일간운세)는 클라이언트 컴포넌트라 `system_settings` 를
 * 직접 읽을 수 없다. 그렇다고 각자 조건을 다시 적으면 스위치가 조용히 빠진다 —
 * 실제로 이 두 곳이 킬스위치를 무시해 **꺼진 기능으로 데려가는 죽은 버튼**이 됐었다
 * (2026-08-21 배포 직전 발견). 판정은 `isRitualEnabled()` 한 곳에만 둔다.
 *
 * 인자를 받지 않고 불리언 하나만 돌려준다 — 공개 엔드포인트가 되어도 노출되는 것이
 * 「이 기능이 켜져 있는가」뿐이다.
 */
export async function isRitualEntryEnabled(): Promise<boolean> {
  return isRitualEnabled()
}

export async function getRitualState(): Promise<RitualState | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const [enabled, window] = [await isRitualEnabled(), getRitualWindow()]

    // 장부 (RLS select-own)
    const { data: records } = await supabase
      .from('ritual_records')
      .select('lunar_month_seq, completed_at, wish_category, ritual_month, is_leap_month')
      .eq('user_id', user.id)
      .order('lunar_month_seq', { ascending: false })
      .limit(24)
    const ledger = buildLedger(records ?? [], window.lunarMonthSeq)

    const current = (records ?? []).find((r) => r.lunar_month_seq === window.lunarMonthSeq)

    // 푸시 옵트인 상태
    const { data: subs } = await supabase.from('push_subscriptions').select('topics').eq('user_id', user.id)
    const hasPushSubscription = (subs?.length ?? 0) > 0
    const pushOptedIn = (subs ?? []).some((s) => Array.isArray(s.topics) && s.topics.includes(RITUAL_PUSH_TOPIC))

    // 카드 — 본인 첫째 (D2), 이후 식구. 결정론 1줄 즉시 (D4), AI 캐시는 있으면 동봉.
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, birth_date, birth_time')
      .eq('id', user.id)
      .maybeSingle()
    const hasBirth = Boolean(profile?.birth_date)

    const { data: members } = await supabase
      .from('family_members')
      .select('id, name, relationship, birth_date, birth_time')
      .eq('user_id', user.id)
      .neq('relationship', '본인')
      .order('created_at', { ascending: true })

    const { data: aiCards } = await supabase
      .from('ritual_cards')
      .select('family_member_id, content')
      .eq('user_id', user.id)
      .eq('ritual_month', window.ritualMonth)
      .eq('is_leap_month', window.isLeapMonth)
    const aiBy = new Map((aiCards ?? []).map((c) => [String(c.family_member_id), String(c.content)]))

    const cards: RitualCard[] = []
    if (hasBirth && profile) {
      cards.push({
        memberId: null,
        name: profile.full_name || '나',
        relationship: '본인',
        line: fallbackLineFor(profile.birth_date, profile.birth_time, window.lunarMonthSeq),
        aiLine: aiBy.get(SELF_CARD_ID) ?? null,
      })
    }
    for (const m of members ?? []) {
      if (!m.birth_date) continue
      cards.push({
        memberId: m.id,
        name: m.name,
        relationship: m.relationship ?? null,
        line: fallbackLineFor(m.birth_date, m.birth_time, window.lunarMonthSeq),
        aiLine: aiBy.get(String(m.id)) ?? null,
      })
    }

    return {
      enabled,
      window,
      entered: Boolean(current),
      completed: Boolean(current?.completed_at),
      hasBirth,
      cards,
      ledger,
      pushOptedIn,
      hasPushSubscription,
    }
  } catch (err) {
    logger.error('[ritual] getRitualState 실패', err)
    return null
  }
}

function fallbackLineFor(birthDate: string, birthTime: string | null, seq: number): string {
  try {
    const manse = calculateManse(birthDate, birthTime || '12:00')
    return ritualFallbackLine(manse.day.ganHan, seq)
  } catch {
    return ritualFallbackLine(null, seq)
  }
}

/** 창 내 첫 진입 기록 — 완주율 분모(entered_at). 창 밖·비활성 시 행을 만들지 않는다. */
export async function enterRitual(): Promise<{ success: boolean; completed?: boolean; error?: RitualErrorCode }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'UNAUTHORIZED' }
    if (!(await isRitualEnabled())) return { success: false, error: 'DISABLED' }

    const window = getRitualWindow()
    if (!window.inWindow) return { success: false, error: 'OUT_OF_WINDOW' }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('enter_ritual', {
      p_user_id: user.id,
      p_ritual_month: window.ritualMonth,
      p_is_leap: window.isLeapMonth,
      p_seq: window.lunarMonthSeq,
    })
    if (error) {
      logger.error('[ritual] enter_ritual RPC 실패', error)
      return { success: false, error: 'FAILED' }
    }
    const row = Array.isArray(data) ? data[0] : data
    return { success: true, completed: Boolean(row?.already_completed) }
  } catch (err) {
    logger.error('[ritual] enterRitual 실패', err)
    return { success: false, error: 'FAILED' }
  }
}

export interface CompleteRitualInput {
  wishCategory: RitualWishCategory
}

export async function completeRitual(input: CompleteRitualInput): Promise<{
  success: boolean
  already?: boolean
  /** 이번 완주로 적립된 복채(만냥). 이미 완주한 달이면 0. */
  awarded?: number
  /** 적립 후 복채 잔액. */
  balance?: number
  /** 이번 완주로 기원 누적이 실제로 올랐는가(10A). 신당에서 오늘 이미 기원했으면 false. */
  devotionGained?: boolean
  /** 기원 누적 일수 — 단(壇) 진행의 근거. */
  devotionTotal?: number
  error?: RitualErrorCode
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'UNAUTHORIZED' }
    if (!(await isRitualEnabled())) return { success: false, error: 'DISABLED' }

    const window = getRitualWindow()
    if (!window.inWindow) return { success: false, error: 'OUT_OF_WINDOW' }

    const rl = await rateLimit(`ritual-complete:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 10 })
    if (!rl.success) return { success: false, error: 'RATE_LIMITED' }

    // 소원 갈래는 목록 안의 값만. 원문은 인자로도 받지 않는다(9A).
    if (!isRitualWishCategory(input?.wishCategory)) return { success: false, error: 'WISH_REQUIRED' }

    const admin = createAdminClient()

    // 7A: 열람한 식구 카드는 **서버가 파생한다.** 클라이언트가 uuid 배열을 보내면
    //     남의 id 를 넣거나 자기 id 를 반복해 「식구 모시기」 지표를 부풀릴 수 있고,
    //     하필 그 숫자가 2단계 확산을 결정하는 가족 가설 관찰 지표다.
    //     의례 진입 화면은 이 유저의 식구 카드를 전량 렌더하므로, 그 목록이 곧 열람 목록이다.
    const { data: ownedMembers } = await supabase.from('family_members').select('id').eq('user_id', user.id)
    const membersViewed = (ownedMembers ?? []).map((m) => m.id as string).slice(0, 50)

    // 적립량 서버 고정 (3A — 클라 입력 불신)
    let amount = 30
    const { data: setting } = await admin
      .from('system_settings')
      .select('value')
      .eq('key', 'ritual_bok_amount')
      .maybeSingle()
    const parsed = Number.parseInt(setting?.value ?? '', 10)
    if (Number.isFinite(parsed) && parsed >= 0) amount = parsed

    const { data, error } = await admin.rpc('complete_ritual', {
      p_user_id: user.id,
      p_ritual_month: window.ritualMonth,
      p_is_leap: window.isLeapMonth,
      p_seq: window.lunarMonthSeq,
      p_wish_category: input.wishCategory,
      p_members_viewed: membersViewed,
      p_bok_amount: amount,
      // 10A: 기원 누적의 KST 날짜. 창 판정과 같은 서버 시계에서 나와야 자정 경계가 갈리지 않는다.
      p_kst_today: window.kstDate,
    })
    if (error) {
      if (String(error.message).includes('WISH_REQUIRED')) return { success: false, error: 'WISH_REQUIRED' }
      logger.error('[ritual] complete_ritual RPC 실패', error)
      return { success: false, error: 'FAILED' }
    }
    const row = Array.isArray(data) ? data[0] : data
    return {
      success: true,
      already: Boolean(row?.already_completed),
      awarded: Number(row?.awarded ?? 0),
      balance: Number(row?.balance ?? 0),
      devotionGained: Boolean(row?.devotion_gained),
      devotionTotal: Number(row?.devotion_total ?? 0),
    }
  } catch (err) {
    logger.error('[ritual] completeRitual 실패', err)
    return { success: false, error: 'FAILED' }
  }
}

/**
 * AI 월간 1줄 — 캐시 우선, 실패 시 null (클라는 결정론 폴백 유지, 1A).
 * memberId null = 본인.
 */
export async function enhanceRitualCard(memberId: string | null): Promise<{ line: string } | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const window = getRitualWindow()
    const cardKey = memberId ?? SELF_CARD_ID

    const admin = createAdminClient()
    const { data: cached } = await admin
      .from('ritual_cards')
      .select('content')
      .eq('user_id', user.id)
      .eq('family_member_id', cardKey)
      .eq('ritual_month', window.ritualMonth)
      .eq('is_leap_month', window.isLeapMonth)
      .maybeSingle()
    if (cached?.content) return { line: String(cached.content) }

    const rl = await rateLimit(`ritual-card:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 20 })
    if (!rl.success) return null

    // 대상 명식
    let name = ''
    let birthDate: string | null = null
    let birthTime: string | null = null
    if (memberId) {
      const { data: m } = await supabase
        .from('family_members')
        .select('name, birth_date, birth_time')
        .eq('id', memberId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!m?.birth_date) return null
      name = m.name
      birthDate = m.birth_date
      birthTime = m.birth_time
    } else {
      const { data: p } = await supabase
        .from('profiles')
        .select('full_name, birth_date, birth_time')
        .eq('id', user.id)
        .maybeSingle()
      if (!p?.birth_date) return null
      name = p.full_name || '사용자'
      birthDate = p.birth_date
      birthTime = p.birth_time
    }

    const template = await getPromptByKey('ritual_month_line')
    if (!template) return null

    const manse = calculateManse(birthDate!, birthTime || '12:00')
    const sajuStr = `${manse.year.gan}${manse.year.ji}년 ${manse.month.gan}${manse.month.ji}월 ${manse.day.gan}${manse.day.ji}일`
    const prompt = template
      .replace('{{month_label}}', window.monthLabel)
      .replace('{{name}}', name)
      .replace('{{saju}}', sajuStr)

    const model = genAI.getGenerativeModel({ model: MODEL_FLASH })
    const result = await withGeminiRateLimit(() => model.generateContent(prompt), {
      userId: user.id,
      model: MODEL_FLASH,
      actionType: 'ritual_month_line',
    })
    const text = result.response.text().trim().split('\n')[0]?.slice(0, 120)
    if (!text) return null

    await admin.from('ritual_cards').upsert(
      {
        user_id: user.id,
        family_member_id: cardKey,
        ritual_month: window.ritualMonth,
        is_leap_month: window.isLeapMonth,
        content: text,
      },
      { onConflict: 'user_id,family_member_id,ritual_month,is_leap_month' }
    )
    return { line: text }
  } catch (err) {
    logger.warn('[ritual] enhanceRitualCard 실패 — 폴백 유지', err)
    return null
  }
}

/** 초하루 알림 옵트인 (V2) — 구독 행이 없으면 클라가 먼저 구독 플로우를 태운다. */
export async function optInRitualPush(): Promise<{ success: boolean; needsSubscribe?: boolean }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const admin = createAdminClient()
    const { data: subs } = await admin.from('push_subscriptions').select('id, topics').eq('user_id', user.id)
    if (!subs || subs.length === 0) return { success: false, needsSubscribe: true }

    for (const s of subs) {
      const topics: string[] = Array.isArray(s.topics) ? s.topics : []
      if (!topics.includes(RITUAL_PUSH_TOPIC)) {
        await admin
          .from('push_subscriptions')
          .update({ topics: [...topics, RITUAL_PUSH_TOPIC] })
          .eq('id', s.id)
      }
    }
    return { success: true }
  } catch (err) {
    logger.error('[ritual] optInRitualPush 실패', err)
    return { success: false }
  }
}
