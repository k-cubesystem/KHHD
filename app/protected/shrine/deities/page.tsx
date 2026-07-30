import { redirect } from 'next/navigation'

/**
 * 신위전은 모아보기(신당테마·아이템·신위)의 한 탭으로 들어갔다 (CEO 6차 지시 2026-07-30).
 * 구 링크·북마크는 리다이렉트한다 — 같은 판테온을 두 주소로 그리면 한쪽만 고치는 사고가 난다
 * (신물 상점 /shrine/shop · 신당 대화 /shrine/chat 이 이미 같은 방식으로 접혀 있다).
 * 알림·가이드가 이 주소를 들고 있어 없앨 수는 없다.
 */
export default async function ShrineDeitiesRedirect({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams
  const qs = typeof member === 'string' && member.length > 0 ? `&member=${encodeURIComponent(member)}` : ''
  redirect(`/protected/shrine/collection?tab=deity${qs}`)
}
