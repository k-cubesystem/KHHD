import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSceneData } from '@/app/actions/shrine/scene'
import { ShrineRoomClient } from '@/components/shrine/scene/ShrineRoomClient'
import { ShrineSetupForm } from '@/components/shrine/ShrineSetupForm'
import { getWishes, getFamilyPrayers } from '@/app/actions/shrine/shrine-wishes'
import { getDevotionStatus } from '@/app/actions/shrine/devotion'
import { getAekmakStatus, getChuljeonStatus, getObangkiStatus } from '@/app/actions/shrine/rituals'
import { getFamilyHallData, type FamilyHallData } from '@/app/actions/shrine/family-hall'
import { ShrineWishLog } from '@/components/shrine/ShrineWishLog'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { MembershipGate } from '@/components/shared/membership-gate'
import { GENERIC_MEMBERSHIP_BENEFIT_LINES } from '@/lib/domain/payment/membership-benefits'
import { logger } from '@/lib/utils/logger'

/**
 * 신당 — **하나의 신당에 가족을 함께 모신다** (CEO 2026-08-25).
 *
 * 🔴 가족별 신당(대상 탭·`?member=` 분기·가족 강신 의식)은 이날 지시로 **물러났다** —
 *    「불필요한 내용이야. 신당 안에 가족을 함께 모시는 것만 남겨줘.」
 *    가족 표현으로 남는 것은 이 신당 안의 **가족 선반장**(FamilyShelfWall)과 **기도 액자**
 *    (PrayerBoard — 백일기도 v2)다. 가족별 신당의 DB 행(shrines.family_member_id)은
 *    지우지 않았다 — 되살릴 때를 위한 데이터 보존이고, 이 화면은 본인 행만 읽는다.
 * 🔴 가족관리로 가는 문은 기도 올리기 시트(PrayerSheet)의 「가족 관리」 링크가 잇는다 —
 *    구 대상 탭 줄이 지던 몫이다. 시트는 의식 독·창방 팻말 어느 쪽으로도 열린다.
 */

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

export default async function ShrinePage() {
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
          '나의 신당에 가족을 함께 모시기',
          '가족 기도 액자 · 방명록 · 배치 효험',
          ...GENERIC_MEMBERSHIP_BENEFIT_LINES,
        ]}
      />
    )
  }

  const scene = await getSceneData(null)

  // 본인 신당 미생성 → 생성 폼
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

  // 오너도 자기 신당의 소원·방명록을 볼 수 있게(F-2). 기원 현황은 유저 단위 — 스트립·소원 폼 공용.
  // 액막이·오방기·척전 현황도 유저 단위 — 남은 횟수와 오늘치 시드를 독이 즉시 그린다.
  // 기도 액자(getFamilyPrayers)와 기도 대상 가족 목록도 여기서 같이 실어 보낸다(클라 fetch 워터폴 회피).
  const [{ wishes }, devotion, familyHall, aekmak, obangki, chuljeon, prayers, { data: familyRows }] =
    await Promise.all([
      getWishes(scene.shrineId, 0, 10),
      getDevotionStatus(),
      loadFamilyHall(),
      getAekmakStatus(),
      getObangkiStatus(),
      getChuljeonStatus(),
      getFamilyPrayers(scene.shrineId),
      // relationship='본인' 행은 기도 대상 「나」와 중복이라 제외(family-page-client.tsx:46 동일 패턴)
      supabase
        .from('family_members')
        .select('id, name, relationship')
        .eq('user_id', user.id)
        .neq('relationship', '본인')
        .order('created_at'),
    ])

  return (
    <div className="min-h-screen px-1 py-4">
      <ShrineRoomClient
        scene={scene}
        devotion={devotion}
        familyHall={familyHall}
        aekmak={aekmak}
        obangki={obangki}
        chuljeon={chuljeon}
        family={familyRows ?? []}
        prayers={prayers}
      />

      {/* 오너 소원 기원 + 방명록 열람 (F-2) — 기도 올리기는 방의 시트(PrayerSheet)가 든다 */}
      <div className="w-full max-w-[430px] mx-auto mt-5 space-y-5">
        <ShrineWishLog wishes={wishes} shrineId={scene.shrineId} targetName="나" />
      </div>
    </div>
  )
}
