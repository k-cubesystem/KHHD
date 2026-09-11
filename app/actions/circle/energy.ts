'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { logger } from '@/lib/utils/logger'
import { isSolarCalendar } from '@/lib/domain/saju/calendar'
import type { SajuContext } from '@/lib/saju-engine/context-builder'
import { isElement, type Element } from '@/lib/domain/shrine/types'
import { BAEKIL_ITEM_NAME } from '@/lib/domain/ritual/baekil'
import { elementFromHanja } from '@/lib/domain/circle/element-lore'
import { FAMILY_CIRCLE_ID, CIRCLE_KIND_META, isCircleKind, type CircleKind } from '@/lib/domain/circle/circle'
import { buildCircleEnergy, type CircleEnergy, type CircleMemberEnergy } from '@/lib/domain/circle/team-energy'
import {
  buildPrescription,
  prescriptionTeaser,
  SHRINE_PICK,
  type MansikHint,
  type Prescription,
  type PrescriptionCatalogItem,
  type PrescriptionMate,
  type PrescriptionTeaser,
} from '@/lib/domain/circle/prescription'
import { getFamilyEnergyMap } from '@/app/actions/shrine/energy-map'

/**
 * 처방전 응답 — 멤버십이 없으면 ①·② 만(teaser). 잘라내는 것은 **서버**다: 화면에 전량을 보내고
 * 가리기만 하면 개발자 도구로 열린다(속풀이 게이트와 같은 규율).
 */
export type PrescriptionPayload =
  | { access: 'full'; prescription: Prescription }
  | { access: 'teaser'; teaser: PrescriptionTeaser }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface BirthRow {
  name: string
  birthDate: string | null
  birthTime: string | null
  calendarType: string | null
  isLeapMonth: boolean
  gender: 'male' | 'female'
}

interface CatalogLite {
  id: string
  name: string
  element: string | null
  energy_power: number
  price_bokchae: number
  emoji: string
  sprite_url: string | null
}

interface BirthDbRow {
  id?: string
  name?: string | null
  full_name?: string | null
  birth_date: string | null
  birth_time: string | null
  calendar_type: string | null
  is_leap_month: boolean | null
  gender: string | null
}

function toBirthRow(row: BirthDbRow, fallbackName: string): BirthRow {
  return {
    name: row.full_name ?? row.name ?? fallbackName,
    birthDate: row.birth_date ?? null,
    birthTime: row.birth_time ?? null,
    calendarType: row.calendar_type ?? null,
    isLeapMonth: row.is_leap_month ?? false,
    gender: row.gender === 'female' ? 'female' : 'male',
  }
}

/** 대상의 생년월일 — 본인은 profiles, 가족은 family_members(🔴 user_id 로 소유 재검증 — IDOR 차단). */
async function loadBirth(supabase: SupabaseClient, userId: string, targetId: string): Promise<BirthRow | null> {
  if (targetId === 'self') {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, birth_date, birth_time, calendar_type, is_leap_month, gender')
      .eq('id', userId)
      .maybeSingle()
    return data ? toBirthRow(data as BirthDbRow, '나') : null
  }
  const { data } = await supabase
    .from('family_members')
    .select('name, birth_date, birth_time, calendar_type, is_leap_month, gender')
    .eq('id', targetId)
    .eq('user_id', userId)
    .maybeSingle()
  return data ? toBirthRow(data as BirthDbRow, '가족') : null
}

/** 명식 전체 — 엔진이 실패하면 null(처방·그룹 지도는 명식 없이도 선다). 엔진은 무거워 지연 로드. */
async function sajuContextOf(birth: BirthRow): Promise<SajuContext | null> {
  if (!birth.birthDate) return null
  try {
    const { buildSajuContext } = await import('@/lib/saju-engine/context-builder')
    return buildSajuContext({
      name: birth.name,
      birthDate: birth.birthDate,
      birthTime: birth.birthTime || '12:00',
      gender: birth.gender,
      isSolar: isSolarCalendar(birth.calendarType),
      isLeapMonth: birth.isLeapMonth,
      birthTimeUnknown: !birth.birthTime,
    })
  } catch (e) {
    logger.warn('[circle] 명식 계산 실패, 명식 없이 진행:', e)
    return null
  }
}

/** 용신·희신·기신 — 처방전과 그룹 지도가 **같은 판정**(advancedYongsin)을 읽는다. */
function hintsOf(ctx: SajuContext | null): MansikHint | null {
  const adv = ctx?.analysis.advancedYongsin
  if (!adv) return null
  return {
    yongsin: elementFromHanja(adv.finalYongsin),
    huisin: elementFromHanja(adv.huisin),
    gisin: elementFromHanja(adv.gisin),
  }
}

function toCatalogLite(row: CatalogLite): PrescriptionCatalogItem | null {
  if (!isElement(row.element)) return null
  return {
    id: row.id,
    name: row.name,
    element: row.element,
    energyPower: row.energy_power,
    priceBokchae: row.price_bokchae,
    emoji: row.emoji,
    spriteUrl: row.sprite_url,
  }
}

/**
 * 기운 처방전 — 본인('self') 또는 내 가족 한 명.
 *
 * «지금 기운»은 기운 지도와 **같은 계산**(getFamilyEnergyMap)에서 가져온다 — 처방전이 지도와 다른 수를
 * 말하면 둘 다 못 믿게 된다. «타고난 기운»은 사주에서 유도하고, 명식의 용신·희신·기신은 곁들이는 힌트다.
 *
 * 비로그인·남의 id·생년월일 없음 → null. 멤버십이 없으면 teaser.
 */
export async function getPrescription(targetId: string): Promise<PrescriptionPayload | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const target = targetId === 'self' ? 'self' : UUID.test(targetId) ? targetId : null
  if (!target) return null

  const [map, membership, birth] = await Promise.all([
    getFamilyEnergyMap(),
    getCurrentUserMembership(),
    loadBirth(supabase, user.id, target),
  ])
  const entry = map?.entries.find((e) => e.targetId === target)
  // 생년월일이 없으면 기운이 평평한 기본값이라 처방이 무의미하다 — null 로 «등록» 안내를 띄운다.
  if (!map || !entry || !birth?.birthDate) return null

  const [{ data: catRows, error: catError }, ctx] = await Promise.all([
    supabase
      .from('shrine_item_catalog')
      .select('id, name, element, energy_power, price_bokchae, emoji, sprite_url')
      .eq('element', entry.yongsin)
      .eq('is_active', true)
      .neq('name', BAEKIL_ITEM_NAME)
      .order('energy_power', { ascending: false })
      .limit(SHRINE_PICK * 3),
    sajuContextOf(birth),
  ])
  if (catError) logger.warn('[prescription] 카탈로그 조회 실패 — 신당 살림 없이 처방:', catError.message)

  const catalog = ((catRows ?? []) as CatalogLite[]).map(toCatalogLite).filter((c): c is PrescriptionCatalogItem => !!c)

  // «사람에게서» 갈래는 가족 안에서만 — 지인은 지도에서도 골라야 들어오는 사람이다.
  const mates: PrescriptionMate[] = map.entries
    .filter((e) => e.targetId !== target && e.category !== 'acquaintance')
    .map((e) => ({ targetId: e.targetId, name: e.name, strongest: e.strongest, energy: e.energy }))

  const prescription = buildPrescription({
    targetId: target,
    name: entry.name,
    energy: entry.energy,
    energyLive: entry.energyLive,
    mansik: hintsOf(ctx),
    catalog,
    mates,
  })

  if (membership) return { access: 'full', prescription }
  return { access: 'teaser', teaser: prescriptionTeaser(prescription) }
}

// ─── 그룹 기운 지도 ─────────────────────────────────────────────────────

export interface CircleEnergyPayload {
  circle: { id: string; name: string; kind: CircleKind }
  energy: CircleEnergy
}

/**
 * 그룹 한 벌의 기운 — 가족('family', 가상) 또는 내 그룹 하나.
 *
 * 기운은 기운 지도와 같은 계산에서 오고, 명식 힌트(일간·용신·기신·십성)는 사람마다 엔진을 돌려 얹는다.
 * 🔴 본인은 모든 그룹에 들어 있다(그룹은 «내가 속한 사람들»이다). 지인은 그룹에 넣어야 들어온다.
 * 🔴 점수는 어디에도 없다 — 도메인(team-energy)이 라벨·문장만 만든다.
 */
export async function getCircleEnergy(circleId: string): Promise<CircleEnergyPayload | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let circle: CircleEnergyPayload['circle']
  let memberIds: Set<string> | null = null

  if (circleId === FAMILY_CIRCLE_ID) {
    circle = { id: FAMILY_CIRCLE_ID, name: `우리 ${CIRCLE_KIND_META.family.label}`, kind: 'family' }
  } else {
    if (!UUID.test(circleId)) return null
    const [{ data: row }, { data: memberRows }] = await Promise.all([
      supabase.from('circles').select('id, name, kind').eq('id', circleId).eq('user_id', user.id).maybeSingle(),
      supabase.from('circle_members').select('member_id').eq('circle_id', circleId),
    ])
    if (!row || !isCircleKind(row.kind)) return null
    circle = { id: row.id as string, name: row.name as string, kind: row.kind }
    memberIds = new Set((memberRows ?? []).map((m) => m.member_id as string))
  }

  const map = await getFamilyEnergyMap()
  if (!map) return null

  const entries = map.entries.filter((e) => {
    if (e.targetId === 'self') return true
    return memberIds ? memberIds.has(e.targetId) : e.category !== 'acquaintance'
  })

  const memberTargetIds = entries.map((e) => e.targetId).filter((id) => id !== 'self')
  const [{ data: me }, { data: rows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, birth_date, birth_time, calendar_type, is_leap_month, gender')
      .eq('id', user.id)
      .maybeSingle(),
    memberTargetIds.length
      ? supabase
          .from('family_members')
          .select('id, name, birth_date, birth_time, calendar_type, is_leap_month, gender')
          .eq('user_id', user.id)
          .in('id', memberTargetIds)
      : Promise.resolve({ data: [] as BirthDbRow[] }),
  ])

  const births = new Map<string, BirthRow>()
  if (me) births.set('self', toBirthRow(me as BirthDbRow, '나'))
  for (const row of (rows ?? []) as BirthDbRow[]) if (row.id) births.set(row.id, toBirthRow(row, '가족'))

  const members: CircleMemberEnergy[] = await Promise.all(
    entries.map(async (e) => {
      const birth = births.get(e.targetId)
      const ctx = birth ? await sajuContextOf(birth) : null
      const hints = hintsOf(ctx)
      const dayMaster: Element | null = ctx ? elementFromHanja(ctx.sajuData.dayMasterElement) : null
      return {
        targetId: e.targetId,
        name: e.name,
        relation: e.relation,
        avatarId: e.avatarId,
        energy: e.energy,
        yongsin: e.yongsin,
        strongest: e.strongest,
        dayMaster,
        mansikYongsin: hints?.yongsin ?? null,
        mansikGisin: hints?.gisin ?? null,
        sipseong: ctx?.analysis.sipseong.distribution ?? null,
      }
    })
  )

  return { circle, energy: buildCircleEnergy(circle.kind, members) }
}
