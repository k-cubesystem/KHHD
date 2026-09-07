import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { getCirclesOverview, type CirclesOverview } from '@/app/actions/circle/circles'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { MembershipGate } from '@/components/shared/membership-gate'
import { GENERIC_MEMBERSHIP_BENEFIT_LINES } from '@/lib/domain/payment/membership-benefits'
import { FamilyPageClient } from './family-page-client'

export const metadata: Metadata = {
  title: '가족·인연 관리',
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

  // 게이트: 가족·인연 관리는 멤버십 전용(진입 게이트만 — 가족 한도 로직은 보호파일, 무변경). 마스터는 통과.
  // 가족 초대(링크로 실계정 잇기)는 2026-09-07 CEO 지시로 뺐다 — 복잡하기만 하고 실사용이 없었다.
  const membership = await getCurrentUserMembership()

  if (!membership) {
    return (
      <div className="flex w-full flex-col gap-5">
        <MembershipGate
          feature="family"
          title="가족·인연 관리"
          description="소중한 인연들의 사주를 한곳에서 관리하고, 가족별 신당·궁합·미션을 이어갑니다. 멤버십 회원 전용 기능입니다."
          benefits={[
            '가족별 사주 · 신당 · 궁합 관리',
            '가족 미션과 인연 네트워크',
            ...GENERIC_MEMBERSHIP_BENEFIT_LINES,
          ]}
        />
      </div>
    )
  }

  let members: FamilyMemberWithMissions[] = []
  try {
    members = await getFamilyWithMissions()
  } catch {
    // Fallback to empty if fetch fails -- client can retry via server action
  }

  let circles: CirclesOverview | null = null
  try {
    circles = await getCirclesOverview()
  } catch {
    // 그룹 정보가 없어도 가족 목록은 떠야 한다 — 탭만 안내 상태로 뜬다.
  }

  return <FamilyPageClient initialMembers={members} isGuest={false} circles={circles} />
}
