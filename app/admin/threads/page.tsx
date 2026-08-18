import { getThreadsStatus, listRounds, listReplyQueue, listRecentReplies, listPosts, listReports } from './actions'
import { ThreadsAdminClient } from './threads-client'

export const dynamic = 'force-dynamic'

export default async function AdminThreadsPage() {
  const [status, rounds, queue, replies, posts, reports] = await Promise.all([
    getThreadsStatus(),
    listRounds(),
    listReplyQueue(),
    listRecentReplies(60),
    listPosts(30),
    listReports(8),
  ])
  return (
    <div className="px-3 py-4 sm:p-6 max-w-5xl">
      <h1 className="text-xl font-serif font-bold text-ink-light mb-1">스레드 이벤트</h1>
      <p className="text-xs text-ink-light/50 mb-6">
        자동: 예약 발행 · 댓글 수집·분류 · 마감 추첨 · 초안 생성 · 보고. 반자동(사람 1클릭): 신청 안내 답글 · 결과 발표
        · 스팸 숨김.
      </p>
      <ThreadsAdminClient
        status={status}
        rounds={rounds.success ? rounds.items : []}
        queue={queue.success ? queue.items : []}
        replies={replies.success ? replies.items : []}
        posts={posts.success ? posts.items : []}
        reports={reports.success ? reports.items : []}
      />
    </div>
  )
}
