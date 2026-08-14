/**
 * 풍수 테마 2 「집이 문제인가, 때가 문제인가」(`house-or-timing`) 판정의 계약.
 *
 * ## 🔴 이 파일이 지키는 둘
 * ① **같은 사주 = 같은 판정**(마스터 §5-1). 판정은 순수 함수, 기준 연도는 인자다.
 * ② **「둘 다 아닌 결」이 자리로 존재한다.** 기획서(PLAN-theme-fengshui-v1 §4 테마 2) ⑨ —
 *    이 칸이 없으면 항상 불안을 파는 구조가 되고, 그건 표시광고법 이전에 상품으로서 거짓이다.
 *    직장·재물 §3-6 이 «풍수 테마2에서 확립»이라 인용하는 그 규율의 원산지가 여기다.
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import {
  houseOrTimingResolver,
  HOUSE_OR_TIMING_LABELS,
  HOUSE_OR_TIMING_OPEN_ENDED_KEY,
} from '@/lib/domain/theme-fortune/resolvers/house-or-timing'
import {
  allowedMonths,
  BAND_THRESHOLD,
  bandOf,
  timingsOf,
  type ThemeJudgeInput,
  type ThemeVerdict,
} from '@/lib/domain/theme-fortune/verdict-types'

/** 기준 연도를 고정한다 — 오늘 날짜가 바뀌어도 이 파일의 기대값은 안 바뀐다. */
const BASE_YEAR = 2026

/** 결이 서로 다르게 나오도록 고른 표본. 값이 아니라 **법칙**을 검증하는 데 쓴다. */
const PEOPLE: ReadonlyArray<PersonInfo> = [
  { name: '가', birthDate: '1988-03-14', birthTime: '09:30', gender: 'male' },
  { name: '나', birthDate: '1993-11-02', birthTime: '23:10', gender: 'female' },
  { name: '다', birthDate: '1979-06-25', birthTime: '05:00', gender: 'male' },
  { name: '라', birthDate: '2000-01-08', birthTime: '14:40', gender: 'female' },
  { name: '마', birthDate: '1985-09-30', birthTime: '18:20', gender: 'female' },
  { name: '바', birthDate: '1996-04-17', birthTime: '02:15', gender: 'male' },
]

function inputFor(person: PersonInfo, baseYear = BASE_YEAR): ThemeJudgeInput {
  const ctx = buildSajuContext(person)
  return {
    ctx,
    baseYear,
    yearly: houseOrTimingResolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset)),
    rules: evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal),
  }
}

function judgeAll(baseYear = BASE_YEAR): ThemeVerdict[] {
  return PEOPLE.map((person) => houseOrTimingResolver.judge(inputFor(person, baseYear)))
}

describe('house-or-timing — 🔴 결정론', () => {
  it('같은 사주·같은 기준 연도를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = houseOrTimingResolver.judge(inputFor(person))
      const second = houseOrTimingResolver.judge(inputFor(person))

      expect(first).toEqual(second)
    }
  })

  it('원국에서 나오는 「터의 감응」은 기준 연도가 바뀌어도 같다 (시각에 흔들리지 않는다)', () => {
    // 역마·거처 궁의 충·공망·귀문은 태어난 순간에 정해진 값이다. 「때의 눌림」은 되짚기 창이
    // 해를 따라 옮겨 가는 지표라 기준 연도와 함께 움직이는 것이 설계다(«이사 온 뒤로 꼬였다»는
    // 지금 시점의 질문이다) — 그래서 이 테스트는 터 축 하나만 고정한다.
    for (const person of PEOPLE) {
      const now = houseOrTimingResolver.judge(inputFor(person, BASE_YEAR))
      const later = houseOrTimingResolver.judge(inputFor(person, BASE_YEAR + 3))

      expect(now.indicators[1]).toEqual(later.indicators[1])
    }
  })

  it('사주가 다르면 판정이 한 칸에 몰려 있지 않다 (표가 장식이 아니다)', () => {
    const labels = new Set(judgeAll().map((verdict) => verdict.verdictLabel?.key))

    expect(labels.size).toBeGreaterThan(1)
  })
})

describe('house-or-timing — 지표 3종', () => {
  it('정확히 셋이고, 키·라벨이 설계 그대로다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators).toHaveLength(3)
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual([
        'time_pressure',
        'place_resonance',
        'year_gate',
      ])
      expect(verdict.indicators.map((indicator) => indicator.label)).toEqual(['때의 눌림', '터의 감응', '올해의 문'])
    }
  })

  it('점수는 0~100 이고 밴드는 그 점수에서만 나온다', () => {
    for (const verdict of judgeAll()) {
      for (const indicator of verdict.indicators) {
        expect(indicator.score).toBeGreaterThanOrEqual(0)
        expect(indicator.score).toBeLessThanOrEqual(100)
        expect(Number.isInteger(indicator.score)).toBe(true)
        expect(indicator.band).toBe(bandOf(indicator.score))
      }
    }
  })

  it('근거는 L1 출력에서 파생한 문장이다 (빈 칸이 없다)', () => {
    for (const verdict of judgeAll()) {
      for (const indicator of verdict.indicators) {
        expect(indicator.basis.trim().length).toBeGreaterThan(0)
      }
    }
  })
})

describe('house-or-timing — 판정 4택 (2×2 고정 매핑)', () => {
  it('🔴 네 칸이 다 다르고, 좌상단은 「둘 다 아닌 결」이며 그 칸만 열려 있다', () => {
    // 기획서 ⑨ — 「둘 다 아님」 판정이 반드시 존재해야 한다. 이 칸을 지우면 상품이 늘 집이나
    // 때에서 원인을 찾게 되고, 그 순간 «무조건 뭔가 나쁘다»를 파는 구조가 된다.
    const verdict = judgeAll()[0]
    const matrix = verdict.matrix
    if (!matrix) throw new Error('판정표가 없다')

    const cells = matrix.cells.flat()
    expect(new Set(cells.map((cell) => cell.key)).size).toBe(4)
    expect(matrix.cells[0][0]).toEqual(HOUSE_OR_TIMING_LABELS.neither)
    expect(matrix.cells[0][0].key).toBe(HOUSE_OR_TIMING_OPEN_ENDED_KEY)
    expect(matrix.cells[0][0].openEnded).toBe(true)
    // 열린 결말은 정확히 한 칸 — 「터를 살펴볼 결」까지 열어 두면 판정이 아무 말도 안 한 것이 된다.
    expect(cells.filter((cell) => cell.openEnded === true)).toHaveLength(1)
  })

  it('판정 라벨은 언제나 앞 두 축 밴드가 가리키는 칸이다', () => {
    for (const verdict of judgeAll()) {
      const matrix = verdict.matrix
      if (!matrix) throw new Error('판정표가 없다')

      const pressing = verdict.indicators[0].band !== 'low'
      const resonating = verdict.indicators[1].band !== 'low'

      expect(verdict.verdictLabel).toEqual(matrix.cells[pressing ? 1 : 0][resonating ? 1 : 0])
    }
  })

  it('표의 축은 실제 지표를 가리킨다 (화면의 막대와 표가 같은 눈금을 쓴다)', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.matrix?.rowIndicatorKey).toBe(verdict.indicators[0].key)
      expect(verdict.matrix?.colIndicatorKey).toBe(verdict.indicators[1].key)
    }
  })

  it('「높다」의 문턱은 밴드 경계와 같은 자리다', () => {
    expect(bandOf(BAND_THRESHOLD.mid)).not.toBe('low')
    expect(bandOf(BAND_THRESHOLD.mid - 1)).toBe('low')
  })

  it('🔴 라벨이 겁을 주지도, 지시하지도 않는다 (완충 화법 — 기획서 §2-1·⑨)', () => {
    // 「이 집에 살면 화를 입는다」류가 라벨에 스미는 순간 미신적 공포 조장이 된다.
    for (const label of Object.values(HOUSE_OR_TIMING_LABELS)) {
      expect(label.note).not.toMatch(/실패|후회|늦었|손해/)
      expect(label.note).not.toMatch(/화를 입|해롭|불행|나쁜 집/)
      expect(label.note).not.toMatch(/하세요|하십시오|권합니다|추천/)
    }
    // 「터를 살펴볼 결」도 집을 단정하지 않는다 — 사주는 그 집을 보지 못했다.
    expect(HOUSE_OR_TIMING_LABELS.place.note).toContain('수 있습니다')
  })
})

describe('house-or-timing — 시기', () => {
  it('달은 1~12 이고, 세운이 준 달에서만 온다 (지어내지 않는다)', () => {
    for (const person of PEOPLE) {
      const input = inputFor(person)
      const verdict = houseOrTimingResolver.judge(input)

      for (const timing of verdict.timings) {
        const fortune = input.yearly.find((year) => year.year === timing.year)
        if (!fortune) throw new Error(`판정에 없는 해가 실렸다: ${timing.year}`)

        const source = timing.kind === 'opportunity' ? fortune.keyOpportunityMonths : fortune.keyCautionMonths
        for (const month of timing.months) {
          expect(month).toBeGreaterThanOrEqual(1)
          expect(month).toBeLessThanOrEqual(12)
          expect(source).toContain(month)
        }
      }
    }
  })

  it('시기는 올해·내년만 다룬다 (지난 세 해는 되짚기 근거로만 쓴다)', () => {
    for (const verdict of judgeAll()) {
      for (const timing of verdict.timings) {
        expect([BASE_YEAR, BASE_YEAR + 1]).toContain(timing.year)
      }
    }
  })

  it('「열리는 달」 칸이 통째로 비지 않는다 (되짚기로 끝나는 화면을 만들지 않는다)', () => {
    for (const verdict of judgeAll()) {
      expect(timingsOf(verdict, 'opportunity').length).toBeGreaterThan(0)
    }
  })

  it('allowedMonths 가 시기 전량을 중복 없이 모은다 (AI 월 검증의 기준)', () => {
    for (const verdict of judgeAll()) {
      const months = allowedMonths(verdict)

      expect(new Set(months).size).toBe(months.length)
      expect([...months].sort((a, b) => a - b)).toEqual(months)
      for (const timing of verdict.timings) {
        for (const month of timing.months) expect(months).toContain(month)
      }
    }
  })
})

describe('house-or-timing — 되짚기·룰', () => {
  it('과거 근거는 «있으면 되짚기 창 안의 연도», 없으면 null 이다 (지어낸 과거를 싣지 않는다)', () => {
    for (const verdict of judgeAll()) {
      if (verdict.pastHint === null) continue

      expect(verdict.pastHint.period).toMatch(/^\d{4}년$/)
      const year = Number(verdict.pastHint.period.slice(0, 4))
      // 「이사 온 뒤 1~3년」(기획서 ④)의 창 — 그 밖의 해를 되짚으면 질문과 무관한 과거가 된다.
      expect(year).toBeGreaterThanOrEqual(BASE_YEAR - 3)
      expect(year).toBeLessThan(BASE_YEAR)
      expect(verdict.pastHint.basis.trim().length).toBeGreaterThan(0)
    }
  })

  it('룰 히트는 터·거처 소재 2룰만 실린다', () => {
    const watched = ['객지 자수성가', '잦은 이동·해외운']

    for (const verdict of judgeAll()) {
      for (const hit of verdict.ruleHits) expect(watched).toContain(hit)
    }
  })

  it('판정에 테마 id 가 실려 저장본이 어느 테마인지 스스로 안다', () => {
    for (const verdict of judgeAll()) expect(verdict.themeId).toBe('house-or-timing')
  })
})

describe('house-or-timing — L3 계약', () => {
  it('판정을 뒤집지 못하게 못 박는다', () => {
    expect(houseOrTimingResolver.prompt.rules.join('\n')).toMatch(/verdictLabel 을 뒤집지 마라/)
  })

  it('🔴 공포 조장을 막는다 (「이 집에 살면 화를 입는다」류)', () => {
    expect(houseOrTimingResolver.prompt.forbidden.join('\n')).toMatch(/화를 입는다/)
    expect(houseOrTimingResolver.prompt.rules.join('\n')).toContain('무섭게 말하지 마라')
  })

  it('🔴 이사·계약 지시를 막고, 「이사 없이 큰돈 들이지 않고」 규율을 승계한다 (§2-1 ④ — 완화 금지)', () => {
    const { rules, forbidden } = houseOrTimingResolver.prompt

    expect(rules.join('\n')).toContain('이사를 권하지 마라')
    expect(rules.join('\n')).toContain('이사 없이, 큰돈 들이지 않고')
    expect(forbidden.join('\n')).toMatch(/이사 가세요|떠나세요/)
  })

  it('🔴 사주가 집을 본 것처럼 말하지 못하게 한다 (집 실사는 사진·방위를 받는 풍수 기능의 몫)', () => {
    expect(houseOrTimingResolver.prompt.rules.join('\n')).toMatch(/사진과 방위가 필요/)
  })

  it('🔴 시세·투자·법률·구매 권유 어휘를 막는다', () => {
    const forbidden = houseOrTimingResolver.prompt.forbidden.join('\n')

    expect(forbidden).toMatch(/집값|시세/)
    expect(forbidden).toMatch(/투자/)
    expect(forbidden).toMatch(/전세사기|보증금|권리분석/)
    expect(forbidden).toMatch(/개운 물품/)
  })

  it('🔴 금지어가 질문·규율에 없다 (레지스트리 금지어 게이트를 선제 통과)', () => {
    const BANNED = [
      '매일',
      '무제한',
      '평생',
      '모두 이용',
      '정액',
      '보장',
      '반드시',
      '확실히',
      '최고',
      '유일',
      '1위',
      '급등',
      '대박',
      '완치',
      '채용',
      '뽑',
      '지원자',
      '적합도',
      '선발',
      '합격',
      '승진',
    ]
    const { question, rules } = houseOrTimingResolver.prompt

    for (const line of [question, ...rules]) {
      for (const word of BANNED) expect(line).not.toContain(word)
    }
  })
})
