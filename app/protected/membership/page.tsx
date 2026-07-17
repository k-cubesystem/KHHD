import { redirect } from 'next/navigation'

// 멤버십 단독 페이지는 통합 상점으로 흡수됨 (2026-07-17). 구 링크·북마크는 리다이렉트.
// 구독 체크아웃·관리 흐름은 /protected/membership/checkout, /manage 에 그대로 남는다.
export default function MembershipRedirect() {
  redirect('/protected/store?tab=membership')
}
