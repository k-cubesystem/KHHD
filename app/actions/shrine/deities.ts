'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { parseMatters } from '@/lib/domain/shrine/item-matters'
import { trackEvent } from '@/lib/analytics/ga4'
import { getActiveMembership } from '@/lib/auth/subscription'
import { TIER_LABEL, tierUnlocks, type MembershipTier } from '@/lib/domain/payment/membership-tiers'
import { assignGuardian, bondProgress, type BondProgress } from '@/lib/domain/shrine/deities'
import { baseFromSajuData } from '@/lib/domain/shrine/energy-born'
import {
  TIER_OPEN_DEITY_SOURCE,
  deityOwnershipHolds,
  isElement,
  parseRequiredTier,
  type Element,
  type ThemeAssets,
  type ThemePack,
} from '@/lib/domain/shrine/types'
import { getSajuData } from '@/lib/domain/saju/saju'
import { seatedDeityHolds } from '@/lib/services/shrine-wear'

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
  isSeasonLimited: boolean
  spriteUrl: string | null
  portraitUrl: string | null
  /** 모실 수 있는 최저 멤버십 등급(shrine_deities.required_tier). null = 누구나(수호신). */
  requiredTier: MembershipTier | null
  /** 지금 멤버십 등급으로 모실 수 있는가. */
  unlocked: boolean
  /** 모셔 둔 신위인가. 등급으로 모신 신위는 등급이 닿을 때만 true 다. */
  owned: boolean
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
  required_tier: string | null
  is_season_limited: boolean
  sprite_url: string | null
  portrait_url: string | null
}

const DEITY_ROW_COLUMNS =
  'id, code, name, name_hanja, tier, tier_name, element, domains, aura, required_tier, is_season_limited, sprite_url, portrait_url'

function parseAura(raw: unknown): DeityAura {
  if (typeof raw !== 'object' || raw === null) return { accent: null, particle: null, sound: null }
  const r = raw as Record<string, unknown>
  return {
    accent: typeof r.accent === 'string' ? r.accent : null,
    particle: typeof r.particle === 'string' ? r.particle : null,
    sound: typeof r.sound === 'string' ? r.sound : null,
  }
}

function toDeity(r: DeityRow, state: { unlocked: boolean; owned: boolean }): Deity {
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
    isSeasonLimited: r.is_season_limited,
    spriteUrl: r.sprite_url,
    portraitUrl: r.portrait_url,
    requiredTier: parseRequiredTier(r.required_tier),
    unlocked: state.unlocked,
    owned: state.owned,
  }
}

function tierRequiredMessage(requiredTier: MembershipTier): string {
  return `${TIER_LABEL[requiredTier]} 멤버십부터 모실 수 있어요`
}

export interface DeityCatalog {
  deities: Deity[]
  seatedDeityId: string | null
}

/** 신위 카탈로그(등급 개방·보유 포함) + 좌정(主神) 상태. familyMemberId 지정 시 그 가족 신당의 좌정 기준. */
export async function listDeities(familyMemberId?: string | null): Promise<DeityCatalog> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: rows } = await supabase
    .from('shrine_deities')
    .select(DEITY_ROW_COLUMNS)
    .eq('is_active', true)
    .order('sort_order')
  const deityRows = (rows ?? []) as DeityRow[]

  if (!user) {
    const deities = deityRows.map((r) => toDeity(r, { unlocked: tierUnlocks(null, r.required_tier), owned: false }))
    return { deities, seatedDeityId: null }
  }

  const shrineQuery = supabase.from('shrines').select('main_deity_id').eq('user_id', user.id)
  const [{ data: owned }, { data: shrine }, membership] = await Promise.all([
    supabase.from('user_shrine_deities').select('deity_id, source').eq('user_id', user.id),
    (familyMemberId
      ? shrineQuery.eq('family_member_id', familyMemberId)
      : shrineQuery.is('family_member_id', null)
    ).maybeSingle(),
    getActiveMembership(user.id),
  ])

  const sourceById = new Map((owned ?? []).map((o) => [o.deity_id as string, o.source as string | null]))
  const holds = (r: DeityRow) => deityOwnershipHolds(sourceById.get(r.id), r.required_tier, membership?.tier)
  const deities = deityRows.map((r) =>
    toDeity(r, {
      unlocked: tierUnlocks(membership?.tier, r.required_tier),
      owned: sourceById.has(r.id) && holds(r),
    })
  )

  // 등급으로 모신 主神은 등급이 닿지 않으면 좌정도 풀린 것으로 본다(씬 loadMainDeity 와 같은 판정).
  const seatedRow = deityRows.find((r) => r.id === shrine?.main_deity_id)
  const seatedDeityId = seatedRow && !holds(seatedRow) ? null : (shrine?.main_deity_id ?? null)

  return { deities, seatedDeityId }
}

/**
 * service_role 로 신위 지급 + 인연 1단계 초기화 (멱등). 실패 시 error 반환.
 * 신위 보유는 계정 단위(모든 신당 공유), 인연(緣)은 familyMemberId 스코프(신당별).
 */
async function grantDeity(
  userId: string,
  deityId: string,
  source: string,
  familyMemberId: string | null = null
): Promise<{ error: string | null }> {
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
      { user_id: userId, deity_id: deityId, family_member_id: familyMemberId, bond_level: 1, bond_points: 0 },
      { onConflict: 'user_id,deity_id,family_member_id', ignoreDuplicates: true }
    )
  if (bondError) {
    // 인연 행은 부가 데이터 — 지급 자체는 성공으로 취급(적립 시 upsert로 재생성됨)
    logger.warn('[grantDeity] bond init failed (non-fatal):', bondError)
  }
  return { error: null }
}

/**
 * 무료 수호신 자동 좌정 (결정론, AI 0).
 * 본인: user_energy_profile.yongsin_element + profiles.focus_areas → assignGuardian.
 * 가족(familyMemberId): 가족 사주로 용신 계산 → assignGuardian → 그 가족 신당에 좌정(없으면 비공개 생성).
 * 이미 主神이 있으면 그대로 반환(멱등). deity 는 강신 연출용 전체 정보.
 */
export async function autoSeatGuardian(
  familyMemberId?: string | null
): Promise<{ success: boolean; deityCode?: string; deity?: Deity; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const fmId = familyMemberId ?? null

  // 가족 대상이면 소유 검증 + 사주 입력 로드
  let family: {
    name: string
    birth_date: string | null
    birth_time: string | null
    calendar_type: string | null
  } | null = null
  if (fmId) {
    const { data } = await supabase
      .from('family_members')
      .select('name, birth_date, birth_time, calendar_type')
      .eq('id', fmId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!data) return { success: false, error: 'FAMILY_NOT_FOUND' }
    family = data
  }

  // 이미 좌정된 主神이 있으면 멱등 반환 — 단 등급이 끊겨 좌정이 풀린 主神이면 수호신을 새로 모신다
  const shrineQuery = supabase.from('shrines').select('id, main_deity_id').eq('user_id', user.id)
  const { data: shrine } = await (
    fmId ? shrineQuery.eq('family_member_id', fmId) : shrineQuery.is('family_member_id', null)
  ).maybeSingle()
  if (shrine?.main_deity_id) {
    const { data: cur } = await supabase
      .from('shrine_deities')
      .select(DEITY_ROW_COLUMNS)
      .eq('id', shrine.main_deity_id)
      .maybeSingle()
    const holds = await seatedDeityHolds(
      { client: supabase, tier: async () => (await getActiveMembership(user.id))?.tier },
      user.id,
      shrine.main_deity_id,
      cur?.required_tier
    )
    if (holds) {
      return {
        success: true,
        deityCode: cur?.code,
        deity: cur ? toDeity(cur as DeityRow, { unlocked: true, owned: true }) : undefined,
      }
    }
  }

  // 배정 입력 수집 — 본인은 저장된 프로필, 가족은 사주에서 즉시 유도
  let yongsin: Element | null = null
  let focusAreas: string | null = null
  if (fmId && family) {
    if (family.birth_date) {
      try {
        const saju = getSajuData(family.birth_date, family.birth_time || '12:00', family.calendar_type !== 'lunar')
        yongsin = baseFromSajuData(saju).yongsin
      } catch (e) {
        logger.warn('[autoSeatGuardian] family yongsin derive failed:', e)
      }
    }
  } else {
    const [{ data: energy }, { data: profile }] = await Promise.all([
      supabase.from('user_energy_profile').select('yongsin_element').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('focus_areas').eq('id', user.id).maybeSingle(),
    ])
    yongsin = isElement(energy?.yongsin_element) ? energy.yongsin_element : null
    focusAreas = profile?.focus_areas ?? null
  }

  const assignment = assignGuardian({ yongsin, focusAreas })

  const { data: deity } = await supabase
    .from('shrine_deities')
    .select(DEITY_ROW_COLUMNS)
    .eq('code', assignment.code)
    .maybeSingle()
  if (!deity) {
    logger.error('[autoSeatGuardian] guardian not found in catalog:', assignment.code)
    return { success: false, error: 'DEITY_NOT_FOUND' }
  }

  const { error: grantError } = await grantDeity(user.id, deity.id, 'free_guardian', fmId)
  if (grantError) return { success: false, error: 'GRANT_FAILED' }

  // 主神 좌정 (shrine 없으면 생성 — 가족 신당은 비공개로, 가족 이름 노출 방지)
  const admin = createAdminClient()
  if (shrine?.id) {
    await admin.from('shrines').update({ main_deity_id: deity.id }).eq('id', shrine.id)
  } else if (fmId && family) {
    await admin.from('shrines').insert({
      user_id: user.id,
      family_member_id: fmId,
      name: `${family.name}의 신당`.slice(0, 20),
      visibility: 'private',
      main_deity_id: deity.id,
    })
  } else {
    await admin.from('shrines').insert({ user_id: user.id, name: '나의 신당', main_deity_id: deity.id })
  }

  trackEvent({ action: 'deity_auto_seat', category: 'shrine', label: assignment.code, value: 0 })
  revalidatePath('/protected/shrine')
  return {
    success: true,
    deityCode: assignment.code,
    deity: toDeity(deity as DeityRow, { unlocked: true, owned: true }),
  }
}

/**
 * 보유한 신위를 主神으로 좌정 (소유 검증 후 admin 으로 반영). familyMemberId 지정 시 그 가족 신당에 좌정.
 * 등급으로 모신 신위는 지금 등급이 닿을 때만 좌정한다(구독 중 이용).
 */
export async function seatDeity(
  deityId: string,
  familyMemberId?: string | null
): Promise<{ success: boolean; error?: string; errorType?: 'TIER_REQUIRED' }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const fmId = familyMemberId ?? null

  const { data: owned } = await supabase
    .from('user_shrine_deities')
    .select('deity_id, source')
    .eq('user_id', user.id)
    .eq('deity_id', deityId)
    .maybeSingle()
  if (!owned) return { success: false, error: 'NOT_OWNED' }

  if (owned.source === TIER_OPEN_DEITY_SOURCE) {
    const [{ data: deity }, membership] = await Promise.all([
      supabase.from('shrine_deities').select('required_tier').eq('id', deityId).maybeSingle(),
      getActiveMembership(user.id),
    ])
    const requiredTier = parseRequiredTier(deity?.required_tier)
    if (requiredTier && !tierUnlocks(membership?.tier, requiredTier)) {
      return { success: false, error: tierRequiredMessage(requiredTier), errorType: 'TIER_REQUIRED' }
    }
  }

  let familyName: string | null = null
  if (fmId) {
    const { data: family } = await supabase
      .from('family_members')
      .select('name')
      .eq('id', fmId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!family) return { success: false, error: 'FAMILY_NOT_FOUND' }
    familyName = family.name
  }

  const admin = createAdminClient()
  const shrineQuery = supabase.from('shrines').select('id').eq('user_id', user.id)
  const { data: shrine } = await (
    fmId ? shrineQuery.eq('family_member_id', fmId) : shrineQuery.is('family_member_id', null)
  ).maybeSingle()
  if (shrine?.id) {
    await admin.from('shrines').update({ main_deity_id: deityId }).eq('id', shrine.id)
  } else if (fmId && familyName) {
    await admin.from('shrines').insert({
      user_id: user.id,
      family_member_id: fmId,
      name: `${familyName}의 신당`.slice(0, 20),
      visibility: 'private',
      main_deity_id: deityId,
    })
  } else {
    await admin.from('shrines').insert({ user_id: user.id, name: '나의 신당', main_deity_id: deityId })
  }

  revalidatePath('/protected/shrine')
  return { success: true }
}

interface EnshrineDeityResult {
  success: boolean
  error?: string
  errorType?: 'TIER_REQUIRED'
}

/**
 * 신위 모시기 — 멤버십 등급이 닿으면 무료로 봉안한다(2026-09-18 구매 폐지).
 * 등급은 서버가 DB(required_tier)와 활성 멤버십으로만 판정한다(클라 값 미신뢰).
 * tier1(수호신)은 자동 좌정 경로(autoSeatGuardian)라 여기 대상이 아니다.
 */
export async function enshrineDeity(deityCode: string): Promise<EnshrineDeityResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { data: deity } = await supabase
    .from('shrine_deities')
    .select('id, tier, required_tier, is_active')
    .eq('code', deityCode)
    .maybeSingle()
  if (!deity || !deity.is_active) return { success: false, error: 'DEITY_NOT_FOUND' }
  if (deity.tier <= 1) return { success: false, error: 'FREE_GUARDIAN' }

  const requiredTier = parseRequiredTier(deity.required_tier)
  if (requiredTier) {
    const membership = await getActiveMembership(user.id)
    if (!tierUnlocks(membership?.tier, requiredTier)) {
      return { success: false, error: tierRequiredMessage(requiredTier), errorType: 'TIER_REQUIRED' }
    }
  }

  const { data: existing } = await supabase
    .from('user_shrine_deities')
    .select('deity_id')
    .eq('user_id', user.id)
    .eq('deity_id', deity.id)
    .maybeSingle()
  if (existing) return { success: false, error: 'ALREADY_OWNED' }

  const { error: grantError } = await grantDeity(user.id, deity.id, TIER_OPEN_DEITY_SOURCE)
  if (grantError) return { success: false, error: 'GRANT_FAILED' }

  trackEvent({ action: 'deity_enshrine', category: 'shrine', label: deityCode })
  revalidatePath('/protected/shrine')
  return { success: true }
}

/**
 * 테마팩 카탈로그 + 보유·등급 개방 — 상점(신당 테마 탭)용.
 * 등급으로 여는 테마는 소유 행을 만들지 않는다 — 등급이 닿는 동안 입힐 수 있고(activateThemePack),
 * 소유 행은 기원·여정 보상과 예전 봉헌만 남긴다(구독이 끝나도 남는 몫).
 */
export async function listThemePacks(): Promise<ThemePack[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: packs }, ownedRes, membership] = await Promise.all([
    supabase.from('shrine_theme_packs').select('*').eq('is_active', true).order('sort_order'),
    user
      ? supabase.from('user_theme_packs').select('pack_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] as Array<{ pack_id: string }> }),
    user ? getActiveMembership(user.id) : Promise.resolve(null),
  ])
  const ownedSet = new Set((ownedRes.data ?? []).map((o) => o.pack_id))

  return (packs ?? []).map((p) => {
    const requiredTier = parseRequiredTier(p.required_tier)
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      requiredTier,
      elementAffinity: isElement(p.element_affinity) ? p.element_affinity : null,
      assets: (typeof p.assets === 'object' && p.assets !== null ? p.assets : {}) as ThemeAssets,
      owned: requiredTier === null || ownedSet.has(p.id),
      unlocked: tierUnlocks(membership?.tier, requiredTier),
      story: typeof p.story === 'string' && p.story ? p.story : null,
      sajuNote: typeof p.saju_note === 'string' && p.saju_note ? p.saju_note : null,
      deityCodes: Array.isArray(p.deity_codes)
        ? p.deity_codes.filter((c: unknown): c is string => typeof c === 'string')
        : [],
      matters: parseMatters(p.matters),
    }
  })
}

// 인연(緣) 적립은 lib/services/deity-bond.ts(서버 내부 전용)로 이동 —
// 공개 서버액션이면 클라이언트가 임의 포인트로 호출 가능해 조작 벡터가 된다.

/** 보유 신위별 인연 진행도(단계·다음목표·해금) — UI용. familyMemberId 스코프(신당별 인연). */
export async function getDeityBonds(
  familyMemberId?: string | null
): Promise<Array<{ deityId: string; progress: BondProgress }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const bondQuery = supabase.from('user_deity_bonds').select('deity_id, bond_points').eq('user_id', user.id)
  const { data } = await (familyMemberId
    ? bondQuery.eq('family_member_id', familyMemberId)
    : bondQuery.is('family_member_id', null))

  return (data ?? []).map((r) => ({ deityId: r.deity_id, progress: bondProgress(r.bond_points) }))
}
