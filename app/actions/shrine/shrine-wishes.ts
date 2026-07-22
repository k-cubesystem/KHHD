'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addBokPoints } from '@/app/actions/payment/bok-points'

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
}): Promise<{ success: boolean; error?: string }> {
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

  revalidatePath(`/shrine/${shrine.user_id}`)
  return { success: true }
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
