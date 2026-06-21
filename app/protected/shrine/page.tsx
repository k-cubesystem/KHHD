import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyShrine } from '@/app/actions/shrine/shrine'
import { getCatalogItems } from '@/app/actions/shrine/shrine-items'
import { getWishes } from '@/app/actions/shrine/shrine-wishes'
import { ShrineCanvas } from '@/components/shrine/ShrineCanvas'
import { ShrineWishForm } from '@/components/shrine/ShrineWishForm'
import { ShrineWishLog } from '@/components/shrine/ShrineWishLog'
import { ShrineSetupForm } from '@/components/shrine/ShrineSetupForm'
import Link from 'next/link'
import { Share2, Settings } from 'lucide-react'

export default async function ShrinePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [shrine, catalogItems] = await Promise.all([getMyShrine(), getCatalogItems()])

  // 신당 없으면 생성 폼
  if (!shrine) {
    return (
      <div className="min-h-screen px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">神 堂</p>
          <h1 className="text-2xl font-serif font-bold text-ink-light">나의 신당</h1>
          <p className="text-sm text-ink-light/50 font-sans">가족의 복을 기원하는 나만의 신당을 만들어보세요</p>
        </div>
        <ShrineSetupForm />
      </div>
    )
  }

  const { wishes } = await getWishes(shrine.id, 0, 10)

  return (
    <div className="min-h-screen px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.4em] text-gold-500/40 font-serif">나의 신당</p>
          <h1 className="text-xl font-serif font-bold text-ink-light">{shrine.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/shrine/${user.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-sans text-gold-500 border border-gold-500/20 bg-gold-500/5"
          >
            <Share2 className="w-3.5 h-3.5" />
            공유
          </Link>
          <Link
            href="/protected/shrine/setup"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-sans text-ink-light/50 border border-white/5"
          >
            <Settings className="w-3.5 h-3.5" />
            설정
          </Link>
        </div>
      </div>

      {/* 신당 캔버스 (슬롯 그리드) */}
      <ShrineCanvas shrine={shrine} catalogItems={catalogItems} isOwner={true} />

      {/* 소원 기원 폼 */}
      <ShrineWishForm shrineId={shrine.id} isOwner={true} />

      {/* 소원 로그 */}
      <ShrineWishLog wishes={wishes} shrineId={shrine.id} />
    </div>
  )
}
