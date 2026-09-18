import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { getOrCreateReferralCode, getReferralStats } from '@/app/actions/user/referral'
import { createClient } from '@/lib/supabase/server'
import { REFERRAL_PASSES, REFERRAL_VALID_DAYS } from '@/lib/domain/entitlement/pass'
import ReferralClient from './ReferralClient'

export const metadata: Metadata = {
  title: '친구 초대 | 해화당',
  description: '친구를 초대하고 함께 이용권을 받아 보세요.',
}

export default async function ReferralPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // 추천 코드 + 통계 병렬 조회
  const [codeResult, statsResult] = await Promise.all([getOrCreateReferralCode(), getReferralStats()])

  if (!codeResult.success || !codeResult.code || !codeResult.referralLink) {
    return (
      <div className="min-h-screen bg-background text-ink-light flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-ink-light/60">추천 코드를 불러오지 못했습니다.</p>
          <Link href="/protected" className="text-primary text-sm underline">
            돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-ink-light pb-24">
      {/* 헤더 */}
      <header className="px-4 pt-12 pb-6">
        <Link
          href="/protected"
          className="inline-flex items-center gap-2 text-ink-light/50 hover:text-primary transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">돌아가기</span>
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-ink-light">친구 초대</h1>
        </div>
        <p className="text-sm text-ink-light/50">
          친구가 초대 링크로 가입하면 두 분께 각각{' '}
          <span className="text-primary font-bold">이용권 {REFERRAL_PASSES}장</span>을 드려요 (유효기간{' '}
          {REFERRAL_VALID_DAYS}일)
        </p>
      </header>

      {/* 클라이언트 컴포넌트 */}
      <section className="px-4">
        <ReferralClient
          referralCode={codeResult.code}
          referralLink={codeResult.referralLink}
          totalReferrals={statsResult.totalReferrals ?? 0}
          recentReferrals={statsResult.recentReferrals ?? []}
        />
      </section>
    </div>
  )
}
