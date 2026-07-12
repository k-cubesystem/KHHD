import { redirect } from 'next/navigation'

// 신당 3.0 대화는 고민상담(해화지기)으로 통합됨. 구 링크·북마크는 리다이렉트.
export default function ShrineChatRedirect() {
  redirect('/protected/ai-shaman')
}
