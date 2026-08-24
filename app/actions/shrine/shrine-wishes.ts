'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addBokPoints } from '@/lib/services/bok-grant'
import { accrueDevotion } from '@/lib/services/devotion'
import { latestPrayerPerTarget, type FamilyPrayer } from '@/lib/domain/shrine/family-prayer'

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
 * 가족 기도 액자 데이터 — 이 신당의 **소유자 기도** 중 대상(본인·가족)별 최신 1건.
 *
 * 백일기도 v2(기도 액자)의 유일한 읽기 경로다. 새 테이블이 아니라 shrine_wishes 의
 * is_owner_wish + family_member_id 를 그대로 읽는다 — 「기도 올리기」(addWish)가 쓴 것을
 * 여기서 돌려받는 왕복이라 스키마 추가가 0 이다.
 *
 * 이름 해석까지 서버가 끝낸다(본인=나, 가족=family_members.name). 가족이 삭제돼 이름이
 * 없는 기도는 **버린다** — 주인 없는 액자를 걸지 않는다(도메인 buildPrayerFrames 와 같은 규율).
 */
export async function getFamilyPrayers(shrineId: string): Promise<FamilyPrayer[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // 최근 60건이면 대상 6명(선반 상한)의 최신을 넉넉히 덮는다 — 전체 스캔을 걸지 않는다.
  const { data, error } = await supabase
    .from('shrine_wishes')
    .select('wish_text, family_member_id, created_at')
    .eq('shrine_id', shrineId)
    .eq('is_owner_wish', true)
    .order('created_at', { ascending: false })
    .limit(60)

  if (error || !data) return []

  const { data: family } = await supabase.from('family_members').select('id, name').eq('user_id', user.id)
  const nameOf = new Map((family ?? []).map((f) => [f.id as string, f.name as string]))

  const rows: FamilyPrayer[] = []
  for (const w of data) {
    const memberId = (w.family_member_id as string | null) ?? null
    const name = memberId === null ? '나' : nameOf.get(memberId)
    if (!name) continue
    rows.push({
      memberId,
      name,
      text: (w.wish_text as string) ?? '',
      createdAt: (w.created_at as string) ?? '',
    })
  }
  return latestPrayerPerTarget(rows)
}
