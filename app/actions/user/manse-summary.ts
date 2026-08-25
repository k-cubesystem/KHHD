'use server'

import { createClient } from '@/lib/supabase/server'
import { getDestinyTargets, type DestinyTarget } from '@/app/actions/user/destiny'
import { getUserTierLimits } from '@/app/actions/payment/membership'

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
  /** 복채 잔액(만냥). */
  balance: number
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

  const [targets, tierLimits, { data: wallet }, { data: shrine }] = await Promise.all([
    getDestinyTargets(),
    getUserTierLimits(),
    supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    // 좌정 신위 — 본인 신당의 主神. 테이블은 `shrines`(신당) + `shrine_deities`(신위 카탈로그)다.
    // 🔴 2026-08-25 신당 단일화로 가족별 신당이 사라졌지만 컬럼은 남아 있어, 본인 신당은
    //    `family_member_id is null` 로 계속 집는다(listDeities 와 같은 계보).
    supabase
      .from('shrines')
      .select('main_deity_id, shrine_deities(name, portrait_url)')
      .eq('user_id', user.id)
      .is('family_member_id', null)
      .maybeSingle(),
  ])

  // 신위는 부가 정보 — 실패해도 팝업의 본체(명식·복채·등급)는 성립한다.
  const deity = toDeity(shrine)

  return {
    targets,
    balance: typeof wallet?.balance === 'number' ? wallet.balance : 0,
    planName: planNameOf(tierLimits),
    isSubscribed: Boolean(tierLimits?.is_subscribed),
    deityName: deity?.name ?? null,
    deityPortraitUrl: deity?.portraitUrl ?? null,
  }
}

/** 등급 표시명 — 화면에 숫자·주기를 쓰지 않는다(표시광고법 규율, CLAUDE.md). */
function planNameOf(limits: Awaited<ReturnType<typeof getUserTierLimits>>): string {
  if (!limits) return '무료 회원'
  if (!limits.is_subscribed) return '무료 회원'
  const tier = typeof limits.tier === 'string' ? limits.tier : ''
  return TIER_LABEL[tier] ?? '멤버십 회원'
}

const TIER_LABEL: Record<string, string> = {
  SINGLE: '싱글 멤버십',
  FAMILY: '패밀리 멤버십',
  BUSINESS: '비즈니스 멤버십',
  TESTER: '테스터',
  UNLIMITED: '마스터',
}

/** 조인 결과는 배열로 올 수도 단건으로 올 수도 있다 — 양쪽을 흡수한다(타입 가드). */
function toDeity(row: unknown): { name: string; portraitUrl: string | null } | null {
  if (typeof row !== 'object' || row === null) return null
  const raw = (row as { shrine_deities?: unknown }).shrine_deities
  const one = Array.isArray(raw) ? raw[0] : raw
  if (typeof one !== 'object' || one === null) return null
  const name = (one as { name?: unknown }).name
  const portrait = (one as { portrait_url?: unknown }).portrait_url
  if (typeof name !== 'string' || !name) return null
  return { name, portraitUrl: typeof portrait === 'string' ? portrait : null }
}
