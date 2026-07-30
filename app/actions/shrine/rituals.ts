'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

/**
 * 신당 의식 서버 액션 — R-1 「액막이」 (PRD-shrine-rituals-v1 §1).
 *
 * ⚠️ 이 파일은 `'use server'` — 모든 export 가 로그인 유저의 **공개 엔드포인트**다.
 *    그래서 여기엔 재화 지급·권한 상승 함수를 두지 않는다. 액막이는 무료 의식이라
 *    지급 경로가 아예 없고, 공유 보상은 기존 `claimShareReward`(app/actions/payment/bok-points)를
 *    그대로 쓴다 — 새 지급 경로를 만들지 않는다.
 *
 * ⚠️ **액운 원문은 인자로도 받지 않는다.** 받는 순간 로그·Sentry·요청 바디에 남을 길이 열린다
 *    (ARCH §6 리스크 1). 서버가 아는 것은 감정 태그 하나뿐이고, 원문은 클라이언트에서
 *    부적 문양으로 변환돼 화면에서 타 없어진다.
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
