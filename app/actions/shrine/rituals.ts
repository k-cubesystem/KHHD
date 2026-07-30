'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { spendBokchae, refundBokchae } from '@/lib/services/bokchae'
import { logger } from '@/lib/utils/logger'
import { formatKstDate } from '@/lib/utils'
import {
  AEKMAK_DAILY_LIMIT,
  countBurnsOnDay,
  countBurnsThisMonth,
  isAekmakTag,
  kstMonthStartMs,
  remainingBurns,
} from '@/lib/domain/ritual/aekmak'
import {
  OBANGKI_DAILY_FREE,
  OBANGKI_EXTRA_COST,
  countDrawsOnDay,
  dailySeed,
  isObangkiColor,
  isObangkiQType,
  remainingFreeDraws,
} from '@/lib/domain/ritual/obangki'

/**
 * 신당 의식 서버 액션 — R-1 「액막이」 · R-2 「오방기 점괘」 (PRD-shrine-rituals-v1 §1·§2).
 *
 * ⚠️ 이 파일은 `'use server'` — 모든 export 가 로그인 유저의 **공개 엔드포인트**다.
 *    그래서 여기엔 재화 지급·권한 상승 함수를 두지 않는다. 액막이는 무료 의식이라
 *    지급 경로가 아예 없고, 공유 보상은 기존 `claimShareReward`(app/actions/payment/bok-points)를
 *    그대로 쓴다 — 새 지급 경로를 만들지 않는다.
 *    오방기의 복채 차감도 여기서 지갑을 직접 만지지 않는다 — server-only 모듈
 *    `lib/services/bokchae.ts`(spendBokchae/refundBokchae, deduct_wallet_balance RPC)만 부른다.
 *
 * ⚠️ **액운 원문·점괘 질문은 인자로도 받지 않는다.** 받는 순간 로그·Sentry·요청 바디에 남을 길이
 *    열린다(ARCH §6 리스크 1). 서버가 아는 것은 감정 태그 / 색·질문유형뿐이고,
 *    원문은 클라이언트에서 부적 문양·깃발 배정으로 변환돼 화면을 떠나지 않는다.
 */

export interface AekmakStatus {
  /** 오늘(KST) 남은 태우기 횟수 */
  remaining: number
  /** 일 상한(3) */
  limit: number
  /** 오늘(KST) 태운 횟수 */
  todayCount: number
  /** 이달(KST) 태운 횟수 — 월간 회고 문구 재료 */
  monthCount: number
}

/** timestamptz 문자열 → epochMs. 파싱 실패는 제외(카운트를 부풀리지 않는다). */
function toEpochMs(rows: { burned_at: string | null }[] | null): number[] {
  const out: number[] = []
  for (const r of rows ?? []) {
    const t = r.burned_at ? Date.parse(r.burned_at) : Number.NaN
    if (Number.isFinite(t)) out.push(t)
  }
  return out
}

/**
 * 액막이 현황 — 이달 기록만 읽어 오늘/이달 카운트를 순수 함수로 판정한다(KST 단일 출처).
 *
 * 비로그인·조회 실패 모두 null 이다. 실패를 기본값(3회 남음)으로 메우면 상한을 오표시하게 되고,
 * 무엇보다 **마이그레이션 적용 전에는 이 테이블이 없다** — 그때는 의식 진입점을 그리지 않는 것이
 * 옳은 동작이다. 신당 페이지 렌더를 막아서는 안 되므로 예외도 여기서 삼킨다(사랑방 로드와 같은 규약).
 */
export async function getAekmakStatus(): Promise<AekmakStatus | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const now = Date.now()
    const { data, error } = await supabase
      .from('shrine_aekmak_logs')
      .select('burned_at')
      .eq('user_id', user.id)
      .gte('burned_at', new Date(kstMonthStartMs(now)).toISOString())
      .order('burned_at', { ascending: false })

    if (error) {
      logger.warn('[aekmak] 현황 조회 실패:', error)
      return null
    }

    const stamps = toEpochMs(data)
    return {
      remaining: remainingBurns(stamps, now),
      limit: AEKMAK_DAILY_LIMIT,
      todayCount: countBurnsOnDay(stamps, now),
      monthCount: countBurnsThisMonth(stamps, now),
    }
  } catch (e) {
    logger.warn('[aekmak] 현황 조회 예외(비치명):', e)
    return null
  }
}

export interface BurnAekmakResult {
  success: boolean
  /** 실패 사유 코드(화면이 문구를 고른다). */
  error?: 'UNAUTHORIZED' | 'INVALID_TAG' | 'DAILY_LIMIT' | 'BURN_FAILED'
  /** 처리 후 오늘 남은 횟수. 실패해도 알 수 있으면 함께 내린다. */
  remaining?: number
}

/**
 * 부적 태우기 기록 — 감정 태그 하나만 받는다.
 *
 * 판정(일 3회)과 기록은 service_role RPC 한 문장 안에서 끝난다 — 클라이언트가 상한을
 * 우회할 경로(직접 INSERT)는 RLS 로 막혀 있다(마이그레이션에 쓰기 정책 미부여).
 * 연출은 이미 화면에서 진행 중이므로(낙관 UI) 실패해도 던지지 않고 코드로 돌려준다.
 */
export async function burnAekmak(tag: string): Promise<BurnAekmakResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }
  if (!isAekmakTag(tag)) return { success: false, error: 'INVALID_TAG' }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('burn_shrine_aekmak', {
    p_user_id: user.id,
    p_tag: tag,
    p_today: formatKstDate(),
    p_limit: AEKMAK_DAILY_LIMIT,
  })

  if (error) {
    logger.error('[aekmak] 기록 RPC 실패:', error)
    return { success: false, error: 'BURN_FAILED' }
  }

  // returns table(...) → 배열의 첫 행
  const row: unknown = Array.isArray(data) ? data[0] : data
  const allowed = isRecord(row) && row.allowed === true
  const todayCount = isRecord(row) && typeof row.today_count === 'number' ? row.today_count : AEKMAK_DAILY_LIMIT
  const remaining = Math.max(0, AEKMAK_DAILY_LIMIT - todayCount)

  if (!allowed) return { success: false, error: 'DAILY_LIMIT', remaining }
  return { success: true, remaining }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

// ─── R-2 오방기 점괘 ──────────────────────────────────────────

export interface ObangkiStatus {
  /** 오늘(KST) 남은 무료 뽑기 */
  remainingFree: number
  /** 무료 상한(3) */
  freeLimit: number
  /** 오늘(KST) 뽑은 총 횟수(복채분 포함) */
  todayCount: number
  /** 무료 소진 후 1회 값 — wallets.balance 단위(1 = 1만냥) */
  cost: number
  /**
   * 오늘치 결정론 시드의 뿌리. 화면이 회차(seq)를 얹어 셔플·배정·문구를 만든다.
   * userId 문자열 대신 해시를 내려보낸다 — 계정 식별자가 DOM·공유 카드로 새지 않게.
   */
  seed: number
}

/** timestamptz 문자열 → epochMs. 파싱 실패는 제외(카운트를 부풀리지 않는다). */
function toDrawEpochMs(rows: { drawn_at: string | null }[] | null): number[] {
  const out: number[] = []
  for (const r of rows ?? []) {
    const t = r.drawn_at ? Date.parse(r.drawn_at) : Number.NaN
    if (Number.isFinite(t)) out.push(t)
  }
  return out
}

/**
 * 오방기 현황 — 오늘 기록만 읽어 남은 무료 횟수를 순수 함수로 판정한다(KST 단일 출처).
 *
 * 비로그인·조회 실패 모두 null 이다(액막이와 같은 규약). 실패를 기본값으로 메우면 무료 잔여를
 * 오표시해 **복채를 물릴 자리에서 무료라고 말하게 된다** — 과금이 걸린 만큼 더 엄격하다.
 * 마이그레이션 적용 전에는 이 테이블이 없으므로 그때도 진입점을 그리지 않는 것이 옳다.
 */
export async function getObangkiStatus(): Promise<ObangkiStatus | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const now = Date.now()
    const today = formatKstDate(now)
    // 오늘 것만 필요하다 — KST 자정을 UTC 로 환산하면 하루 전 15:00Z 다. 여유 없이 정확히 자른다.
    const dayStart = Date.parse(`${today}T00:00:00+09:00`)
    const { data, error } = await supabase
      .from('obangki_draws')
      .select('drawn_at')
      .eq('user_id', user.id)
      .gte('drawn_at', new Date(dayStart).toISOString())
      .order('drawn_at', { ascending: false })

    if (error) {
      logger.warn('[obangki] 현황 조회 실패:', error)
      return null
    }

    const stamps = toDrawEpochMs(data)
    return {
      remainingFree: remainingFreeDraws(stamps, now),
      freeLimit: OBANGKI_DAILY_FREE,
      todayCount: countDrawsOnDay(stamps, now),
      cost: OBANGKI_EXTRA_COST,
      seed: dailySeed(user.id, today),
    }
  } catch (e) {
    logger.warn('[obangki] 현황 조회 예외(비치명):', e)
    return null
  }
}

export interface DrawObangkiResult {
  success: boolean
  /** 실패 사유 코드(화면이 문구를 고른다). */
  error?: 'UNAUTHORIZED' | 'INVALID_COLOR' | 'INVALID_QTYPE' | 'NEEDS_PAYMENT' | 'INSUFFICIENT_BOKCHAE' | 'DRAW_FAILED'
  /** 이번 뽑기에 복채를 물었는가 */
  charged?: boolean
  /** 처리 후 오늘 뽑은 총 횟수 */
  todayCount?: number
  /** 처리 후 남은 무료 횟수 */
  remainingFree?: number
  /** 차감 후 지갑 잔액(복채로 뽑았을 때만) */
  balance?: number
}

/**
 * 오방기 뽑기 기록 — 뽑힌 색과 질문유형만 받는다(질문·선택지는 화면을 떠나지 않는다).
 *
 * 과금 순서가 이 함수의 핵심이다:
 *   ① 무조건 **무료 시도 먼저**(RPC p_paid=false — 상한 검사와 INSERT 가 한 문장).
 *   ② 거절됐을 때만 = 오늘 무료가 실제로 소진됐을 때만 복채를 본다.
 *   ③ 그마저도 화면이 명시 동의(confirmPaid)를 보냈을 때만 차감한다.
 * 이 순서라 "무료가 남았는데 돈을 물렸다"는 사고가 구조적으로 불가능하다 —
 * 클라이언트가 confirmPaid 를 항상 true 로 보내도 ①에서 통과해버리기 때문이다.
 *
 * 차감은 server-only 모듈(spendBokchae)만 쓴다. 차감 후 기록이 실패하면 곧바로 환불한다
 * (deities.ts 의 구매 → 지급 실패 → refundBokchae 와 같은 패턴).
 */
export async function drawObangki(color: string, qtype: string, confirmPaid: boolean): Promise<DrawObangkiResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }
  if (!isObangkiColor(color)) return { success: false, error: 'INVALID_COLOR' }
  if (!isObangkiQType(qtype)) return { success: false, error: 'INVALID_QTYPE' }

  const admin = createAdminClient()
  const today = formatKstDate()
  const record = async (paid: boolean) =>
    admin.rpc('draw_shrine_obangki', {
      p_user_id: user.id,
      p_color: color,
      p_qtype: qtype,
      p_today: today,
      p_free_limit: OBANGKI_DAILY_FREE,
      p_paid: paid,
    })

  // ① 무료 시도
  const free = await record(false)
  if (free.error) {
    logger.error('[obangki] 무료 기록 RPC 실패:', free.error)
    return { success: false, error: 'DRAW_FAILED' }
  }
  const freeRow = readDrawRow(free.data)
  if (freeRow.allowed) {
    return { success: true, charged: false, ...counts(freeRow.todayCount) }
  }
  // 응답을 못 읽었으면 "무료 소진"이 아니다 — 여기서 멈춘다. 계속 가면 무료가 남은 사람에게 과금한다.
  if (!freeRow.parsed) {
    logger.error('[obangki] 무료 기록 RPC 응답 형식 불명 — 과금하지 않고 중단')
    return { success: false, error: 'DRAW_FAILED', ...counts(freeRow.todayCount) }
  }

  // ② 무료 소진 — 동의 없이는 여기서 멈춘다(화면이 값을 안내하고 다시 부른다)
  if (!confirmPaid) {
    return { success: false, error: 'NEEDS_PAYMENT', ...counts(freeRow.todayCount) }
  }

  // ③ 복채 차감 → 기록. 기록이 깨지면 되돌린다.
  const paid = await spendBokchae(OBANGKI_EXTRA_COST, '오방기 점괘 1회', 'OBANGKI')
  if (!paid.success) {
    if (paid.error === 'INSUFFICIENT_BOKCHAE') {
      return { success: false, error: 'INSUFFICIENT_BOKCHAE', ...counts(freeRow.todayCount) }
    }
    logger.error('[obangki] 복채 차감 실패:', paid.error)
    return { success: false, error: 'DRAW_FAILED', ...counts(freeRow.todayCount) }
  }

  const charged = await record(true)
  const chargedRow = readDrawRow(charged.data)
  if (charged.error || !chargedRow.allowed) {
    logger.error('[obangki] 유료 기록 RPC 실패 — 복채 환불:', charged.error)
    await refundBokchae(user.id, OBANGKI_EXTRA_COST, '오방기 점괘 기록 실패 환불')
    return { success: false, error: 'DRAW_FAILED', ...counts(freeRow.todayCount) }
  }

  return { success: true, charged: true, balance: paid.balance, ...counts(chargedRow.todayCount) }
}

/**
 * RPC 응답(returns table) 파싱 — 배열의 첫 행.
 *
 * ⚠️ "못 읽음"과 "거절"을 **구분해야 한다**. 한 값으로 뭉개면 안전한 방향이 경로마다 반대가 된다:
 *   · 유료 기록 경로 — 못 읽음을 거절로 보면 환불한다 → 안전
 *   · 무료 시도 경로 — 못 읽음을 거절로 보면 "무료 소진"으로 읽혀 **과금으로 넘어간다** → 위험.
 *     RPC 가 무료 뽑기를 이미 INSERT 한 뒤 응답만 안 읽히는 경우, 공짜로 받은 뽑기에 복채를 물린다.
 * 그래서 parsed 를 따로 돌려주고, 무료 경로는 **긍정적으로 거절을 확인했을 때만** 과금 단계로 간다.
 */
function readDrawRow(data: unknown): { parsed: boolean; allowed: boolean; todayCount: number } {
  const row: unknown = Array.isArray(data) ? data[0] : data
  const parsed = isRecord(row) && typeof row.allowed === 'boolean'
  return {
    parsed,
    allowed: isRecord(row) && row.allowed === true,
    todayCount: isRecord(row) && typeof row.today_count === 'number' ? row.today_count : OBANGKI_DAILY_FREE,
  }
}

function counts(todayCount: number): { todayCount: number; remainingFree: number } {
  return { todayCount, remainingFree: Math.max(0, OBANGKI_DAILY_FREE - todayCount) }
}
