'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { buildJourney } from '@/lib/domain/analysis/journey'
import {
  JOURNEY_REWARD_CHOICES,
  findJourneyRewardChoice,
  type JourneyRewardKind,
} from '@/lib/domain/analysis/journey-reward'

export interface JourneyRewardChoiceStatus {
  kind: JourneyRewardKind
  code: string
  /** DB name(조회 실패 시 도메인 폴백). */
  name: string
  element: string
  tagline: string
  /** 복채 정가(만냥) — "여정 완주 무료"의 대비가격. */
  priceBokchae: number
  /** 이미 보유(구매·기원 등 다른 경로) — 선택 불가 안내용. */
  owned: boolean
}

export interface JourneyRewardStatus {
  /** 본인 여정 5단계 완주 여부(서버 재판정). */
  complete: boolean
  /** 수령 완료 시 그 기록(미수령 null). */
  claimed: { kind: JourneyRewardKind; code: string; name: string } | null
  choices: JourneyRewardChoiceStatus[]
}

const DEITY_CODES = JOURNEY_REWARD_CHOICES.filter((c) => c.kind === 'deity').map((c) => c.code)
const THEME_CODES = JOURNEY_REWARD_CHOICES.filter((c) => c.kind === 'theme').map((c) => c.code)

/**
 * 여정 완주 보상 현황 — 완주 여부·수령 기록·후보 8종(보유 여부 포함).
 * 보상은 **본인 여정 전용**(target = user.id). 비로그인 null.
 */
export async function getJourneyRewardStatus(): Promise<JourneyRewardStatus | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: history },
    { data: claim },
    { data: deities },
    { data: packs },
    { data: ownedDeities },
    { data: ownedPacks },
  ] = await Promise.all([
    supabase.from('analysis_history').select('category').eq('user_id', user.id).eq('target_id', user.id),
    supabase.from('journey_reward_claims').select('reward_kind, reward_code').eq('user_id', user.id).maybeSingle(),
    supabase.from('shrine_deities').select('id, code, name, price_bokchae').in('code', DEITY_CODES),
    supabase.from('shrine_theme_packs').select('id, code, name, price_bokchae').in('code', THEME_CODES),
    supabase.from('user_shrine_deities').select('deity_id').eq('user_id', user.id),
    supabase.from('user_theme_packs').select('pack_id').eq('user_id', user.id),
  ])

  const categories = Array.from(
    new Set(
      (history ?? [])
        .map((r) => (r as { category: string | null }).category)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
    )
  )
  const complete = buildJourney(categories).allComplete

  const deityByCode = new Map((deities ?? []).map((d) => [d.code as string, d]))
  const packByCode = new Map((packs ?? []).map((p) => [p.code as string, p]))
  const ownedDeityIds = new Set((ownedDeities ?? []).map((o) => o.deity_id as string))
  const ownedPackIds = new Set((ownedPacks ?? []).map((o) => o.pack_id as string))

  const choices: JourneyRewardChoiceStatus[] = JOURNEY_REWARD_CHOICES.map((c) => {
    const row = c.kind === 'deity' ? deityByCode.get(c.code) : packByCode.get(c.code)
    const owned = row
      ? c.kind === 'deity'
        ? ownedDeityIds.has(row.id as string)
        : ownedPackIds.has(row.id as string)
      : false
    return {
      kind: c.kind,
      code: c.code,
      name: (row?.name as string | undefined) ?? c.name,
      element: c.element,
      tagline: c.tagline,
      priceBokchae: (row?.price_bokchae as number | undefined) ?? 0,
      owned,
    }
  })

  let claimed: JourneyRewardStatus['claimed'] = null
  if (claim) {
    const kind = claim.reward_kind as JourneyRewardKind
    const code = claim.reward_code as string
    const match = choices.find((c) => c.kind === kind && c.code === code)
    claimed = { kind, code, name: match?.name ?? findJourneyRewardChoice(kind, code)?.name ?? code }
  }

  return { complete, claimed, choices }
}

export interface ClaimJourneyRewardResult {
  success: boolean
  error?: string
  kind?: JourneyRewardKind
  /** 표시용 이름(성공 시). */
  name?: string
}

/**
 * 여정 완주 보상 수령 — 신위 1좌 또는 테마 1종, 계정당 1회 무료.
 * 검증 순서: 후보 목록(클라 입력 미신뢰) → 완주 재판정(DB) → 카탈로그 실재·활성
 * → 기보유 안내 → 수령 기록 선점(PK 멱등) → 지급 → 실패 시 기록 롤백.
 * 기원 보상(claimDevotionReward)과 동일 계보의 지급 패턴.
 *
 * 신뢰 경계: 완주 판정의 근거인 analysis_history 는 RLS 상 본인 INSERT 가 열려 있어
 * (analysis_history_all_own, ALL) API 직호출로 위조 가능하다. 보상이 1만냥급 소장품
 * 계정당 1회라 수용한 위험 — 복채 등 금전 보상을 여기에 얹으려면 판정 근거를
 * service_role 전용 기록으로 옮겨야 한다.
 */
export async function claimJourneyReward(kind: string, code: string): Promise<ClaimJourneyRewardResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const choice = findJourneyRewardChoice(kind, code)
  if (!choice) return { success: false, error: 'INVALID_CHOICE' }

  // 완주 재판정 — 클라 상태 미신뢰, 본인 여정만
  const { data: history } = await supabase
    .from('analysis_history')
    .select('category')
    .eq('user_id', user.id)
    .eq('target_id', user.id)
  const categories = Array.from(
    new Set(
      (history ?? [])
        .map((r) => (r as { category: string | null }).category)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
    )
  )
  if (!buildJourney(categories).allComplete) return { success: false, error: 'JOURNEY_NOT_COMPLETE' }

  // 카탈로그 행 + 기보유 확인
  let targetId: string | null = null
  let displayName = choice.name
  let alreadyOwned = false
  if (choice.kind === 'deity') {
    const { data: deity } = await supabase
      .from('shrine_deities')
      .select('id, name, is_active')
      .eq('code', choice.code)
      .maybeSingle()
    if (!deity || !deity.is_active) return { success: false, error: 'REWARD_NOT_FOUND' }
    targetId = deity.id
    displayName = deity.name
    const { data: owned } = await supabase
      .from('user_shrine_deities')
      .select('deity_id')
      .eq('user_id', user.id)
      .eq('deity_id', deity.id)
      .maybeSingle()
    alreadyOwned = !!owned
  } else {
    const { data: pack } = await supabase
      .from('shrine_theme_packs')
      .select('id, name, is_active')
      .eq('code', choice.code)
      .maybeSingle()
    if (!pack || !pack.is_active) return { success: false, error: 'REWARD_NOT_FOUND' }
    targetId = pack.id
    displayName = pack.name
    const { data: owned } = await supabase
      .from('user_theme_packs')
      .select('pack_id')
      .eq('user_id', user.id)
      .eq('pack_id', pack.id)
      .maybeSingle()
    alreadyOwned = !!owned
  }

  if (alreadyOwned) return { success: false, error: 'ALREADY_OWNED' }

  const admin = createAdminClient()

  // 수령 기록 선점 — PK(user_id) 충돌 = 이미 수령(계정당 1회)
  const { error: claimErr } = await admin
    .from('journey_reward_claims')
    .insert({ user_id: user.id, reward_kind: choice.kind, reward_code: choice.code })
  if (claimErr) {
    if (claimErr.code === '23505') return { success: false, error: 'ALREADY_CLAIMED' }
    logger.error('[journey-reward] claim insert failed:', claimErr)
    return { success: false, error: 'CLAIM_FAILED' }
  }

  // 지급 (무료). 실패 시 수령 기록 롤백 → 재시도 가능.
  let grantErr: unknown = null
  if (choice.kind === 'deity') {
    const { error } = await admin
      .from('user_shrine_deities')
      .upsert(
        { user_id: user.id, deity_id: targetId, source: 'journey_reward' },
        { onConflict: 'user_id,deity_id', ignoreDuplicates: true }
      )
    grantErr = error
    if (!error) {
      // 인연 행은 부가 데이터 — 실패해도 지급은 성공(적립 시 upsert 로 재생성). grantDeity 와 동일 규약.
      const { error: bondError } = await admin
        .from('user_deity_bonds')
        .upsert(
          { user_id: user.id, deity_id: targetId, family_member_id: null, bond_level: 1, bond_points: 0 },
          { onConflict: 'user_id,deity_id,family_member_id', ignoreDuplicates: true }
        )
      if (bondError) logger.warn('[journey-reward] bond init failed (non-fatal):', bondError)
    }
  } else {
    const { error } = await admin
      .from('user_theme_packs')
      .upsert({ user_id: user.id, pack_id: targetId }, { onConflict: 'user_id,pack_id', ignoreDuplicates: true })
    grantErr = error
  }

  if (grantErr) {
    logger.error('[journey-reward] grant failed:', grantErr)
    await admin.from('journey_reward_claims').delete().eq('user_id', user.id)
    return { success: false, error: 'GRANT_FAILED' }
  }

  revalidatePath('/protected/analysis')
  revalidatePath('/protected/shrine')
  revalidatePath('/protected/store')
  return { success: true, kind: choice.kind, name: displayName }
}
