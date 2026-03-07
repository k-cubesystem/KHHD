import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: '홈',
  description: '청담해화당 메인 페이지',
}

export default function ProtectedPage() {
  redirect('/protected/analysis')
}
