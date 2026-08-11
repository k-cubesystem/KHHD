import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getFamilyWithMissions, type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { getLinkedFamilies, listFamilyInviteLinks, type FamilyInviteSummary } from '@/app/actions/family-invite'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { MembershipGate } from '@/components/shared/membership-gate'
import { LinkedFamiliesSection } from '@/components/family/linked-families-section'
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
  // ⚠️ 「연결된 가족」은 게이트 **앞**에 둔다 — 초대를 수락한 쪽은 무료 회원인 경우가 흔하고,
  //    자기가 어느 가족에 붙어 있는지는 멤버십과 무관하게 보여야 한다.
  const [membership, linkedFamilies] = await Promise.all([getCurrentUserMembership(), getLinkedFamilies()])

  if (!membership) {
    return (
      <div className="flex w-full flex-col gap-5">
        {linkedFamilies.length > 0 && (
          <div className="mx-auto w-full max-w-[480px] px-3 pt-6">
            <LinkedFamiliesSection families={linkedFamilies} />
          </div>
        )}
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
      </div>
    )
  }

  let members: FamilyMemberWithMissions[] = []
  try {
    members = await getFamilyWithMissions()
  } catch {
    // Fallback to empty if fetch fails -- client can retry via server action
  }

  let invites: FamilyInviteSummary[] = []
  let linkedMemberIds: string[] = []
  try {
    const [inviteRows, { data: linkedRows }] = await Promise.all([
      listFamilyInviteLinks(),
      supabase.from('family_members').select('id').eq('user_id', user.id).not('linked_user_id', 'is', null),
    ])
    invites = inviteRows
    linkedMemberIds = (linkedRows ?? []).map((row) => row.id as string)
  } catch {
    // 초대 정보가 없어도 가족 목록은 떠야 한다 — 패널만 빈 상태로 뜬다.
  }

  return (
    <FamilyPageClient
      initialMembers={members}
      isGuest={false}
      invites={invites}
      linkedMemberIds={linkedMemberIds}
      linkedFamilies={linkedFamilies}
    />
  )
}
