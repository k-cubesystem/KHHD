/**
 * C-1 「나갈까 말까, 벌써 세 번째」 판정의 계약.
 *
 * ## 🔴 이 파일이 지키는 단 하나
 * **같은 사주 = 같은 판정.** AI 는 문장만 다를 수 있다. 판정이 흔들리면 「같은 사주에 다른 답」이
 * 되고 그 순간 서비스가 신뢰를 잃는다(마스터 §5-1). 그래서 판정 함수는 순수 함수이고,
 * 기준 연도조차 인자로 받는다 — 시각을 읽으면 테스트가 시각으로 흔들린다.
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import { leaveOrStayResolver, LEAVE_OR_STAY_LABELS } from '@/lib/domain/theme-fortune/resolvers/leave-or-stay'
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
    yearly: leaveOrStayResolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset)),
    rules: evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal),
  }
}

function judgeAll(baseYear = BASE_YEAR): ThemeVerdict[] {
  return PEOPLE.map((person) => leaveOrStayResolver.judge(inputFor(person, baseYear)))
}

describe('leave-or-stay — 🔴 결정론', () => {
  it('같은 사주·같은 기준 연도를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = leaveOrStayResolver.judge(inputFor(person))
      const second = leaveOrStayResolver.judge(inputFor(person))

      expect(first).toEqual(second)
    }
  })

  it('원국에서 나오는 두 축은 기준 연도가 바뀌어도 같다 (시각에 흔들리지 않는다)', () => {
    // 「눌리는 힘」·「나가려는 힘」은 태어난 순간에 정해진 값이다. 여기가 흔들리면 판정 라벨이
    // 해마다 달라져 「작년엔 버티는 결이라더니」가 된다.
    for (const person of PEOPLE) {
      const now = leaveOrStayResolver.judge(inputFor(person, BASE_YEAR))
      const later = leaveOrStayResolver.judge(inputFor(person, BASE_YEAR + 3))

      expect(now.indicators[0]).toEqual(later.indicators[0])
      expect(now.indicators[1]).toEqual(later.indicators[1])
      expect(now.verdictLabel).toEqual(later.verdictLabel)
    }
  })

  it('사주가 다르면 판정이 한 칸에 몰려 있지 않다 (표가 장식이 아니다)', () => {
    const labels = new Set(judgeAll().map((verdict) => verdict.verdictLabel?.key))

    expect(labels.size).toBeGreaterThan(1)
  })
})

describe('leave-or-stay — 지표 3종', () => {
  it('정확히 셋이고, 키·라벨이 설계 그대로다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators).toHaveLength(3)
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual([
        'gwan_pressure',
        'siksang_pull',
        'year_gate',
      ])
      expect(verdict.indicators.map((indicator) => indicator.label)).toEqual(['눌리는 힘', '나가려는 힘', '올해의 문'])
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

describe('leave-or-stay — 판정 4택 (2×2 고정 매핑)', () => {
  it('네 칸이 다 다르고, 좌상단은 「자리보다 다른 데 있는 결」이다', () => {
    // 🔴 이 칸이 이 테마의 양심이다 — 「직장 문제가 아닐 수 있다」는 답이 표에 자리로 존재해야
    //    한다. 지우면 상품이 늘 직장에서 원인을 찾게 된다.
    const verdict = judgeAll()[0]
    const matrix = verdict.matrix
    if (!matrix) throw new Error('판정표가 없다')

    const keys = matrix.cells.flat().map((cell) => cell.key)
    expect(new Set(keys).size).toBe(4)
    expect(matrix.cells[0][0]).toEqual(LEAVE_OR_STAY_LABELS.elsewhere)
    expect(matrix.cells[0][0].openEnded).toBe(true)
  })

  it('판정 라벨은 언제나 앞 두 축 밴드가 가리키는 칸이다', () => {
    for (const verdict of judgeAll()) {
      const matrix = verdict.matrix
      if (!matrix) throw new Error('판정표가 없다')

      const pressing = verdict.indicators[0].band !== 'low'
      const pulling = verdict.indicators[1].band !== 'low'

      expect(verdict.verdictLabel).toEqual(matrix.cells[pressing ? 1 : 0][pulling ? 1 : 0])
    }
  })

  it('표의 축은 실제 지표를 가리킨다 (화면의 막대와 표가 같은 눈금을 쓴다)', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.matrix?.rowIndicatorKey).toBe(verdict.indicators[0].key)
      expect(verdict.matrix?.colIndicatorKey).toBe(verdict.indicators[1].key)
    }
  })

  it('「높다」의 문턱은 밴드 경계와 같은 자리다', () => {
    // 두 눈금이 다르면 화면의 막대가 «보통»인데 판정은 «낮음» 칸에 있는 일이 생긴다.
    expect(bandOf(BAND_THRESHOLD.mid)).not.toBe('low')
    expect(bandOf(BAND_THRESHOLD.mid - 1)).toBe('low')
  })

  it('🔴 「버티는 결」을 실패로 적지 않는다', () => {
    // 남는 쪽을 실패로 그리면 그 순간 이 상품이 이직을 권한 것이 된다(직장·재물 §5 C-1).
    expect(LEAVE_OR_STAY_LABELS.hold.note).toContain('선택')
    for (const label of Object.values(LEAVE_OR_STAY_LABELS)) {
      expect(label.note).not.toMatch(/실패|후회|늦었|손해/)
      // 결론·지시가 아니라 «결»의 서술이어야 한다.
      expect(label.note).not.toMatch(/하세요|하십시오|권합니다|추천/)
    }
  })
})

describe('leave-or-stay — 시기', () => {
  it('달은 1~12 이고, 세운이 준 달에서만 온다 (지어내지 않는다)', () => {
    for (const person of PEOPLE) {
      const input = inputFor(person)
      const verdict = leaveOrStayResolver.judge(input)

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

  it('「열리는 달」 칸이 통째로 비지 않는다 (막혔다고만 말하지 않는다)', () => {
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

describe('leave-or-stay — 되짚기·룰', () => {
  it('과거 근거는 «있으면 연도 형식», 없으면 null 이다 (지어낸 과거를 싣지 않는다)', () => {
    for (const verdict of judgeAll()) {
      if (verdict.pastHint === null) continue

      expect(verdict.pastHint.period).toMatch(/^\d{4}년$/)
      expect(Number(verdict.pastHint.period.slice(0, 4))).toBeLessThan(BASE_YEAR)
      expect(verdict.pastHint.basis.trim().length).toBeGreaterThan(0)
    }
  })

  it('룰 히트는 이 테마가 읽기로 한 것만 실린다', () => {
    const watched = ['잦은 이동·해외운', '법적 분쟁 위험', '소송·폭력 위험', '무역·창업 적성']

    for (const verdict of judgeAll()) {
      for (const hit of verdict.ruleHits) expect(watched).toContain(hit)
    }
  })

  it('판정에 테마 id 가 실려 저장본이 어느 테마인지 스스로 안다', () => {
    for (const verdict of judgeAll()) expect(verdict.themeId).toBe('leave-or-stay')
  })
})

describe('leave-or-stay — L3 계약', () => {
  it('🔴 양방향 지시를 프롬프트가 막는다 (「이직하세요」도 「참으세요」도 안 된다)', () => {
    const { rules, forbidden } = leaveOrStayResolver.prompt

    expect(rules.join('\n')).toContain('이직을 권하거나 만류하지 마라')
    expect(forbidden.join('\n')).toMatch(/이직하세요/)
    expect(forbidden.join('\n')).toMatch(/버티세요|참으세요/)
  })

  it('🔴 노동 상담·처우 어휘를 막는다', () => {
    const forbidden = leaveOrStayResolver.prompt.forbidden.join('\n')

    expect(forbidden).toMatch(/연봉/)
    expect(forbidden).toMatch(/부당해고|권고사직|실업급여/)
  })

  it('🔴 통계 인용을 막는다 (테마를 만든 이유이지 결과의 근거가 아니다)', () => {
    expect(leaveOrStayResolver.prompt.forbidden.join('\n')).toMatch(/설문|통계/)
  })

  it('판정을 뒤집지 못하게 못 박는다', () => {
    expect(leaveOrStayResolver.prompt.rules.join('\n')).toMatch(/verdictLabel 을 뒤집지 마라/)
  })
})
