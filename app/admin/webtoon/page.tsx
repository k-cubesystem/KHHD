import { listAdminEpisodes } from '@/app/actions/admin/webtoon'
import { WebtoonEpisodesClient } from './webtoon-episodes-client'

export const dynamic = 'force-dynamic'

export default async function AdminWebtoonPage() {
  const episodes = await listAdminEpisodes()
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-serif font-bold text-ink-light mb-1">웹툰 회차</h1>
      <p className="text-xs text-ink-light/50 mb-6">
        공개 시각을 비워 두면 초안입니다 — 목록에도 뷰어에도 뜨지 않습니다. 멤버십 회차의 본문은 비공개 버킷에 올라가고
        서명 주소로만 나갑니다.
      </p>
      <WebtoonEpisodesClient initialEpisodes={episodes} />
    </div>
  )
}
