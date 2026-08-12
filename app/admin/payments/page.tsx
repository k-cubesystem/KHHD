import { PaymentManagementClient } from './payment-management-client'
import { CancelLossSummary } from './cancel-loss-summary'
import { AnimatedHeader } from '@/components/admin/dashboard-stats'

export default function PaymentManagementPage() {
  return (
    <>
      <AnimatedHeader title="Payment History" subtitle="전체 결제 내역 조회 및 상태 확인" />

      <div className="mt-8">
        {/* 손실 처리가 한 건도 없으면 아무것도 그리지 않는다(빈 패널 노이즈 방지). */}
        <CancelLossSummary />
        <PaymentManagementClient />
      </div>
    </>
  )
}
