import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRitualState } from '@/app/actions/ritual/loop'
import RitualClient from './ritual-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '초하루 의례 | 청담해화당',
  description: '매달 초하루, 식구들 안부를 여쭙고 신당에 기원을 올립니다.',
}

/** 유저의 활성 신당 테마 방 이미지 — 없으면 기본 반가(banga). */
async function getRitualRoomUrl(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const { data: shrine } = await supabase
      .from('shrines')
      .select('active_pack_id')
      .eq('user_id', user.id)
      .is('family_member_id', null)
      .maybeSingle()
    let code = 'banga'
    if (shrine?.active_pack_id) {
      const { data: pack } = await supabase
        .from('shrine_theme_packs')
        .select('code')
        .eq('id', shrine.active_pack_id)
        .maybeSingle()
      if (pack?.code) code = String(pack.code)
    }
    return `/shrine/themes/${code}/room.webp`
  } catch {
    return '/shrine/themes/banga/room.webp'
  }
}

export default async function RitualPage() {
  const state = await getRitualState()
  if (!state) redirect('/auth/login')
  if (!state.enabled) redirect('/protected/analysis')

  const roomUrl = await getRitualRoomUrl()
  return <RitualClient initial={state} roomUrl={roomUrl} />
}
