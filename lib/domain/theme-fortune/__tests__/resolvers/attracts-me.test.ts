/**
 * L1 「내가 좋아하는 사람 말고, 날 좋아해주는 사람」 판정의 계약.
 *
 * ## 🔴 이 파일이 지키는 단 하나
 * **같은 사주 = 같은 판정.** 그리고 이 테마 고유의 선 — **사람을 맞히지 않는다.**
 * 상대 정보를 받지 않는 SOLO 테마이므로 「그 사람은 당신을 좋아합니다」가 나올 자리 자체가
 * 없어야 하고(연애 §4-2·§5 L1-9), 배우자성이 없는 사주를 「인연 없음」으로 낙인찍지 않아야
 * 한다. 판정 축 3개는 전부 원국에서 나오므로 기준 연도가 바뀌어도 흔들리면 안 된다.
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import {
  attractsMeResolver,
  ATTRACTS_ME_GAP_LABELS,
  ATTRACTS_ME_INDICATORS,
  ATTRACTS_ME_STAR_LABELS,
} from '@/lib/domain/theme-fortune/resolvers/attracts-me'
import {
  allowedMonths,
  bandOf,
  timingsOf,
  type ThemeBand,
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
    yearly: attractsMeResolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset)),
    rules: evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal),
  }
}

function judgeAll(baseYear = BASE_YEAR): ThemeVerdict[] {
  return PEOPLE.map((person) => attractsMeResolver.judge(inputFor(person, baseYear)))
}

describe('attracts-me — 🔴 결정론', () => {
  it('같은 사주·같은 기준 연도를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = attractsMeResolver.judge(inputFor(person))
      const second = attractsMeResolver.judge(inputFor(person))

      expect(first).toEqual(second)
    }
  })

  it('판정 축 3개가 전부 원국에서 나온다 — 기준 연도가 바뀌어도 같다', () => {
    // 맞이하는 자리·끌림의 쏠림·간극은 태어난 순간에 정해진 값이다. 여기가 흔들리면
    // 「작년엔 상생이라더니 올해는 상극」이 되고, 그 순간 상품이 신뢰를 잃는다.
    for (const person of PEOPLE) {
      const now = attractsMeResolver.judge(inputFor(person, BASE_YEAR))
      const later = attractsMeResolver.judge(inputFor(person, BASE_YEAR + 3))

      expect(now.indicators).toEqual(later.indicators)
    }
  })

  it('사주가 다르면 간극 게이지가 한 칸에 몰려 있지 않다 (게이지가 장식이 아니다)', () => {
    const verdicts = judgeAll()

    expect(new Set(verdicts.map((verdict) => verdict.indicators[2].band)).size).toBeGreaterThan(1)
    expect(new Set(verdicts.map((verdict) => verdict.indicators[1].band)).size).toBeGreaterThan(1)
  })
})

describe('attracts-me — 지표 3종', () => {
  it('정확히 셋이고, 키·라벨이 설계 그대로다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators).toHaveLength(3)
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual(['welcome_seat', 'pull_lean', 'gap_between'])
      expect(verdict.indicators.map((indicator) => indicator.label)).toEqual([
        '맞이하는 자리',
        '끌림의 쏠림',
        '끌림과 편안함의 간극',
      ])
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual(
        ATTRACTS_ME_INDICATORS.map((entry) => entry.key)
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

  it('🔴 4결 라벨은 고정 매핑표에서만 나온다 (§5 L1 ⓒ — AI 가 새 유형을 만들 자리가 없다)', () => {
    const starLabels = Object.values(ATTRACTS_ME_STAR_LABELS)

    for (const verdict of judgeAll()) {
      const basis = verdict.indicators[0].basis
      expect(starLabels.filter((label) => basis.includes(label))).toHaveLength(1)
      // 배우자궁(일지)이 근거에 사실로 실린다 — §5 L1 ⓐ.
      expect(basis).toContain('배우자궁')
    }
  })

  it('🔴 배우자성 0 은 「무(無)」 라벨이다 — 인연 없음 판정이 아니다 (§5 L1 ⓑ)', () => {
    for (const verdict of judgeAll()) {
      const basis = verdict.indicators[0].basis
      if (basis.includes('배우자성 없음')) expect(basis).toContain(ATTRACTS_ME_STAR_LABELS.무)
    }
  })

  it('🔴 간극 게이지(같음/상생/상극)는 밴드와 같은 눈금을 쓴다 — 감탄 지점의 정합', () => {
    // 게이지 라벨과 막대 밴드가 다른 말을 하면(라벨은 상극인데 밴드는 보통) 화면이 스스로를
    // 반박한다. 라벨→밴드 매핑을 표로 고정한다.
    const gapBand: Record<string, ThemeBand> = {
      [ATTRACTS_ME_GAP_LABELS.same]: 'low',
      [ATTRACTS_ME_GAP_LABELS.saeng]: 'mid',
      [ATTRACTS_ME_GAP_LABELS.geuk]: 'high',
      [ATTRACTS_ME_GAP_LABELS.weak]: 'low',
    }

    for (const verdict of judgeAll()) {
      const gap = verdict.indicators[2]
      const matched = Object.entries(gapBand).filter(([label]) => gap.basis.includes(label))

      expect(matched).toHaveLength(1)
      expect(gap.band).toBe(matched[0][1])
    }
  })
})

describe('attracts-me — 판정 구조 (양자택일이 아니다)', () => {
  it('판정 라벨·판정표가 없다 — 이 테마의 답은 칸이 아니라 간극 게이지다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.verdictLabel).toBeNull()
      expect(verdict.matrix).toBeUndefined()
    }
  })

  it('🔴 근거 문장에 지시·낙인 어휘가 없다 (결의 서술만 있다)', () => {
    for (const verdict of judgeAll()) {
      const texts = [
        ...verdict.indicators.map((indicator) => indicator.basis),
        ...verdict.timings.map((timing) => timing.basis),
      ]
      for (const text of texts) {
        expect(text).not.toMatch(/하세요|하십시오|권합니다|추천|실패|후회|늦었|손해/)
      }
    }
  })
})

describe('attracts-me — 시기', () => {
  it('달은 1~12 이고, 세운이 준 달에서만 온다 (지어내지 않는다)', () => {
    for (const person of PEOPLE) {
      const input = inputFor(person)
      const verdict = attractsMeResolver.judge(input)

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

  it('시기는 올해만 다룬다 — 이 테마의 상품은 원국이고 시기는 곁들이다 (§6 L1)', () => {
    for (const verdict of judgeAll()) {
      for (const timing of verdict.timings) expect(timing.year).toBe(BASE_YEAR)
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

describe('attracts-me — 되짚기·룰', () => {
  it('🔴 과거 되짚기는 항상 null 이다 — 설계에 역추산이 없고, 없는 과거를 지어내지 않는다', () => {
    for (const verdict of judgeAll()) expect(verdict.pastHint).toBeNull()
  })

  it('룰 히트는 이 테마가 읽기로 한 것(정재·정관 동반)만 실린다', () => {
    for (const verdict of judgeAll()) {
      for (const hit of verdict.ruleHits) expect(['좋은 배우자 인연']).toContain(hit)
    }
  })

  it('판정에 테마 id 가 실려 저장본이 어느 테마인지 스스로 안다', () => {
    for (const verdict of judgeAll()) expect(verdict.themeId).toBe('attracts-me')
  })

  it('세운은 올해 하나만 선언한다 (판정 축이 전부 원국이라 그 이상이 필요 없다)', () => {
    expect(attractsMeResolver.yearOffsets).toEqual([0])
    expect(attractsMeResolver.prompt.analysisType).toBe('TREND_LOVE')
  })
})

describe('attracts-me — L3 계약', () => {
  it('🔴 특정 인물의 마음 단정을 막는다 (상대의 정보를 받지 않은 SOLO 테마다)', () => {
    const { rules, forbidden } = attractsMeResolver.prompt

    expect(forbidden.join('\n')).toMatch(/그 사람은 당신을 좋아합니다/)
    expect(rules.join('\n')).toMatch(/누가 나를 좋아할지 맞히려 하지 마라/)
  })

  it('🔴 보장 어휘·결혼 시기 단정을 막는다 (연애 §4-2)', () => {
    const forbidden = attractsMeResolver.prompt.forbidden.join('\n')

    expect(forbidden).toMatch(/운명의 상대/)
    expect(forbidden).toMatch(/인연 보장/)
    expect(forbidden).toMatch(/결혼·출산 시기/)
    expect(forbidden).toMatch(/이별·재회/)
  })

  it('🔴 「무(無)」를 인연 없음으로 번역하는 경로를 막는다', () => {
    expect(attractsMeResolver.prompt.rules.join('\n')).toMatch(/인연이 없는 사주로 읽지 마라/)
    expect(attractsMeResolver.prompt.forbidden.join('\n')).toMatch(/「인연이 없는 사주」류 단정/)
  })

  it('만남의 효과 단정 대신 「덜 지친다」 규격을 강제한다 (§5 L1-9)', () => {
    expect(attractsMeResolver.prompt.rules.join('\n')).toMatch(/덜 지친다/)
  })

  it('🔴 통계 인용을 막는다 (테마를 만든 이유이지 결과의 근거가 아니다)', () => {
    expect(attractsMeResolver.prompt.forbidden.join('\n')).toMatch(/설문|통계/)
  })

  it('🔴 질문·규율 본문에 금지어가 없다 (forbidden 안 인용만 허용)', () => {
    const lines = [attractsMeResolver.prompt.question, ...attractsMeResolver.prompt.rules]

    for (const line of lines) {
      for (const word of BANNED) expect(line).not.toContain(word)
    }
  })
})
