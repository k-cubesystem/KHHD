import { ShamanChatInterface } from '@/components/ai/shaman-chat-interface'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI 신당 | 해화당',
  description: '천지인의 지혜로 당신의 고민을 풀어드리는 AI 상담',
}

import { EventBannersSection } from '@/components/events/event-banners-section'

export default function AIShamanPage() {
  return (
    <ShamanChatInterface>
      <EventBannersSection />
    </ShamanChatInterface>
  )
}
