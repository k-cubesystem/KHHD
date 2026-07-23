import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { MembershipGate } from '@/components/shared/membership-gate'

/**
 * 신당 계열 전체(deities·shop·setup·chat 포함) 멤버십 게이트.
 * 인덱스 페이지의 자체 게이트만으론 하위 라우트 딥링크가 우회됐다(4차 CONCERN #1) —
 * 레이아웃에서 한 번에 막는다. 공개 신당(/shrine/[userId])은 /protected 밖이라 영향 없음.
 */
export default async function ShrineLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const membership = await getCurrentUserMembership()
  if (!membership) {
    return (
      <MembershipGate
        feature="shrine"
        title="나만의 신당"
        description="사주·관상·손금이 깃든 나만의 신당을 만들고, 신위를 모셔 매일의 기운을 돌봅니다. 멤버십 회원 전용 공간입니다."
        benefits={[
          '나·가족별 신당과 신위 모시기',
          '소원 기원 · 방명록 · 배치 효험',
          '매일 복채 정액 + 전체 기록 평생 보관',
          '고민상담 채팅 · 가족관리 포함',
        ]}
      />
    )
  }
  return <>{children}</>
}
