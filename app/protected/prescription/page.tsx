import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPrescription } from '@/app/actions/circle/energy'
import { getGiftSummary, type GiftSummary } from '@/app/actions/circle/gift'
import { getCachedNarrative } from '@/app/actions/circle/narrative'
import { getShopLinks } from '@/app/actions/circle/shop-links'
import { PrescriptionView } from '@/components/family/prescription-view'

export const metadata: Metadata = {
  title: '기운 처방전',
  description: '모자란 기운이 삶에서 어떻게 보이는지, 어떤 기운이 왜 그것을 채우는지, 무엇을 곁에 둘지',
}

export const dynamic = 'force-dynamic'

/**
 * 기운 처방전 — 본인(`/protected/prescription`) 또는 가족(`?target=<family_members.id>`).
 *
 * 🔴 가족관리 계열(`/protected/family/*`)은 레이아웃이 멤버십으로 통째로 막지만, 이 화면은 그 밖에 둔다 —
 *    무료 사용자도 «내» 처방전 맛보기(①·②)는 봐야 멤버십이 무엇을 여는지 안다. 자르는 것은 서버 액션이다.
 */
export default async function PrescriptionPage({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
  const { target } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const isSelf = !target || target === 'self'
  const targetId = isSelf ? 'self' : target
  const [payload, giftSummary, narrative] = await Promise.all([
    getPrescription(targetId),
    isSelf ? Promise.resolve<GiftSummary | null>(null) : getGiftSummary(targetId),
    getCachedNarrative('prescription', targetId),
  ])
  // 실물 항목의 쿠팡 링크 — 전체 처방전(멤버십)에만. 키워드는 처방전에서 나온다(전역 캐시).
  const shopLinks =
    payload?.access === 'full'
      ? await getShopLinks([payload.prescription.items.real.desk, ...payload.prescription.items.real.gifts])
      : {}

  if (!payload) {
    return (
      <div className="min-h-screen w-full max-w-[480px] mx-auto px-4 py-16">
        <div className="text-center space-y-5 border border-dashed border-gold-500/20 bg-surface/20 rounded-xl p-10">
          <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">氣運 處方</p>
          <h1 className="text-xl font-serif font-bold text-ink-light">아직 처방을 지을 기운이 없습니다</h1>
          <p className="text-sm text-ink-light/55 leading-relaxed">
            {isSelf ? (
              <>
                생년월일을 등록하면
                <br />
                타고난 기운에서 처방전을 지어 드립니다.
              </>
            ) : (
              <>
                내 가족으로 등록된 사람만
                <br />
                처방전을 볼 수 있습니다.
              </>
            )}
          </p>
          <Link
            href={isSelf ? '/protected/profile' : '/protected/family'}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 text-sm font-serif"
          >
            {isSelf ? '내 정보 등록하기' : '가족·인연 관리로 가기'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <PrescriptionView
      payload={payload}
      targetId={targetId}
      giftSummary={giftSummary}
      narrative={narrative}
      shopLinks={shopLinks}
      backHref={isSelf ? '/protected/analysis' : '/protected/family/map'}
      backLabel={isSelf ? '사주·궁합' : '기운 지도'}
    />
  )
}
