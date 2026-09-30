/**
 * 서울 달력 연도와 입춘 기준 세운 연도.
 *
 * 입춘 기준값은 한국 달력 사이트(month2k.com «절기 시각은 … 한국표준시»)에서 따로 확인한 KST 시각이다 —
 * 라이브러리 값(UTC+8)에 한 시간을 더한 것과 일치한다. 라이브러리만 믿고 기대값을 만들지 않는다.
 * 어느 시간대에서 돌려도 같아야 한다: `TZ=UTC` · `TZ=PST8PDT` · `TZ=EST5EDT` · 서울 기본값
 * (이 기기의 Node 는 `America/Los_Angeles` 같은 IANA 이름을 못 알아듣고 서울로 떨어진다 — POSIX 형식을 쓴다).
 */
import { Solar } from 'lunar-javascript'
import { getYearPillar } from '@/lib/saju-engine/woon-calculator'
import { kstYmd } from '../kst-ymd'
import { ipchunInstant, seunYearAt } from '../seun-year'

const minute = (d: Date) => Math.floor(d.getTime() / 60000)
const at = (iso: string) => new Date(iso)

describe('kstYmd — 서울 달력', () => {
  it('UTC 12-31 15:00 은 이미 서울 새해다', () => {
    expect(kstYmd(at('2026-12-31T15:00:00Z'))).toEqual({ year: 2027, month: 1, day: 1 })
    expect(kstYmd(at('2026-12-31T14:59:59Z'))).toEqual({ year: 2026, month: 12, day: 31 })
  })

  it('UTC 월말 15:00 은 이미 서울 다음 달이다', () => {
    expect(kstYmd(at('2026-09-30T15:30:00Z'))).toEqual({ year: 2026, month: 10, day: 1 })
  })
})

describe('ipchunInstant — 입춘 시각(KST 기준값)', () => {
  it.each([
    ['2025', 2025, '2025-02-03T23:10:00+09:00'],
    ['2026', 2026, '2026-02-04T05:02:00+09:00'],
    ['2027', 2027, '2027-02-04T10:46:00+09:00'],
  ])('%s년', (_label, year, kst) => {
    expect(minute(ipchunInstant(year))).toBe(minute(at(kst)))
  })
})

describe('seunYearAt — 입춘을 지나야 세운이 바뀐다', () => {
  it('입춘 뒤 한참(2026-09-29 서울)은 그해', () => {
    expect(seunYearAt(at('2026-09-29T10:00:00+09:00'))).toBe(2026)
    expect(seunYearAt(at('2026-12-31T23:59:00+09:00'))).toBe(2026)
  })

  it('🔴 서울 새해 00:30 은 달력으론 2027 이지만 세운은 아직 2026 이다', () => {
    const now = at('2026-12-31T15:30:00Z')
    expect(kstYmd(now).year).toBe(2027)
    expect(seunYearAt(now)).toBe(2026)
  })

  it('입춘 분 단위 경계 — 2027-02-04 10:46(KST) 전후', () => {
    expect(seunYearAt(at('2027-02-04T10:44:00+09:00'))).toBe(2026)
    expect(seunYearAt(at('2027-02-04T10:48:00+09:00'))).toBe(2027)
  })

  it('입춘이 2월 3일 밤인 해(2025-02-03 23:10)도 맞는다 — «2월 4일»로 뭉뚱그리지 않는다', () => {
    expect(seunYearAt(at('2025-02-03T23:00:00+09:00'))).toBe(2024)
    expect(seunYearAt(at('2025-02-03T23:20:00+09:00'))).toBe(2025)
  })

  it('입춘이 새벽인 해(2026-02-04 05:02) — 그날 04:00 은 아직 전해', () => {
    expect(seunYearAt(at('2026-02-04T04:00:00+09:00'))).toBe(2025)
    expect(seunYearAt(at('2026-02-04T05:05:00+09:00'))).toBe(2026)
  })

  it('만세력 «정확 연주»와 대조 — 2020~2032 입춘이 드는 이틀 반과 연말연시를 훑어도 어긋나지 않는다', () => {
    const exactYearGanji = (now: Date) => {
      const b = new Date(now.getTime() + 8 * 60 * 60 * 1000)
      const lunar = Solar.fromYmdHms(
        b.getUTCFullYear(),
        b.getUTCMonth() + 1,
        b.getUTCDate(),
        b.getUTCHours(),
        b.getUTCMinutes(),
        b.getUTCSeconds()
      ).getLunar() as unknown as { getYearInGanZhiExact(): string }
      return lunar.getYearInGanZhiExact()
    }
    const mismatches: string[] = []
    const sweep = (from: string, to: string, stepMin: number) => {
      for (let t = at(from).getTime(); t <= at(to).getTime(); t += stepMin * 60000) {
        const now = new Date(t)
        const got = getYearPillar(seunYearAt(now)).ganji
        if (got !== exactYearGanji(now)) mismatches.push(`${now.toISOString()} ${got}`)
      }
    }
    for (let y = 2020; y <= 2032; y++) {
      sweep(`${y}-02-03T00:00:00+09:00`, `${y}-02-05T12:00:00+09:00`, 20)
      sweep(`${y}-12-29T00:00:00+09:00`, `${y + 1}-01-03T00:00:00+09:00`, 360)
    }
    expect(mismatches).toEqual([])
  })
})
