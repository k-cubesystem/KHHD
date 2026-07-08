'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { getSajuData } from '@/lib/domain/saju/saju'
import {
  parseBehavior,
  parsePlacementState,
  isLayer,
  isElement,
  type CatalogItem,
  type Element,
  type InventoryEntry,
  type Layer,
  type Placement,
  type SceneData,
  type SizeGrade,
  type ThemeAssets,
  type ThemePack,
} from '@/lib/domain/shrine/types'
import { ZONES, clampPct } from '@/lib/domain/shrine/zones'

const HANJA_TO_EL: Record<string, Element> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' }
const DEFAULT_BASE: Record<Element, number> = { wood: 40, fire: 40, earth: 40, metal: 40, water: 40 }

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
}

function toCatalogItem(r: CatalogRow): CatalogItem {
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
  }
}

function deriveBase(dist: Record<string, number>): { base: Record<Element, number>; yongsin: Element } {
  const base: Record<Element, number> = { ...DEFAULT_BASE }
  for (const [k, v] of Object.entries(dist)) {
    const el = HANJA_TO_EL[k]
    if (el) base[el] = Math.max(5, Math.min(90, 20 + v * 15))
  }
  let yongsin: Element = 'wood'
  ;(['wood', 'fire', 'earth', 'metal', 'water'] as Element[]).forEach((el) => {
    if (base[el] < base[yongsin]) yongsin = el
  })
  return { base, yongsin }
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/** 사주 기반 기운 프로필을 계산·저장하거나 기존 것을 반환 */
async function loadOrComputeProfile(
  supabase: SupabaseServer,
  userId: string
): Promise<{ base: Record<Element, number>; yongsin: Element | null }> {
  const { data: existing } = await supabase
    .from('user_energy_profile')
    .select('base_wood, base_fire, base_earth, base_metal, base_water, yongsin_element')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return {
      base: {
        wood: existing.base_wood,
        fire: existing.base_fire,
        earth: existing.base_earth,
        metal: existing.base_metal,
        water: existing.base_water,
      },
      yongsin: isElement(existing.yongsin_element) ? existing.yongsin_element : null,
    }
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
      const { base, yongsin } = deriveBase(saju.elementsDistribution)
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
  if (invRows.length) await supabase.from('user_shrine_inventory').insert(invRows)

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

async function loadThemes(supabase: SupabaseServer, userId: string): Promise<ThemePack[]> {
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
    elementAffinity: isElement(p.element_affinity) ? p.element_affinity : null,
    assets: (typeof p.assets === 'object' && p.assets !== null ? p.assets : {}) as ThemeAssets,
    owned: p.price_krw === 0 && p.price_bok === 0 ? true : ownedSet.has(p.id),
  }))
}

/** 소유자용 씬 데이터 로드 */
export async function getSceneData(): Promise<SceneData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: shrine } = await supabase
    .from('shrines')
    .select('id, name, visitor_count, wish_count, active_pack_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!shrine) return null

  await ensureStarterKit(supabase, user.id, shrine.id)

  const [{ data: catRows }, { data: placeRows }, { data: invRows }, profile, themes] = await Promise.all([
    supabase.from('shrine_item_catalog').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('shrine_placements').select('*').eq('shrine_id', shrine.id),
    supabase.from('user_shrine_inventory').select('catalog_item_id, qty').eq('user_id', user.id),
    loadOrComputeProfile(supabase, user.id),
    loadThemes(supabase, user.id),
  ])

  const catalog: CatalogItem[] = (catRows ?? []).map((r) => toCatalogItem(r as CatalogRow))
  const placements: Placement[] = (placeRows ?? []).map((p) => ({
    id: p.id,
    catalogItemId: p.catalog_item_id,
    layer: isLayer(p.layer) ? p.layer : 'floor',
    x: Number(p.x),
    y: Number(p.y),
    flip: p.flip,
    state: parsePlacementState(p.state),
  }))
  const inventory: InventoryEntry[] = (invRows ?? []).map((i) => ({ catalogItemId: i.catalog_item_id, qty: i.qty }))

  const activePack = themes.find((t) => t.id === shrine.active_pack_id)

  return {
    shrineId: shrine.id,
    shrineName: shrine.name,
    isOwner: true,
    catalog,
    placements,
    inventory,
    profile: { base: profile.base, yongsin: profile.yongsin },
    themes,
    activePackCode: activePack?.code ?? 'banga',
    visitorCount: shrine.visitor_count,
    wishCount: shrine.wish_count,
  }
}

/** 방문자용 공개 씬 데이터 (읽기 전용). 소유자의 방·테마만 노출, 인벤토리/프로필 비공개. */
export async function getPublicSceneData(userId: string): Promise<SceneData | null> {
  const supabase = await createClient()

  const { data: shrine } = await supabase
    .from('shrines')
    .select('id, name, visibility, visitor_count, wish_count, active_pack_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!shrine || shrine.visibility !== 'public') return null

  const [{ data: catRows }, { data: placeRows }, { data: packs }] = await Promise.all([
    supabase.from('shrine_item_catalog').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('shrine_placements').select('*').eq('shrine_id', shrine.id),
    supabase
      .from('shrine_theme_packs')
      .select('id, code, name, price_bok, price_krw, element_affinity, assets')
      .eq('is_active', true),
  ])

  const catalog: CatalogItem[] = (catRows ?? []).map((r) => toCatalogItem(r as CatalogRow))
  const placements: Placement[] = (placeRows ?? []).map((p) => ({
    id: p.id,
    catalogItemId: p.catalog_item_id,
    layer: isLayer(p.layer) ? p.layer : 'floor',
    x: Number(p.x),
    y: Number(p.y),
    flip: p.flip,
    state: parsePlacementState(p.state),
  }))
  const activePack = (packs ?? []).find((p) => p.id === shrine.active_pack_id)
  const themes: ThemePack[] = activePack
    ? [
        {
          id: activePack.id,
          code: activePack.code,
          name: activePack.name,
          priceBok: activePack.price_bok,
          priceKrw: activePack.price_krw,
          elementAffinity: isElement(activePack.element_affinity) ? activePack.element_affinity : null,
          assets: (typeof activePack.assets === 'object' && activePack.assets !== null
            ? activePack.assets
            : {}) as ThemeAssets,
          owned: true,
        },
      ]
    : []

  return {
    shrineId: shrine.id,
    shrineName: shrine.name,
    isOwner: false,
    catalog,
    placements,
    inventory: [],
    profile: { base: { ...DEFAULT_BASE }, yongsin: null },
    themes,
    activePackCode: activePack?.code ?? 'banga',
    visitorCount: shrine.visitor_count,
    wishCount: shrine.wish_count,
  }
}

interface PlacementInput {
  catalogItemId: string
  layer: Layer
  x: number
  y: number
  flip?: boolean
  state?: { lit?: boolean }
}

/** 방 레이아웃 일괄 저장 (인벤토리 보유량 초과 배치 방지) */
export async function saveShrineLayout(placements: PlacementInput[]): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { data: shrine } = await supabase.from('shrines').select('id').eq('user_id', user.id).maybeSingle()
  if (!shrine) return { success: false, error: 'SHRINE_NOT_FOUND' }

  if (placements.length > 40) return { success: false, error: 'TOO_MANY_ITEMS' }

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

  // 좌표 클램프 (서버 방어)
  const rows = placements.map((p) => {
    const zone = ZONES[isLayer(p.layer) ? p.layer : 'floor']
    return {
      shrine_id: shrine.id,
      catalog_item_id: p.catalogItemId,
      layer: p.layer,
      x: clampPct(p.x, zone.x),
      y: clampPct(p.y, zone.y),
      flip: p.flip ?? false,
      state: p.state ?? {},
    }
  })

  // 전체 교체 (delete + insert)
  const { error: delErr } = await supabase.from('shrine_placements').delete().eq('shrine_id', shrine.id)
  if (delErr) return { success: false, error: delErr.message }
  if (rows.length) {
    const { error: insErr } = await supabase.from('shrine_placements').insert(rows)
    if (insErr) return { success: false, error: insErr.message }
  }

  revalidatePath('/protected/shrine')
  return { success: true }
}

/** 테마 팩 활성화 (무료거나 보유한 팩만) */
export async function activateThemePack(packCode: string): Promise<{ success: boolean; error?: string }> {
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

  const { error } = await supabase.from('shrines').update({ active_pack_id: pack.id }).eq('user_id', user.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/protected/shrine')
  return { success: true }
}
