import {
  FREE_DAILY_QUESTIONS,
  MEMBER_WEEKLY_QUESTIONS,
  ONBOARDING_FREE_QUESTIONS,
  PURCHASE_COST_BOKCHAE,
  PURCHASE_QUESTIONS,
  PURCHASE_EXPIRE_DAYS,
  memberWeekWindow,
  purchaseExpiryFrom,
  isCreditExpired,
  totalRemainingOf,
} from '../entitlements'

const DAY = 86_400_000
const WEEK = 7 * DAY

describe('수치 계약 (화면·안내문구가 이 값을 인용한다)', () => {
  it('무료 일일분은 폐지되어 0이다', () => {
    expect(FREE_DAILY_QUESTIONS).toBe(0)
  })

  it('멤버십 주간 10회 · 온보딩 1회 · 구매 1만냥 10회 · 소비기한 30일', () => {
    expect(MEMBER_WEEKLY_QUESTIONS).toBe(10)
    expect(ONBOARDING_FREE_QUESTIONS).toBe(1)
    expect(PURCHASE_COST_BOKCHAE).toBe(1)
    expect(PURCHASE_QUESTIONS).toBe(10)
    expect(PURCHASE_EXPIRE_DAYS).toBe(30)
  })
})

describe('memberWeekWindow — 구독 시작일 앵커', () => {
  const start = Date.parse('2026-08-25T00:00:00Z')

  it('구독 첫날은 첫 주기를 돌려준다', () => {
    const w = memberWeekWindow(start, start)
    expect(w.startIso).toBe(new Date(start).toISOString())
    expect(w.endIso).toBe(new Date(start + WEEK).toISOString())
  })

  it('6일 23시간 뒤에도 여전히 첫 주기다 (경계 직전)', () => {
    const w = memberWeekWindow(start, start + WEEK - 1)
    expect(w.startIso).toBe(new Date(start).toISOString())
  })

  it('정확히 7일 뒤에는 둘째 주기로 넘어간다 (반열림 구간)', () => {
    const w = memberWeekWindow(start, start + WEEK)
    expect(w.startIso).toBe(new Date(start + WEEK).toISOString())
    expect(w.endIso).toBe(new Date(start + 2 * WEEK).toISOString())
  })

  it('30일 뒤에는 다섯째 주기다', () => {
    const w = memberWeekWindow(start, start + 30 * DAY)
    expect(w.startIso).toBe(new Date(start + 4 * WEEK).toISOString())
  })

  it('일요일 가입자가 하루 만에 주간치를 잃지 않는다 (월요일 리셋과의 차이)', () => {
    const sunday = Date.parse('2026-08-23T12:00:00Z')
    const mondayNextDay = Date.parse('2026-08-24T12:00:00Z')
    const w = memberWeekWindow(sunday, mondayNextDay)
    expect(w.startIso).toBe(new Date(sunday).toISOString())
  })

  it('periodStart 가 미래여도 첫 주기를 돌려준다 (시계 오차 방어)', () => {
    const w = memberWeekWindow(start + DAY, start)
    expect(w.startIso).toBe(new Date(start + DAY).toISOString())
  })
})

describe('구매 질문권 소비기한', () => {
  const now = Date.parse('2026-08-25T00:00:00Z')

  it('만료 시각은 구매 시점 + 30일', () => {
    expect(purchaseExpiryFrom(now).toISOString()).toBe(new Date(now + 30 * DAY).toISOString())
  })

  it('만료 전이면 살아 있다', () => {
    expect(isCreditExpired(new Date(now + DAY).toISOString(), now)).toBe(false)
  })

  it('만료 시각 정각이면 소멸한다', () => {
    expect(isCreditExpired(new Date(now).toISOString(), now)).toBe(true)
  })

  it('🔴 expires_at 이 null 이면 무기한 — 소비기한 도입 이전 구매분에 소급 만료를 걸지 않는다', () => {
    expect(isCreditExpired(null, now)).toBe(false)
  })
})

describe('totalRemainingOf', () => {
  it('네 주머니를 합산한다', () => {
    expect(totalRemainingOf({ onboarding: 1, memberWeekly: 10, ad: 1, purchased: 10 })).toBe(22)
  })

  it('전부 0이면 0 — 이때 화면은 「소진」이 아니라 「충전 안내」를 보여야 한다', () => {
    expect(totalRemainingOf({ onboarding: 0, memberWeekly: 0, ad: 0, purchased: 0 })).toBe(0)
  })
})
