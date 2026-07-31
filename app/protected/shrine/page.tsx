import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSceneData } from '@/app/actions/shrine/scene'
import { ShrineRoomClient } from '@/components/shrine/scene/ShrineRoomClient'
import { ShrineSetupForm } from '@/components/shrine/ShrineSetupForm'
import { ShrineTargetTabs, type ShrineTargetTab } from '@/components/shrine/ShrineTargetTabs'
import { FamilySummonGate } from '@/components/shrine/FamilySummonGate'
import { getWishes } from '@/app/actions/shrine/shrine-wishes'
import { getDevotionStatus } from '@/app/actions/shrine/devotion'
import { getAekmakStatus, getBaekilStatus, getChuljeonStatus, getObangkiStatus } from '@/app/actions/shrine/rituals'
import { getFamilyHallData, type FamilyHallData } from '@/app/actions/shrine/family-hall'
import { ShrineWishForm } from '@/components/shrine/ShrineWishForm'
import { ShrineWishLog } from '@/components/shrine/ShrineWishLog'
import { EL_KO } from '@/lib/domain/shrine/energy'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { MembershipGate } from '@/components/shared/membership-gate'
import { logger } from '@/lib/utils/logger'

/**
 * 사랑방 좌석 presence — 실패해도 **방 렌더를 막지 않는다**(null 이면 후원에 사랑방이 뜨지 않을 뿐).
 * 등급 게이트·좌석 스코프는 전부 getFamilyHallData 안에서 끝난다 — 여기서 role/tier 를 다시 보지 않는다.
 */
async function loadFamilyHall(): Promise<FamilyHallData | null> {
  try {
    return await getFamilyHallData()
  } catch (e) {
    logger.warn('[shrine] 사랑방 presence 로드 실패:', e)
    return null
  }
}

export default async function ShrinePage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 게이트: 신당은 멤버십 전용. 비멤버는 업셀(데이터는 보존 — 가입 시 그대로). 마스터는 통과.
  const membership = await getCurrentUserMembership()
  if (!membership) {
    return (
      <MembershipGate
        feature="shrine"
        title="나만의 신당"
        description="사주·관상·손금이 깃든 나만의 신당을 만들고, 신위를 모셔 매일의 기운을 돌봅니다. 멤버십 회원 전용 공간입니다."
        benefits={[
          '나·가족별 신당과 신위 모시기',
          '소원 기원 · 방명록 · 배치 효험',
          '매일 복채 정액 + 고민상담 무제한 + 전체 기록 평생 보관',
        ]}
      />
    )
  }

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
  // 기원 현황은 유저 단위(신당 무관) — 스트립·보상 트랙·소원 폼 뉘앙스에 공용.
  // 사랑방은 **본인 신당 탭 전용**이다(가족 탭에서는 그 가족 방이지 온 식구의 방이 아니다).
  // 여기서 같이 실어 내려보낸다 — 룸이 마운트 후 다시 부르면 클라 fetch 워터폴이 된다.
  // 액막이·오방기 현황도 유저 단위(신당 무관) — 남은 횟수와 오늘치 시드를 스트립이 즉시 그린다.
  // 백일기도도 같다 — 방 위 게이지의 원천이라 여기서 같이 실어 보낸다(클라 fetch 워터폴 회피).
  const [{ wishes }, devotion, familyHall, aekmak, obangki, chuljeon, baekil] = await Promise.all([
    getWishes(scene.shrineId, 0, 10),
    getDevotionStatus(),
    target ? Promise.resolve<FamilyHallData | null>(null) : loadFamilyHall(),
    getAekmakStatus(),
    getObangkiStatus(),
    getChuljeonStatus(),
    getBaekilStatus(),
  ])

  return (
    <div className="min-h-screen px-1 py-4">
      <div className="w-full max-w-[520px] mx-auto">{targetTabs}</div>
      <ShrineRoomClient
        scene={scene}
        devotion={devotion}
        familyHall={familyHall}
        aekmak={aekmak}
        obangki={obangki}
        chuljeon={chuljeon}
        baekil={baekil}
      />
      {/* 가족 신당 첫 진입 — 主神이 없으면 그 가족 사주로 강신 의식 */}
      {target && !scene.mainDeity && (
        <FamilySummonGate
          familyMemberId={target.id}
          memberName={target.name}
          yongsinKo={scene.profile.yongsin ? EL_KO[scene.profile.yongsin] : null}
        />
      )}

      {/* 오너 소원 기원 + 방명록 열람 (F-2) — 대상(본인/가족)을 소원에 새기고 로그에 표기(W2-b/c) */}
      <div className="w-full max-w-[430px] mx-auto mt-5 space-y-5">
        <ShrineWishForm
          shrineId={scene.shrineId}
          isOwner
          familyMemberId={target?.id ?? null}
          prayedToday={devotion?.prayedToday ?? false}
        />
        <ShrineWishLog wishes={wishes} shrineId={scene.shrineId} targetName={target?.name ?? '나'} />
      </div>
    </div>
  )
}
