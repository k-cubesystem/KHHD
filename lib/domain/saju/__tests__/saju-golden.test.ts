import { getSajuData, calculateDaeun } from '../saju'
import { calculateManse } from '../manse'

// 골든값 출처: lunar-javascript 1.7.7 EightChar(setSect(1)) 직접 실행 (scripts 일회성 검증, 2026-07-13).
// 야자시(23시대) 규약: 일주는 다음 날로 넘기되(sect1), 년주·월주는 절입 시각 기준 그대로 —
// 과거의 수동 +1일 시프트가 만들던 년/월주 오염·時干 이중 시프트 회귀를 잠근다.

const PILLAR_GOLDENS: Array<{ label: string; date: string; time: string; expected: [string, string, string, string] }> =
  [
    { label: '기본 1990-03-15 08:30', date: '1990-03-15', time: '08:30', expected: ['庚午', '己卯', '己卯', '戊辰'] },
    { label: '기본 1990-01-01 12:00', date: '1990-01-01', time: '12:00', expected: ['己巳', '丙子', '丙寅', '甲午'] },
    { label: '기본 2024-01-01 12:00', date: '2024-01-01', time: '12:00', expected: ['癸卯', '甲子', '甲子', '庚午'] },
    {
      label: '입춘 전 야자시 2024-02-03 23:30 — 년/월주 오염 금지',
      date: '2024-02-03',
      time: '23:30',
      expected: ['癸卯', '乙丑', '戊戌', '壬子'],
    },
    {
      label: '입춘 후 야자시 2024-02-04 23:30',
      date: '2024-02-04',
      time: '23:30',
      expected: ['甲辰', '丙寅', '己亥', '甲子'],
    },
    {
      label: '야자시 2024-06-10 23:30 — 일주 익일 + 時干 戊子(이중시프트 금지)',
      date: '2024-06-10',
      time: '23:30',
      expected: ['甲辰', '庚午', '丙午', '戊子'],
    },
    { label: '해시 2024-06-10 22:59', date: '2024-06-10', time: '22:59', expected: ['甲辰', '庚午', '乙巳', '丁亥'] },
    { label: '조자시 2024-06-11 00:30', date: '2024-06-11', time: '00:30', expected: ['甲辰', '庚午', '丙午', '戊子'] },
    {
      label: '경칩 전 2024-03-05 09:00',
      date: '2024-03-05',
      time: '09:00',
      expected: ['甲辰', '丙寅', '戊辰', '丁巳'],
    },
    {
      label: '경칩 후 2024-03-05 11:00 — 월주 전환',
      date: '2024-03-05',
      time: '11:00',
      expected: ['甲辰', '丁卯', '戊辰', '戊午'],
    },
  ]

describe('사주 명식 골든값 (lunar-javascript 오라클 검증)', () => {
  describe.each(PILLAR_GOLDENS)('$label', ({ date, time, expected }) => {
    it('getSajuData 4주 일치', () => {
      const saju = getSajuData(date, time, true)
      expect([
        saju.pillars.year.ganji,
        saju.pillars.month.ganji,
        saju.pillars.day.ganji,
        saju.pillars.time.ganji,
      ]).toEqual(expected)
    })

    it('calculateManse 4주 일치 (양 구현 정합)', () => {
      const manse = calculateManse(date, time)
      const ganji = (p: { ganHan: string; jiHan: string }) => `${p.ganHan}${p.jiHan}`
      expect([ganji(manse.year), ganji(manse.month), ganji(manse.day), ganji(manse.time)]).toEqual(expected)
    })
  })
})

describe('대운 골든값 (EightChar.getYun, 만나이 = 시작연도-출생연도)', () => {
  it('1990-03-15 08:30 남 — 양간(庚) 순행, 1997년(만 7세) 庚辰 시작', () => {
    const daeun = calculateDaeun('1990-03-15', '08:30', 'M', true)
    expect(daeun[0].age).toBe(7)
    expect(daeun[0].ganji).toBe('庚辰')
  })

  it('1990-03-15 08:30 여 — 역행, 1993년(만 3세) 戊寅 시작', () => {
    const daeun = calculateDaeun('1990-03-15', '08:30', 'F', true)
    expect(daeun[0].age).toBe(3)
    expect(daeun[0].ganji).toBe('戊寅')
  })

  it('2000-10-10 10:00 여 — 2001년(만 1세) 乙酉 시작', () => {
    const daeun = calculateDaeun('2000-10-10', '10:00', 'F', true)
    expect(daeun[0].age).toBe(1)
    expect(daeun[0].ganji).toBe('乙酉')
  })

  it('대운 점수는 결정론적 (Math.random 회귀 방지)', () => {
    const a = calculateDaeun('1990-03-15', '08:30', 'M', true)
    const b = calculateDaeun('1990-03-15', '08:30', 'M', true)
    expect(a.map((d) => d.score)).toEqual(b.map((d) => d.score))
  })
})

// ===== 음력 윤달 골든 (R-P0-3) =====
// 골든값 출처: lunar-javascript(6tail Lunar 엔진, 앱의 만세력) 직접 실행 검증(2026-07-22).
// 규약(node_modules/lunar-javascript/lunar.js): 음력 윤달은 음(-)월로 전달 → month<0=闰月.
//   근거 L974 `(month<0?'闰':'')`, L2826 `isLeap:function(){return this._p.month<0;}`.
// 교차 검증(만세력↔양력 절기):
//   · 2020 음력 윤4월 15일 = 양력 2020-06-06(芒種 이후 → 午月),
//     평달 4월 15일 = 양력 2020-05-07(立夏 이후 → 巳月) → 월주 巳月(辛巳)→午月(壬午)로 교정됨.
//   · 2023 음력 윤2월 5일 = 양력 2023-03-26, 평달 2월 5일 = 양력 2023-02-24 → 월주 甲寅→乙卯.
const LEAP_GOLDENS: Array<{
  label: string
  date: string
  regular: [string, string, string, string]
  leap: [string, string, string, string]
}> = [
  {
    label: '2020 윤4월 15일 (양 05-07 vs 06-06)',
    date: '2020-04-15',
    regular: ['庚子', '辛巳', '庚戌', '壬午'],
    leap: ['庚子', '壬午', '庚辰', '壬午'],
  },
  {
    label: '2023 윤2월 5일 (양 02-24 vs 03-26)',
    date: '2023-02-05',
    regular: ['癸卯', '甲寅', '癸丑', '戊午'],
    leap: ['癸卯', '乙卯', '癸未', '戊午'],
  },
]

describe('음력 윤달 골든값 (윤달=음월 전달, 월주 교정)', () => {
  const pillars = (saju: ReturnType<typeof getSajuData>): [string, string, string, string] => [
    saju.pillars.year.ganji,
    saju.pillars.month.ganji,
    saju.pillars.day.ganji,
    saju.pillars.time.ganji,
  ]
  describe.each(LEAP_GOLDENS)('$label', ({ date, regular, leap }) => {
    it('평달(isLeapMonth=false) 4주 일치', () => {
      expect(pillars(getSajuData(date, '12:00', false, false))).toEqual(regular)
    })
    it('윤달(isLeapMonth=true) 4주 일치', () => {
      expect(pillars(getSajuData(date, '12:00', false, true))).toEqual(leap)
    })
    it('윤달은 평달과 월주(月柱)가 달라진다 — 오계산 제거', () => {
      const r = getSajuData(date, '12:00', false, false)
      const l = getSajuData(date, '12:00', false, true)
      expect(l.pillars.month.ganji).not.toBe(r.pillars.month.ganji)
    })
  })

  it('4번째 인자 미전달 시 평달로 계산(기존 호출부 하위호환)', () => {
    const withDefault = getSajuData('2020-04-15', '12:00', false)
    const explicitFalse = getSajuData('2020-04-15', '12:00', false, false)
    expect(withDefault.pillars.month.ganji).toBe(explicitFalse.pillars.month.ganji)
  })
})
