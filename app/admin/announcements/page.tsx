import { listAnnouncements } from '@/app/actions/guide'
import { AnnouncementsClient } from './announcements-client'

export const dynamic = 'force-dynamic'

export default async function AdminAnnouncementsPage() {
  const res = await listAnnouncements()
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-serif font-bold text-ink-light mb-1">공지사항</h1>
      <p className="text-xs text-ink-light/50 mb-6">
        활성 공지는 모든 회원의 신 가이드(우하단 아바타) 말풍선으로 전달됩니다. 최신 활성 공지 1건이 노출됩니다.
      </p>
      <AnnouncementsClient initialItems={res.items ?? []} />
    </div>
  )
}
