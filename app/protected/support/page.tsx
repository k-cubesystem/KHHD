import { Suspense } from 'react'
import { getMyTickets } from '@/app/actions/support/tickets'
import { MySupport } from './my-support'

export const dynamic = 'force-dynamic'

export const metadata = { title: '문의하기' }

export default async function SupportPage() {
  const tickets = await getMyTickets()

  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <MySupport initialTickets={tickets} />
    </Suspense>
  )
}
