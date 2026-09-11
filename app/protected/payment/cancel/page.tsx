import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ScrollText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getChargeCancelOverview } from '@/app/actions/payment/cancel-request'
import { ChargeCancelPanel } from './charge-cancel-panel'

export const metadata: Metadata = {
  title: '결제 취소',
  description: '복채 충전 결제를 직접 취소하고 환불받으실 수 있습니다.',
}

export const dynamic = 'force-dynamic'

export default async function PaymentCancelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const overview = await getChargeCancelOverview()

  return (
    <div className="w-full max-w-[480px] mx-auto px-3 text-ink-light font-sans pb-16">
      <div className="px-1 py-4 flex items-center gap-4 border-b border-primary/10 mb-6">
        <Link href="/protected/store" className="p-1 -ml-1 hover:bg-surface/10 transition-colors rounded-full">
          <ChevronLeft className="w-5 h-5 text-ink-light/80" strokeWidth={1} />
        </Link>
        <h1 className="text-lg font-serif font-light text-ink-light">결제 취소</h1>
      </div>

      <section className="mb-6 space-y-2 px-1">
        <p className="text-sm text-ink-light/70 font-light leading-relaxed">
          복채 충전 결제를 직접 취소하실 수 있습니다. 결제일로부터 7일 이내에는 남아 있는 복채에 대해 수수료 없이 전액
          환불되고, 7일이 지나면 이용약관 제7조 제2항에 따라 10% 수수료가 차감됩니다.
        </p>
        <p className="text-[11px] text-ink-light/40 font-light leading-relaxed">
          이미 분석을 받아보신 복채는 되돌릴 수 없어 자동 취소가 제한될 수 있습니다. 환불금은 결제하신 수단으로
          돌아가며, 카드사 사정에 따라 영업일 기준 최대 7일이 걸릴 수 있습니다.
        </p>
      </section>

      <ChargeCancelPanel overview={overview} />

      <section className="mt-10 space-y-2">
        <Link
          href="/protected/membership/cancel"
          className="flex items-center justify-between p-4 bg-surface/40 border border-primary/20 hover:border-primary/40 transition-colors"
        >
          <span className="text-sm font-light text-ink-light/85">멤버십을 해지하시겠어요?</span>
          <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180" />
        </Link>
        <Link
          href="/terms"
          className="flex items-center gap-3 p-4 bg-surface/40 border border-primary/20 hover:border-primary/40 transition-colors"
        >
          <ScrollText className="w-4 h-4 text-primary/70" strokeWidth={1} />
          <span className="text-sm font-light text-ink-light/85">청약철회·환불 규정 (이용약관 제7조)</span>
        </Link>
      </section>
    </div>
  )
}
