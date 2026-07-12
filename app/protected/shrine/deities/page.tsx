import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDeities, getDeityBonds } from '@/app/actions/shrine/deities'
import { DeityPantheon } from '@/components/shrine/deities/DeityPantheon'

export const dynamic = 'force-dynamic'

export default async function DeitiesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [catalog, bonds] = await Promise.all([listDeities(), getDeityBonds()])

  return (
    <div className="min-h-screen px-4 py-6">
      <DeityPantheon catalog={catalog} bonds={bonds} />
    </div>
  )
}
