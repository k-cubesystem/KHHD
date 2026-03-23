import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { FamilyPageClient } from './family-page-client'

export const metadata: Metadata = {
  title: '가족 관리',
  description: '소중한 인연들의 사주를 체계적으로 관리하세요',
}

export default async function FamilyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <FamilyPageClient initialMembers={[]} isGuest />
  }

  let members: FamilyMemberWithMissions[] = []
  try {
    members = await getFamilyWithMissions()
  } catch {
    // Fallback to empty if fetch fails -- client can retry via server action
  }

  return <FamilyPageClient initialMembers={members} isGuest={false} />
}
