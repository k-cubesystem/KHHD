'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { GUARDIANS, MAX_GUARDIANS, findGuardian, parseGuardianSlugs } from '@/lib/domain/shrine/guardians'
import { purchaseToInventory } from '@/app/actions/shrine/inventory'

/**
 * 신수 착좌(모시기) — `'use server'` 공개 엔드포인트.
 *
 * ⚠️ shrines 쓰기는 **admin 경유**다. shrines 는 컬럼 화이트리스트(감사 A3)라 사용자 클라이언트
 *    update 가 막혀 있고, guardians 에 grant 를 열면 PostgREST PATCH 한 방으로 구매 검증을
 *    우회한 무료 착좌가 된다 — 테마 착용(active_pack_id)과 같은 규율이다.
 *    그래서 검증(본인 신당 + 전부 보유)이 **admin 호출보다 먼저**고, 전부 사용자 클라이언트로 한다.
 */

export interface EquipGuardiansResult {
  success: boolean
  error?: 'UNAUTHORIZED' | 'SHRINE_NOT_FOUND' | 'TOO_MANY' | 'UNKNOWN_GUARDIAN' | 'NOT_OWNED' | 'FAILED'
}

export async function equipGuardians(slugs: string[], familyMemberId?: string | null): Promise<EquipGuardiansResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const wanted = Array.isArray(slugs) ? [...new Set(slugs.filter((s) => typeof s === 'string'))] : []
  if (wanted.length > MAX_GUARDIANS) return { success: false, error: 'TOO_MANY' }
  const guardians = wanted.map((s) => findGuardian(s))
  if (guardians.some((g) => g === undefined)) return { success: false, error: 'UNKNOWN_GUARDIAN' }

  // 본인 신당인가 (가족 신당 포함 — 소유는 언제나 user_id)
  const shrineQuery = supabase.from('shrines').select('id').eq('user_id', user.id)
  let { data: shrine } = await (
    familyMemberId ? shrineQuery.eq('family_member_id', familyMemberId) : shrineQuery.is('family_member_id', null)
  ).maybeSingle()

  // 본인 신당이 아직 없으면 **만들어 준다** — 신수는 신(主神)이 없어도, 신당 개설 절차를 밟지
  // 않았어도 기본으로 쓸 수 있어야 한다(가족 신당 자동 생성과 같은 문법·같은 컬럼 화이트리스트).
  if (!shrine && !familyMemberId) {
    const { data: created } = await supabase
      .from('shrines')
      .insert({ user_id: user.id, name: '나의 신당', visibility: 'private' })
      .select('id')
      .maybeSingle()
    shrine = created
    if (!shrine) {
      // 동시 첫 진입 레이스(UNIQUE 충돌) — 이미 생성된 행을 재조회
      const { data: existing } = await supabase
        .from('shrines')
        .select('id')
        .eq('user_id', user.id)
        .is('family_member_id', null)
        .maybeSingle()
      shrine = existing
    }
  }
  if (!shrine) return { success: false, error: 'SHRINE_NOT_FOUND' }

  // 전부 보유했는가 — 신수는 카탈로그 이름이 열쇠다(구매가 인벤토리에 남긴다)
  if (wanted.length > 0) {
    const names = guardians.map((g) => (g as NonNullable<typeof g>).name)
    const { data: rows } = await supabase
      .from('user_shrine_inventory')
      .select('qty, shrine_item_catalog(name, type)')
      .eq('user_id', user.id)
      .gt('qty', 0)
    const ownedNames = new Set(
      (rows ?? [])
        .map((r) => {
          const cat: unknown = r.shrine_item_catalog
          return typeof cat === 'object' && cat !== null ? (cat as Record<string, unknown>).name : null
        })
        .filter((n): n is string => typeof n === 'string')
    )
    if (!names.every((n) => ownedNames.has(n))) return { success: false, error: 'NOT_OWNED' }
  }

  // 검증 끝 — 여기서만 admin (컬럼 화이트리스트 밖의 유일한 통로)
  const admin = createAdminClient()
  const { error } = await admin.from('shrines').update({ guardians: wanted }).eq('id', shrine.id)
  if (error) {
    logger.warn('[guardians] 착좌 실패:', error)
    return { success: false, error: 'FAILED' }
  }

  revalidatePath('/protected/shrine')
  return { success: true }
}

export interface PurchaseGuardianResult {
  success: boolean
  /** 구매 직후 본인 신당 빈자리에 자동 착좌됐는가 — UI 토스트 분기용 */
  seated?: boolean
  error?: 'UNKNOWN_GUARDIAN' | 'INSUFFICIENT_BOKCHAE' | 'FAILED'
}

/**
 * 신수 봉헌(구매) — 신수 탭에서 바로. 결제·인벤토리 반영은 기존 purchaseToInventory 를
 * **함수로 재사용**한다(경로가 두 벌이면 환불·중복 방지 같은 규칙이 갈라진다).
 * 여기서는 슬러그 → 카탈로그 id 만 푼다.
 *
 * 구매가 성사되면 **본인 신당 빈자리에 바로 착좌까지** 이어 준다 — 봉헌 4좌·착좌 0좌로
 * 방이 비어 있던 실사용 데이터(2026-08-06)의 교훈: 구매와 착좌가 다른 탭이면 신수는
 * 산 채로 잊힌다. 이미 2좌면 건드리지 않는다(교체는 모아보기 「신수」 탭 그대로).
 * 착좌 실패는 구매를 되돌리지 않는다 — 봉헌은 유효하고, 착좌는 언제든 다시 할 수 있다.
 */
export async function purchaseGuardian(slug: string): Promise<PurchaseGuardianResult> {
  const g = findGuardian(typeof slug === 'string' ? slug : '')
  if (!g) return { success: false, error: 'UNKNOWN_GUARDIAN' }

  const supabase = await createClient()
  const { data: item } = await supabase
    .from('shrine_item_catalog')
    .select('id')
    .eq('name', g.name)
    .eq('type', 'guardian')
    .maybeSingle()
  if (!item) return { success: false, error: 'FAILED' }

  const res = await purchaseToInventory(String(item.id))
  if (!res.success) {
    return {
      success: false,
      error: res.error === 'INSUFFICIENT_BOKCHAE' ? 'INSUFFICIENT_BOKCHAE' : 'FAILED',
    }
  }

  // 빈자리 자동 착좌 — 검증·admin 경유는 equipGuardians 한 벌을 그대로 쓴다(경로 분기 금지)
  let seated = false
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { data: shrine } = await supabase
      .from('shrines')
      .select('guardians')
      .eq('user_id', user.id)
      .is('family_member_id', null)
      .maybeSingle()
    const current = parseGuardianSlugs(shrine?.guardians)
    if (!current.includes(g.slug) && current.length < MAX_GUARDIANS) {
      const eq = await equipGuardians([...current, g.slug])
      seated = eq.success
    }
  }

  return { success: true, seated }
}

/** 화면용 — 보유한 신수 이름 집합(카탈로그 이름 기준). 컬렉션 그리드가 쓴다. */
export async function listOwnedGuardianNames(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data: rows } = await supabase
    .from('user_shrine_inventory')
    .select('qty, shrine_item_catalog(name, type)')
    .eq('user_id', user.id)
    .gt('qty', 0)
  const known = new Set(GUARDIANS.map((g) => g.name))
  return (rows ?? [])
    .map((r) => {
      const cat: unknown = r.shrine_item_catalog
      if (typeof cat !== 'object' || cat === null) return null
      const rec = cat as Record<string, unknown>
      return rec.type === 'guardian' && typeof rec.name === 'string' ? rec.name : null
    })
    .filter((n): n is string => n !== null && known.has(n))
}
