import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMembershipCancelOverview } from '@/app/actions/payment/cancel-request'
import { MembershipCancelForm } from './membership-cancel-form'

export const metadata: Metadata = {
  title: '멤버십 해지 | 청담해화당',
  description: '멤버십을 직접 해지하고 잔여기간을 일할 환불받으실 수 있습니다.',
}

export const dynamic = 'force-dynamic'

export default async function MembershipCancelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const overview = await getMembershipCancelOverview()

  return (
    <div className="w-full max-w-[480px] mx-auto px-3 text-ink-light font-sans pb-16">
      <div className="px-1 py-4 flex items-center gap-4 border-b border-primary/10 mb-6">
        <Link
          href="/protected/store?tab=membership"
          className="p-1 -ml-1 hover:bg-surface/10 transition-colors rounded-full"
        >
          <ChevronLeft className="w-5 h-5 text-ink-light/80" strokeWidth={1} />
        </Link>
        <h1 className="text-lg font-serif font-light text-ink-light">멤버십 해지</h1>
      </div>

      {!overview.hasSubscription ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-sm text-ink-light/60 font-light">이용 중인 멤버십이 없습니다.</p>
          <Link
            href="/protected/store?tab=membership"
            className="inline-block text-xs text-primary underline underline-offset-4 hover:text-primary/80"
          >
            멤버십 둘러보기
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-light/70 font-light leading-relaxed px-1 mb-6">
            해지하시면 다음 결제부터 청구되지 않습니다. 이미 받으신 복채는 회수하지 않으니 그대로 쓰셔도 됩니다.
          </p>
          <MembershipCancelForm overview={overview} />
          <p className="text-[11px] text-ink-light/35 font-light leading-relaxed mt-8 px-1">
            환불금은 결제하신 수단으로 돌아가며, 카드사 사정에 따라 영업일 기준 최대 7일이 걸릴 수 있습니다. 자세한
            내용은{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink-light/60">
              이용약관 제7조
            </Link>
            를 확인해주세요.
          </p>
        </>
      )}
    </div>
  )
}
