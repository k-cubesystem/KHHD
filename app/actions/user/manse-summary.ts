'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTargets, type DestinyTarget } from '@/app/actions/user/destiny'
import { getUserTierLimits } from '@/app/actions/payment/membership'
import { getPassSummary } from '@/lib/services/entitlement'
import { loadWornMainDeity } from '@/lib/services/shrine-wear'
import type { PassSummary } from '@/lib/domain/entitlement/pass'
import { planDisplayName } from '@/lib/domain/payment/membership-tiers'
import { logger } from '@/lib/utils/logger'

/**
 * 상단 바 「내 명식 바로보기」(태극 팝업)가 쓰는 요약 한 벌.
 *
 * 명식(사주팔자·오행)은 **클라이언트에서 결정론 엔진으로 계산한다** — 만세력 화면과 같은
 * 계보다(`getSajuData`). 서버는 «계산에 필요한 생년월일»과 «계정 요약»만 모은다.
 * 🔴 명식을 서버에서 또 계산하지 말 것 — 두 벌이 되면 만세력과 값이 갈린다.
 */
export interface ManseSummary {
  /** 드롭다운에 세울 사람들(본인 먼저). 만세력·궁합과 같은 출처(v_destiny_targets). */
  targets: DestinyTarget[]
  /** 이용권 — 멤버십 이번 달 몫과 보유 이용권을 따로 든다(한 숫자로 합치지 않는다). */
  passes: PassSummary
  /** 멤버십 등급 표시명 — 없으면 '무료 회원'. */
  planName: string
  isSubscribed: boolean
  /** 좌정한 主神 이름 — 없으면 null(팝업이 「신위 모시기」로 안내한다). */
  deityName: string | null
  deityPortraitUrl: string | null
}

export async function getManseSummary(): Promise<ManseSummary | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [targets, tierLimits, passes, deity] = await Promise.all([
    getDestinyTargets(),
    getUserTierLimits(),
    getPassSummary(user.id),
    // 좌정 신위 — 등급이 끊겨 신당에서 풀린 主神은 여기서도 풀려 보여야 한다(판정은 shrine-wear 한 곳).
    // 신위는 부가 정보 — 실패해도 팝업의 본체(명식·이용권·등급)는 성립한다.
    loadWornMainDeity(supabase, user.id).catch((e: unknown) => {
      logger.warn('[getManseSummary] seated deity skipped:', e)
      return null
    }),
  ])

  return {
    targets,
    passes,
    planName: planDisplayName(tierLimits),
    isSubscribed: Boolean(tierLimits?.is_subscribed),
    deityName: deity?.name ?? null,
    deityPortraitUrl: deity?.portraitUrl ?? null,
  }
}
