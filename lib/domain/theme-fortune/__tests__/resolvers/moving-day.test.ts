/**
 * 풍수 테마 1 「손 없는 날은 다 같은 날이 아니다」(`moving-day`) 판정의 계약.
 *
 * ## 🔴 이 파일이 지키는 둘
 * ① **같은 사주 = 같은 판정.** AI 는 문장만 다를 수 있다(마스터 §5-1). 판정 함수는 순수 함수이고
 *    기준 연도조차 인자로 받는다 — 시각을 읽으면 테스트가 시각으로 흔들린다.
 * ② **날(日)을 지어내지 않는다.** 기획서(PLAN-theme-fengshui-v1 §4 테마 1) ⑥ 🔴 그대로 —
 *    같은 사람이 두 번 눌렀을 때 다른 날이 나오는 순간 이 기능은 끝난다. 이 골격의 시기는
 *    세운이 준 달까지만이고, 손 없는 날·음력 날짜는 판정 어디에도 없다.
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import {
  movingDayResolver,
  MOVING_DAY_INDICATOR_KEYS,
  MOVING_DAY_INDICATOR_LABELS,
} from '@/lib/domain/theme-fortune/resolvers/moving-day'
import {
  allowedMonths,
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
    yearly: movingDayResolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset)),
    rules: evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal),
  }
}

function judgeAll(baseYear = BASE_YEAR): ThemeVerdict[] {
  return PEOPLE.map((person) => movingDayResolver.judge(inputFor(person, baseYear)))
}

describe('moving-day — 🔴 결정론', () => {
  it('같은 사주·같은 기준 연도를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = movingDayResolver.judge(inputFor(person))
      const second = movingDayResolver.judge(inputFor(person))

      expect(first).toEqual(second)
    }
  })

  it('원국에서 나오는 「움직이는 힘」은 기준 연도가 바뀌어도 같다 (시각에 흔들리지 않는다)', () => {
    // 역마·원국 충·공망은 태어난 순간에 정해진 값이다. 여기가 흔들리면 「작년엔 급하지 않은
    // 원국이라더니」가 된다. 문 두 짝은 해를 보는 지표라 해가 바뀌면 달라지는 것이 설계다.
    for (const person of PEOPLE) {
      const now = movingDayResolver.judge(inputFor(person, BASE_YEAR))
      const later = movingDayResolver.judge(inputFor(person, BASE_YEAR + 3))

      expect(now.indicators[0]).toEqual(later.indicators[0])
    }
  })

  it('사주가 다르면 지표 밴드가 한 모양에 몰려 있지 않다 (지표가 장식이 아니다)', () => {
    const signatures = new Set(
      judgeAll().map((verdict) => verdict.indicators.map((indicator) => indicator.band).join('/'))
    )

    expect(signatures.size).toBeGreaterThan(1)
  })
})

describe('moving-day — 지표 3종', () => {
  it('정확히 셋이고, 키·라벨이 설계 그대로다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators).toHaveLength(3)
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual([...MOVING_DAY_INDICATOR_KEYS])
      expect(verdict.indicators.map((indicator) => indicator.label)).toEqual([...MOVING_DAY_INDICATOR_LABELS])
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

describe('moving-day — 판정 구조 (양자택일이 아니다)', () => {
  it('판정 라벨과 판정표가 없다 — 이 테마는 「가라/마라」를 고르지 않고 시기를 가른다', () => {
    // 라벨 칸을 만드는 순간 「이사 지시 금지」(기획서 ⑨)를 코드 구조가 어기게 된다.
    for (const verdict of judgeAll()) {
      expect(verdict.verdictLabel).toBeNull()
      expect(verdict.matrix).toBeUndefined()
    }
  })
})

describe('moving-day — 시기 (이 상품의 핵심)', () => {
  it('🔴 달은 1~12 이고, 세운이 준 달에서만 온다 (날짜는커녕 달도 지어내지 않는다)', () => {
    for (const person of PEOPLE) {
      const input = inputFor(person)
      const verdict = movingDayResolver.judge(input)

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

  it('시기는 올해·내년만 다룬다 (과거 세운은 되짚기 근거로만 쓴다)', () => {
    for (const verdict of judgeAll()) {
      for (const timing of verdict.timings) {
        expect([BASE_YEAR, BASE_YEAR + 1]).toContain(timing.year)
      }
    }
  })

  it('「열리는 달」 칸이 통째로 비지 않는다 (갈 때가 없다고만 말하지 않는다)', () => {
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

describe('moving-day — 되짚기·룰', () => {
  it('과거 근거는 «있으면 연도 형식», 없으면 null 이다 (지어낸 과거를 싣지 않는다)', () => {
    for (const verdict of judgeAll()) {
      if (verdict.pastHint === null) continue

      expect(verdict.pastHint.period).toMatch(/^\d{4}년$/)
      expect(Number(verdict.pastHint.period.slice(0, 4))).toBeLessThan(BASE_YEAR)
      expect(verdict.pastHint.basis.trim().length).toBeGreaterThan(0)
    }
  })

  it('룰 히트는 타향살이 3룰만 실린다 (이동·이거의 고전 소재)', () => {
    const watched = ['객지 자수성가', '잦은 이동·해외운', '부모 떠남']

    for (const verdict of judgeAll()) {
      for (const hit of verdict.ruleHits) expect(watched).toContain(hit)
    }
  })

  it('판정에 테마 id 가 실려 저장본이 어느 테마인지 스스로 안다', () => {
    for (const verdict of judgeAll()) expect(verdict.themeId).toBe('moving-day')
  })
})

describe('moving-day — L3 계약', () => {
  it('🔴 AI 가 날짜를 고르지 못하게 못 박는다 (기획서 ⑥ — 날짜가 흔들리면 이 기능은 끝난다)', () => {
    const { rules, forbidden } = movingDayResolver.prompt

    expect(rules.join('\n')).toContain('날짜를 고르지 마라')
    expect(forbidden.join('\n')).toMatch(/음력 날짜/)
    expect(forbidden.join('\n')).toMatch(/손 없는 날 날짜/)
  })

  it('🔴 양방향 지시를 막는다 (「이사 가라」도 「미뤄라」도 안 된다)', () => {
    expect(movingDayResolver.prompt.rules.join('\n')).toContain('이사하라고도 미루라고도 말하지 마라')
  })

  it('🔴 효과 단정을 막는다 — 「어긋나지 않는 날」까지만 (기획서 ⑨ 그대로)', () => {
    const { rules, forbidden } = movingDayResolver.prompt

    expect(forbidden.join('\n')).toMatch(/재물이 는다/)
    expect(rules.join('\n')).toMatch(/어긋나지 않는 달/)
  })

  it('🔴 업체 알선·부동산 판단·법률 상담 어휘를 막는다', () => {
    const forbidden = movingDayResolver.prompt.forbidden.join('\n')

    expect(forbidden).toMatch(/이사업체/)
    expect(forbidden).toMatch(/알선/)
    expect(forbidden).toMatch(/시세|집값/)
    expect(forbidden).toMatch(/전세사기|보증금/)
  })

  it('🔴 금지어가 질문·규율에 없다 (레지스트리 금지어 게이트를 선제 통과)', () => {
    // `resolvers.test.ts` 의 BANNED 와 같은 배열 — forbidden 은 금지어를 «인용»하는 자리라 뺀다.
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
    const { question, rules } = movingDayResolver.prompt

    for (const line of [question, ...rules]) {
      for (const word of BANNED) expect(line).not.toContain(word)
    }
  })
})
