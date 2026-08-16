'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isEdgeEnabled } from '@/lib/supabase/edge-config'
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
import { logger } from '@/lib/utils/logger'
import { toMemberCategory, type MemberCategory } from '@/lib/domain/family/member-category'
import { addBokPoints } from '@/lib/services/bok-grant'
import { canAddRelationship } from '@/app/actions/payment/membership'

/**
 * 달력 종류와 윤달 여부를 FormData 에서 읽는다.
 * 윤달은 음력일 때만 유효 — 양력이면 항상 false 로 정규화한다(본인 경로 saveProfile·saveSelfFamilyMember 와 동일 규약).
 * family_members.is_leap_month 는 NOT NULL DEFAULT false 이므로 null 대신 false 를 쓴다.
 */
function readCalendarFields(formData: FormData): { calendarType: string; isLeapMonth: boolean } {
  const calendarType = formData.get('calendar_type') as string // 'solar' | 'lunar'
  return {
    calendarType,
    isLeapMonth: calendarType === 'lunar' && formData.get('is_leap_month') === 'true',
  }
}

export async function getFamilyMembers() {
  if (isEdgeEnabled('user')) {
    return invokeEdgeSafe('user', { action: 'getFamilyMembers' })
  }
  // Demo Mode check
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    logger.warn('Supabase credentials missing. Running in Demo Mode.')
    return [
      {
        id: 'demo-1',
        name: '권지용 (데모)',
        relationship: '본인',
        birth_date: '1988-08-18',
        birth_time: '08:18',
        calendar_type: 'solar',
        gender: 'male',
      },
      {
        id: 'demo-2',
        name: '이효리 (데모)',
        relationship: '배우자',
        birth_date: '1979-05-10',
        birth_time: '12:00',
        calendar_type: 'solar',
        gender: 'female',
      },
    ]
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    logger.error('Auth Error in getFamilyMembers:', userError)
  }

  if (!user) {
    logger.warn('No authenticated user found in getFamilyMembers')
    // If no user, but we want the user to experience it, we could return demo data here too
    // but for now let's just return empty or error if we really need auth
    return []
  }

  logger.log(`Fetching family members for user: ${user.id}`)

  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('Error fetching family members:', error.message)
    return []
  }

  logger.log(`Found ${data?.length || 0} family members for user ${user.id}`)
  return data || []
}

/**
 * 인연 즉석 등록 — **풀이 화면을 떠나지 않고** 사람을 하나 더한다.
 *
 * ## 왜 별도 액션인가
 * `addFamilyMember` 는 폼 제출용이라 아무것도 돌려주지 않고 가족 페이지를 갱신한다. 대상
 * 선택기에서 쓰려면 «방금 만든 사람»을 곧바로 골라 줘야 하는데, 그러려면 id 가 필요하다.
 * 사주를 보려다 등록하러 나갔다가 돌아오지 않는 이탈이 이 함수가 막는 것이다.
 *
 * 🔴 한도 검사는 여기서도 **다시** 한다. UI 가드는 우회 가능하고, 이 함수도 공개 엔드포인트다.
 */
export async function quickAddDestinyTarget(input: {
  name: string
  birthDate: string
  birthTime?: string | null
  gender?: 'male' | 'female'
  calendarType?: 'solar' | 'lunar'
  isLeapMonth?: boolean
  relationship: string
  category: MemberCategory
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const name = input.name?.trim()
  const birthDate = input.birthDate?.trim()
  if (!name) return { success: false, error: '이름을 입력해주세요.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate ?? '')) return { success: false, error: '생년월일을 확인해주세요.' }

  const limitCheck = await canAddRelationship()
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.message ?? '인연 등록 한도에 도달했습니다.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const { data, error } = await supabase
    .from('family_members')
    .insert({
      user_id: user.id,
      name,
      relationship: input.relationship?.trim() || (input.category === 'acquaintance' ? '지인' : '가족'),
      birth_date: birthDate,
      birth_time: input.birthTime || null,
      calendar_type: input.calendarType ?? 'solar',
      is_leap_month: input.isLeapMonth ?? false,
      gender: input.gender ?? 'male',
      member_category: toMemberCategory(input.category),
    })
    .select('id')
    .single()

  if (error || !data) {
    logger.error('[quickAddDestinyTarget] 등록 실패:', error?.message)
    return { success: false, error: '등록 중 오류가 발생했습니다.' }
  }

  await addBokPoints(50, 'REGISTER', undefined, `${name}님 인연 등록`).catch(() => {})
  revalidatePath('/protected/family')

  return { success: true, id: data.id }
}

export async function addFamilyMember(formData: FormData) {
  // 티어 한도 검증 — Edge 분기보다 먼저 둔다. UI 가드(family-page-client)는 우회 가능하므로
  // 서버 액션이 최종 방어선이다. 마스터는 getUserTierLimits 의 admin 분기로 통과한다.
  const limitCheck = await canAddRelationship()
  if (!limitCheck.allowed) {
    logger.warn(`인연 등록 한도 초과 차단: ${limitCheck.current}/${limitCheck.limit}`)
    throw new Error(limitCheck.message ?? '인연 등록 한도에 도달했습니다.')
  }

  if (isEdgeEnabled('user')) {
    await invokeEdgeSafe('user', { action: 'addFamilyMember', formData })
    return
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('인증된 사용자가 아닙니다.')
  }

  const birthTimeRaw = formData.get('birth_time') as string
  // "unknown"이면 null로 저장, 그 외에는 시간값 저장
  const birthTime = birthTimeRaw === 'unknown' || !birthTimeRaw ? null : birthTimeRaw

  const { calendarType, isLeapMonth } = readCalendarFields(formData)

  const rawData = {
    user_id: user.id,
    name: formData.get('name') as string,
    relationship: formData.get('relationship') as string,
    birth_date: formData.get('birth_date') as string,
    birth_time: birthTime,
    calendar_type: calendarType,
    is_leap_month: isLeapMonth,
    gender: formData.get('gender') as string,
    job: formData.get('job') as string,
    hobby: formData.get('hobby') as string,
    avatar_id: formData.get('avatar_id') as string,
    // 인연 갈래(2026-08-16). 값이 안 오면 가족 — 갈래가 없던 시절의 동작을 그대로 남긴다.
    member_category: toMemberCategory(formData.get('member_category') as string | null),
  }

  const { error } = await supabase.from('family_members').insert([rawData])

  if (error) {
    logger.error('Error adding family member:', error.message)
    throw new Error('가족 정보 등록 중 오류가 발생했습니다.')
  }

  // 복 포인트 적립 (인연 등록)
  const name = formData.get('name') as string
  await addBokPoints(50, 'REGISTER', undefined, `${name}님 인연 등록`).catch(() => {})

  revalidatePath('/protected/family')
}

export async function updateFamilyMember(formData: FormData) {
  if (isEdgeEnabled('user')) {
    await invokeEdgeSafe('user', { action: 'updateFamilyMember', formData })
    return
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('인증된 사용자가 아닙니다.')
  }

  const id = formData.get('id') as string
  if (!id) {
    throw new Error('수정할 대상의 ID가 필요합니다.')
  }

  const birthTimeRaw = formData.get('birth_time') as string
  const birthTime = birthTimeRaw === 'unknown' || !birthTimeRaw ? null : birthTimeRaw

  const { calendarType, isLeapMonth } = readCalendarFields(formData)

  const rawData = {
    name: formData.get('name') as string,
    relationship: formData.get('relationship') as string,
    birth_date: formData.get('birth_date') as string,
    birth_time: birthTime,
    calendar_type: calendarType,
    is_leap_month: isLeapMonth,
    gender: formData.get('gender') as string,
    job: formData.get('job') as string,
    hobby: formData.get('hobby') as string,
    avatar_id: formData.get('avatar_id') as string,
    // 인연 갈래(2026-08-16). 값이 안 오면 가족 — 갈래가 없던 시절의 동작을 그대로 남긴다.
    member_category: toMemberCategory(formData.get('member_category') as string | null),
  }

  const { error } = await supabase.from('family_members').update(rawData).eq('id', id).eq('user_id', user.id)

  if (error) {
    logger.error('Error updating family member:', error.message)
    throw new Error('가족 정보 수정 중 오류가 발생했습니다.')
  }

  revalidatePath('/protected/family')
}

export async function deleteFamilyMember(id: string) {
  if (isEdgeEnabled('user')) {
    await invokeEdgeSafe('user', { action: 'deleteFamilyMember', id })
    return
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('인증된 사용자가 아닙니다.')
  }

  const { error } = await supabase.from('family_members').delete().eq('id', id).eq('user_id', user.id)

  if (error) {
    logger.error('Error deleting family member:', error.message)
    throw new Error('가족 정보 삭제 중 오류가 발생했습니다.')
  }

  revalidatePath('/protected/family')
  revalidatePath('/protected')
}
