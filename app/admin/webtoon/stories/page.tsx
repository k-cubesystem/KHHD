import { listAdminStories, listHiddenComments } from '@/app/actions/admin/webtoon'
import { WebtoonStoriesClient } from './stories-client'

export const dynamic = 'force-dynamic'

export default async function AdminWebtoonStoriesPage() {
  const [stories, hidden] = await Promise.all([listAdminStories(), listHiddenComments()])
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-serif font-bold text-ink-light mb-1">「내 이야기」 접수</h1>
      <p className="text-xs text-ink-light/50 mb-6">
        보내 주신 분께 한 약속은 <b>선정 여부와 무관하게 답을 남긴다</b>는 것입니다. 회신 한마디는 접수하신 분의 웹툰
        화면에만 보입니다. 연락처는 접어 두었습니다 — 필요할 때만 펴 주세요.
      </p>
      <WebtoonStoriesClient initialStories={stories} initialHidden={hidden} />
    </div>
  )
}
