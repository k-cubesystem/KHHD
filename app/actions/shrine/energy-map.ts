'use server'

import { createClient } from '@/lib/supabase/server'
import { toMemberCategory, type MemberCategory } from '@/lib/domain/family/member-category'
import { baseFromBirth } from '@/lib/domain/shrine/energy-born'
import { isLayer, isElement, type CatalogItem, type Placement } from '@/lib/domain/shrine/types'
import { applyModifiers, computeEnergy, indexCatalog } from '@/lib/domain/shrine/energy'
import {
  buildEnergyMap,
  buildFamilyEnergySummary,
  highestElement,
  lowestElement,
  type EnergyMapEntry,
  type EnergySummarySource,
  type FamilyEnergyMap,
  type FamilyEnergySummary,
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
        .select('id, name, relationship, birth_date, birth_time, calendar_type, avatar_id, member_category')
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
    /** 인연 갈래 — 화면이 가족/지인을 갈라 고를 수 있게 함께 싣는다(2026-08-16). */
    category: MemberCategory
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
      category: 'family' as MemberCategory,
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
        category: toMemberCategory(m.member_category as string | null),
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
      category: t.category,
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

/**
 * 허브 배너용 요약 — 「우리 가족 기운 지도」 배너 하나가 쓰는 축약본.
 *
 * 🔴 **지도(getFamilyEnergyMap)를 부르지 않는다.** 그쪽은 신당·배치·카탈로그까지 일곱 번을
 *    질의하는데, 허브는 첫 화면이라 배너 하나가 질 비용이 아니다. 여기서 읽는 것은 두 표뿐이고
 *    (profiles · family_members) 기운은 **사주에서 유도한 타고난 값**이다.
 *    그래서 배너 문구도 「타고난 기운」이라고 적는다 — 지도와 «다른 수»가 아니라
 *    «다른 것»을 보이는 것이고, 그 차이는 라벨이 진다.
 *
 * 🔴 견줄 사람이 둘 미만이면 `count` 만 채워 돌려준다 — 배너가 «가족 등록» 상태로 선다.
 *    비로그인·조회 실패는 null 이고, 그때 배너는 스스로 사라진다(빈 자리를 남기지 않는다).
 */
export async function getFamilyEnergySummary(): Promise<FamilyEnergySummary | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: me }, { data: members }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, birth_date, birth_time, calendar_type')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('family_members')
      .select('id, name, relationship, birth_date, birth_time, calendar_type, avatar_id, member_category')
      .eq('user_id', user.id)
      .order('created_at'),
  ])

  const sources: EnergySummarySource[] = [
    {
      targetId: 'self',
      name: me?.full_name || '나',
      avatarId: null,
      energy: baseFromBirth(me?.birth_date ?? null, me?.birth_time ?? null, me?.calendar_type !== 'lunar').base,
    },
    // 지도와 같은 두 규칙: relationship='본인' 자동 레코드는 self 와 이중 계상이라 빼고,
    // 기본 비교 대상은 «가족»이다(지인은 지도에서 골라야 들어온다).
    ...(members ?? [])
      .filter((m) => m.relationship !== '본인' && toMemberCategory(m.member_category as string | null) === 'family')
      .map((m) => ({
        targetId: m.id as string,
        name: (m.name as string) || '이름 없음',
        avatarId: (m.avatar_id as string) ?? null,
        energy: baseFromBirth(
          (m.birth_date as string) ?? null,
          (m.birth_time as string) ?? null,
          m.calendar_type !== 'lunar'
        ).base,
      })),
  ]

  return buildFamilyEnergySummary(sources)
}
