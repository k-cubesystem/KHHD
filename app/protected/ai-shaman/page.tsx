import { ShamanChatInterface } from '@/components/ai/shaman-chat-interface'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '해화당 고민 상담소',
  description: '당신의 깊은 고민을 들어주는 명리학 기반 AI 상담소',
}

export default function AIShamanPage() {
  return (
    <ShamanChatInterface />
  )
}
