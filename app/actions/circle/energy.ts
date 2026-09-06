'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { logger } from '@/lib/utils/logger'
import { isSolarCalendar } from '@/lib/domain/saju/calendar'
import { isElement } from '@/lib/domain/shrine/types'
import { baseFromBirth } from '@/lib/domain/shrine/energy-born'
import { BAEKIL_ITEM_NAME } from '@/lib/domain/ritual/baekil'
import { elementFromHanja } from '@/lib/domain/circle/element-lore'
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

/** 대상의 생년월일 — 본인은 profiles, 가족은 family_members(🔴 user_id 로 소유 재검증 — IDOR 차단). */
async function loadBirth(supabase: SupabaseClient, userId: string, targetId: string): Promise<BirthRow | null> {
  if (targetId === 'self') {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, birth_date, birth_time, calendar_type, is_leap_month, gender')
      .eq('id', userId)
      .maybeSingle()
    if (!data) return null
    return {
      name: data.full_name ?? '나',
      birthDate: data.birth_date ?? null,
      birthTime: data.birth_time ?? null,
      calendarType: data.calendar_type ?? null,
      isLeapMonth: data.is_leap_month ?? false,
      gender: data.gender === 'female' ? 'female' : 'male',
    }
  }
  const { data } = await supabase
    .from('family_members')
    .select('name, birth_date, birth_time, calendar_type, is_leap_month, gender')
    .eq('id', targetId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return null
  return {
    name: data.name ?? '가족',
    birthDate: data.birth_date ?? null,
    birthTime: data.birth_time ?? null,
    calendarType: data.calendar_type ?? null,
    isLeapMonth: data.is_leap_month ?? false,
    gender: data.gender === 'female' ? 'female' : 'male',
  }
}

/** 명식의 용신·희신·기신 — 엔진이 실패하면 null(처방전은 명식 없이도 선다). 엔진은 무거워 지연 로드. */
async function mansikOf(birth: BirthRow): Promise<MansikHint | null> {
  if (!birth.birthDate) return null
  try {
    const { buildSajuContext } = await import('@/lib/saju-engine/context-builder')
    const ctx = buildSajuContext({
      name: birth.name,
      birthDate: birth.birthDate,
      birthTime: birth.birthTime || '12:00',
      gender: birth.gender,
      isSolar: isSolarCalendar(birth.calendarType),
      isLeapMonth: birth.isLeapMonth,
      birthTimeUnknown: !birth.birthTime,
    })
    const adv = ctx.analysis.advancedYongsin
    if (!adv) return null
    return {
      yongsin: elementFromHanja(adv.finalYongsin),
      huisin: elementFromHanja(adv.huisin),
      gisin: elementFromHanja(adv.gisin),
    }
  } catch (e) {
    logger.warn('[prescription] 명식 계산 실패, 명식 없이 처방:', e)
    return null
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

  const [{ data: catRows, error: catError }, mansik] = await Promise.all([
    supabase
      .from('shrine_item_catalog')
      .select('id, name, element, energy_power, price_bokchae, emoji, sprite_url')
      .eq('element', entry.yongsin)
      .eq('is_active', true)
      .neq('name', BAEKIL_ITEM_NAME)
      .order('energy_power', { ascending: false })
      .limit(SHRINE_PICK * 3),
    mansikOf(birth),
  ])
  if (catError) logger.warn('[prescription] 카탈로그 조회 실패 — 신당 살림 없이 처방:', catError.message)

  const catalog = ((catRows ?? []) as CatalogLite[]).map(toCatalogLite).filter((c): c is PrescriptionCatalogItem => !!c)

  // «사람에게서» 갈래는 가족 안에서만 — 지인은 지도에서도 골라야 들어오는 사람이다.
  const mates: PrescriptionMate[] = map.entries
    .filter((e) => e.targetId !== target && e.category !== 'acquaintance')
    .map((e) => ({ targetId: e.targetId, name: e.name, strongest: e.strongest, energy: e.energy }))

  const energyBorn = birth.birthDate
    ? baseFromBirth(birth.birthDate, birth.birthTime, isSolarCalendar(birth.calendarType)).base
    : null

  const prescription = buildPrescription({
    targetId: target,
    name: entry.name,
    energyNow: entry.energy,
    energyBorn,
    mansik,
    catalog,
    mates,
  })

  if (membership) return { access: 'full', prescription }
  return { access: 'teaser', teaser: prescriptionTeaser(prescription) }
}
