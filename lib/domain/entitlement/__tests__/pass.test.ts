import {
  addMonthsAnchored,
  BANNED_PASS_TERMS,
  canCoverUnits,
  findBannedPassTerms,
  heldPassCount,
  membershipWindow,
  migrationPassCount,
  passBadgeLabel,
  passExpiryFrom,
  passSummaryLines,
  PASS_SOURCE_LABEL,
  PASS_VALID_DAYS,
  type PassSummary,
} from '../pass'
import { FEATURE_COST, formatFeatureCost } from '@/lib/domain/payment/feature-costs'

const DAY = 86_400_000

describe('addMonthsAnchored — 말일 앵커는 짧은 달의 말일로 붙는다', () => {
  it('1/31 → 2/28 → 3/31 (윤년 아님)', () => {
    const jan31 = Date.UTC(2027, 0, 31, 9, 0, 0)
    expect(new Date(addMonthsAnchored(jan31, 1)).toISOString()).toBe('2027-02-28T09:00:00.000Z')
    expect(new Date(addMonthsAnchored(jan31, 2)).toISOString()).toBe('2027-03-31T09:00:00.000Z')
  })

  it('해를 넘긴다', () => {
    const nov15 = Date.UTC(2026, 10, 15)
    expect(new Date(addMonthsAnchored(nov15, 3)).toISOString()).toBe('2027-02-15T00:00:00.000Z')
  })
})

describe('membershipWindow — 구독 시작일에 앵커한 한 달', () => {
  const start = Date.UTC(2026, 8, 18, 12, 0, 0) // 9/18

  it('첫 달', () => {
    const w = membershipWindow(start, null, start + 3 * DAY)
    expect(w).toEqual({ startIso: '2026-09-18T12:00:00.000Z', endIso: '2026-10-18T12:00:00.000Z' })
  })

  it('석 달째 — 앞 창의 사용량을 이어받지 않는다(이월 없음 = 창 시작이 다르다)', () => {
    const w = membershipWindow(start, null, Date.UTC(2026, 11, 1))
    expect(w?.startIso).toBe('2026-11-18T12:00:00.000Z')
    expect(w?.endIso).toBe('2026-12-18T12:00:00.000Z')
  })

  it('창의 끝은 구독 종료를 넘지 않는다', () => {
    const end = start + 10 * DAY
    const w = membershipWindow(start, end, start + DAY)
    expect(w?.endIso).toBe(new Date(end).toISOString())
  })

  it('구독이 끝났으면 창이 없다', () => {
    expect(membershipWindow(start, start + DAY, start + 2 * DAY)).toBeNull()
  })

  it('경계 — 정확히 한 달이 되는 순간 다음 창으로 넘어간다', () => {
    const next = addMonthsAnchored(start, 1)
    expect(membershipWindow(start, null, next)?.startIso).toBe(new Date(next).toISOString())
    expect(membershipWindow(start, null, next - 1)?.startIso).toBe(new Date(start).toISOString())
  })
})

describe('membershipWindow — 기간 끝 앞의 꼬리는 새 창으로 열지 않는다(월 몫이 두 번 열리면 안 된다)', () => {
  // 기간 끝은 JS setMonth(넘침)·관리자 30일 부여로 만들어진다 — 말일 앵커 창과 어긋난다.
  const cases: Array<{ name: string; start: number; end: number; probe: number }> = [
    {
      name: '8/31 시작 + setMonth → 10/1 끝, 9/30 에 본다',
      start: Date.UTC(2026, 7, 31, 3),
      end: Date.UTC(2026, 9, 1, 3),
      probe: Date.UTC(2026, 8, 30, 12),
    },
    {
      name: '1/31 시작 + setMonth → 3/3 끝, 3/1 에 본다',
      start: Date.UTC(2027, 0, 31, 9),
      end: Date.UTC(2027, 2, 3, 9),
      probe: Date.UTC(2027, 2, 1, 9),
    },
    {
      name: '1/29 시작 + setMonth → 3/1 끝, 2/28 저녁에 본다',
      start: Date.UTC(2027, 0, 29, 9),
      end: Date.UTC(2027, 2, 1, 9),
      probe: Date.UTC(2027, 1, 28, 20),
    },
    {
      name: '2/1 시작 + 30일 부여 → 3/3 끝, 3/2 에 본다',
      start: Date.UTC(2027, 1, 1, 0),
      end: Date.UTC(2027, 2, 3, 0),
      probe: Date.UTC(2027, 2, 2, 0),
    },
    {
      name: '12/31 시작 + setMonth → 1/31 끝, 1/30 에 본다',
      start: Date.UTC(2026, 11, 31, 9),
      end: Date.UTC(2027, 0, 31, 9),
      probe: Date.UTC(2027, 0, 30, 9),
    },
  ]

  it.each(cases)('$name — 창은 기간 전체 하나', ({ start, end, probe }) => {
    const expected = { startIso: new Date(start).toISOString(), endIso: new Date(end).toISOString() }
    expect(membershipWindow(start, end, probe)).toEqual(expected)
    expect(membershipWindow(start, end, start + DAY)).toEqual(expected)
  })

  it('여러 달짜리 기간은 달마다 창이 갈리고, 마지막 창만 기간 끝까지 간다', () => {
    const start = Date.UTC(2026, 0, 31, 0)
    const end = Date.UTC(2026, 4, 2, 0) // 1/31 → 5/2 : 창 [1/31,2/28) [2/28,3/31) [3/31,5/2)
    expect(membershipWindow(start, end, Date.UTC(2026, 1, 10))?.endIso).toBe('2026-02-28T00:00:00.000Z')
    expect(membershipWindow(start, end, Date.UTC(2026, 2, 10))?.startIso).toBe('2026-02-28T00:00:00.000Z')
    const last = membershipWindow(start, end, Date.UTC(2026, 4, 1))
    expect(last).toEqual({ startIso: '2026-03-31T00:00:00.000Z', endIso: '2026-05-02T00:00:00.000Z' })
  })
})

describe('기한·이관', () => {
  it('구매 이용권 기한은 90일 — 토스 기준(1년 이내)', () => {
    expect(PASS_VALID_DAYS).toBe(90)
    expect(PASS_VALID_DAYS).toBeLessThanOrEqual(365)
    const now = Date.UTC(2026, 8, 18)
    expect(passExpiryFrom(now, 90)?.toISOString()).toBe('2026-12-17T00:00:00.000Z')
    expect(passExpiryFrom(now, null)).toBeNull()
  })

  it('이관 환산은 올림 — 1만냥도 한 장이 된다(이용자에게 불리해지지 않게)', () => {
    expect(migrationPassCount(21)).toBe(11)
    expect(migrationPassCount(1)).toBe(1)
    expect(migrationPassCount(2)).toBe(1)
    expect(migrationPassCount(0)).toBe(0)
    expect(migrationPassCount(-5)).toBe(0)
  })
})

describe('요약 — 주머니를 합치지 않는다', () => {
  const summary: PassSummary = {
    unlimited: false,
    membership: { quota: 5, used: 2, remaining: 3, resetsAt: '2026-10-18T12:00:00.000Z', renews: true },
    holdings: [
      { id: 'a', source: 'purchase', remaining: 4, expiresAt: '2026-12-17T00:00:00.000Z' },
      { id: 'b', source: 'migration', remaining: 11, expiresAt: null },
    ],
  }

  it('보유 장수에 멤버십 몫을 더하지 않는다', () => {
    expect(heldPassCount(summary)).toBe(15)
  })

  it('요약에 «합계» 필드가 없다 — 모양으로 잠근다', () => {
    expect(Object.keys(summary).sort()).toEqual(['holdings', 'membership', 'unlimited'])
  })

  it('주머니마다 한 줄', () => {
    const lines = passSummaryLines(summary)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('멤버십 이번 달 3장')
    expect(lines[1]).toContain('구매한 이용권 4장')
    expect(lines[2]).toContain('이전 보유분 11장 (기한 없음)')
  })

  it('다시 채워지지 않는 멤버십(해지·결제 수단 없는 부여)의 마지막 창은 «다시 N장»을 약속하지 않는다', () => {
    const ending: PassSummary = { ...summary, membership: { ...summary.membership!, renews: false } }
    const line = passSummaryLines(ending)[0]
    expect(line).toContain('멤버십 이번 달 3장')
    expect(line).toContain('까지')
    expect(line).not.toContain('다시')
  })

  it('쓸 수 있는지 — 여러 주머니에서 나눠 쓰는 것은 허용', () => {
    expect(canCoverUnits(summary, 18)).toBe(true)
    expect(canCoverUnits(summary, 19)).toBe(false)
    expect(canCoverUnits({ unlimited: true, membership: null, holdings: [] }, 99)).toBe(true)
  })

  it('머리글 한 마디', () => {
    expect(passBadgeLabel(summary)).toBe('이번 달 3장')
    expect(passBadgeLabel({ ...summary, membership: null })).toBe('이용권 15장')
  })
})

describe('금지어 — 화면 문구에 잔액형 재화의 말을 쓰지 않는다', () => {
  it('이 모듈이 만드는 문구에 금지어가 없다', () => {
    const texts = [
      ...Object.values(PASS_SOURCE_LABEL),
      ...passSummaryLines({
        unlimited: false,
        membership: { quota: 5, used: 0, remaining: 5, resetsAt: '2026-10-18T00:00:00.000Z', renews: true },
        holdings: [{ id: 'x', source: 'onboarding', remaining: 1, expiresAt: '2026-12-17T00:00:00.000Z' }],
      }),
      passSummaryLines({ unlimited: true, membership: null, holdings: [] }).join(' '),
    ]
    for (const t of texts) expect(findBannedPassTerms(t)).toEqual([])
  })

  it('비용 표기에 금지어가 없다', () => {
    for (const key of Object.keys(FEATURE_COST) as Array<keyof typeof FEATURE_COST>) {
      expect(findBannedPassTerms(formatFeatureCost(key))).toEqual([])
    }
  })

  it('금지어 목록에 핵심 단어가 들어 있다', () => {
    for (const t of ['복채', '충전', '포인트', '잔액', '만료 없이', '무제한']) expect(BANNED_PASS_TERMS).toContain(t)
  })
})

describe('비용 — 옛 복채 가격을 내림 쪽으로 옮겼다', () => {
  it('풀이 1회 = 1장, 심층·함께 보기 = 2장', () => {
    expect(FEATURE_COST.saju.display).toBe(1)
    expect(FEATURE_COST.face.display).toBe(1)
    expect(FEATURE_COST.wealth.display).toBe(2)
    expect(FEATURE_COST.samhap.display).toBe(2)
    expect(FEATURE_COST.togetherNarrative.display).toBe(2)
    expect(formatFeatureCost('saju')).toBe('이용권 1장')
    expect(formatFeatureCost('today')).toBe('무료')
  })

  it('과금 코드가 없는 이미지 생성은 무료로 표기한다', () => {
    expect(FEATURE_COST.imageGeneration.free).toBe(true)
  })
})
