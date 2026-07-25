import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyShrine } from '@/app/actions/shrine/shrine'
import { ShrineEditForm } from '@/components/shrine/ShrineEditForm'

export default async function ShrineSetupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const shrine = await getMyShrine()
  if (!shrine) redirect('/protected/shrine')

  return (
    <div className="min-h-screen px-4 py-8 space-y-6">
      <div className="text-center space-y-1">
        <p className="text-[10px] tracking-[0.5em] text-gold-500/40 font-serif">신당 설정</p>
        <h1 className="text-xl font-serif font-bold text-ink-light">신당 정보 수정</h1>
      </div>
      <ShrineEditForm shrine={shrine} />
    </div>
  )
}
