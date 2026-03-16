import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { getFamilyFortuneBreakdown } from '@/app/actions/fortune/fortune'
import { FamilyPageClient } from './family-page-client'
import { FamilyFortuneStatus } from '@/components/fortune/family-fortune-status'

export const metadata: Metadata = {
  title: '가족 관리',
  description: '소중한 인연들의 사주를 체계적으로 관리하세요',
}

async function FamilyFortuneSection() {
  const breakdown = await getFamilyFortuneBreakdown()
  if (!breakdown || breakdown.length === 0) return null
  return <FamilyFortuneStatus members={breakdown} />
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

  return (
    <>
      <Suspense fallback={<div className="h-32 bg-surface/10 border border-white/5 rounded-xl animate-pulse mx-4" />}>
        <FamilyFortuneSection />
      </Suspense>
      <FamilyPageClient initialMembers={members} isGuest={false} />
    </>
  )
}
