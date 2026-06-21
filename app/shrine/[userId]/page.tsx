import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getShrineByUserId } from '@/app/actions/shrine/shrine'
import { getCatalogItems } from '@/app/actions/shrine/shrine-items'
import { getWishes } from '@/app/actions/shrine/shrine-wishes'
import { ShrineCanvas } from '@/components/shrine/ShrineCanvas'
import { ShrineWishForm } from '@/components/shrine/ShrineWishForm'
import { ShrineWishLog } from '@/components/shrine/ShrineWishLog'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ userId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params
  const shrine = await getShrineByUserId(userId)

  if (!shrine) return { title: '신당을 찾을 수 없습니다' }

  return {
    title: `${shrine.name} | 청담해화당 신당`,
    description: shrine.description ?? `${shrine.name}에 소원을 기원해보세요`,
    openGraph: {
      title: shrine.name,
      description: shrine.description ?? '소원을 기원하는 디지털 신당',
      images: [`/api/og/shrine/${userId}`],
    },
  }
}

export default async function PublicShrinePage({ params }: PageProps) {
  const { userId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [shrine, catalogItems] = await Promise.all([getShrineByUserId(userId), getCatalogItems()])

  if (!shrine) notFound()

  const isOwner = user?.id === userId
  const { wishes } = await getWishes(shrine.id, 0, 10)

  return (
    <div className="min-h-screen px-4 py-6 space-y-6">
      {/* 방문자 배너 */}
      {!isOwner && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}
        >
          <span className="text-xl">🏮</span>
          <div>
            <p className="text-xs font-serif text-gold-500/80 font-bold">{shrine.name} 방문 중</p>
            <p className="text-[10px] text-ink-light/30 font-sans">소원을 기원하면 복 포인트 +5 적립</p>
          </div>
        </div>
      )}

      {/* 신당 캔버스 */}
      <ShrineCanvas shrine={shrine} catalogItems={catalogItems} isOwner={isOwner} />

      {/* 소원 기원 폼 */}
      <ShrineWishForm shrineId={shrine.id} isOwner={isOwner} />

      {/* 소원 로그 */}
      <ShrineWishLog wishes={wishes} shrineId={shrine.id} />
    </div>
  )
}
