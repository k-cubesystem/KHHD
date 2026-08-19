import { PlanManagementClient } from './plan-management-client'
import { AdminPageHeader } from '@/components/admin/ui/page-header'
import { Store } from 'lucide-react'

export default function AdminMembershipPlansPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <AdminPageHeader
        title="스토어 관리"
        description="멤버십 구독 플랜과 복채 팩의 가격·판매 여부. 값을 바꾸면 감사 로그에 남는다."
        icon={<Store className="h-5 w-5 text-gold-500" aria-hidden />}
      />
      <PlanManagementClient />
    </div>
  )
}
