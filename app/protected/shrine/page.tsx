import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSceneData } from '@/app/actions/shrine/scene'
import { ShrineRoomClient } from '@/components/shrine/scene/ShrineRoomClient'
import { ShrineSetupForm } from '@/components/shrine/ShrineSetupForm'
import { ShrineTargetTabs, type ShrineTargetTab } from '@/components/shrine/ShrineTargetTabs'
import { FamilySummonGate } from '@/components/shrine/FamilySummonGate'
import { getWishes } from '@/app/actions/shrine/shrine-wishes'
import { ShrineWishForm } from '@/components/shrine/ShrineWishForm'
import { ShrineWishLog } from '@/components/shrine/ShrineWishLog'
import { EL_KO } from '@/lib/domain/shrine/energy'

export default async function ShrinePage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { member } = await searchParams
  const memberId = typeof member === 'string' && member.length > 0 ? member : null

  const [{ data: familyRows }, { data: profile }] = await Promise.all([
    // relationship='본인' 레코드는 '나' 탭(id=null)과 중복되므로 가족 탭에서 제외(family-page-client.tsx:46 동일 패턴)
    supabase
      .from('family_members')
      .select('id, name, avatar_id')
      .eq('user_id', user.id)
      .neq('relationship', '본인')
      .order('created_at'),
    supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle(),
  ])
  const family = familyRows ?? []

  const target = memberId ? (family.find((f) => f.id === memberId) ?? null) : null
  if (memberId && !target) redirect('/protected/shrine')

  const scene = await getSceneData(target?.id ?? null)

  const tabs: ShrineTargetTab[] = [
    { id: null, name: '나', avatarUrl: profile?.avatar_url ?? null },
    ...family.map((f) => ({ id: f.id, name: f.name, avatarId: f.avatar_id as string | null })),
  ]
  const targetTabs = family.length > 0 && <ShrineTargetTabs tabs={tabs} activeId={target?.id ?? null} />

  // 본인 신당 미생성 → 생성 폼. (가족 신당은 getSceneData 가 자동 생성)
  if (!scene) {
    if (target) redirect('/protected/shrine')
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

  // 오너도 자기 신당의 소원·방명록을 볼 수 있게(F-2). wishCount 는 ShrineRoomClient 배지에 표시.
  const { wishes } = await getWishes(scene.shrineId, 0, 10)

  return (
    <div className="min-h-screen px-1 py-4">
      <div className="w-full max-w-[520px] mx-auto">{targetTabs}</div>
      <ShrineRoomClient scene={scene} />
      {/* 가족 신당 첫 진입 — 主神이 없으면 그 가족 사주로 강신 의식 */}
      {target && !scene.mainDeity && (
        <FamilySummonGate
          familyMemberId={target.id}
          memberName={target.name}
          yongsinKo={scene.profile.yongsin ? EL_KO[scene.profile.yongsin] : null}
        />
      )}

      {/* 오너 소원 기원 + 방명록 열람 (F-2) */}
      <div className="w-full max-w-[430px] mx-auto mt-5 space-y-5">
        <ShrineWishForm shrineId={scene.shrineId} isOwner />
        <ShrineWishLog wishes={wishes} shrineId={scene.shrineId} />
      </div>
    </div>
  )
}
