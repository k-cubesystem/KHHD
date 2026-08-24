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
  drawSeed,
  isObangkiMatter,
  remainingFreeDraws,
} from '@/lib/domain/ritual/obangki'
import { drawSamgi } from '@/lib/domain/ritual/obangki-reading'
import {
  CHULJEON_DAILY_LIMIT,
  CHULJEON_WAY_MAX,
  CHULJEON_WAY_MIN,
  castChuljeon,
  countThrowsOnDay,
  dailySeed as chuljeonDailySeed,
  remainingThrows,
  throwSeed as chuljeonThrowSeed,
} from '@/lib/domain/ritual/chuljeon'
import { isElement, type Element } from '@/lib/domain/shrine/types'
import { calculateManseBasic } from '@/lib/domain/saju/manse'
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
import { isGutKind, remainingFreeGut, type GutKind, type GutStatus } from '@/lib/domain/ritual/gut'

/**
 * 신당 의식 서버 액션 — R-1 「액막이」 · R-2 「오방기 점괘」 · R-3 「백일기도」
 *
 * ⚠️ 구 백일기도(서약·게이지·트로피) UI 는 2026-08-25 CEO 재기획(기도 액자 v2)으로 물러났다.
 *    아래 getBaekilStatus·startBaekilVow·settleBaekilVow·getGutStatus 는 **호출처 0** 이지만
 *    지급된 트로피·아이템·shrine_vows 행이 살아 있어 재개 레버로 남긴다 — 새 소비처를 만들
 *    때는 PrayerSheet(기도 액자) 문법과 겹치지 않는지 먼저 볼 것.
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
  /**
   * 사용자 용신(用神) 오행 — 사주 해석 층(sajuLine)의 재료 (CEO 7차: "그 사람 사주 기반").
   * 명식 분석 전이면 null — 화면은 기본 층(색×유형 풀)만 보여준다(폴백 필수).
   */
  yongsin: Element | null
  /**
   * 명식의 오행 분포 — 삼기 점사의 왕쇠(旺衰) 층 재료. 같은 홍기라도 화(火)가 넘치는 명식과
   * 비어 있는 명식에 다르게 서기 때문에 용신만으로는 부족하다. 분석 전이면 null.
   */
  elements: Readonly<Record<Element, number>> | null
  /**
   * 일간(日干) — 태어난 날의 천간, 곧 **명식에서 나 자신**이다. 육친(六親) 판정의 기준이라
   * 용신·오행 분포만으로는 못 하는 "그 기운이 나에게 무엇인가"를 여기서 말한다.
   * 생년월일이 없거나 만세력이 실패하면 null — 화면은 육친 층을 통째로 뺀다(지어내지 않는다).
   */
  dayStem: { ko: string; han: string; element: Element } | null
  /**
   * 고축(告祝) 재료 — 이름·생년. 전승에서 점사는 "어디 사는 몇 년생 아무개가 아뢰옵니다"로 연다.
   *
   * ⚠️ 내려보내기만 하고 **되받지 않는다**. 화면이 문장으로 엮을 뿐이고 기록에 남는 것은
   *    여전히 갈래·색·시각 셋뿐이다. 값이 없으면 화면이 "이 몸이"로 아뢴다(폴백 필수).
   */
  worshipper: { name: string | null; birthYear: number | null }
}

/**
 * 명식 오행 분포 — base_* 다섯 컬럼을 삼기 왕쇠 판정이 쓰는 모양으로 옮긴다.
 *
 * **전부 0이거나 하나라도 수가 아니면 null** 이다. 빠진 값을 0으로 메우면 그 오행이 "가장 비어 있다"고
 * 읽혀 없는 명식으로 왕쇠를 단정하게 된다 — 사주 층은 없으면 빼는 것이 맞고 지어내면 안 된다.
 */
function elementSpread(row: unknown): Readonly<Record<Element, number>> | null {
  if (!isRecord(row)) return null
  const keys: readonly (readonly [Element, string])[] = [
    ['wood', 'base_wood'],
    ['fire', 'base_fire'],
    ['earth', 'base_earth'],
    ['metal', 'base_metal'],
    ['water', 'base_water'],
  ]
  const out = {} as Record<Element, number>
  let sum = 0
  for (const [el, col] of keys) {
    const v = row[col]
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    out[el] = Math.max(0, v)
    sum += out[el]
  }
  return sum > 0 ? Object.freeze(out) : null
}

/**
 * birth_date(text) → 생년. 형식이 어긋나면 null 이다 — 고축문에 엉뚱한 해를 넣느니 빼는 편이 낫다.
 * 저장 형식이 'YYYY-MM-DD' 라는 전제에만 기대고, 그 밖의 문자열은 조용히 버린다.
 */
function birthYearOf(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = /^(\d{4})-\d{2}-\d{2}/.exec(value.trim())
  if (!m) return null
  const y = Number(m[1])
  return y >= 1900 && y <= 2200 ? y : null
}

/** 만세력 오행 표기('Wood'…) → 우리 Element. 모르는 값은 null 이다. */
const MANSE_ELEMENT: Readonly<Record<string, Element>> = Object.freeze({
  Wood: 'wood',
  Fire: 'fire',
  Earth: 'earth',
  Metal: 'metal',
  Water: 'water',
})

/**
 * 일간(日干)을 명식에서 뽑는다 — 생년월일(+시)로 만세력을 세워 일주(日柱)의 천간을 읽는다.
 *
 * ⚠️ 실패하면 **null 이다**. 시가 없으면 자정으로 세우는데, 일간은 날짜가 정하는 값이라
 *    시 누락이 일간을 바꾸지 않는다(일진 경계인 야자시만 예외이고 그건 시가 있어야 알 수 있다).
 *    만세력이 던지면 육친 층을 빼는 것이 맞고, 임의값으로 메우면 없는 명식을 지어내는 것이 된다.
 */
function dayStemOf(birthDate: unknown, birthTime: unknown): { ko: string; han: string; element: Element } | null {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(birthDate.trim())) return null
  const time = typeof birthTime === 'string' && /^\d{2}:\d{2}/.test(birthTime.trim()) ? birthTime.trim() : '00:00'
  try {
    const manse = calculateManseBasic(birthDate.trim().slice(0, 10), time.slice(0, 5))
    const el = MANSE_ELEMENT[manse.day.ganElement]
    if (!el || !manse.day.gan) return null
    return { ko: manse.day.gan, han: manse.day.ganHan, element: el }
  } catch (e) {
    logger.warn('[obangki] 일간 산출 실패 — 육친 층 생략:', e)
    return null
  }
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
    // 용신은 명식 분석 산출물 — 없으면 null 로 두고 화면이 기본 층만 쓴다(신규 가입 직후 등)
    const { data: energy } = await supabase
      .from('user_energy_profile')
      .select('yongsin_element, base_wood, base_fire, base_earth, base_metal, base_water')
      .eq('user_id', user.id)
      .maybeSingle()
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, birth_date, birth_time')
      .eq('id', user.id)
      .maybeSingle()
    return {
      remainingFree: remainingFreeDraws(stamps, now),
      freeLimit: OBANGKI_DAILY_FREE,
      todayCount: countDrawsOnDay(stamps, now),
      cost: OBANGKI_EXTRA_COST,
      seed: dailySeed(user.id, today),
      yongsin: isElement(energy?.yongsin_element) ? energy.yongsin_element : null,
      elements: elementSpread(energy),
      dayStem: dayStemOf(profile?.birth_date, profile?.birth_time),
      worshipper: {
        name: typeof profile?.full_name === 'string' && profile.full_name.trim() ? profile.full_name.trim() : null,
        birthYear: birthYearOf(profile?.birth_date),
      },
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
    | 'INVALID_MATTER'
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
  /** 서버가 확정한 향방(말기) 색 — 화면은 이 값을 **보여줄 뿐**이다(성공 시 항상 있다) */
  color?: import('@/lib/domain/ritual/obangki').ObangkiColor
  /**
   * 서버가 실제로 쓴 회차(seq). 화면이 이 값으로 시드를 맞춰 **같은 삼기**를 편다.
   * 색 하나만 돌려주면 나머지 두 기가 갈릴 수 있어(동시요청으로 회차가 밀린 경우) 회차째로 준다.
   */
  seq?: number
}

/**
 * 오방기 뽑기 — **문복 갈래만 받는다**(색은 서버가 시드·회차로 확정, 아뢰는 말은 화면을 떠나지 않는다).
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
export async function drawObangki(matter: string, confirmPaid: boolean): Promise<DrawObangkiResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }
  if (!isObangkiMatter(matter)) return { success: false, error: 'INVALID_MATTER' }

  const gate = await ritualGate(user.id, 'obangki')
  if (gate !== 'OK') return { success: false, error: gate }

  const admin = createAdminClient()
  const today = formatKstDate()

  // ── 색은 서버가 확정한다 (CEO 7차: 자동 선출 / 감사 A3 P1 "시드 역산" 근본 해소) ──
  // 클라이언트가 보낸 색을 믿는 구조는 "선택"이 있을 때의 산물이다. 선택이 사라졌으므로
  // 회차(seq = 오늘 뽑은 수)와 시드에서 색을 서버가 스스로 계산한다 — 클라이언트는 같은
  // 결정론 함수로 연출만 그린다. 동시요청이 겹치면 RPC 잠금이 직렬화하지만 seq 사전 조회가
  // 반 박자 늦을 수 있다 — 최악이 "같은 색 두 번"(문구 중복)이고 경제 영향은 0, 폭주는
  // ritualGate 의 rate limit 이 막는다.
  const dayStart = Date.parse(`${today}T00:00:00+09:00`)
  const { data: todayRows, error: countError } = await supabase
    .from('obangki_draws')
    .select('drawn_at')
    .eq('user_id', user.id)
    .gte('drawn_at', new Date(dayStart).toISOString())
  if (countError) {
    logger.error('[obangki] 회차 조회 실패:', countError)
    return { success: false, error: 'DRAW_FAILED' }
  }
  const seq = countDrawsOnDay(toDrawEpochMs(todayRows), Date.now())
  const roundSeed = drawSeed(dailySeed(user.id, today), seq)
  // 8차: 한 점사는 삼기(자리·뿌리·향방)다. 로그에 남는 한 색은 **향방** — 결론을 쥔 기다.
  // 나머지 두 기와 부정풀이 여부는 같은 회차 시드에서 언제든 다시 나오므로 컬럼을 늘리지 않는다
  // (질문·선택지 무저장 원칙도 그대로: 남는 것은 여전히 색·유형·시각 셋뿐이다).
  const color = drawSamgi(roundSeed).way
  const record = async (paid: boolean) =>
    admin.rpc('draw_shrine_obangki', {
      p_user_id: user.id,
      p_color: color,
      p_qtype: matter,
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
    return { success: true, charged: false, color, seq, ...counts(freeRow.todayCount) }
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

  return { success: true, charged: true, color, seq, balance: paid.balance, ...counts(chargedRow.todayCount) }
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

// ─── R-4 척전(擲錢) 「엽전 세 닢」 ─────────────────────────────
//
// 갈림길을 정하는 도구 — 오방기(문복)와 **전혀 다른 의식**이다.
// 오방기는 한 가지 일에 신이 답하는 자리이고, 척전은 사람이 이미 길을 다 알면서 고르지 못할 때
// 하늘에 맡기는 자리다. 그래서 신격도 처방도 없고, **복채도 없다** —
// 점심 메뉴를 고르는 자리에 값을 붙이면 도구가 아니라 판매가 된다.
// 일 상한(10회)이 있는 이유는 과금이 아니라 기록 폭주를 막기 위해서다.

export interface ChuljeonStatus {
  /** 오늘(KST) 남은 던지기 */
  remaining: number
  /** 일 상한(10) */
  limit: number
  /** 오늘(KST) 던진 횟수 */
  todayCount: number
  /** 오늘치 결정론 시드의 뿌리 — 화면이 회차를 얹어 엽전 면을 만든다 */
  seed: number
}

/** timestamptz 문자열 → epochMs. 파싱 실패는 제외(카운트를 부풀리지 않는다). */
function toThrowEpochMs(rows: { thrown_at: string | null }[] | null): number[] {
  const out: number[] = []
  for (const r of rows ?? []) {
    const t = r.thrown_at ? Date.parse(r.thrown_at) : Number.NaN
    if (Number.isFinite(t)) out.push(t)
  }
  return out
}

/**
 * 척전 현황. 비로그인·조회 실패 모두 null 이다(다른 의식과 같은 규약) —
 * 마이그레이션 적용 전에는 테이블이 없으므로 그때는 진입점을 그리지 않는 것이 옳다.
 */
export async function getChuljeonStatus(): Promise<ChuljeonStatus | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const now = Date.now()
    const today = formatKstDate(now)
    const dayStart = Date.parse(`${today}T00:00:00+09:00`)
    const { data, error } = await supabase
      .from('shrine_chuljeon_throws')
      .select('thrown_at')
      .eq('user_id', user.id)
      .gte('thrown_at', new Date(dayStart).toISOString())

    if (error) {
      logger.warn('[chuljeon] 현황 조회 실패:', error)
      return null
    }

    const stamps = toThrowEpochMs(data)
    return {
      remaining: remainingThrows(stamps, now),
      limit: CHULJEON_DAILY_LIMIT,
      todayCount: countThrowsOnDay(stamps, now),
      seed: chuljeonDailySeed(user.id, today),
    }
  } catch (e) {
    logger.warn('[chuljeon] 현황 조회 예외(비치명):', e)
    return null
  }
}

export interface CastChuljeonResult {
  success: boolean
  error?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INVALID_WAYS' | 'DAILY_LIMIT' | 'THROW_FAILED'
  /** 서버가 실제로 쓴 회차 — 화면이 이 값으로 시드를 맞춰 같은 엽전을 던진다 */
  seq?: number
  todayCount?: number
  remaining?: number
}

/**
 * 척전 한 판 — **갈래 수만 받는다**(갈림길 원문은 화면을 떠나지 않는다).
 *
 * 결과(어느 길이 정해졌는가)는 서버가 회차 시드로 스스로 계산한다. 클라이언트가 보낸 값을 믿으면
 * "마음에 드는 길이 나올 때까지" 되던지는 길이 열리고, 그러면 정해 주는 도구가 아니게 된다.
 */
export async function castChuljeonThrow(ways: number): Promise<CastChuljeonResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const n = Number.isFinite(ways) ? Math.floor(ways) : 0
  if (n < CHULJEON_WAY_MIN || n > CHULJEON_WAY_MAX) return { success: false, error: 'INVALID_WAYS' }

  const gate = await ritualGate(user.id, 'chuljeon')
  if (gate !== 'OK') return { success: false, error: gate }

  const admin = createAdminClient()
  const today = formatKstDate()
  const dayStart = Date.parse(`${today}T00:00:00+09:00`)
  const { data: todayRows, error: countError } = await supabase
    .from('shrine_chuljeon_throws')
    .select('thrown_at')
    .eq('user_id', user.id)
    .gte('thrown_at', new Date(dayStart).toISOString())
  if (countError) {
    logger.error('[chuljeon] 회차 조회 실패:', countError)
    return { success: false, error: 'THROW_FAILED' }
  }

  const seq = countThrowsOnDay(toThrowEpochMs(todayRows), Date.now())
  const result = castChuljeon(chuljeonThrowSeed(chuljeonDailySeed(user.id, today), seq), n)
  // 끝내 갈리지 않은 판도 한 번의 던지기다 — picked 컬럼은 0 으로 두되 기록은 남긴다
  const picked = result.picked ?? 0

  const { data, error } = await admin.rpc('throw_shrine_chuljeon', {
    p_user_id: user.id,
    p_ways: n,
    p_picked: picked,
    p_today: today,
    p_limit: CHULJEON_DAILY_LIMIT,
  })
  if (error) {
    logger.error('[chuljeon] 기록 RPC 실패:', error)
    return { success: false, error: 'THROW_FAILED' }
  }

  const row: unknown = Array.isArray(data) ? data[0] : data
  const allowed = isRecord(row) && row.allowed === true
  const todayCount = isRecord(row) && typeof row.today_count === 'number' ? row.today_count : CHULJEON_DAILY_LIMIT
  const remaining = Math.max(0, CHULJEON_DAILY_LIMIT - todayCount)

  if (!allowed) return { success: false, error: 'DAILY_LIMIT', todayCount, remaining }
  return { success: true, seq, todayCount, remaining }
}

// ─── R-5 기원굿(祈願굿) ───────────────────────────────────────
//
// 백일기도를 마친 이의 소원을 굿 영상으로 만들어 드리는 의식(PLAN-gut-video-v1).
// ⚠️ **영상 제작 직전까지만** 열려 있다(CEO 2026-08-01: 힉스필드 연동은 테스트 후).
//    여기서 하는 일은 자격 판정과 접수뿐이고, 상태는 'requested' 에서 멈춘다.

export interface GutRequestRow {
  id: string
  kind: GutKind
  status: GutStatus
  round: number | null
  requestedAt: string
  videoUrl: string | null
}

export interface GutStatusData {
  /** 남은 완주 기원굿(회차마다 하나) */
  remainingFree: number
  /** 백일기도 완주 횟수 */
  completedCount: number
  /** 지금까지의 신청들 — 최신순 */
  requests: GutRequestRow[]
  /** 축원문 재료 — 없는 것은 null 이고 화면이 그만큼 뺀다 */
  chukwon: {
    name: string | null
    birthYear: number | null
    deity: string | null
    wish: string | null
    round: number | null
    dayKey: string
  }
}

function asGutStatus(v: unknown): GutStatus {
  const all: GutStatus[] = [
    'requested',
    'script_ready',
    'queued',
    'rendering',
    'review',
    'delivered',
    'failed',
    'canceled',
  ]
  return typeof v === 'string' && (all as string[]).includes(v) ? (v as GutStatus) : 'requested'
}

/**
 * 기원굿 현황 — 자격·신청 이력·축원문 재료를 한 번에 내려보낸다.
 * 다른 의식과 같은 규약으로 실패는 null 이다(자격을 지어내면 없는 굿을 권하게 된다).
 */
export async function getGutStatus(): Promise<GutStatusData | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const [{ data: vows }, { data: reqs }, { data: profile }] = await Promise.all([
      supabase.from('shrine_vows').select('round, completed_at').eq('user_id', user.id).not('completed_at', 'is', null),
      supabase
        .from('shrine_gut_requests')
        .select('id, kind, status, vow_round, requested_at, video_url')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false }),
      supabase.from('profiles').select('full_name, birth_date').eq('id', user.id).maybeSingle(),
    ])

    const requests: GutRequestRow[] = (reqs ?? []).map((r) => ({
      id: String(r.id),
      kind: isGutKind(r.kind) ? r.kind : 'petition',
      status: asGutStatus(r.status),
      round: typeof r.vow_round === 'number' ? r.vow_round : null,
      requestedAt: String(r.requested_at),
      videoUrl: typeof r.video_url === 'string' ? r.video_url : null,
    }))

    const completedCount = (vows ?? []).length
    const usedFree = requests.filter((r) => r.kind === 'completion' && r.status !== 'canceled').length

    // 주신·소원 — 본인 신당에서. 없으면 그 줄이 축원문에서 빠진다(지어내지 않는다).
    const { data: shrine } = await supabase
      .from('shrines')
      .select('id, main_deity_name')
      .eq('user_id', user.id)
      .is('family_member_id', null)
      .maybeSingle()
    const { data: wish } = shrine?.id
      ? await supabase
          .from('shrine_wishes')
          .select('wish_text')
          .eq('shrine_id', shrine.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null }

    const rounds = (vows ?? []).map((v) => (typeof v.round === 'number' ? v.round : 0)).sort((a, b) => b - a)

    return {
      remainingFree: remainingFreeGut(completedCount, usedFree),
      completedCount,
      requests,
      chukwon: {
        name: typeof profile?.full_name === 'string' && profile.full_name.trim() ? profile.full_name.trim() : null,
        birthYear: birthYearOf(profile?.birth_date),
        deity: typeof shrine?.main_deity_name === 'string' ? shrine.main_deity_name : null,
        wish: typeof wish?.wish_text === 'string' ? wish.wish_text : null,
        round: rounds[0] ?? null,
        dayKey: formatKstDate(),
      },
    }
  } catch (e) {
    logger.warn('[gut] 현황 조회 예외(비치명):', e)
    return null
  }
}

export interface RequestGutResult {
  success: boolean
  error?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INVALID_KIND' | 'NO_QUOTA' | 'NOT_OPEN' | 'REQUEST_FAILED'
  requestId?: string
}

/**
 * 기원굿 접수 — **완주 자격 건만** 연다.
 *
 * ⚠️ 청원(값을 치르고 청하는) 건은 **가격이 정해지지 않아 열지 않는다**(기획서 §4 결정 대기).
 *    값이 미정인 채로 결제 경로를 열면 무료로 새거나 임의 금액이 굳는다 — 어느 쪽도 되돌리기 어렵다.
 * ⚠️ 자격 판정은 **RPC 안에서** 완주 수와 사용 수를 견주며 어드바이저리 잠금을 쥔다 —
 *    화면이 보낸 회차를 믿고 주면 완주하지 않고도 신청이 된다.
 */
export async function requestGut(kind: string): Promise<RequestGutResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }
  if (!isGutKind(kind)) return { success: false, error: 'INVALID_KIND' }
  if (kind === 'petition') return { success: false, error: 'NOT_OPEN' }

  const gate = await ritualGate(user.id, 'gut')
  if (gate !== 'OK') return { success: false, error: gate }

  const { data: vows } = await supabase
    .from('shrine_vows')
    .select('round')
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .order('round', { ascending: false })
    .limit(1)
  const round = Array.isArray(vows) && typeof vows[0]?.round === 'number' ? vows[0].round : null

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('request_shrine_gut', {
    p_user_id: user.id,
    p_kind: kind,
    p_round: round,
  })
  if (error) {
    logger.error('[gut] 접수 RPC 실패:', error)
    return { success: false, error: 'REQUEST_FAILED' }
  }

  const row: unknown = Array.isArray(data) ? data[0] : data
  if (!isRecord(row) || row.allowed !== true) {
    return { success: false, error: row && isRecord(row) && row.reason === 'NO_QUOTA' ? 'NO_QUOTA' : 'REQUEST_FAILED' }
  }

  revalidatePath('/protected/shrine')
  return { success: true, requestId: typeof row.request_id === 'string' ? row.request_id : undefined }
}
