import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCircleEnergy } from '@/app/actions/circle/energy'
import { getRecentTogether } from '@/app/actions/circle/narrative'
import { getShopLinks } from '@/app/actions/circle/shop-links'
import { FAMILY_CIRCLE_ID } from '@/lib/domain/circle/circle'
import { allElementNeeds, allNeedKeywords } from '@/lib/domain/circle/element-lore'
import { canPrintTeamSheet } from '@/lib/domain/circle/print-access'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { CircleEnergyMapView } from '@/components/family/circle-energy-map'

export const metadata: Metadata = {
  title: '우리 가족 기운 지도',
  description: '가족 구성원의 오행을 한 사람씩 오각형으로 보고, 서로의 기운은 AI 가 풀어 줍니다',
}

export const dynamic = 'force-dynamic'

function EmptyState({ title, body, cta }: { title: string; body: React.ReactNode; cta: string }) {
  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto px-4 py-16">
      <div className="text-center space-y-5 border border-dashed border-gold-500/20 bg-surface/20 rounded-xl p-10">
        <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">氣運 地圖</p>
        <h1 className="text-xl font-serif font-bold text-ink-light">{title}</h1>
        <p className="text-sm text-ink-light/55 leading-relaxed">{body}</p>
        <Link
          href="/protected/family"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 text-sm font-serif"
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}

/**
 * 기운 지도 v3 — 가족(가상 그룹)과 내 그룹이 **같은 화면**. 한 사람씩 오각형, 팩트 세 줄, 나머지는 복채 AI(함께 보기).
 * 쿠팡 링크는 다섯 기운의 물건 전부를 한 번에 받아 둔다(전역 30일 캐시) — 고르는 사람이 바뀌어도 서버를 다시 부르지 않는다.
 */
export default async function FamilyEnergyMapPage({ searchParams }: { searchParams: Promise<{ circle?: string }> }) {
  const { circle } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const circleId = circle && circle !== FAMILY_CIRCLE_ID ? circle : FAMILY_CIRCLE_ID
  const [payload, membership, recentTogether, shopLinks] = await Promise.all([
    getCircleEnergy(circleId),
    getCurrentUserMembership(),
    getRecentTogether(),
    getShopLinks(allNeedKeywords()),
  ])

  if (!payload && circleId !== FAMILY_CIRCLE_ID) {
    return (
      <EmptyState title="그 그룹을 찾지 못했습니다" body="지워졌거나 내 그룹이 아닙니다." cta="가족·인연 관리로 가기" />
    )
  }

  // 본인 1명뿐이면 함께 볼 사람이 없다 — 지도 대신 가족 등록으로 안내
  if (!payload || payload.energy.entries.length < 2) {
    return (
      <EmptyState
        title="아직 견줄 기운이 없습니다"
        body={
          <>
            가족을 한 분이라도 등록하시면
            <br />
            서로의 오행을 함께 볼 수 있어요.
          </>
        }
        cta="가족 등록하러 가기"
      />
    )
  }

  return (
    <CircleEnergyMapView
      payload={payload}
      sheet={canPrintTeamSheet(membership?.tier) ? 'print' : 'upsell'}
      recentTogether={recentTogether}
      needs={allElementNeeds()}
      shopLinks={shopLinks}
    />
  )
}
