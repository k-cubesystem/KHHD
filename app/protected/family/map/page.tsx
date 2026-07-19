import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFamilyEnergyMap } from '@/app/actions/shrine/energy-map'
import { FamilyEnergyMapView } from '@/components/family/FamilyEnergyMap'

export const metadata: Metadata = {
  title: '우리 가족 기운 지도',
  description: '가족 구성원의 오행 균형을 한눈에 비교합니다',
}

export const dynamic = 'force-dynamic'

export default async function FamilyEnergyMapPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const data = await getFamilyEnergyMap()

  // 본인 1명뿐이면 비교할 게 없다 — 지도 대신 가족 등록으로 안내
  if (!data || data.entries.length < 2) {
    return (
      <div className="min-h-screen w-full max-w-[480px] mx-auto px-4 py-16">
        <div className="text-center space-y-5 border border-dashed border-gold-500/20 bg-surface/20 rounded-xl p-10">
          <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">氣運 地圖</p>
          <h1 className="text-xl font-serif font-bold text-ink-light">아직 견줄 기운이 없습니다</h1>
          <p className="text-sm text-ink-light/55 leading-relaxed">
            가족을 한 분이라도 등록하시면
            <br />
            서로의 오행을 나란히 두고 볼 수 있어요.
          </p>
          <Link
            href="/protected/family"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 text-sm font-serif"
          >
            가족 등록하러 가기
          </Link>
        </div>
      </div>
    )
  }

  return <FamilyEnergyMapView data={data} />
}
