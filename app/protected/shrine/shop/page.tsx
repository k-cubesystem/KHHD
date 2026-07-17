import { redirect } from 'next/navigation'

// 신물 상점은 통합 상점(신물 탭)으로 흡수됨 (2026-07-17). 구 링크·북마크는 리다이렉트.
export default function ShrineShopRedirect() {
  redirect('/protected/store?tab=items')
}
