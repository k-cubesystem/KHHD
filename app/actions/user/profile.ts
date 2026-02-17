'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface SaveProfileData {
  fullName: string
  gender: string
  birthDate: string
  birthTime: string
  calendarType: string
  homeAddress: string
  workAddress: string
  avatarUrl: string
}

export async function saveProfile(data: SaveProfileData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요합니다.' }

  const adminClient = createAdminClient()

  // admin client로 upsert → RLS 우회
  const { error: profileError } = await adminClient.from('profiles').upsert(
    {
      id: user.id,
      full_name: data.fullName || user.email?.split('@')[0] || '사용자',
      email: user.email,
      avatar_url: data.avatarUrl || null,
      home_address: data.homeAddress || null,
      work_address: data.workAddress || null,
      gender: data.gender || 'male',
      birth_date: data.birthDate || null,
      birth_time: data.birthTime || null,
      calendar_type: data.calendarType || 'solar',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    console.error('Profile upsert error:', profileError)
    return { success: false, error: profileError.message || '프로필 저장 실패' }
  }

  // wallet 없으면 생성 (신규 유저 보장)
  await adminClient
    .from('wallets')
    .upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id', ignoreDuplicates: true })

  return { success: true }
}

interface SaveFamilyMemberData {
  userId: string
  name: string
  gender: string
  birthDate: string
  birthTime: string
  calendarType: string
}

export async function saveSelfFamilyMember(data: SaveFamilyMemberData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== data.userId) return { success: false, error: '권한 없음' }

  const adminClient = createAdminClient()

  // 기존 '본인' 레코드 확인
  const { data: existing } = await adminClient
    .from('family_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('relationship', '본인')
    .maybeSingle()

  const memberData = {
    user_id: user.id,
    relationship: '본인',
    name: data.name || '나',
    gender: ['male', 'female'].includes(data.gender) ? data.gender : 'male',
    birth_date: data.birthDate,
    birth_time: data.birthTime || null,
    calendar_type: ['solar', 'lunar'].includes(data.calendarType) ? data.calendarType : 'solar',
  }

  if (existing) {
    const { error } = await adminClient
      .from('family_members')
      .update(memberData)
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await adminClient.from('family_members').insert(memberData)
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}
