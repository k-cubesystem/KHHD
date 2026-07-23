'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { formatKstDate } from '@/lib/utils'
import {
  DEVOTION_REWARDS,
  devotionProgress,
  levelFromDays,
  rewardForLevel,
  type DevotionRewardKind,
} from '@/lib/domain/shrine/devotion'

export type DevotionRewardUiStatus = 'locked' | 'claimable' | 'claimed' | 'owned'

export interface DevotionRewardStatus {
  level: number
  kind: DevotionRewardKind
  /** theme: pack code · item: 신물 name (안정 키) */
  code: string
  /** 표시용 이름 (DB name). 조회 실패 시 code 폴백. */
  name: string
  /** 복채 정가(만냥). 0=무료. "기원 N단 무료"의 대비가격. */
  priceBokchae: number
  status: DevotionRewardUiStatus
}

export interface DevotionStatus {
  totalDays: number
  level: number
  /** 다음 단(최고 단이면 null). */
  nextLevel: number | null
  /** 다음 단까지 남은 기도일(최고 단이면 0). */
  daysToNext: number
  /** 오늘(KST) 이미 기도(적립)했는지. */
  prayedToday: boolean
  rewards: DevotionRewardStatus[]
}

/** 기원 현황 — 누적일·단·오늘 기도 여부 + 보상 트랙(수령/보유 상태). 비로그인 null. */
export async function getDevotionStatus(): Promise<DevotionStatus | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const today = formatKstDate()
  const [{ data: dev }, { data: claims }, { data: ownedThemes }, { data: inv }, { data: themePacks }, { data: items }] =
    await Promise.all([
      supabase.from('shrine_devotion').select('total_days, last_prayer_date').eq('user_id', user.id).maybeSingle(),
      supabase.from('shrine_devotion_claims').select('reward_level').eq('user_id', user.id),
      supabase.from('user_theme_packs').select('pack_id').eq('user_id', user.id),
      supabase.from('user_shrine_inventory').select('catalog_item_id, qty').eq('user_id', user.id),
      supabase.from('shrine_theme_packs').select('id, code, name, price_bokchae'),
      supabase.from('shrine_item_catalog').select('id, name, price_bokchae'),
    ])

  const totalDays = dev?.total_days ?? 0
  const progress = devotionProgress(totalDays)
  const prayedToday = !!dev?.last_prayer_date && dev.last_prayer_date === today

  const claimedLevels = new Set((claims ?? []).map((c) => c.reward_level))
  const themeByCode = new Map((themePacks ?? []).map((p) => [p.code, p]))
  const ownedThemeIds = new Set((ownedThemes ?? []).map((o) => o.pack_id))
  const itemByName = new Map((items ?? []).map((i) => [i.name, i]))
  const ownedItemIds = new Set((inv ?? []).filter((i) => (i.qty ?? 0) > 0).map((i) => i.catalog_item_id))

  const rewards: DevotionRewardStatus[] = DEVOTION_REWARDS.map((r) => {
    let name = r.code
    let priceBokchae = 0
    let alreadyOwned = false
    if (r.kind === 'theme') {
      const p = themeByCode.get(r.code)
      if (p) {
        name = p.name
        priceBokchae = p.price_bokchae ?? 0
        alreadyOwned = ownedThemeIds.has(p.id)
      }
    } else {
      const it = itemByName.get(r.code)
      if (it) {
        name = it.name
        priceBokchae = it.price_bokchae ?? 0
        alreadyOwned = ownedItemIds.has(it.id)
      }
    }

    let status: DevotionRewardUiStatus
    if (claimedLevels.has(r.level)) status = 'claimed'
    else if (alreadyOwned) status = 'owned'
    else if (progress.level >= r.level) status = 'claimable'
    else status = 'locked'

    return { level: r.level, kind: r.kind, code: r.code, name, priceBokchae, status }
  })

  return {
    totalDays,
    level: progress.level,
    nextLevel: progress.nextLevel,
    daysToNext: progress.daysToNext,
    prayedToday,
    rewards,
  }
}

export interface ClaimResult {
  success: boolean
  error?: string
  kind?: DevotionRewardKind
  /** 표시용 이름(성공 시). */
  name?: string
}

/**
 * 기원 보상 수령 — 무료 지급(복채 차감 없음).
 * 검증: 단 도달(서버 신뢰) → 이미 보유면 안내(수령 불필요) → 수령 기록 선점(PK 멱등) → 지급.
 * 테마는 user_theme_packs, 신물은 grant_shrine_item RPC(구매 경로와 동일한 지급 함수 재사용).
 */
export async function claimDevotionReward(level: number): Promise<ClaimResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const reward = rewardForLevel(level)
  if (!reward) return { success: false, error: 'NO_REWARD' }

  // 단 도달 검증 (클라 레벨 미신뢰 — DB 누적일로 재판정)
  const { data: dev } = await supabase.from('shrine_devotion').select('total_days').eq('user_id', user.id).maybeSingle()
  if (levelFromDays(dev?.total_days ?? 0) < reward.level) return { success: false, error: 'LEVEL_NOT_REACHED' }

  // 보상 대상 카탈로그 행 + 기보유 여부 확인
  let targetId: string | null = null
  let alreadyOwned = false
  if (reward.kind === 'theme') {
    const { data: pack } = await supabase.from('shrine_theme_packs').select('id').eq('code', reward.code).maybeSingle()
    if (!pack) return { success: false, error: 'REWARD_NOT_FOUND' }
    targetId = pack.id
    const { data: owned } = await supabase
      .from('user_theme_packs')
      .select('pack_id')
      .eq('user_id', user.id)
      .eq('pack_id', pack.id)
      .maybeSingle()
    alreadyOwned = !!owned
  } else {
    const { data: item } = await supabase.from('shrine_item_catalog').select('id').eq('name', reward.code).maybeSingle()
    if (!item) return { success: false, error: 'REWARD_NOT_FOUND' }
    targetId = item.id
    const { data: invRow } = await supabase
      .from('user_shrine_inventory')
      .select('qty')
      .eq('user_id', user.id)
      .eq('catalog_item_id', item.id)
      .maybeSingle()
    alreadyOwned = (invRow?.qty ?? 0) > 0
  }

  // 이미 보유 → 수령 불필요 (getDevotionStatus 가 'owned' 로 노출, 안내만)
  if (alreadyOwned) return { success: false, error: 'ALREADY_OWNED' }

  const admin = createAdminClient()

  // 수령 기록 선점 — PK(user_id, reward_level) 충돌 = 이미 수령(중복 방어)
  const { error: claimErr } = await admin
    .from('shrine_devotion_claims')
    .insert({ user_id: user.id, reward_level: reward.level })
  if (claimErr) {
    if (claimErr.code === '23505') return { success: false, error: 'ALREADY_CLAIMED' }
    logger.error('[devotion] claim insert failed:', claimErr)
    return { success: false, error: 'CLAIM_FAILED' }
  }

  // 지급 (무료). 실패 시 수령 기록 롤백 → 재시도 가능.
  let grantErr: unknown = null
  if (reward.kind === 'theme') {
    const { error } = await admin
      .from('user_theme_packs')
      .upsert({ user_id: user.id, pack_id: targetId }, { onConflict: 'user_id,pack_id', ignoreDuplicates: true })
    grantErr = error
  } else {
    const { error } = await admin.rpc('grant_shrine_item', {
      p_user_id: user.id,
      p_item_id: targetId,
      p_qty: reward.qty,
    })
    grantErr = error
  }

  if (grantErr) {
    logger.error('[devotion] reward grant failed:', grantErr)
    await admin.from('shrine_devotion_claims').delete().eq('user_id', user.id).eq('reward_level', reward.level)
    return { success: false, error: 'GRANT_FAILED' }
  }

  revalidatePath('/protected/shrine')
  revalidatePath('/protected/store')
  return { success: true, kind: reward.kind, name: reward.code }
}
