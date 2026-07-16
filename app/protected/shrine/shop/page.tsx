import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getShopData } from '@/app/actions/shrine/inventory'
import { ShrineShopClient } from '@/components/shrine/ShrineShopClient'

export default async function ShrineShopPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: shrine } = await supabase
    .from('shrines')
    .select('id')
    .eq('user_id', user.id)
    .is('family_member_id', null)
    .maybeSingle()
  if (!shrine) redirect('/protected/shrine')

  const data = await getShopData()

  return (
    <div className="min-h-screen px-4 py-6 space-y-5">
      <div>
        <p className="text-[10px] tracking-[0.4em] text-gold-500/40 font-serif">봉헌소</p>
        <h1 className="text-xl font-serif font-bold text-ink-light">신물 상점</h1>
        <p className="text-xs text-ink-light/40 font-sans mt-1">
          신물을 보관함에 담고, 신당 꾸미기에서 방에 배치하세요
        </p>
      </div>

      <ShrineShopClient data={data} />
    </div>
  )
}
