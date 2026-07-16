import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDeities, getDeityBonds } from '@/app/actions/shrine/deities'
import { DeityPantheon } from '@/components/shrine/deities/DeityPantheon'

export const dynamic = 'force-dynamic'

export default async function DeitiesPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { member } = await searchParams
  let fmId = typeof member === 'string' && member.length > 0 ? member : null
  if (fmId) {
    // 본인 소유 가족만 유효 — 아니면 본인 신당 기준으로 폴백
    const { data: fam } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', fmId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!fam) fmId = null
  }

  const [catalog, bonds] = await Promise.all([listDeities(fmId), getDeityBonds(fmId)])

  return (
    <div className="min-h-screen px-4 py-6">
      <DeityPantheon catalog={catalog} bonds={bonds} familyMemberId={fmId} />
    </div>
  )
}
