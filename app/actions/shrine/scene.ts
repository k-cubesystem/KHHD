'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { getSajuData } from '@/lib/domain/saju/saju'
import {
  parseBehavior,
  parsePlacementState,
  parseUnlockEffect,
  isLayer,
  isElement,
  type Element,
  type InventoryEntry,
  type Layer,
  type SizeGrade,
  type ThemeAssets,
} from '@/lib/domain/shrine/types'
import {
  isCatalogKind,
  parseAnchorId,
  parseAnchorSpec,
  parseAssetUrl,
  parseStageSpec,
  type StageCatalogItem,
  type ShelfFamilyTag,
  type StagePlacement,
  type StageSceneData,
  type StageThemePack,
} from '@/lib/domain/shrine/stage'
import { ZONES, clampPct } from '@/lib/domain/shrine/zones'
import { SEAT_ANCHOR_PREFIX } from '@/lib/domain/shrine/shelf'
import { parseMatters } from '@/lib/domain/shrine/item-matters'
import { isGuardianType, parseGuardianSlugs } from '@/lib/domain/shrine/guardians'
import { DEFAULT_BASE, deriveBaseFromDistribution, applyModifiers, ELEMENTS } from '@/lib/domain/shrine/energy'
import { getShrineEffects } from '@/lib/services/shrine-effects'

/**
 * ⚠️ v2 무대 컬럼(kind·asset_url·anchor_spec / anchor_id / stage)은 마이그레이션
 *    `20260729_shrine_stage_v2.sql` 로 추가된다. 카탈로그·배치·소유자 테마 조회는 전부
 *    `select('*')` 라 컬럼이 없어도 값이 undefined 로 들어올 뿐 터지지 않지만,
 *    방문자 뷰의 테마 조회는 컬럼을 명시하므로 **마이그레이션 미적용 DB에서는 실패한다.**
 *    배포 순서는 반드시 「마이그레이션 적용 → 코드 배포」 (오케스트레이터가 보장).
 */
interface CatalogRow {
  id: string
  name: string
  description: string | null
  type: string
  rarity: string
  emoji: string
  sprite_url: string | null
  element: string | null
  energy_power: number
  placement_layer: string
  size_grade: string
  behavior: unknown
  price_bok_points: number
  price_krw: number
  price_bokchae: number
  unlock_effect: unknown
  matters: unknown
  origin_note: string | null
  /** v2 — 마이그레이션 이전 DB에서는 undefined 로 들어온다 (전부 방어 파싱) */
  kind?: unknown
  asset_url?: unknown
  anchor_spec?: unknown
}

function toCatalogItem(r: CatalogRow): StageCatalogItem {
  const anchors = parseAnchorSpec(r.anchor_spec)
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type,
    rarity: r.rarity,
    emoji: r.emoji,
    spriteUrl: r.sprite_url,
    element: isElement(r.element) ? r.element : null,
    energyPower: r.energy_power,
    layer: isLayer(r.placement_layer) ? r.placement_layer : 'floor',
    size: (['sm', 'md', 'lg'].includes(r.size_grade) ? r.size_grade : 'md') as SizeGrade,
    behavior: parseBehavior(r.behavior),
    priceBok: r.price_bok_points,
    priceKrw: r.price_krw,
    priceBokchae: r.price_bokchae,
    unlockEffect: parseUnlockEffect(r.unlock_effect),
    matters: parseMatters(r.matters),
    originNote: r.origin_note,
    kind: isCatalogKind(r.kind) ? r.kind : 'prop',
    // v2 스프라이트가 아직 없는 품목은 기존 sprite_url 로 폴백 → 신규 렌더도 첫날부터 그림이 나온다
    assetUrl: parseAssetUrl(r.asset_url) ?? parseAssetUrl(r.sprite_url),
    anchorSpec: anchors.length > 0 ? anchors : null,
  }
}

interface PlacementRow {
  id: string
  catalog_item_id: string
  layer: string
  x: number | string
  y: number | string
  flip: boolean
  state: unknown
  /** v2 — 마이그레이션 이전 DB에서는 undefined 로 들어온다 */
  anchor_id?: unknown
  /** 시렁 가족 지정 — 마이그레이션 이전 DB에서는 undefined */
  family_member_id?: unknown
}

function toPlacement(p: PlacementRow): StagePlacement {
  return {
    id: p.id,
    catalogItemId: p.catalog_item_id,
    layer: isLayer(p.layer) ? p.layer : 'floor',
    x: Number(p.x),
    y: Number(p.y),
    flip: p.flip,
    state: parsePlacementState(p.state),
    anchorId: parseAnchorId(p.anchor_id),
    familyMemberId: typeof p.family_member_id === 'string' && p.family_member_id ? p.family_member_id : null,
  }
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

interface FamilyTarget {
  id: string
  name: string
  birthDate: string | null
  birthTime: string | null
  isSolar: boolean
}

/** 점사 대상 가족 로드 — 본인 소유 가족만 (아니면 null). */
async function loadFamilyTarget(
  supabase: SupabaseServer,
  userId: string,
  familyMemberId: string
): Promise<FamilyTarget | null> {
  const { data } = await supabase
    .from('family_members')
    .select('id, name, birth_date, birth_time, calendar_type')
    .eq('id', familyMemberId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    birthDate: data.birth_date,
    birthTime: data.birth_time,
    isSolar: data.calendar_type !== 'lunar',
  }
}

/**
 * 가족 사주 기반 기운 프로필 + 저장된 관상·손금 보정 합산.
 * user_energy_profile 이 가족 스코프를 지원하므로(20260719 마이그레이션) 보정도 대상별로 적용된다.
 */
async function familyProfile(
  supabase: SupabaseServer,
  userId: string,
  family: FamilyTarget
): Promise<{ base: Record<Element, number>; yongsin: Element | null }> {
  let base = { ...DEFAULT_BASE }
  let yongsin: Element | null = null

  if (family.birthDate) {
    try {
      const saju = getSajuData(family.birthDate, family.birthTime || '12:00', family.isSolar)
      const derived = deriveBaseFromDistribution(saju.elementsDistribution)
      base = derived.base
      yongsin = derived.yongsin
    } catch (e) {
      logger.warn('[shrine/scene] family profile derive failed:', e)
    }
  }

  // 관상·손금 보정 (있으면 반영 — 없으면 사주만)
  const { data: stored } = await supabase
    .from('user_energy_profile')
    .select('face_modifier, palm_modifier')
    .eq('user_id', userId)
    .eq('family_member_id', family.id)
    .maybeSingle()
  if (stored) {
    base = applyModifiers(
      base,
      stored.face_modifier as Record<string, unknown>,
      stored.palm_modifier as Record<string, unknown>
    )
    // 보정 후 가장 낮은 기운으로 용신 재판정
    let lowest: Element = 'wood'
    for (const el of ELEMENTS) if (base[el] < base[lowest]) lowest = el
    yongsin = lowest
  }

  return { base, yongsin }
}

/** 사주 기반 기운 프로필을 계산·저장하거나 기존 것을 반환 */
async function loadOrComputeProfile(
  supabase: SupabaseServer,
  userId: string
): Promise<{ base: Record<Element, number>; yongsin: Element | null }> {
  const { data: existing } = await supabase
    .from('user_energy_profile')
    .select('base_wood, base_fire, base_earth, base_metal, base_water, yongsin_element, face_modifier, palm_modifier')
    .eq('user_id', userId)
    .is('family_member_id', null)
    .maybeSingle()

  if (existing) {
    // 관상·손금 보정 반영 (설계돼 있었으나 여태 적용되지 않던 컬럼)
    const base = applyModifiers(
      {
        wood: existing.base_wood,
        fire: existing.base_fire,
        earth: existing.base_earth,
        metal: existing.base_metal,
        water: existing.base_water,
      },
      existing.face_modifier as Record<string, unknown>,
      existing.palm_modifier as Record<string, unknown>
    )
    let yongsin = isElement(existing.yongsin_element) ? existing.yongsin_element : null
    const hasModifier =
      Object.keys((existing.face_modifier as object) ?? {}).length > 0 ||
      Object.keys((existing.palm_modifier as object) ?? {}).length > 0
    if (hasModifier) {
      let lowest: Element = 'wood'
      for (const el of ELEMENTS) if (base[el] < base[lowest]) lowest = el
      yongsin = lowest
    }
    return { base, yongsin }
  }

  // 사주에서 유도 (생년월일 있을 때). 실패 시 기본값.
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('birth_date, birth_time, calendar_type')
      .eq('id', userId)
      .maybeSingle()

    if (profile?.birth_date) {
      const saju = getSajuData(profile.birth_date, profile.birth_time || '12:00', profile.calendar_type !== 'lunar')
      const { base, yongsin } = deriveBaseFromDistribution(saju.elementsDistribution)
      await supabase.from('user_energy_profile').insert({
        user_id: userId,
        base_wood: base.wood,
        base_fire: base.fire,
        base_earth: base.earth,
        base_metal: base.metal,
        base_water: base.water,
        yongsin_element: yongsin,
      })
      return { base, yongsin }
    }
  } catch (e) {
    logger.warn('[shrine/scene] profile derive failed:', e)
  }
  return { base: { ...DEFAULT_BASE }, yongsin: null }
}

/** 최초 방문자에게 스타터 인벤토리 + 기본 배치 지급 (인벤토리가 완전히 비었을 때 1회) */
async function ensureStarterKit(supabase: SupabaseServer, userId: string, shrineId: string): Promise<void> {
  const { count } = await supabase
    .from('user_shrine_inventory')
    .select('catalog_item_id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if ((count ?? 0) > 0) return

  const { count: placedCount } = await supabase
    .from('shrine_placements')
    .select('id', { count: 'exact', head: true })
    .eq('shrine_id', shrineId)
  if ((placedCount ?? 0) > 0) return

  // 이름 → 카탈로그 id 맵
  const { data: cat } = await supabase.from('shrine_item_catalog').select('id, name, placement_layer')
  if (!cat) return
  const byName = new Map(cat.map((c) => [c.name, { id: c.id, layer: c.placement_layer as Layer }]))

  const owned: Array<[string, number]> = [
    ['기본 촛불', 2],
    ['초롱', 1],
    ['공물 꽃', 1],
    ['청죽', 1],
    ['은풍경', 1],
    ['놋방울', 1],
    ['물항아리', 1],
  ]
  const invRows = owned
    .map(([name, qty]) => {
      const c = byName.get(name)
      return c ? { user_id: userId, catalog_item_id: c.id, qty } : null
    })
    .filter((r): r is { user_id: string; catalog_item_id: string; qty: number } => r !== null)
  // 인벤토리 지급은 service_role 전용(무료 아이템 자가발행 차단). 배치(placements)는 본인 소유라 유저 클라이언트 유지.
  if (invRows.length) await createAdminClient().from('user_shrine_inventory').insert(invRows)

  // 기본 배치 (방을 살아있게)
  const defaults: Array<[string, number, number]> = [
    ['기본 촛불', 38, 48],
    ['공물 꽃', 63, 48],
    ['초롱', 26, 14],
    ['청죽', 64, 85],
  ]
  const placeRows = defaults
    .map(([name, x, y]) => {
      const c = byName.get(name)
      if (!c) return null
      return { shrine_id: shrineId, catalog_item_id: c.id, layer: c.layer, x, y, flip: false, state: {} }
    })
    .filter((r) => r !== null)
  if (placeRows.length) await supabase.from('shrine_placements').insert(placeRows)
}

async function loadThemes(supabase: SupabaseServer, userId: string): Promise<StageThemePack[]> {
  const [{ data: packs }, { data: owned }] = await Promise.all([
    supabase.from('shrine_theme_packs').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('user_theme_packs').select('pack_id').eq('user_id', userId),
  ])
  const ownedSet = new Set((owned ?? []).map((o) => o.pack_id))
  return (packs ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    priceBok: p.price_bok,
    priceKrw: p.price_krw,
    priceBokchae: p.price_bokchae ?? 0,
    elementAffinity: isElement(p.element_affinity) ? p.element_affinity : null,
    assets: (typeof p.assets === 'object' && p.assets !== null ? p.assets : {}) as ThemeAssets,
    owned: (p.price_bokchae ?? 0) === 0 ? true : ownedSet.has(p.id),
    story: typeof p.story === 'string' && p.story ? p.story : null,
    sajuNote: typeof p.saju_note === 'string' && p.saju_note ? p.saju_note : null,
    deityCodes: Array.isArray(p.deity_codes)
      ? p.deity_codes.filter((c: unknown): c is string => typeof c === 'string')
      : [],
    matters: parseMatters(p.matters),
    stage: parseStageSpec(p.stage),
    // 두루마리 구역(zones)은 StageSpec 밖이라 원본을 함께 내려보낸다 (클라에서 parseWorld 가 파싱)
    stageRaw: p.stage ?? null,
  }))
}

const SHRINE_COLUMNS = 'id, name, visitor_count, wish_count, active_pack_id, main_deity_id, visibility, guardians'

/**
 * 소유자용 씬 데이터 로드.
 * familyMemberId 지정 시 그 가족의 신당(없으면 자동 생성 — 비공개, 가족 이름 노출 방지).
 * 본인 신당(생략/null)은 기존과 동일하게 없으면 null(생성 폼 유도).
 */
export async function getSceneData(familyMemberId?: string | null): Promise<StageSceneData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const fmId = familyMemberId ?? null
  let family: FamilyTarget | null = null
  if (fmId) {
    family = await loadFamilyTarget(supabase, user.id, fmId)
    if (!family) return null
  }

  const shrineQuery = supabase.from('shrines').select(SHRINE_COLUMNS).eq('user_id', user.id)
  let { data: shrine } = await (
    fmId ? shrineQuery.eq('family_member_id', fmId) : shrineQuery.is('family_member_id', null)
  ).maybeSingle()

  if (!shrine && fmId && family) {
    const { data: created } = await supabase
      .from('shrines')
      .insert({
        user_id: user.id,
        family_member_id: fmId,
        name: `${family.name}의 신당`.slice(0, 20),
        visibility: 'private',
      })
      .select(SHRINE_COLUMNS)
      .maybeSingle()
    shrine = created
    if (!shrine) {
      // 동시 첫 진입 레이스(UNIQUE 충돌) — 이미 생성된 행을 재조회
      const { data: existing } = await supabase
        .from('shrines')
        .select(SHRINE_COLUMNS)
        .eq('user_id', user.id)
        .eq('family_member_id', fmId)
        .maybeSingle()
      shrine = existing
    }
  }
  if (!shrine) return null

  if (!fmId) await ensureStarterKit(supabase, user.id, shrine.id)

  const [{ data: catRows }, { data: placeRows }, { data: invRows }, profile, themes] = await Promise.all([
    supabase.from('shrine_item_catalog').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('shrine_placements').select('*').eq('shrine_id', shrine.id),
    supabase.from('user_shrine_inventory').select('catalog_item_id, qty').eq('user_id', user.id),
    family ? familyProfile(supabase, user.id, family) : loadOrComputeProfile(supabase, user.id),
    loadThemes(supabase, user.id),
  ])

  const catalog: StageCatalogItem[] = (catRows ?? []).map((r) => toCatalogItem(r as CatalogRow))
  const placements: StagePlacement[] = (placeRows ?? []).map(toPlacement)
  const inventory: InventoryEntry[] = (invRows ?? []).map((i) => ({ catalogItemId: i.catalog_item_id, qty: i.qty }))

  const activePack = themes.find((t) => t.id === shrine.active_pack_id)
  const [mainDeity, effects] = await Promise.all([
    loadMainDeity(supabase, user.id, shrine.main_deity_id, true, fmId),
    getShrineEffects(user.id),
  ])

  // ⚡ 배치 효험: 놋방울(deity_greeting) — 입장 시 이름을 불러 맞이한다.
  let greetingName: string | null = null
  if (effects.deityGreeting) {
    if (family) {
      greetingName = family.name
    } else {
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      greetingName = prof?.full_name ?? null
    }
  }

  // 시렁 이름표 — 지정된 가족만 골라 이름·정령을 붙인다(소유자 화면 전용, RLS select-own)
  const assignedIds = [...new Set(placements.map((p) => p.familyMemberId).filter((v): v is string => v !== null))]
  const familyTags: Record<string, ShelfFamilyTag> = {}
  if (assignedIds.length > 0) {
    const { data: fams } = await supabase.from('family_members').select('id, name, avatar_id').in('id', assignedIds)
    for (const f of fams ?? []) {
      familyTags[String(f.id)] = {
        name: String(f.name ?? ''),
        avatarId: typeof f.avatar_id === 'string' && f.avatar_id ? f.avatar_id : null,
      }
    }
  }

  return {
    shrineId: shrine.id,
    shrineName: shrine.name,
    familyMemberId: fmId,
    greetingName,
    visibility: shrine.visibility === 'public' ? 'public' : 'private',
    isOwner: true,
    catalog,
    placements,
    inventory,
    profile: { base: profile.base, yongsin: profile.yongsin },
    themes,
    activePackCode: activePack?.code ?? 'banga',
    visitorCount: shrine.visitor_count,
    wishCount: shrine.wish_count,
    mainDeity,
    familyTags,
    guardians: parseGuardianSlugs(shrine.guardians),
  }
}

/**
 * 좌정한 主神(신위) 로드 — 없으면 null.
 * includeBond=false(방문자 뷰): user_deity_bonds는 RLS select-own이라 방문자 조회가 항상 빈 값 →
 * "0점" 오표시 대신 bondPoints=null로 비공개 처리.
 */
async function loadMainDeity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  mainDeityId: string | null,
  includeBond: boolean,
  familyMemberId: string | null = null
): Promise<import('@/lib/domain/shrine/types').MainDeity | null> {
  if (!mainDeityId) return null
  const { data } = await supabase
    .from('shrine_deities')
    .select('code, name, sprite_url, portrait_url, aura')
    .eq('id', mainDeityId)
    .maybeSingle()
  if (!data) return null

  const aura = typeof data.aura === 'object' && data.aura !== null ? (data.aura as Record<string, unknown>) : {}
  const particle = typeof aura.particle === 'string' ? aura.particle : null
  const accent = typeof aura.accent === 'string' ? aura.accent : null
  const SOUND_KEYS = ['moktak', 'chime', 'bell', 'water', 'crackle', 'bara'] as const
  const sound = SOUND_KEYS.includes(aura.sound as (typeof SOUND_KEYS)[number])
    ? (aura.sound as import('@/lib/domain/shrine/types').SoundKey)
    : null

  let bondPoints: number | null = null
  if (includeBond) {
    const bondQuery = supabase
      .from('user_deity_bonds')
      .select('bond_points')
      .eq('user_id', ownerId)
      .eq('deity_id', mainDeityId)
    const { data: bond } = await (
      familyMemberId ? bondQuery.eq('family_member_id', familyMemberId) : bondQuery.is('family_member_id', null)
    ).maybeSingle()
    bondPoints = typeof bond?.bond_points === 'number' ? bond.bond_points : 0
  }

  return {
    code: data.code,
    name: data.name,
    spriteUrl: data.sprite_url,
    portraitUrl: data.portrait_url,
    particle,
    accent,
    sound,
    bondPoints,
  }
}

/** 방문자용 공개 씬 데이터 (읽기 전용). 소유자의 방·테마만 노출, 인벤토리/프로필 비공개. */
export async function getPublicSceneData(userId: string): Promise<StageSceneData | null> {
  const supabase = await createClient()

  const { data: shrine } = await supabase
    .from('shrines')
    .select('id, name, visibility, visitor_count, wish_count, active_pack_id, main_deity_id, guardians')
    .eq('user_id', userId)
    .is('family_member_id', null)
    .maybeSingle()
  if (!shrine || shrine.visibility !== 'public') return null

  const [{ data: catRows }, { data: placeRows }, { data: packs }] = await Promise.all([
    supabase.from('shrine_item_catalog').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('shrine_placements').select('*').eq('shrine_id', shrine.id),
    supabase
      // ⚠️ 유일하게 컬럼을 명시하는 조회 — `stage` 는 20260729 마이그레이션 적용 후에만 존재한다
      .from('shrine_theme_packs')
      .select('id, code, name, price_bok, price_krw, price_bokchae, element_affinity, assets, stage')
      .eq('is_active', true),
  ])

  const catalog: StageCatalogItem[] = (catRows ?? []).map((r) => toCatalogItem(r as CatalogRow))
  const placements: StagePlacement[] = (placeRows ?? []).map(toPlacement)
  // active_pack_id 미지정(테마를 한 번도 고르지 않은 신당 — 대다수)은 기본 테마 banga 로 해석한다.
  // 이 폴백이 없으면 activePackCode 는 'banga' 문자열로 폴백되는데 테마 '객체'는 빠져서
  // 클라이언트가 stage(조립식 무대)·assets 를 찾지 못해 레거시 렌더로 떨어진다.
  const activePack =
    (packs ?? []).find((p) => p.id === shrine.active_pack_id) ?? (packs ?? []).find((p) => p.code === 'banga')
  const themes: StageThemePack[] = activePack
    ? [
        {
          id: activePack.id,
          code: activePack.code,
          name: activePack.name,
          priceBok: activePack.price_bok,
          priceKrw: activePack.price_krw,
          priceBokchae: activePack.price_bokchae ?? 0,
          elementAffinity: isElement(activePack.element_affinity) ? activePack.element_affinity : null,
          assets: (typeof activePack.assets === 'object' && activePack.assets !== null
            ? activePack.assets
            : {}) as ThemeAssets,
          owned: true,
          // 방문자 뷰는 상점을 그리지 않는다 — 로어는 빈 값으로 두되 조회 컬럼도 늘리지 않는다
          story: null,
          sajuNote: null,
          deityCodes: [],
          matters: [],
          stage: parseStageSpec(activePack.stage),
          stageRaw: activePack.stage ?? null,
        },
      ]
    : []

  const mainDeity = await loadMainDeity(supabase, userId, shrine.main_deity_id, false)

  return {
    shrineId: shrine.id,
    shrineName: shrine.name,
    familyMemberId: null,
    greetingName: null, // 방문자 뷰는 효험 미적용
    visibility: 'public', // 방문자에게 보이는 시점에서 이미 공개 신당
    isOwner: false,
    catalog,
    placements,
    inventory: [],
    profile: { base: { ...DEFAULT_BASE }, yongsin: null },
    themes,
    activePackCode: activePack?.code ?? 'banga',
    visitorCount: shrine.visitor_count,
    wishCount: shrine.wish_count,
    mainDeity,
    // 방문자에게 남의 가족 이름을 보이지 않는다 — 조회 자체를 하지 않는다
    familyTags: {},
    guardians: parseGuardianSlugs(shrine.guardians),
  }
}

interface PlacementInput {
  catalogItemId: string
  layer: Layer
  x: number
  y: number
  flip?: boolean
  state?: { lit?: boolean }
  /** 스냅된 앵커 id (자유 배치면 생략/null). 62자 초과·비문자열은 서버에서 null 처리. */
  anchorId?: string | null
  /**
   * 시렁 가족 지정. 저장이 delete+insert 전체 교체라 **여기 실리지 않으면 저장마다 지정이
   * 통째로 날아간다** — 클라이언트는 반드시 현재 지정값을 그대로 실어 보낸다.
   */
  familyMemberId?: string | null
}

/** 방 레이아웃 일괄 저장 (인벤토리 보유량 초과 배치 방지). 성공 시 재발급된 placements 반환. */
/** 진열대 스냅 배치의 절대 클램프 범위 — 존 우회 시에도 좌표는 방 밖으로 못 나간다 */
const FULL_RANGE: [number, number] = [0, 100]

export async function saveShrineLayout(
  placements: PlacementInput[],
  familyMemberId?: string | null
): Promise<{ success: boolean; error?: string; placements?: StagePlacement[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const shrineQuery = supabase.from('shrines').select('id').eq('user_id', user.id)
  const { data: shrine } = await (
    familyMemberId ? shrineQuery.eq('family_member_id', familyMemberId) : shrineQuery.is('family_member_id', null)
  ).maybeSingle()
  if (!shrine) return { success: false, error: 'SHRINE_NOT_FOUND' }

  if (placements.length > 40) return { success: false, error: 'TOO_MANY_ITEMS' }

  // 신수는 배치 아이템이 아니다 — 스스로 거니는 존재를 바닥에 못 박으면 세계가 어긋난다.
  // (트레이가 이미 거르지만, 서버가 최종 관문이다)
  if (placements.length > 0) {
    const usedIds = [...new Set(placements.map((p) => p.catalogItemId))]
    const { data: cats } = await supabase.from('shrine_item_catalog').select('id, type').in('id', usedIds)
    if ((cats ?? []).some((c) => isGuardianType(typeof c.type === 'string' ? c.type : null))) {
      return { success: false, error: 'GUARDIAN_NOT_PLACEABLE' }
    }
  }

  // 보유량 검증
  const { data: invRows } = await supabase
    .from('user_shrine_inventory')
    .select('catalog_item_id, qty')
    .eq('user_id', user.id)
  const owned = new Map((invRows ?? []).map((i) => [i.catalog_item_id, i.qty]))
  const placedCount = new Map<string, number>()
  for (const p of placements) {
    placedCount.set(p.catalogItemId, (placedCount.get(p.catalogItemId) ?? 0) + 1)
  }
  for (const [itemId, cnt] of placedCount) {
    if (cnt > (owned.get(itemId) ?? 0)) return { success: false, error: 'NOT_ENOUGH_OWNED' }
  }

  // 앵커 id 검증(62자 이하 문자열만 통과, 그 외 null).
  // 앵커가 하나도 없으면 anchor_id 키 자체를 payload 에서 뺀다 — 마이그레이션 미적용 DB에서
  // "알 수 없는 컬럼"으로 insert 가 실패하면 이미 실행된 delete 때문에 배치가 통째로 유실된다.
  const anchorIds = placements.map((p) => parseAnchorId(p.anchorId))
  const withAnchors = anchorIds.some((a) => a !== null)

  // 시렁 가족 지정 — uuid 모양만 통과(아니면 null). 지정된 것이 있는데 실제 내 가족이 아니면
  // FK 가 막지만, 남의 가족 id 를 넣어 보는 시도는 여기서 먼저 거른다(내 가족 목록 대조).
  const famIds = placements.map((p) =>
    typeof p.familyMemberId === 'string' && /^[0-9a-f-]{36}$/i.test(p.familyMemberId) ? p.familyMemberId : null
  )
  const withFamily = famIds.some((f) => f !== null)
  if (withFamily) {
    const wanted = [...new Set(famIds.filter((f): f is string => f !== null))]
    const { data: mine } = await supabase.from('family_members').select('id').in('id', wanted)
    const mineSet = new Set((mine ?? []).map((m) => String(m.id)))
    for (let i = 0; i < famIds.length; i += 1) {
      if (famIds[i] !== null && !mineSet.has(famIds[i] as string)) famIds[i] = null
    }
  }

  // 좌표 클램프 (서버 방어) — layer도 검증값 사용(원시값이 CHECK 위반으로 delete 후 insert 실패 → 배치 유실 방지)
  const rows = placements.map((p, i) => {
    const layer = isLayer(p.layer) ? p.layer : 'floor'
    const zone = ZONES[layer]
    // 진열대 스냅(seat:) 배치는 층 존 대신 절대 범위만 클램프한다 — 제물(altar 존 y48~58)이
    // 바닥 가구 상판에 얹히는 유일한 경로. 존은 UX 가드이지 보안 경계가 아니고(RLS 가 소유권),
    // 프리픽스는 저장 후 배치 id 재발급으로 dangling 이 돼도 존 우회 표식으로 계속 산다.
    const onSurface = anchorIds[i] !== null && (anchorIds[i] as string).startsWith(SEAT_ANCHOR_PREFIX)
    const row = {
      shrine_id: shrine.id,
      catalog_item_id: p.catalogItemId,
      layer,
      x: clampPct(p.x, onSurface ? FULL_RANGE : zone.x),
      y: clampPct(p.y, onSurface ? FULL_RANGE : zone.y),
      flip: p.flip ?? false,
      state: p.state ?? {},
    }
    const withAnchor = withAnchors ? { ...row, anchor_id: anchorIds[i] } : row
    return withFamily ? { ...withAnchor, family_member_id: famIds[i] } : withAnchor
  })

  // 전체 교체 (delete + insert) — 새 id가 재발급되므로 반드시 반환해 클라 상태를 교체시킨다
  // (클라가 옛 id를 유지하면 이후 점화 저장(setPlacementLit)이 존재하지 않는 row에 무음 no-op)
  const { error: delErr } = await supabase.from('shrine_placements').delete().eq('shrine_id', shrine.id)
  if (delErr) return { success: false, error: delErr.message }

  let saved: StagePlacement[] = []
  if (rows.length) {
    const { data: inserted, error: insErr } = await supabase.from('shrine_placements').insert(rows).select('*')
    if (insErr) return { success: false, error: insErr.message }
    saved = (inserted ?? []).map(toPlacement)
  }

  revalidatePath('/protected/shrine')
  return { success: true, placements: saved }
}

/** 보기 모드에서 촛불 점화 상태를 즉시 저장 (소유자). RLS가 소유권 보장. state는 병합(통째 교체 시 다른 필드 유실). */
export async function setPlacementLit(placementId: string, lit: boolean): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false }
  const { data: row } = await supabase.from('shrine_placements').select('state').eq('id', placementId).maybeSingle()
  if (!row) return { success: false }
  const merged = { ...parsePlacementState(row.state), lit }
  const { error } = await supabase.from('shrine_placements').update({ state: merged }).eq('id', placementId)
  return { success: !error }
}

/**
 * 신당 공개/비공개 전환 (P3-16). 가족 신당은 기본 비공개이며 소유자가 명시적으로 공개할 때만 열린다.
 * ⚠️ 공개 시 신당 이름("○○의 신당")으로 가족 이름이 드러난다 — 호출부에서 반드시 고지할 것.
 */
export async function setShrineVisibility(
  visibility: 'public' | 'private',
  familyMemberId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }
  if (visibility !== 'public' && visibility !== 'private') return { success: false, error: 'INVALID_VISIBILITY' }

  const q = supabase.from('shrines').update({ visibility }).eq('user_id', user.id)
  const { error } = await (familyMemberId ? q.eq('family_member_id', familyMemberId) : q.is('family_member_id', null))
  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/shrine')
  return { success: true }
}

/** 테마 팩 활성화 (무료거나 보유한 팩만). familyMemberId 지정 시 그 가족 신당에 적용. */
export async function activateThemePack(
  packCode: string,
  familyMemberId?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { data: pack } = await supabase
    .from('shrine_theme_packs')
    .select('id, price_bok, price_krw')
    .eq('code', packCode)
    .maybeSingle()
  if (!pack) return { success: false, error: 'PACK_NOT_FOUND' }

  const isFree = pack.price_bok === 0 && pack.price_krw === 0
  if (!isFree) {
    const { data: owned } = await supabase
      .from('user_theme_packs')
      .select('pack_id')
      .eq('user_id', user.id)
      .eq('pack_id', pack.id)
      .maybeSingle()
    if (!owned) return { success: false, error: 'NOT_OWNED' }
  }

  // ⚠️ admin 으로 쓴다(감사 A3 S-P0-1). 소유권 검증(위)은 앱 경로에만 있고, 사용자 클라이언트
  //    쓰기는 PostgREST 직접 PATCH 와 같은 권한이라 "검증 없는 착용"의 존재 증명이 된다.
  //    이 전환 뒤 shrines 의 사용자 UPDATE 컬럼 권한에서 active_pack_id 를 회수한다(마이그레이션).
  const updateQuery = createAdminClient().from('shrines').update({ active_pack_id: pack.id }).eq('user_id', user.id)
  const { error } = await (familyMemberId
    ? updateQuery.eq('family_member_id', familyMemberId)
    : updateQuery.is('family_member_id', null))
  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/shrine')
  return { success: true }
}
