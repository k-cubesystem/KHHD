import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { MembershipGate } from '@/components/shared/membership-gate'
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

  // 게이트: 가족관리는 멤버십 전용(진입 게이트만 — 가족 한도 로직은 보호파일, 무변경). 마스터는 통과.
  const membership = await getCurrentUserMembership()
  if (!membership) {
    return (
      <MembershipGate
        feature="family"
        title="가족 관리"
        description="소중한 인연들의 사주를 한곳에서 관리하고, 가족별 신당·궁합·미션을 이어갑니다. 멤버십 회원 전용 기능입니다."
        benefits={[
          '가족별 사주 · 신당 · 궁합 관리',
          '가족 미션과 인연 네트워크',
          '매일 복채 정액 + 고민상담 무제한 + 전체 기록 평생 보관',
        ]}
      />
    )
  }

  let members: FamilyMemberWithMissions[] = []
  try {
    members = await getFamilyWithMissions()
  } catch {
    // Fallback to empty if fetch fails -- client can retry via server action
  }

  return <FamilyPageClient initialMembers={members} isGuest={false} />
}
