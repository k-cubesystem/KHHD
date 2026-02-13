import { PlanManagementClient } from './plan-management-client'

export default function AdminMembershipPlansPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-serif font-bold text-stone-100">스토어 관리</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          멤버십 구독 플랜과 부적 상품을 통합 관리합니다.
        </p>
      </div>
      <PlanManagementClient />
    </div>
  )
}
