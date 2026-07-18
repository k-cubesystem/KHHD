import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listMyNotifications } from '@/app/actions/core/user-notifications'
import { NotificationsClient } from './notifications-client'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const items = await listMyNotifications()
  return <NotificationsClient initialItems={items} />
}
