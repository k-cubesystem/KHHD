'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { trackEvent } from '@/lib/analytics/ga4'
import { spendBokchae, refundBokchae } from '@/lib/services/bokchae'
import { assignGuardian, bondProgress, type BondProgress } from '@/lib/domain/shrine/deities'
import { isElement } from '@/lib/domain/shrine/types'

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
  /** 복채 가격(만냥). 0=무료(수호신). */
  priceBokchae: number
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
  price_bokchae: number
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
    priceBokchae: r.price_bokchae,
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
      'id, code, name, name_hanja, tier, tier_name, element, domains, aura, price_krw, price_bok, price_bokchae, is_season_limited, sprite_url, portrait_url'
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

/** service_role 로 신위 지급 + 인연 1단계 초기화 (멱등). 실패 시 error 반환 — 결제 경로는 환불 필요. */
async function grantDeity(userId: string, deityId: string, source: string): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  const { error: grantError } = await admin
    .from('user_shrine_deities')
    .upsert({ user_id: userId, deity_id: deityId, source }, { onConflict: 'user_id,deity_id', ignoreDuplicates: true })
  if (grantError) {
    logger.error('[grantDeity] grant failed:', grantError)
    return { error: grantError.message }
  }
  const { error: bondError } = await admin
    .from('user_deity_bonds')
    .upsert(
      { user_id: userId, deity_id: deityId, bond_level: 1, bond_points: 0 },
      { onConflict: 'user_id,deity_id', ignoreDuplicates: true }
    )
  if (bondError) {
    // 인연 행은 부가 데이터 — 지급 자체는 성공으로 취급(적립 시 upsert로 재생성됨)
    logger.warn('[grantDeity] bond init failed (non-fatal):', bondError)
  }
  return { error: null }
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

  const { error: grantError } = await grantDeity(user.id, deity.id, 'free_guardian')
  if (grantError) return { success: false, error: 'GRANT_FAILED' }

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
 * 신위 봉안(구매). 단일 통화 **복채** 차감(price_bokchae, 서버 DB 값만 신뢰).
 * 영구 소장 + GA4. tier1(수호신)은 무료 좌정 경로이므로 구매 대상 아님.
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
    .select('id, tier, price_bokchae, is_active')
    .eq('code', deityCode)
    .maybeSingle()
  if (!deity || !deity.is_active) return { success: false, error: 'DEITY_NOT_FOUND' }
  if (deity.tier <= 1) return { success: false, error: 'FREE_GUARDIAN_NOT_PURCHASABLE' }

  // 이미 보유 시 중복 결제 방지
  const { data: existing } = await supabase
    .from('user_shrine_deities')
    .select('deity_id')
    .eq('user_id', user.id)
    .eq('deity_id', deity.id)
    .maybeSingle()
  if (existing) return { success: false, error: 'ALREADY_OWNED' }

  const price = deity.price_bokchae
  let newBalance: number | undefined
  if (price > 0) {
    const res = await spendBokchae(price, `신위 봉안 (${deityCode})`)
    if (!res.success) return { success: false, error: res.error ?? 'PAYMENT_FAILED' }
    newBalance = res.balance
  }

  const { error: grantError } = await grantDeity(user.id, deity.id, 'purchase')
  if (grantError) {
    // 결제됐는데 지급 실패 → 복채 환불 (테마팩과 동일 패턴)
    if (price > 0) await refundBokchae(user.id, price, `신위 봉안 취소 환불 (${deityCode})`)
    return { success: false, error: 'GRANT_FAILED' }
  }

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
    .select('id, price_bokchae, is_active')
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

  const price = pack.price_bokchae
  let newBalance: number | undefined
  if (price > 0) {
    const res = await spendBokchae(price, `테마팩 구매 (${packCode})`)
    if (!res.success) return { success: false, error: res.error ?? 'PAYMENT_FAILED' }
    newBalance = res.balance
  }

  const admin = createAdminClient()
  const { error } = await admin.from('user_theme_packs').insert({ user_id: user.id, pack_id: pack.id })
  if (error) {
    logger.error('[purchaseThemePack] grant failed:', error)
    // 결제됐는데 지급 실패 → best-effort 복채 환불
    if (price > 0) await refundBokchae(user.id, price, `테마팩 구매 취소 환불 (${packCode})`)
    return { success: false, error: 'GRANT_FAILED' }
  }

  trackEvent({ action: 'theme_pack_purchase', category: 'shrine', label: packCode, value: price })
  revalidatePath('/protected/shrine')
  return { success: true, newBalance }
}

// 인연(緣) 적립은 lib/services/deity-bond.ts(서버 내부 전용)로 이동 —
// 공개 서버액션이면 클라이언트가 임의 포인트로 호출 가능해 조작 벡터가 된다.

/** 보유 신위별 인연 진행도(단계·다음목표·해금) — UI용. */
export async function getDeityBonds(): Promise<Array<{ deityId: string; progress: BondProgress }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase.from('user_deity_bonds').select('deity_id, bond_points').eq('user_id', user.id)

  return (data ?? []).map((r) => ({ deityId: r.deity_id, progress: bondProgress(r.bond_points) }))
}
