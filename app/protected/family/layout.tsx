import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { MembershipGate } from '@/components/shared/membership-gate'
import { GENERIC_MEMBERSHIP_BENEFIT_LINES } from '@/lib/domain/payment/membership-benefits'

/**
 * 가족관리 계열 전체(map·compatibility-matrix 포함) 멤버십 게이트.
 * 인덱스만 게이트하면 하위 라우트 딥링크가 우회됐다(4차 CONCERN #1) — 레이아웃에서 일괄 차단.
 * 등록된 가족 데이터는 보존되며 가입 즉시 복원 노출된다.
 */
export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const membership = await getCurrentUserMembership()
  if (!membership) {
    return (
      <MembershipGate
        feature="family"
        title="가족 관리"
        description="가족의 사주를 등록해 기운 지도를 보고, 구성원별 풀이 미션과 종합사주풀이까지 이어갑니다. 멤버십 회원 전용입니다."
        benefits={[
          '가족 구성원 등록 · 기운 지도',
          '구성원별 5대 풀이 미션 & 종합사주풀이',
          '가족 신당 · 닮은꼴 운세',
          ...GENERIC_MEMBERSHIP_BENEFIT_LINES,
        ]}
      />
    )
  }
  return <>{children}</>
}
