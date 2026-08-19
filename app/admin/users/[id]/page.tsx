import { getUserDetails } from '../actions'
import { UserDetailClient } from './user-detail-client'
import { notFound } from 'next/navigation'

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getUserDetails(id)

  if (result.error || !('profile' in result) || !result.profile) {
    if (result.error === 'Unauthorized' || result.error === 'Forbidden') {
      return <div className="p-8 text-center font-sans text-sm text-seal">접근 권한이 없습니다.</div>
    }
    notFound()
  }

  const { profile, sajuRecords, familyMembers, payments, wallet, subscription, transactions, shrines, authCreatedAt } =
    result

  return (
    <UserDetailClient
      user={profile}
      sajuRecords={sajuRecords || []}
      familyMembers={familyMembers || []}
      payments={payments || []}
      wallet={wallet}
      subscription={subscription}
      transactions={transactions || []}
      shrines={shrines || []}
      authCreatedAt={authCreatedAt}
    />
  )
}
