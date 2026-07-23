import { retentionCutoffISO, FREE_RETENTION_DAYS } from '../subscription'

describe('retentionCutoffISO — 무료 보관 경계(순수)', () => {
  it('기본값은 30일', () => {
    expect(FREE_RETENTION_DAYS).toBe(30)
  })

  it('UTC 자정으로 고정(일 단위) — 캐시 키 안정', () => {
    const iso = retentionCutoffISO()
    expect(iso).toMatch(/T00:00:00\.000Z$/)
  })

  it('현재보다 과거이며, 대략 N일 전이다', () => {
    const now = Date.now()
    const cutoff = new Date(retentionCutoffISO(30)).getTime()
    expect(cutoff).toBeLessThan(now)
    const diffDays = (now - cutoff) / 86_400_000
    // 자정 고정이므로 30일 ~ 31일 사이(하루 미만 오차)
    expect(diffDays).toBeGreaterThanOrEqual(29.9)
    expect(diffDays).toBeLessThan(31.1)
  })

  it('days 인자가 커질수록 더 과거', () => {
    const c30 = new Date(retentionCutoffISO(30)).getTime()
    const c60 = new Date(retentionCutoffISO(60)).getTime()
    expect(c60).toBeLessThan(c30)
    expect((c30 - c60) / 86_400_000).toBeCloseTo(30, 5)
  })

  it('0일이면 오늘 UTC 자정', () => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    expect(retentionCutoffISO(0)).toBe(today.toISOString())
  })
})
