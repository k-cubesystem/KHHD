import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { getCircleEnergy } from '@/app/actions/circle/energy'
import { FAMILY_CIRCLE_ID } from '@/lib/domain/circle/circle'
import { canPrintTeamSheet } from '@/lib/domain/circle/print-access'
import { CirclePrintSheet } from '@/components/family/circle-print-sheet'

export const metadata: Metadata = {
  title: '우리 팀 기운 한 장',
  description: '무리 전원의 모자란 기운과 곁에 둘 것을 한 장으로',
}

export const dynamic = 'force-dynamic'

function Panel({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto px-4 py-16">
      <div className="text-center space-y-5 border border-dashed border-gold-500/20 bg-surface/20 rounded-xl p-10">
        <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">氣運 一張</p>
        <h1 className="text-xl font-serif font-bold text-ink-light">{title}</h1>
        <p className="text-sm text-ink-light/55 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
          {body}
        </p>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 text-sm font-serif"
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}

/**
 * 「우리 팀 기운 한 장」 — BUSINESS 전용 인쇄물(PRD-energy-circle §8: BUSINESS 에 처음 생기는 제 이름값).
 * 가족 게이트(레이아웃) 안이므로 비회원은 이미 걸러졌다. 여기서는 티어만 본다.
 */
export default async function TeamSheetPage({ searchParams }: { searchParams: Promise<{ circle?: string }> }) {
  const { circle } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const membership = await getCurrentUserMembership()
  if (!canPrintTeamSheet(membership?.tier)) {
    return (
      <Panel
        title="BUSINESS 멤버십이 여는 한 장입니다"
        body="무리 전원의 모자란 기운과 책상 위에 둘 한 가지를 표 한 장으로 뽑아, 자리마다 놓아 줄 수 있습니다."
        href="/protected/store?tab=membership"
        cta="BUSINESS 멤버십 보기"
      />
    )
  }

  const payload = await getCircleEnergy(circle && circle !== FAMILY_CIRCLE_ID ? circle : FAMILY_CIRCLE_ID)
  if (!payload) {
    return (
      <Panel
        title="그 무리를 찾지 못했습니다"
        body="지워졌거나 내 무리가 아닙니다."
        href="/protected/family"
        cta="인연·무리로 가기"
      />
    )
  }

  const printedAt = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'Asia/Seoul' }).format(new Date())
  return <CirclePrintSheet payload={payload} printedAt={printedAt} />
}
