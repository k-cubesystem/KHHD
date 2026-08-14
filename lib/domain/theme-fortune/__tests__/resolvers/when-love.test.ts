/**
 * L3 「내 인연은 언제 오나」 판정의 계약.
 *
 * ## 🔴 이 파일이 지키는 단 하나
 * **달은 코드가 확정한다**(연애 §5 L3 ⓑ·§3-3). 이 테마의 상품이 timings 이므로,
 * 달이 세운의 기회월·주의월 밖에서 오는 순간 상품 전체가 지어낸 예언이 된다.
 * 그리고 「온다」가 아니라 「열린다」 — 사건 예언을 막는 프롬프트 규율(§5 L3-9)을
 * 여기서 고정한다. 원국 지표(인연의 자리)는 기준 연도가 바뀌어도 흔들리면 안 된다.
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import { whenLoveResolver, WHEN_LOVE_INDICATORS } from '@/lib/domain/theme-fortune/resolvers/when-love'
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

/** 프롬프트 금지어 — 레지스트리 계약(resolvers.test.ts)과 같은 배열. 등록 전에 여기서 먼저 건다. */
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

function inputFor(person: PersonInfo, baseYear = BASE_YEAR): ThemeJudgeInput {
  const ctx = buildSajuContext(person)
  return {
    ctx,
    baseYear,
    yearly: whenLoveResolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset)),
    rules: evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal),
  }
}

function judgeAll(baseYear = BASE_YEAR): ThemeVerdict[] {
  return PEOPLE.map((person) => whenLoveResolver.judge(inputFor(person, baseYear)))
}

describe('when-love — 🔴 결정론', () => {
  it('같은 사주·같은 기준 연도를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = whenLoveResolver.judge(inputFor(person))
      const second = whenLoveResolver.judge(inputFor(person))

      expect(first).toEqual(second)
    }
  })

  it('원국 지표(인연의 자리)는 기준 연도가 바뀌어도 같다 (시각에 흔들리지 않는다)', () => {
    // 「열리는 창」·「결이 바뀌는 때」는 창이 이동하면 따라 움직이는 것이 설계다.
    // 태어난 순간에 정해지는 것은 첫 지표뿐이고, 그것만은 절대 흔들리면 안 된다.
    for (const person of PEOPLE) {
      const now = whenLoveResolver.judge(inputFor(person, BASE_YEAR))
      const later = whenLoveResolver.judge(inputFor(person, BASE_YEAR + 3))

      expect(now.indicators[0]).toEqual(later.indicators[0])
    }
  })

  it('사주가 다르면 창이 한 칸에 몰려 있지 않다 (지표가 장식이 아니다)', () => {
    const verdicts = judgeAll()

    expect(new Set(verdicts.map((verdict) => verdict.indicators[1].band)).size).toBeGreaterThan(1)
    expect(new Set(verdicts.map((verdict) => verdict.indicators[2].band)).size).toBeGreaterThan(1)
  })
})

describe('when-love — 지표 3종', () => {
  it('정확히 셋이고, 키·라벨이 설계 그대로다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators).toHaveLength(3)
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual(['yeon_seat', 'window_open', 'turn_year'])
      expect(verdict.indicators.map((indicator) => indicator.label)).toEqual([
        '인연의 자리',
        '열리는 창',
        '결이 바뀌는 때',
      ])
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual(
        WHEN_LOVE_INDICATORS.map((entry) => entry.key)
      )
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

  it('「결이 바뀌는 때」는 대운 전환의 사실만 싣는다 (§5 L3 ⓓ)', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators[2].basis).toMatch(/대운 교체 \d{4}년|대운 전환 계산 없음/)
    }
  })
})

describe('when-love — 판정 구조 (양자택일이 아니다)', () => {
  it('판정 라벨·판정표가 없다 — 이 테마의 답은 칸이 아니라 달이 실린 timings 다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.verdictLabel).toBeNull()
      expect(verdict.matrix).toBeUndefined()
    }
  })

  it('🔴 근거 문장에 지시·조바심 어휘가 없다 (기다림을 지시하지도, 늦었다고 겁주지도 않는다)', () => {
    for (const verdict of judgeAll()) {
      const texts = [
        ...verdict.indicators.map((indicator) => indicator.basis),
        ...verdict.timings.map((timing) => timing.basis),
      ]
      for (const text of texts) {
        expect(text).not.toMatch(/하세요|하십시오|권합니다|추천|실패|후회|늦었|손해|기다리/)
      }
    }
  })
})

describe('when-love — 시기 (이 테마의 상품)', () => {
  it('🔴 달은 1~12 이고, 세운이 준 달에서만 온다 — 여기가 무너지면 상품 전체가 예언이 된다', () => {
    for (const person of PEOPLE) {
      const input = inputFor(person)
      const verdict = whenLoveResolver.judge(input)

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

  it('기회는 3개년 창 안에서 1~2개, 주의는 가까운 두 해에서 1~2개다 (그릇 규격)', () => {
    for (const verdict of judgeAll()) {
      const opportunities = timingsOf(verdict, 'opportunity')
      const cautions = timingsOf(verdict, 'caution')

      expect(opportunities.length).toBeGreaterThanOrEqual(1)
      expect(opportunities.length).toBeLessThanOrEqual(2)
      expect(cautions.length).toBeGreaterThanOrEqual(1)
      expect(cautions.length).toBeLessThanOrEqual(2)

      for (const timing of opportunities) {
        expect([BASE_YEAR, BASE_YEAR + 1, BASE_YEAR + 2]).toContain(timing.year)
      }
      for (const timing of cautions) {
        expect([BASE_YEAR, BASE_YEAR + 1]).toContain(timing.year)
      }
    }
  })

  it('기회는 가장 가까운 창부터 싣는다 (§5 L3-7 「가장 가까운 창」 카드의 데이터 순서)', () => {
    for (const verdict of judgeAll()) {
      const years = timingsOf(verdict, 'opportunity').map((timing) => timing.year)
      expect([...years].sort((a, b) => a - b)).toEqual(years)
    }
  })

  it('🔴 세 해 모두 신호가 없어도 기회 칸이 비지 않는다 — 근거에 그 사실을 적은 채로', () => {
    for (const verdict of judgeAll()) {
      expect(timingsOf(verdict, 'opportunity').length).toBeGreaterThan(0)
    }

    // 표본 「가」는 세 해 전부 신호가 없는 사주다 — 폴백 경로가 실제로 이렇게 말한다.
    const fallback = whenLoveResolver.judge(inputFor(PEOPLE[0]))
    expect(timingsOf(fallback, 'opportunity')[0].basis).toContain('세 해 중 흐름이 나은 쪽')
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

describe('when-love — 되짚기·룰', () => {
  it('🔴 과거 되짚기는 항상 null 이다 — 설계에 역추산이 없고, 없는 과거를 지어내지 않는다', () => {
    for (const verdict of judgeAll()) expect(verdict.pastHint).toBeNull()
  })

  it('룰 히트는 이 테마가 읽기로 한 것(정재·정관 동반)만 실린다 — 만혼 룰은 일부러 안 읽는다', () => {
    for (const verdict of judgeAll()) {
      for (const hit of verdict.ruleHits) expect(['좋은 배우자 인연']).toContain(hit)
    }
  })

  it('판정에 테마 id 가 실려 저장본이 어느 테마인지 스스로 안다', () => {
    for (const verdict of judgeAll()) expect(verdict.themeId).toBe('when-love')
  })

  it('세운은 올해·내년·내후년 3개년을 선언한다 (§5 L3 ⓐ)', () => {
    expect(whenLoveResolver.yearOffsets).toEqual([0, 1, 2])
    expect(whenLoveResolver.prompt.analysisType).toBe('TREND_LOVE')
  })
})

describe('when-love — L3 계약', () => {
  it('🔴 사건 예언을 막고 「행동하기 좋은 창」 번역을 강제한다 (§5 L3-9)', () => {
    const { rules, forbidden } = whenLoveResolver.prompt

    expect(forbidden.join('\n')).toMatch(/「N월에 인연이 옵니다」식 사건 예언/)
    expect(rules.join('\n')).toMatch(/약속을 잡아볼 만한 달/)
  })

  it('🔴 AI 가 달을 만들 수 없다 — timings 밖의 달·해를 금지하는 규율이 있다', () => {
    expect(whenLoveResolver.prompt.rules.join('\n')).toMatch(/새 달·새 해를 만들지 마라/)
  })

  it('🔴 결혼·출산 시기 단정과 보장 어휘를 막는다 (연애 §4-2)', () => {
    const forbidden = whenLoveResolver.prompt.forbidden.join('\n')

    expect(forbidden).toMatch(/결혼·출산 시기/)
    expect(forbidden).toMatch(/운명의 상대/)
    expect(forbidden).toMatch(/인연 보장/)
  })

  it('🔴 조바심 장사를 막는다 — 늦었다는 서술과 기다리라는 마감이 둘 다 금지다', () => {
    expect(whenLoveResolver.prompt.forbidden.join('\n')).toMatch(/조바심을 주는 서술/)
    expect(whenLoveResolver.prompt.rules.join('\n')).toMatch(/기다리라고 닫지 마라/)
  })

  it('🔴 특정 인물 단정·이별 재회 지시·통계 인용을 막는다', () => {
    const forbidden = whenLoveResolver.prompt.forbidden.join('\n')

    expect(forbidden).toMatch(/특정 인물의 마음·행동을 단정/)
    expect(forbidden).toMatch(/이별·재회를 지시/)
    expect(forbidden).toMatch(/설문|통계/)
  })

  it('🔴 질문·규율 본문에 금지어가 없다 (forbidden 안 인용만 허용)', () => {
    const lines = [whenLoveResolver.prompt.question, ...whenLoveResolver.prompt.rules]

    for (const line of lines) {
      for (const word of BANNED) expect(line).not.toContain(word)
    }
  })
})
