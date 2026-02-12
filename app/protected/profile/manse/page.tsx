import { getDestinyTargets } from '@/app/actions/destiny-targets'
import { getUserTierLimits } from '@/app/actions/membership-limits'
import { getCurrentUserRole } from '@/app/actions/products'
import ManseClient from './manse-client'

export default async function MansePage() {
  // Fetch data on server - getDestinyTargets는 본인 + 가족을 모두 반환
  const [targetsData, tierLimits, userRole] = await Promise.all([
    getDestinyTargets(),
    getUserTierLimits(),
    getCurrentUserRole(),
  ])

  // DestinyTarget을 Member 형식으로 변환
  const membersData = targetsData.map((target) => ({
    id: target.id,
    name: target.name,
    relationship: target.relation_type,
    birth_date: target.birth_date || '',
    birth_time: target.birth_time || null,
    calendar_type: target.calendar_type || 'solar',
    gender: target.gender || 'male',
  }))

  // 관리자는 구독 여부와 무관하게 모든 프리미엄 기능 접근 가능
  const isAdmin = userRole.role === 'admin'
  const isSubscribed = isAdmin || tierLimits?.is_subscribed || false

  return <ManseClient members={membersData} isSubscribed={isSubscribed} />
}
