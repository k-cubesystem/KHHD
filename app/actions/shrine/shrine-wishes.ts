'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addBokPoints } from '@/lib/services/bok-grant'
import { accrueDevotion } from '@/lib/services/devotion'
import { logger } from '@/lib/utils/logger'
import { PRAYER_MAX_SAVED, PRAYER_PAGE_SIZE, type FamilyPrayer } from '@/lib/domain/shrine/family-prayer'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export interface ShrineWish {
  id: string
  shrine_id: string
  wisher_user_id: string | null
  visitor_name: string | null
  wish_text: string
  category: string | null
  is_owner_wish: boolean
  /** 소원이 향한 가족 신당 대상(NULL=본인). shrineId 스코프의 표기 보강. */
  family_member_id: string | null
  created_at: string
}

export async function addWish(input: {
  shrineId: string
  wishText: string
  category?: string
  visitorName?: string
  visitorSessionId?: string
  /** 대상 가족(본인 신당이면 null). 소원 로그 대상명 표기용 — shrineId 로 이미 분리됨. */
  familyMemberId?: string | null
}): Promise<{
  success: boolean
  error?: string
  /** 오늘(KST) 첫 기도로 기원이 적립됐는지 — UI 토스트 강조용. 본인·가족 신당 소원만 적립. */
  devotionGained?: boolean
  /** 적립 후 누적 기도일(기원 단·다음목표 계산용). */
  devotionTotalDays?: number
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!input.wishText || input.wishText.trim().length < 5) {
    return { success: false, error: 'WISH_TOO_SHORT' }
  }

  // 신당 오너 여부 확인
  const { data: shrine } = await supabase.from('shrines').select('user_id').eq('id', input.shrineId).single()

  if (!shrine) return { success: false, error: 'SHRINE_NOT_FOUND' }
  const isOwner = user?.id === shrine.user_id

  const { error } = await supabase.from('shrine_wishes').insert({
    shrine_id: input.shrineId,
    wisher_user_id: user?.id ?? null,
    visitor_name: input.visitorName?.trim().slice(0, 10) ?? null,
    visitor_session_id: input.visitorSessionId ?? null,
    wish_text: input.wishText.trim().slice(0, 100),
    category: input.category ?? null,
    is_owner_wish: isOwner,
    family_member_id: input.familyMemberId ?? null,
  })

  if (error) return { success: false, error: error.message }

  // 복 포인트 적립 (로그인 유저만)
  if (user) {
    if (isOwner) {
      // 내 신당 소원: +10 (일일 1회 제한은 미션 시스템에서 처리)
      await addBokPoints(10, 'SHRINE_WISH_OWN', undefined, '신당 기원')
    } else {
      // 타인 신당 방문 기원: +5
      await addBokPoints(5, 'SHRINE_WISH_VISIT', undefined, '신당 방문 기원')
    }
  }

  // 방문자 카운트 증가 (비오너만)
  if (!isOwner) {
    await supabase.rpc('increment_shrine_visitor', { p_shrine_id: input.shrineId })
  }

  // 기원 적립 — 본인·가족 신당(=오너) 소원만, 유저 기준 하루(KST) 1회 멱등(서버에서).
  // 방문자(타인 신당) 기원은 적립 대상 아님. 적립은 소원 저장 성공 이후에만 수행.
  let devotionGained = false
  let devotionTotalDays: number | undefined
  if (user && isOwner) {
    const accrual = await accrueDevotion(user.id)
    devotionGained = accrual.gained
    devotionTotalDays = accrual.totalDays
  }

  // 100편 상한 정리 — 소유자 기도에만(방문자 소원은 상한 대상이 아니다)
  if (isOwner) await prunePrayers(supabase, input.shrineId)

  revalidatePath(`/shrine/${shrine.user_id}`)
  return { success: true, devotionGained, devotionTotalDays }
}

export async function getWishes(
  shrineId: string,
  page = 0,
  pageSize = 20
): Promise<{ wishes: ShrineWish[]; hasMore: boolean }> {
  const supabase = await createClient()

  const from = page * pageSize
  const to = from + pageSize

  const { data, error } = await supabase
    .from('shrine_wishes')
    .select('*')
    .eq('shrine_id', shrineId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { wishes: [], hasMore: false }

  return {
    wishes: (data ?? []).slice(0, pageSize),
    hasMore: (data?.length ?? 0) > pageSize,
  }
}

export async function deleteWish(wishId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { error } = await supabase.from('shrine_wishes').delete().eq('id', wishId)

  if (error) return { success: false, error: error.message }

  return { success: true }
}

/**
 * 백일기도 데이터 — 이 신당의 **소유자 기도** 한 쪽(10편) + 액자에 걸린 편 + 총 편수.
 *
 * 새 테이블이 아니라 shrine_wishes 의 is_owner_wish + family_member_id 를 그대로 읽는다 —
 * 「기도 올리기」(addWish)가 쓴 것을 여기서 돌려받는 왕복이라 스키마 추가가 0 이다.
 *
 * 이름 해석까지 서버가 끝낸다(본인=나, 가족=family_members.name). 가족이 삭제돼 이름이 없는
 * 기도는 **버린다** — 주인 없는 액자를 걸지 않는다.
 *
 * ⚠️ 페이지 계산은 서버가 진다(count: 'exact'). 클라가 전체를 받아 자르면 100편을 매번 실어
 *    나르게 된다 — 목록은 10편만 내려간다.
 */
export interface PrayerPageData {
  /** 요청한 쪽의 기도(최신순 10편) */
  prayers: FamilyPrayer[]
  /** 소유자 기도 총 편수 — 진행도(n/100)와 쪽수의 원천 */
  total: number
  /** 액자에 걸린 기도 id. null 이면 최신 기도가 걸린다 */
  featuredId: string | null
  /**
   * 액자에 걸린 기도 **그 자체**.
   *
   * 🔴 이 필드가 없던 동안, 고른 기도가 이번 쪽(최신 10편) 밖에 있으면 화면이 찾지 못해
   *    조용히 최신 기도로 되돌아갔다 — 목록은 「걸림」이라 표시하는데 벽에는 다른 기도가
   *    걸려 있었다(2026-08-26 수복). 쪽 밖이면 id 로 한 행만 따로 읽어 채운다.
   */
  featuredPrayer: FamilyPrayer | null
}

const EMPTY_PAGE: PrayerPageData = { prayers: [], total: 0, featuredId: null, featuredPrayer: null }

/**
 * 행 → 기도. 이름을 못 찾으면 '가족' 으로 뭉갠다 — 두 경우가 여기로 온다:
 *  · 삭제된 가족의 기도(주인 뷰) — 기록은 남기되 이름만 잃는다.
 *  · 방문자 뷰 — family_members 는 RLS(소유자 전용)라 이름 조회가 통째로 빈다.
 *    공개 신당이라도 **가족 실명은 방문자에게 내리지 않는 것**이 맞다(가족 신당 공개 확인창의
 *    「이름이 보일 수 있습니다」 경고와 같은 축 — 액자는 그 경고 없이 걸리므로 익명이 기본).
 */
function toPrayer(row: Record<string, unknown>, nameOf: Map<string, string>): FamilyPrayer {
  const memberId = (row.family_member_id as string | null) ?? null
  const name = memberId === null ? '나' : (nameOf.get(memberId) ?? '가족')
  return {
    id: (row.id as string) ?? '',
    memberId,
    name,
    text: (row.wish_text as string) ?? '',
    createdAt: (row.created_at as string) ?? '',
  }
}

/**
 * 🔴 비로그인(방문자)도 부른다 — 공개 신당의 액자가 이 데이터로 걸린다. 행 접근 제어는 전부
 *    RLS 몫이다(비공개 신당이면 shrine_wishes·shrines 조회가 빈다 → EMPTY). 가족 이름은
 *    family_members RLS(소유자 전용)가 방문자에게 자연히 감춘다(toPrayer 의 '가족' 폴백).
 */
export async function getPrayerPage(shrineId: string, page = 0): Promise<PrayerPageData> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 0
  const from = safePage * PRAYER_PAGE_SIZE

  const [{ data, error, count }, { data: shrine }, { data: family }] = await Promise.all([
    supabase
      .from('shrine_wishes')
      .select('id, wish_text, family_member_id, created_at', { count: 'exact' })
      .eq('shrine_id', shrineId)
      .eq('is_owner_wish', true)
      .order('created_at', { ascending: false })
      .range(from, from + PRAYER_PAGE_SIZE - 1),
    supabase.from('shrines').select('featured_wish_id').eq('id', shrineId).maybeSingle(),
    user
      ? supabase.from('family_members').select('id, name').eq('user_id', user.id)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  if (error || !data) return EMPTY_PAGE

  const nameOf = new Map((family ?? []).map((f) => [f.id as string, f.name as string]))
  const prayers = data.map((row) => toPrayer(row, nameOf))
  const featuredId = (shrine?.featured_wish_id as string | null) ?? null

  // 고른 기도가 이번 쪽 안에 있으면 그대로 쓰고, 밖이면 한 행만 따로 읽는다.
  // (쪽 크기 10 이라 11편째부터는 항상 밖이었다 — 그때 액자가 최신 기도로 되돌아갔다)
  let featuredPrayer = featuredId ? (prayers.find((p) => p.id === featuredId) ?? null) : null
  if (featuredId && !featuredPrayer) {
    const { data: one } = await supabase
      .from('shrine_wishes')
      .select('id, wish_text, family_member_id, created_at')
      .eq('id', featuredId)
      .eq('shrine_id', shrineId)
      .eq('is_owner_wish', true)
      .maybeSingle()
    featuredPrayer = one ? toPrayer(one, nameOf) : null
  }

  return {
    prayers,
    total: count ?? prayers.length,
    featuredId,
    featuredPrayer,
  }
}

/**
 * 액자에 걸 기도를 고른다. null 이면 «최신 기도» 기본값으로 되돌린다.
 *
 * 🔴 **소유 확인이 여기서 끝난다.** featured_wish_id 는 컬럼 그랜트로 열려 있고 FK 는 «존재하는
 *    기도»만 보므로, 확인이 없으면 남의 기도 id 를 자기 액자에 걸 수 있다. 그 기도가 이 신당의
 *    소유자 기도인지 먼저 묻고, 아니면 조용히 거절한다.
 */
export async function setFeaturedPrayer(
  shrineId: string,
  wishId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { data: shrine } = await supabase.from('shrines').select('user_id').eq('id', shrineId).maybeSingle()
  if (!shrine || shrine.user_id !== user.id) return { success: false, error: 'FORBIDDEN' }

  if (wishId) {
    const { data: wish } = await supabase
      .from('shrine_wishes')
      .select('id')
      .eq('id', wishId)
      .eq('shrine_id', shrineId)
      .eq('is_owner_wish', true)
      .maybeSingle()
    if (!wish) return { success: false, error: 'NOT_FOUND' }
  }

  const { error } = await supabase.from('shrines').update({ featured_wish_id: wishId }).eq('id', shrineId)
  if (error) {
    logger.error('[prayer] 액자 걸기 실패:', error)
    return { success: false, error: 'SAVE_FAILED' }
  }

  revalidatePath('/protected/shrine')
  return { success: true }
}

/**
 * 100편 상한 — 넘치면 **가장 오래된 기도부터** 물러난다.
 *
 * 기록 보관 상한(storage_limit)과 같은 규약이다. 상한을 넘겨 «저장이 거절»되는 편보다
 * 오래된 것이 조용히 물러나는 편이 백일기도의 서사(계속 올린다)에 맞는다.
 * 실패해도 기도 저장 자체는 성공으로 둔다 — 정리는 다음 기회에 다시 시도된다.
 */
async function prunePrayers(supabase: SupabaseClient, shrineId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('shrine_wishes')
      .select('id')
      .eq('shrine_id', shrineId)
      .eq('is_owner_wish', true)
      .order('created_at', { ascending: false })
      .range(PRAYER_MAX_SAVED, PRAYER_MAX_SAVED + 49)
    if (error || !data || data.length === 0) return
    await supabase
      .from('shrine_wishes')
      .delete()
      .in(
        'id',
        data.map((r) => r.id as string)
      )
  } catch (e) {
    logger.warn('[prayer] 오래된 기도 정리 실패(비치명):', e)
  }
}
