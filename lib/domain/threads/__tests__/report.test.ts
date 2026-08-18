import { previousWeekKst, buildWeeklyReport, deltaPct, type ReportInput } from '../report'

describe('previousWeekKst — 주 경계는 KST 월~일', () => {
  it('월요일 09:00 KST 크론은 직전 주 월~일을 집계한다', () => {
    // 2026-08-24(월) 00:00 UTC = 09:00 KST → 지난주 = 08-17(월) ~ 08-23(일)
    const b = previousWeekKst(new Date('2026-08-24T00:00:00Z'))
    expect(b.startDate).toBe('2026-08-17')
    expect(b.endDate).toBe('2026-08-23')
    // 하한은 08-17 00:00 KST = 08-16 15:00 UTC, 상한은 08-24 00:00 KST(미포함)
    expect(b.startUtc.toISOString()).toBe('2026-08-16T15:00:00.000Z')
    expect(b.endUtc.toISOString()).toBe('2026-08-23T15:00:00.000Z')
  })

  it('KST 로 넘어가야 주가 바뀌는 시각 — 일요일 23:00 KST 는 아직 이전 주를 본다', () => {
    // 2026-08-23(일) 23:00 KST = 14:00 UTC. KST 기준 아직 08-17 주 → 직전 주는 08-10~08-16
    const b = previousWeekKst(new Date('2026-08-23T14:00:00Z'))
    expect(b.startDate).toBe('2026-08-10')
    expect(b.endDate).toBe('2026-08-16')
  })

  it('UTC 로는 아직 일요일이지만 KST 로는 월요일이면 새 주를 기준으로 센다', () => {
    // 2026-08-23(일) 16:00 UTC = 08-24(월) 01:00 KST
    const b = previousWeekKst(new Date('2026-08-23T16:00:00Z'))
    expect(b.startDate).toBe('2026-08-17')
    expect(b.endDate).toBe('2026-08-23')
  })
})

const BOUNDS = previousWeekKst(new Date('2026-08-24T00:00:00Z'))

function input(over: Partial<ReportInput> = {}): ReportInput {
  return {
    bounds: BOUNDS,
    posts: [],
    replies: [],
    queue: [],
    entries: [],
    rounds: [],
    winners: [],
    acquisition: [],
    tokenExpiresAt: null,
    ...over,
  }
}

describe('buildWeeklyReport', () => {
  it('인사이트를 합산하고 조회수 1위 글을 뽑는다', () => {
    const m = buildWeeklyReport(
      input({
        posts: [
          {
            kind: 'content',
            body: '오늘은 갑진일',
            permalink: 'p1',
            published_at: null,
            insights: { views: 120, likes: 8 },
          },
          {
            kind: 'campaign',
            body: '이번 주 궁합 5명',
            permalink: 'p2',
            published_at: null,
            insights: { views: 900, likes: 40, replies: 12 },
          },
        ],
      })
    )
    expect(m.posts.published).toBe(2)
    expect(m.posts.views).toBe(1020)
    expect(m.posts.likes).toBe(48)
    expect(m.posts.replies).toBe(12)
    expect(m.posts.byKind).toEqual({ content: 1, campaign: 1 })
    expect(m.posts.top?.permalink).toBe('p2')
  })

  it('인사이트가 아직 안 붙은 글은 세되 0으로 더하지 않는다', () => {
    const m = buildWeeklyReport(
      input({
        posts: [{ kind: 'content', body: 'x', permalink: null, published_at: null, insights: null }],
      })
    )
    expect(m.posts.insightsMissing).toBe(1)
    expect(m.posts.views).toBe(0)
  })

  it('전부 0회 조회면 «최고 글»을 억지로 만들지 않는다', () => {
    const m = buildWeeklyReport(
      input({
        posts: [{ kind: 'content', body: 'x', permalink: 'p', published_at: null, insights: { views: 0 } }],
      })
    )
    expect(m.posts.top).toBeNull()
  })

  it('댓글 분류 분포를 센다', () => {
    const m = buildWeeklyReport(
      input({
        replies: [
          { classification: 'apply' },
          { classification: 'apply' },
          { classification: 'spam' },
          { classification: null },
        ],
      })
    )
    expect(m.replies.collected).toBe(4)
    expect(m.replies.byClass).toEqual({ apply: 2, spam: 1, unknown: 1 })
  })

  it('답글 승인 지연의 중앙값을 분 단위로 낸다 — 승인 안 된 건 계산에서 뺀다', () => {
    const m = buildWeeklyReport(
      input({
        queue: [
          { status: 'sent', created_at: '2026-08-18T00:00:00Z', approved_at: '2026-08-18T00:10:00Z' },
          { status: 'sent', created_at: '2026-08-18T00:00:00Z', approved_at: '2026-08-18T00:30:00Z' },
          { status: 'sent', created_at: '2026-08-18T00:00:00Z', approved_at: '2026-08-18T02:00:00Z' },
          { status: 'pending', created_at: '2026-08-18T00:00:00Z', approved_at: null },
        ],
      })
    )
    expect(m.queue.created).toBe(4)
    expect(m.queue.sent).toBe(3)
    expect(m.queue.pending).toBe(1)
    expect(m.queue.medianApprovalMin).toBe(30)
  })

  it('승인 이력이 없으면 중앙값은 0 이 아니라 null 이다', () => {
    const m = buildWeeklyReport(
      input({ queue: [{ status: 'pending', created_at: '2026-08-18T00:00:00Z', approved_at: null }] })
    )
    expect(m.queue.medianApprovalMin).toBeNull()
  })

  it('이벤트 단계별 수와 가입 전환을 센다', () => {
    const m = buildWeeklyReport(
      input({
        rounds: [
          { id: 'r1', slug: 'w1', status: 'published' },
          { id: 'r2', slug: 'w2', status: 'open' },
        ],
        entries: [{ round_id: 'r1' }, { round_id: 'r1' }, { round_id: 'r2' }],
        winners: [
          { published_at: '2026-08-22T00:00:00Z', converted_user_id: 'u1' },
          { published_at: '2026-08-22T00:00:00Z', converted_user_id: null },
          { published_at: null, converted_user_id: null },
        ],
      })
    )
    expect(m.event.roundsClosed).toBe(1) // open 은 마감 안 된 것
    expect(m.event.entries).toBe(3)
    expect(m.event.winners).toBe(3)
    expect(m.event.resultsPublished).toBe(2)
    expect(m.event.converted).toBe(1)
  })

  it('유입 귀속을 매체별로 합산한다', () => {
    const m = buildWeeklyReport(
      input({
        acquisition: [
          { medium: 'reply', visitors: 40, sessions: 55, signups: 6 },
          { medium: 'result', visitors: 12, sessions: 14, signups: 3 },
        ],
      })
    )
    expect(m.acquisition.visitors).toBe(52)
    expect(m.acquisition.signups).toBe(9)
    expect(m.acquisition.byMedium).toEqual({ reply: 6, result: 3 })
  })

  it('토큰 잔여일은 그 주 끝을 기준으로 센다', () => {
    const m = buildWeeklyReport(input({ tokenExpiresAt: new Date('2026-09-22T15:00:00Z') }))
    expect(m.token.daysLeft).toBe(30)
  })
})

describe('deltaPct', () => {
  it('증감률을 소수 첫째 자리까지 낸다', () => {
    expect(deltaPct(120, 100)).toBe(20)
    expect(deltaPct(90, 100)).toBe(-10)
  })

  it('전주가 0이면 Infinity 대신 «비교 불가»(null)', () => {
    expect(deltaPct(50, 0)).toBeNull()
  })
})
