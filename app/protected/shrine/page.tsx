import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSceneData } from '@/app/actions/shrine/scene'
import { ShrineRoomClient } from '@/components/shrine/scene/ShrineRoomClient'
import { ShrineSetupForm } from '@/components/shrine/ShrineSetupForm'

export default async function ShrinePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const scene = await getSceneData()

  // 신당 없으면 생성 폼
  if (!scene) {
    return (
      <div className="min-h-screen px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">神 堂</p>
          <h1 className="text-2xl font-serif font-bold text-ink-light">나의 신당</h1>
          <p className="text-sm text-ink-light/50 font-sans">사주·관상·손금이 깃든 나만의 신당을 만들어보세요</p>
        </div>
        <ShrineSetupForm />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-5">
      <ShrineRoomClient scene={scene} />
    </div>
  )
}
