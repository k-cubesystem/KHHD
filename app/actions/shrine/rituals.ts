'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { spendBokchae, refundBokchae } from '@/lib/services/bokchae'
import { logger } from '@/lib/utils/logger'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { rateLimit } from '@/lib/utils/rate-limit'
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
import {
  BAEKIL_TARGET_DAYS,
  daysSinceLastPrayer,
  isVowVideoStatus,
  milestoneLine,
  nextVowRound,
  trophyTierForRound,
  vowProgress,
  type VowProgress,
  type VowTrophyTier,
  type VowVideoStatus,
} from '@/lib/domain/ritual/baekil'
import { grantVowCompletion } from '@/lib/services/ritual-grant'

/**
 * 신당 의식 서버 액션 — R-1 「액막이」 · R-2 「오방기 점괘」 · R-3 「백일기도」
 * (PRD-shrine-rituals-v1 §1·§2·§3).
 *
 * ⚠️ 이 파일은 `'use server'` — 모든 export 가 로그인 유저의 **공개 엔드포인트**다.
 *    그래서 여기엔 재화 지급·권한 상승 함수를 두지 않는다. 액막이는 무료 의식이라
 *    지급 경로가 아예 없고, 공유 보상은 기존 `claimShareReward`(app/actions/payment/bok-points)를
 *    그대로 쓴다 — 새 지급 경로를 만들지 않는다.
 *    오방기의 복채 차감도 여기서 지갑을 직접 만지지 않는다 — server-only 모듈
 *    `lib/services/bokchae.ts`(spendBokchae/refundBokchae, deduct_wallet_balance RPC)만 부른다.
 *    백일기도 완주 보상(트로피·신당 걸이 아이템)도 마찬가지다 — 지급은 server-only 모듈
 *    `lib/services/ritual-grant.ts` 가 하고, 여기 있는 액션은 **인자를 받지 않는다**.
 *
 * ⚠️ **액운 원문·점괘 질문·소원 원문은 인자로도 받지 않는다.** 받는 순간 로그·Sentry·요청 바디에
 *    남을 길이 열린다(ARCH §6 리스크 1). 서버가 아는 것은 감정 태그 / 색·질문유형 / 서약 회차뿐이고,
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
  error?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INVALID_TAG' | 'DAILY_LIMIT' | 'BURN_FAILED'
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

  const gate = await ritualGate(user.id, 'aekmak')
  if (gate !== 'OK') return { success: false, error: gate }

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

/**
 * 의식 공통 게이트 — 멤버십 + 분당 호출 상한 (감사 A3 P1, 2026-07-31).
 *
 * 페이지는 layout 이 막지만 서버 액션은 그 자체로 공개 엔드포인트다(4차 CONCERN #1 의 액션판).
 * 같은 날 배포된 saveFamilyHallSeats 는 게이트가 걸려 있었는데 의식 4종만 비어 있었다.
 * 일 상한 RPC(3회)는 **거절된 호출을 세지 않으므로** 호출 폭주 자체는 여기 rateLimit 이 막는다.
 * 조회(getXxxStatus)에는 걸지 않는다 — 읽기는 RLS 본인 스코프가 이미 막고, 게이트 실패 시
 * 진입점 렌더 자체가 사라져 "멤버십 만료 직후 화면이 통째로 죽는" 회귀를 만들 이유가 없다.
 */
async function ritualGate(userId: string, ritual: string): Promise<'OK' | 'FORBIDDEN' | 'RATE_LIMITED'> {
  const membership = await getCurrentUserMembership()
  if (!membership) return 'FORBIDDEN'
  const rl = await rateLimit(`ritual-${ritual}:${userId}`, { interval: 60_000, uniqueTokenPerInterval: 10 })
  return rl.success ? 'OK' : 'RATE_LIMITED'
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
  error?:
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'RATE_LIMITED'
    | 'INVALID_COLOR'
    | 'INVALID_QTYPE'
    | 'NEEDS_PAYMENT'
    | 'INSUFFICIENT_BOKCHAE'
    | 'DRAW_FAILED'
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

  const gate = await ritualGate(user.id, 'obangki')
  if (gate !== 'OK') return { success: false, error: gate }

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

// ─── R-3 백일기도 ─────────────────────────────────────────────
//
// 진행도는 **기존 기원(shrine_devotion) 누적일에서 파생**한다 — 새 게이지도, 새 데일리 액션도 없다.
// 서약 행은 시작 시점의 누적일을 스냅샷으로 들고 있고, `현재 누적 − 스냅샷` 이 곧 걸어온 날수다.
// 그래서 여기 있는 액션들은 기원 적립 사건을 새로 만들지 않는다(기도 = 소원 올리기, 기존 경로 그대로).

/** 완주한 서약 하나 = 트로피 하나. 회차·완주일·축원 영상 상태를 함께 들고 있다. */
export interface BaekilTrophy {
  vowId: string
  /** 회차(1부터) */
  round: number
  /** 회차로 갈리는 등급 — 목패/놋패/금패 */
  tier: VowTrophyTier
  /** 완주 시각 ISO */
  completedAt: string
  videoStatus: VowVideoStatus
  /** 축원 영상 주소. 렌더 파이프라인 붙기 전까지는 항상 null */
  videoUrl: string | null
}

export interface BaekilStatus {
  /** 기원 누적 기도일(진행도의 원천) */
  totalDays: number
  /** 오늘(KST) 이미 기도했는가 */
  prayedToday: boolean
  /** 마지막 기도 이후 KST 일수. 기도 기록이 없으면 null */
  idleDays: number | null
  /** 활성 서약의 진행도. 서약이 없으면 phase='none' 인 빈 값 */
  progress: VowProgress
  /** 활성 서약 id. 없으면 null */
  activeVowId: string | null
  /** 지금 서약하면 부여될 회차 */
  nextRound: number
  /** 누적 완주 횟수(= 트로피 수) */
  completedCount: number
  /** 트로피 목록(최신 회차 순) */
  trophies: BaekilTrophy[]
  /** 진행 상황에 대한 신위의 한마디(결정론). 활성 서약이 없으면 null */
  milestone: string | null
  /** 한 회차의 목표일(100) */
  targetDays: number
}

interface VowRow {
  id: string
  round: number
  devotion_snapshot: number
  target_days: number
  started_at: string
  completed_at: string | null
  video_status: string
  video_url: string | null
}

function toTrophy(r: VowRow): BaekilTrophy {
  return {
    vowId: r.id,
    round: r.round,
    tier: trophyTierForRound(r.round),
    completedAt: r.completed_at ?? '',
    videoStatus: isVowVideoStatus(r.video_status) ? r.video_status : 'none',
    videoUrl: r.video_url,
  }
}

/**
 * 백일기도 현황 — 기원 누적일 + 서약 행을 읽어 진행도를 **순수 함수로** 판정한다.
 *
 * 이 함수는 아무것도 바꾸지 않는다. 완주 조건을 채웠어도 여기서 확정하지 않고 `progress.ready`
 * 로만 알린다 — 조회가 지급을 일으키면 화면이 현황을 새로 고칠 때마다 의식 없이 트로피가 나온다.
 * 확정은 화면이 완주 연출과 함께 settleBaekilVow 를 부를 때 한 번 일어난다.
 *
 * 비로그인·조회 실패 모두 null 이다(액막이·오방기와 같은 규약). 마이그레이션 적용 전에는
 * 이 테이블이 없으므로 그때도 서약 진입점을 그리지 않는 것이 옳은 동작이다.
 */
export async function getBaekilStatus(): Promise<BaekilStatus | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const now = Date.now()
    const [{ data: dev }, { data: vowRows, error: vowErr }] = await Promise.all([
      supabase.from('shrine_devotion').select('total_days, last_prayer_date').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('shrine_vows')
        .select('id, round, devotion_snapshot, target_days, started_at, completed_at, video_status, video_url')
        .eq('user_id', user.id)
        .order('round', { ascending: false }),
    ])

    if (vowErr) {
      logger.warn('[baekil] 현황 조회 실패:', vowErr)
      return null
    }

    const rows = (vowRows ?? []) as VowRow[]
    const totalDays = dev?.total_days ?? 0
    const lastPrayerDate: string | null = dev?.last_prayer_date ?? null
    const active = rows.find((r) => r.completed_at === null) ?? null
    const completed = rows.filter((r) => r.completed_at !== null)

    const progress = vowProgress(
      active
        ? {
            round: active.round,
            devotionSnapshot: active.devotion_snapshot,
            targetDays: active.target_days,
            startedAtMs: Date.parse(active.started_at),
            completedAtMs: null,
          }
        : null,
      totalDays,
      lastPrayerDate,
      now
    )

    // 회차 번호는 완주 수가 아니라 **최대 회차**에서 잇는다 — 활성 서약도 이미 번호를 쓰고 있다.
    const maxRound = rows.reduce((m, r) => Math.max(m, r.round), 0)

    return {
      totalDays,
      prayedToday: !!lastPrayerDate && lastPrayerDate === formatKstDate(now),
      idleDays: daysSinceLastPrayer(lastPrayerDate, now),
      progress,
      activeVowId: active?.id ?? null,
      nextRound: nextVowRound(maxRound),
      completedCount: completed.length,
      trophies: completed.map(toTrophy),
      milestone: active ? milestoneLine(progress.earnedDays, progress.round) : null,
      targetDays: BAEKIL_TARGET_DAYS,
    }
  } catch (e) {
    logger.warn('[baekil] 현황 조회 예외(비치명):', e)
    return null
  }
}

export interface StartBaekilResult {
  success: boolean
  /** 실패 사유 코드(화면이 문구를 고른다). */
  error?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'ALREADY_ACTIVE' | 'START_FAILED'
  /** 시작된(또는 이미 진행 중인) 서약 id */
  vowId?: string
  /** 그 서약의 회차 */
  round?: number
  /** 서약 시점의 기원 누적일 — 진행도의 기준선 */
  snapshot?: number
}

/**
 * 서약 시작 — 인자를 받지 않는다.
 *
 * 스냅샷(기준선)은 **서버 RPC 가 shrine_devotion 에서 직접 읽는다**. 클라이언트가 보낸 값을
 * 쓰면 0 을 보내 그 자리에서 완주할 수 있다. 활성 서약이 이미 있으면 ALREADY_ACTIVE 로 거절하되
 * 그 회차를 함께 돌려준다(화면이 현황을 다시 묻지 않아도 되게).
 */
export async function startBaekilVow(): Promise<StartBaekilResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const gate = await ritualGate(user.id, 'baekil')
  if (gate !== 'OK') return { success: false, error: gate }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('start_shrine_vow', {
    p_user_id: user.id,
    p_target: BAEKIL_TARGET_DAYS,
  })

  if (error) {
    logger.error('[baekil] 서약 시작 RPC 실패:', error)
    return { success: false, error: 'START_FAILED' }
  }

  const row: unknown = Array.isArray(data) ? data[0] : data
  if (!isRecord(row) || typeof row.started !== 'boolean') {
    logger.error('[baekil] 서약 시작 RPC 응답 형식 불명')
    return { success: false, error: 'START_FAILED' }
  }

  const vowId = typeof row.vow_id === 'string' ? row.vow_id : undefined
  const round = typeof row.round === 'number' ? row.round : undefined
  const snapshot = typeof row.devotion_snapshot === 'number' ? row.devotion_snapshot : undefined

  if (row.started !== true) return { success: false, error: 'ALREADY_ACTIVE', vowId, round, snapshot }

  revalidatePath('/protected/shrine')
  return { success: true, vowId, round, snapshot }
}

export interface SettleBaekilResult {
  success: boolean
  /** 실패 사유 코드(화면이 문구를 고른다). */
  error?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'NOT_READY' | 'SETTLE_FAILED'
  /** 완주한 회차 */
  round?: number
  /** 그 회차의 트로피 등급 */
  tier?: VowTrophyTier
  /** 처리 후 누적 완주 횟수(= 트로피 수) */
  completedCount?: number
  /** 지급 후 「백일 소원끈」 보유 수량 */
  itemQty?: number
  /** 완주와 함께 열린 축원 영상 자리의 상태 — 이번 차수에서는 항상 'queued' */
  videoStatus?: VowVideoStatus
}

/**
 * 완주 판정 + 보상 지급 — 인자를 받지 않는다.
 *
 * 판정과 지급은 RPC 한 트랜잭션에서 끝난다(complete_shrine_vow):
 *   ① 완주 UPDATE 가 `completed_at is null` 을 조건으로 걸어 **두 번째 호출은 0 행**이 된다.
 *   ② 0 행이면 아이템 지급 블록에 들어가지도 않는다 → 두 번 눌러도 트로피·아이템이 하나씩.
 *   ③ 진행도는 서버가 shrine_devotion 에서 재판정한다 → 클라이언트 값 미신뢰.
 * 그래서 이 액션은 멱등이다 — 연출 도중 중복 호출돼도 두 번째부터 NOT_READY 로 조용히 접힌다.
 *
 * 지급 자체는 server-only 모듈(grantVowCompletion)만 한다. 여기서 인벤토리를 직접 만지지 않는다.
 */
export async function settleBaekilVow(): Promise<SettleBaekilResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const gate = await ritualGate(user.id, 'baekil')
  if (gate !== 'OK') return { success: false, error: gate }

  const result = await grantVowCompletion(user.id)
  if (result.error) return { success: false, error: 'SETTLE_FAILED' }

  if (!result.completed) {
    // 100일 미달이거나 이미 완주 처리됨 — 실패가 아니라 "지금 할 일이 없다"이다
    return { success: false, error: 'NOT_READY', completedCount: result.totalCompleted }
  }

  revalidatePath('/protected/shrine')
  return {
    success: true,
    round: result.round,
    tier: trophyTierForRound(result.round),
    completedCount: result.totalCompleted,
    itemQty: result.itemQty,
    videoStatus: 'queued',
  }
}
