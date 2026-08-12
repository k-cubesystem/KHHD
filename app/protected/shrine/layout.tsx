// ⚠️ 연출 CSS 는 신당 계열 **전 라우트**에서 적재돼야 한다(감사 A2 P0-1).
//    종전에는 방 페이지 체인만 이 파일을 import 해서, 오방기·백일기도 **직접 진입**(새로고침·
//    프로필 버튼)에는 키프레임이 통째로 빠졌다 — 국면 전환이 animationend 에 걸려 있어
//    "방울이 울리고…"에서 영원히 멎는 무증상 교착이 됐다(콘솔 에러 0, 프로덕션 실측 재현).
//    개별 페이지 import 는 또 빠뜨린다 — 게이트와 같은 원리로 layout 한 곳에 둔다.
import '@/app/shrine-scene.css'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AnimAuditBadge } from '@/components/shrine/scene/AnimAuditBadge'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { MembershipGate } from '@/components/shared/membership-gate'
import { GENERIC_MEMBERSHIP_BENEFIT_LINES } from '@/lib/domain/payment/membership-benefits'

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
          '가족관리 입장 포함',
          ...GENERIC_MEMBERSHIP_BENEFIT_LINES,
        ]}
      />
    )
  }
  return (
    <>
      {children}
      {/* 연출 계측 — `?anim=1` 일 때만 뜬다. 신당 계열 전 라우트에서 재려고 레이아웃에 둔다
          (개별 페이지에 꽂으면 CSS 적재와 똑같은 이유로 어딘가 빠뜨린다) */}
      <Suspense fallback={null}>
        <AnimAuditBadge />
      </Suspense>
    </>
  )
}
