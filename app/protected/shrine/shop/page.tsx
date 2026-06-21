import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCatalogItems } from '@/app/actions/shrine/shrine-items'
import { getMyShrine } from '@/app/actions/shrine/shrine'
import { ShrineShopClient } from '@/components/shrine/ShrineShopClient'

export default async function ShrineShopPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [shrine, catalogItems] = await Promise.all([getMyShrine(), getCatalogItems()])
  if (!shrine) redirect('/protected/shrine')

  // 보유 복 포인트 조회
  const { data: profile } = await supabase.from('user_profiles').select('bok_points').eq('id', user.id).single()

  const bokPoints = profile?.bok_points ?? 0

  return (
    <div className="min-h-screen px-4 py-6 space-y-6">
      <div>
        <p className="text-[10px] tracking-[0.4em] text-gold-500/40 font-serif">신당 아이템</p>
        <h1 className="text-xl font-serif font-bold text-ink-light">신물 상점</h1>
        <p className="text-xs text-ink-light/40 font-sans mt-1">
          보유 복 포인트: <span className="text-gold-500 font-bold">🌟 {bokPoints.toLocaleString()}</span>
        </p>
      </div>

      <ShrineShopClient catalogItems={catalogItems} shrine={shrine} bokPoints={bokPoints} />
    </div>
  )
}
