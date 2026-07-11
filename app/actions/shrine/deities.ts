'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { trackEvent } from '@/lib/analytics/ga4'
import { addBokPoints, deductBokPoints } from '@/app/actions/payment/bok-points'
import { assignGuardian } from '@/lib/domain/shrine/deities'
import { isElement } from '@/lib/domain/shrine/types'

/**
 * ⚠️ 통화 결정 대기 (Fable 검토 R3 / WORKLOG Track D).
 * PRD는 신위/테마를 "복전(유료)"으로 규정했으나 현재 구현은 복(bok_points=무료 적립형) 차감.
 * 무료 통화로 프리미엄을 팔면 매출 누수 → 통화(복채/복전) 확정 전까지 유료 구매를 막는다.
 * (UI 미노출 상태라 앱 영향 없음. 확정 후 true 로 전환하며 차감 통화도 함께 결정.)
 */
const PREMIUM_CURRENCY_READY = false

export interface DeityAura {
  accent: string | null
  particle: string | null
  sound: string | null
}

export interface Deity {
  id: string
  code: string
  name: string
  nameHanja: string | null
  tier: number
  tierName: string
  element: string
  domains: string[]
  aura: DeityAura
  priceKrw: number
  priceBok: number
  isSeasonLimited: boolean
  spriteUrl: string | null
  portraitUrl: string | null
}

interface DeityRow {
  id: string
  code: string
  name: string
  name_hanja: string | null
  tier: number
  tier_name: string
  element: string
  domains: string[] | null
  aura: unknown
  price_krw: number
  price_bok: number
  is_season_limited: boolean
  sprite_url: string | null
  portrait_url: string | null
}

function parseAura(raw: unknown): DeityAura {
  if (typeof raw !== 'object' || raw === null) return { accent: null, particle: null, sound: null }
  const r = raw as Record<string, unknown>
  return {
    accent: typeof r.accent === 'string' ? r.accent : null,
    particle: typeof r.particle === 'string' ? r.particle : null,
    sound: typeof r.sound === 'string' ? r.sound : null,
  }
}

function toDeity(r: DeityRow): Deity {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    nameHanja: r.name_hanja,
    tier: r.tier,
    tierName: r.tier_name,
    element: r.element,
    domains: r.domains ?? [],
    aura: parseAura(r.aura),
    priceKrw: r.price_krw,
    priceBok: r.price_bok,
    isSeasonLimited: r.is_season_limited,
    spriteUrl: r.sprite_url,
    portraitUrl: r.portrait_url,
  }
}

export interface DeityCatalog {
  deities: Deity[]
  ownedCodes: string[]
  seatedDeityId: string | null
}

/** 신위 카탈로그 + 보유 목록 + 좌정(主神) 상태 */
export async function listDeities(): Promise<DeityCatalog> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: rows } = await supabase
    .from('shrine_deities')
    .select(
      'id, code, name, name_hanja, tier, tier_name, element, domains, aura, price_krw, price_bok, is_season_limited, sprite_url, portrait_url'
    )
    .eq('is_active', true)
    .order('sort_order')

  const deities = (rows ?? []).map((r) => toDeity(r as DeityRow))

  if (!user) return { deities, ownedCodes: [], seatedDeityId: null }

  const [{ data: owned }, { data: shrine }] = await Promise.all([
    supabase.from('user_shrine_deities').select('deity_id').eq('user_id', user.id),
    supabase.from('shrines').select('main_deity_id').eq('user_id', user.id).maybeSingle(),
  ])

  const ownedIds = new Set((owned ?? []).map((o) => o.deity_id))
  const ownedCodes = deities.filter((d) => ownedIds.has(d.id)).map((d) => d.code)

  return { deities, ownedCodes, seatedDeityId: shrine?.main_deity_id ?? null }
}

/** service_role 로 신위 지급 + 인연 1단계 초기화 (멱등) */
async function grantDeity(userId: string, deityId: string, source: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('user_shrine_deities')
    .upsert({ user_id: userId, deity_id: deityId, source }, { onConflict: 'user_id,deity_id', ignoreDuplicates: true })
  await admin
    .from('user_deity_bonds')
    .upsert(
      { user_id: userId, deity_id: deityId, bond_level: 1, bond_points: 0 },
      { onConflict: 'user_id,deity_id', ignoreDuplicates: true }
    )
}

/**
 * 무료 수호신 자동 좌정 (결정론, AI 0).
 * user_energy_profile.yongsin_element + profiles.focus_areas → assignGuardian → 지급·좌정.
 * 이미 主神이 있으면 그대로 반환(멱등).
 */
export async function autoSeatGuardian(): Promise<{ success: boolean; deityCode?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  // 이미 좌정된 主神이 있으면 멱등 반환
  const { data: shrine } = await supabase
    .from('shrines')
    .select('id, main_deity_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (shrine?.main_deity_id) {
    const { data: cur } = await supabase
      .from('shrine_deities')
      .select('code')
      .eq('id', shrine.main_deity_id)
      .maybeSingle()
    return { success: true, deityCode: cur?.code }
  }

  // 배정 입력 수집
  const [{ data: energy }, { data: profile }] = await Promise.all([
    supabase.from('user_energy_profile').select('yongsin_element').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('focus_areas').eq('id', user.id).maybeSingle(),
  ])

  const yongsin = isElement(energy?.yongsin_element) ? energy.yongsin_element : null
  const assignment = assignGuardian({ yongsin, focusAreas: profile?.focus_areas ?? null })

  // 코드 → deity id
  const { data: deity } = await supabase
    .from('shrine_deities')
    .select('id, code')
    .eq('code', assignment.code)
    .maybeSingle()
  if (!deity) {
    logger.error('[autoSeatGuardian] guardian not found in catalog:', assignment.code)
    return { success: false, error: 'DEITY_NOT_FOUND' }
  }

  await grantDeity(user.id, deity.id, 'free_guardian')

  // 主神 좌정 (shrine 없으면 생성)
  const admin = createAdminClient()
  if (shrine?.id) {
    await admin.from('shrines').update({ main_deity_id: deity.id }).eq('id', shrine.id)
  } else {
    await admin.from('shrines').insert({ user_id: user.id, name: '나의 신당', main_deity_id: deity.id })
  }

  trackEvent({ action: 'deity_auto_seat', category: 'shrine', label: assignment.code, value: 0 })
  revalidatePath('/protected/shrine')
  return { success: true, deityCode: assignment.code }
}

/** 보유한 신위를 主神으로 좌정 (소유 검증 후 admin 으로 반영) */
export async function seatDeity(deityId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { data: owned } = await supabase
    .from('user_shrine_deities')
    .select('deity_id')
    .eq('user_id', user.id)
    .eq('deity_id', deityId)
    .maybeSingle()
  if (!owned) return { success: false, error: 'NOT_OWNED' }

  const admin = createAdminClient()
  const { data: shrine } = await supabase.from('shrines').select('id').eq('user_id', user.id).maybeSingle()
  if (shrine?.id) {
    await admin.from('shrines').update({ main_deity_id: deityId }).eq('id', shrine.id)
  } else {
    await admin.from('shrines').insert({ user_id: user.id, name: '나의 신당', main_deity_id: deityId })
  }

  revalidatePath('/protected/shrine')
  return { success: true }
}

/**
 * 신위 구매. 가격은 **서버 DB 값만 신뢰**(클라 전송값 무시). 차감은 원자적(deduct_bok_points).
 * 영구 소장 + GA4. tier1(수호신)은 무료 좌정 경로이므로 구매 대상 아님.
 * ⚠️ 유료 구매는 통화 확정(PREMIUM_CURRENCY_READY) 전까지 차단(R3).
 */
export async function purchaseDeity(
  deityCode: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  // 서버에서 가격·등급 조회 (클라 값 미신뢰)
  const { data: deity } = await supabase
    .from('shrine_deities')
    .select('id, tier, price_bok, is_active')
    .eq('code', deityCode)
    .maybeSingle()
  if (!deity || !deity.is_active) return { success: false, error: 'DEITY_NOT_FOUND' }
  if (deity.tier <= 1) return { success: false, error: 'FREE_GUARDIAN_NOT_PURCHASABLE' }

  const price = deity.price_bok
  if (price > 0 && !PREMIUM_CURRENCY_READY) {
    return { success: false, error: 'PREMIUM_CURRENCY_NOT_CONFIGURED' }
  }

  // 이미 보유 시 중복 결제 방지
  const { data: existing } = await supabase
    .from('user_shrine_deities')
    .select('deity_id')
    .eq('user_id', user.id)
    .eq('deity_id', deity.id)
    .maybeSingle()
  if (existing) return { success: false, error: 'ALREADY_OWNED' }

  let newBalance: number | undefined
  if (price > 0) {
    const res = await deductBokPoints(price, 'SHRINE_ITEM_PURCHASE', undefined, `신위 좌정 (${deityCode})`)
    if (!res.success) return { success: false, error: res.error ?? 'PAYMENT_FAILED' }
    newBalance = res.balance
  }

  await grantDeity(user.id, deity.id, 'purchase')

  trackEvent({ action: 'deity_purchase', category: 'shrine', label: deityCode, value: price })
  revalidatePath('/protected/shrine')
  return { success: true, newBalance }
}

/**
 * 테마팩 구매(복 결제) — 기존 미구현분 구현.
 * 서버 가격검증 → 복 차감 → user_theme_packs 영구 소장(admin) → GA4.
 */
export async function purchaseThemePack(
  packCode: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { data: pack } = await supabase
    .from('shrine_theme_packs')
    .select('id, price_bok, is_active')
    .eq('code', packCode)
    .maybeSingle()
  if (!pack || !pack.is_active) return { success: false, error: 'PACK_NOT_FOUND' }

  const { data: owned } = await supabase
    .from('user_theme_packs')
    .select('pack_id')
    .eq('user_id', user.id)
    .eq('pack_id', pack.id)
    .maybeSingle()
  if (owned) return { success: false, error: 'ALREADY_OWNED' }

  const price = pack.price_bok
  if (price > 0 && !PREMIUM_CURRENCY_READY) {
    return { success: false, error: 'PREMIUM_CURRENCY_NOT_CONFIGURED' }
  }

  let newBalance: number | undefined
  if (price > 0) {
    const res = await deductBokPoints(price, 'SHRINE_ITEM_PURCHASE', undefined, `테마팩 구매 (${packCode})`)
    if (!res.success) return { success: false, error: res.error ?? 'PAYMENT_FAILED' }
    newBalance = res.balance
  }

  const admin = createAdminClient()
  const { error } = await admin.from('user_theme_packs').insert({ user_id: user.id, pack_id: pack.id })
  if (error) {
    logger.error('[purchaseThemePack] grant failed:', error)
    // 결제됐는데 지급 실패 → best-effort 환불
    if (price > 0) await addBokPoints(price, 'BONUS', undefined, `테마팩 구매 취소 환불 (${packCode})`)
    return { success: false, error: 'GRANT_FAILED' }
  }

  trackEvent({ action: 'theme_pack_purchase', category: 'shrine', label: packCode, value: price })
  revalidatePath('/protected/shrine')
  return { success: true, newBalance }
}
