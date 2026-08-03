'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { getSajuData } from '@/lib/domain/saju/saju'
import { isLayer, isElement, type CatalogItem, type Element, type Placement } from '@/lib/domain/shrine/types'
import {
  DEFAULT_BASE,
  deriveBaseFromDistribution,
  applyModifiers,
  computeEnergy,
  indexCatalog,
} from '@/lib/domain/shrine/energy'
import {
  buildEnergyMap,
  highestElement,
  lowestElement,
  type EnergyMapEntry,
  type FamilyEnergyMap,
} from '@/lib/domain/shrine/energy-map'

/** 지도에 필요한 최소 카탈로그 필드만 — 방 렌더용 필드는 불필요 */
interface MapCatalogRow {
  id: string
  name: string
  element: string | null
  energy_power: number
  placement_layer: string
}

function toMapCatalogItem(r: MapCatalogRow): CatalogItem {
  return {
    id: r.id,
    name: r.name,
    description: null,
    type: '',
    rarity: '',
    emoji: '',
    spriteUrl: null,
    element: isElement(r.element) ? r.element : null,
    energyPower: r.energy_power,
    layer: isLayer(r.placement_layer) ? r.placement_layer : 'floor',
    size: 'md',
    behavior: {},
    priceBok: 0,
    priceKrw: 0,
    priceBokchae: 0,
    unlockEffect: null,
    // 기운 지도는 오행·세기만 본다 — 갈래·전거는 이 계산에 쓰이지 않는다
    matters: [],
    originNote: null,
  }
}

function baseFromBirth(birthDate: string | null, birthTime: string | null, isSolar: boolean) {
  if (!birthDate) return { base: { ...DEFAULT_BASE }, yongsin: null as Element | null }
  try {
    const saju = getSajuData(birthDate, birthTime || '12:00', isSolar)
    return deriveBaseFromDistribution(saju.elementsDistribution)
  } catch (e) {
    logger.warn('[energy-map] 사주 유도 실패, 기본값 사용:', e)
    return { base: { ...DEFAULT_BASE }, yongsin: null as Element | null }
  }
}

/**
 * 우리 가족 기운 지도 — 본인 + 가족 전원의 오행을 한 번에 계산해 비교한다.
 *
 * 읽기 전용이다: getSceneData 와 달리 신당·기운 프로필을 **생성하지 않는다**.
 * (지도를 열었다는 이유로 아직 안 만든 신당이 생기면 곤란하다 — 생성은 신당 방 진입 때만)
 * 그래서 프로필 행이 없는 대상은 사주에서 즉석 유도하고 저장하지 않는다.
 */
export async function getFamilyEnergyMap(): Promise<FamilyEnergyMap | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: me }, { data: members }, { data: shrines }, { data: catRows }, { data: profiles }] = await Promise.all(
    [
      supabase
        .from('profiles')
        .select('full_name, birth_date, birth_time, calendar_type')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        // ⚠️ avatar_url 컬럼은 존재하지 않는다 — 가족 아바타는 avatar_id(오행 정령 키)로 매핑
        .from('family_members')
        .select('id, name, relationship, birth_date, birth_time, calendar_type, avatar_id')
        .eq('user_id', user.id)
        .order('created_at'),
      supabase.from('shrines').select('id, family_member_id, main_deity_id').eq('user_id', user.id),
      supabase.from('shrine_item_catalog').select('id, name, element, energy_power, placement_layer'),
      supabase
        .from('user_energy_profile')
        .select(
          'family_member_id, base_wood, base_fire, base_earth, base_metal, base_water, yongsin_element, face_modifier, palm_modifier'
        )
        .eq('user_id', user.id),
    ]
  )

  const shrineRows = shrines ?? []
  const shrineIds = shrineRows.map((s) => s.id)

  // 배치는 신당이 있을 때만 조회 (빈 IN 절 방지)
  const { data: placeRows } = shrineIds.length
    ? await supabase
        .from('shrine_placements')
        .select('id, shrine_id, catalog_item_id, layer, x, y, flip, state')
        .in('shrine_id', shrineIds)
    : { data: [] }

  // 주신 이름 — 신당마다 좌정한 신위
  const deityIds = shrineRows.map((s) => s.main_deity_id).filter((v): v is string => !!v)
  const { data: deityRows } = deityIds.length
    ? await supabase.from('shrine_deities').select('id, name').in('id', deityIds)
    : { data: [] }
  const deityName = new Map((deityRows ?? []).map((d) => [d.id, d.name as string]))

  const catalog = (catRows ?? []).map((r) => toMapCatalogItem(r as MapCatalogRow))
  const catalogById = indexCatalog(catalog)

  const placementsByShrine = new Map<string, Placement[]>()
  for (const p of placeRows ?? []) {
    const list = placementsByShrine.get(p.shrine_id) ?? []
    list.push({
      id: p.id,
      catalogItemId: p.catalog_item_id,
      layer: isLayer(p.layer) ? p.layer : 'floor',
      x: Number(p.x),
      y: Number(p.y),
      flip: !!p.flip,
      state: {},
    })
    placementsByShrine.set(p.shrine_id, list)
  }

  // family_member_id 는 본인 신당이 NULL — Map 키로 쓰려고 'self' 로 정규화
  const shrineByTarget = new Map(shrineRows.map((s) => [s.family_member_id ?? 'self', s]))
  const profileByTarget = new Map((profiles ?? []).map((p) => [p.family_member_id ?? 'self', p]))

  const targets: Array<{
    id: string
    name: string
    relation: string
    avatarId: string | null
    birthDate: string | null
    birthTime: string | null
    isSolar: boolean
  }> = [
    {
      id: 'self',
      name: me?.full_name || '나',
      // 계정 본인 — profiles 기준 정본. 아래에서 relationship='본인' 가족행은 제외하므로 중복 없다.
      relation: '내 계정',
      avatarId: null,
      birthDate: me?.birth_date ?? null,
      birthTime: me?.birth_time ?? null,
      isSolar: me?.calendar_type !== 'lunar',
    },
    // 사주 계산용 relationship='본인' 자동 레코드는 profiles 의 self 와 이중 계상되므로 제외
    ...(members ?? [])
      .filter((m) => m.relationship !== '본인')
      .map((m) => ({
        id: m.id as string,
        name: (m.name as string) || '이름 없음',
        relation: (m.relationship as string) || '가족',
        avatarId: (m.avatar_id as string) ?? null,
        birthDate: (m.birth_date as string) ?? null,
        birthTime: (m.birth_time as string) ?? null,
        isSolar: m.calendar_type !== 'lunar',
      })),
  ]

  const entries: EnergyMapEntry[] = targets.map((t) => {
    const stored = profileByTarget.get(t.id)
    // 저장된 프로필이 정본(base_* 는 NOT NULL), 없으면 사주에서 즉석 유도 — 저장은 하지 않는다
    let base = stored
      ? {
          wood: stored.base_wood,
          fire: stored.base_fire,
          earth: stored.base_earth,
          metal: stored.base_metal,
          water: stored.base_water,
        }
      : baseFromBirth(t.birthDate, t.birthTime, t.isSolar).base

    base = applyModifiers(
      base,
      stored?.face_modifier as Record<string, unknown>,
      stored?.palm_modifier as Record<string, unknown>
    )

    const shrine = shrineByTarget.get(t.id)
    const placements = shrine ? (placementsByShrine.get(shrine.id) ?? []) : []
    const { energy } = computeEnergy(base, placements, catalogById)

    return {
      targetId: t.id,
      name: t.name,
      relation: t.relation,
      avatarId: t.avatarId,
      hasShrine: !!shrine,
      itemCount: placements.length,
      deityName: shrine?.main_deity_id ? (deityName.get(shrine.main_deity_id) ?? null) : null,
      energy,
      yongsin: lowestElement(energy),
      strongest: highestElement(energy),
    }
  })

  return buildEnergyMap(entries)
}
