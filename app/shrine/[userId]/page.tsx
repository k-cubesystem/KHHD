import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getShrineByUserId } from '@/app/actions/shrine/shrine'
import { getPublicSceneData } from '@/app/actions/shrine/scene'
import { getWishes } from '@/app/actions/shrine/shrine-wishes'
import { ShrineRoomClient } from '@/components/shrine/scene/ShrineRoomClient'
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

  const scene = await getPublicSceneData(userId)
  if (!scene) notFound()

  const isOwner = user?.id === userId

  // 방문 카운트 증가 (비소유자, best-effort)
  if (!isOwner) {
    await supabase.rpc('increment_shrine_visitor', { p_shrine_id: scene.shrineId })
  }

  const { wishes } = await getWishes(scene.shrineId, 0, 10)

  return (
    <div className="min-h-screen px-4 py-5 space-y-5">
      {/* 방문자 배너 */}
      {!isOwner && (
        <div className="max-w-[430px] mx-auto rounded-xl px-4 py-3 flex items-center gap-3 border border-gold-500/[0.12] bg-gold-500/[0.06]">
          <span className="text-xl">🏮</span>
          <div>
            <p className="text-xs font-serif text-gold-500/80 font-bold">{scene.shrineName} 방문 중</p>
            <p className="text-[10px] text-ink-light/30 font-sans">신물을 탭해보고, 소원을 기원해보세요 (+5 복)</p>
          </div>
        </div>
      )}

      {/* 신당 미니룸 (읽기 전용) */}
      <ShrineRoomClient scene={scene} />

      {/* 소원 기원 폼 + 로그 */}
      <div className="max-w-[430px] mx-auto space-y-5">
        <ShrineWishForm shrineId={scene.shrineId} isOwner={isOwner} />
        <ShrineWishLog wishes={wishes} shrineId={scene.shrineId} />
      </div>
    </div>
  )
}
