/**
 * L2 「나는 왜 항상 이런 사람만 만날까」 판정의 계약.
 *
 * ## 🔴 이 파일이 지키는 단 하나
 * **같은 사주 = 같은 판정**, 그리고 이 테마 고유의 선 — **낙인을 찍지 않는다**(연애 §5 L2-9).
 * 타깃이 「내가 문제인가」 자책 구간의 사람들이라, 판정·근거·프롬프트 어디에도
 * 「나쁜 사람에게 끌린다」「당신 탓」이 나올 자리가 없어야 한다. 되짚기(직전 대운)는
 * 사용자가 스스로 검증할 수 있는 신뢰 장치이므로 형식을 고정한다.
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import {
  sameTypeResolver,
  SAME_TYPE_INDICATORS,
  SAME_TYPE_PALACE_LABELS,
  SAME_TYPE_TOLL_LABELS,
} from '@/lib/domain/theme-fortune/resolvers/same-type'
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
    yearly: sameTypeResolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset)),
    rules: evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal),
  }
}

function judgeAll(baseYear = BASE_YEAR): ThemeVerdict[] {
  return PEOPLE.map((person) => sameTypeResolver.judge(inputFor(person, baseYear)))
}

describe('same-type — 🔴 결정론', () => {
  it('같은 사주·같은 기준 연도를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = sameTypeResolver.judge(inputFor(person))
      const second = sameTypeResolver.judge(inputFor(person))

      expect(first).toEqual(second)
    }
  })

  it('판정 축 3개가 전부 원국·용신에서 나온다 — 기준 연도가 바뀌어도 같다', () => {
    // 쏠림·부딪히는 자리·치르는 값은 태어난 순간에 정해진 값이다. 여기가 흔들리면
    // 「작년엔 익숙한 결이 아니라더니」가 된다.
    for (const person of PEOPLE) {
      const now = sameTypeResolver.judge(inputFor(person, BASE_YEAR))
      const later = sameTypeResolver.judge(inputFor(person, BASE_YEAR + 3))

      expect(now.indicators).toEqual(later.indicators)
    }
  })

  it('사주가 다르면 판정이 한 결에 몰려 있지 않다 (지표가 장식이 아니다)', () => {
    const verdicts = judgeAll()

    expect(new Set(verdicts.map((verdict) => verdict.indicators[0].band)).size).toBeGreaterThan(1)
    expect(new Set(verdicts.map((verdict) => verdict.indicators[2].band)).size).toBeGreaterThan(1)
  })
})

describe('same-type — 지표 3종', () => {
  it('정확히 셋이고, 키·라벨이 설계 그대로다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators).toHaveLength(3)
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual(['pull_lean', 'friction_seat', 'gisin_toll'])
      expect(verdict.indicators.map((indicator) => indicator.label)).toEqual([
        '끌림의 쏠림',
        '부딪히는 자리',
        '치르는 값',
      ])
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual(
        SAME_TYPE_INDICATORS.map((entry) => entry.key)
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

  it('🔴 부딪히는 자리는 궁위 이름으로 짚는다 (§5 L2 ⓑ — 년=집안/월=사회/일=배우자/시=미래)', () => {
    const palaceNames = Object.values(SAME_TYPE_PALACE_LABELS)

    for (const verdict of judgeAll()) {
      const basis = verdict.indicators[1].basis
      if (basis.includes('충·형 없음')) continue

      expect(palaceNames.some((name) => basis.includes(name))).toBe(true)
      expect(basis).toContain('자리')
    }
  })

  it('🔴 치르는 값의 라벨은 고정 매핑표에서만 나온다 (잘잘못이 아니라 방향의 언어)', () => {
    const tollLabels = Object.values(SAME_TYPE_TOLL_LABELS)

    for (const verdict of judgeAll()) {
      const basis = verdict.indicators[2].basis
      expect(tollLabels.some((label) => basis.includes(label))).toBe(true)
      // 신강약이 근거에 실린다 — 같은 소모도 신약이면 더 크게 치른다는 판정의 출처.
      expect(basis).toMatch(/신강|신약|중화/)
    }
  })
})

describe('same-type — 판정 구조 (양자택일이 아니다)', () => {
  it('판정 라벨·판정표가 없다 — 「왜」의 답은 칸이 아니라 세 지표의 조합이다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.verdictLabel).toBeNull()
      expect(verdict.matrix).toBeUndefined()
    }
  })

  it('🔴 근거 문장에 낙인·자책·지시 어휘가 없다 (§5 L2-9)', () => {
    for (const verdict of judgeAll()) {
      const texts = [
        ...verdict.indicators.map((indicator) => indicator.basis),
        ...verdict.timings.map((timing) => timing.basis),
        verdict.pastHint?.basis ?? '',
      ]
      for (const text of texts) {
        expect(text).not.toMatch(/나쁜 남자|나쁜 여자|당신 탓|잘못/)
        expect(text).not.toMatch(/하세요|하십시오|권합니다|추천|실패|후회|늦었|손해/)
      }
    }
  })
})

describe('same-type — 시기', () => {
  it('달은 1~12 이고, 세운이 준 달에서만 온다 (지어내지 않는다)', () => {
    for (const person of PEOPLE) {
      const input = inputFor(person)
      const verdict = sameTypeResolver.judge(input)

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

  it('시기는 올해만 다룬다 — 반복의 판정은 원국이고 세운은 곁들이다 (§6 L2)', () => {
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

describe('same-type — 되짚기·룰', () => {
  it('🔴 되짚기는 직전 대운 10년이다 — 연도 범위 형식이고 기준 연도보다 과거다 (§5 L2 ⓒ)', () => {
    // 「그 10년엔 어떤 결이 많았나」는 사후 설명이라 사용자가 검증할 수 있다 = 신뢰 장치.
    for (const verdict of judgeAll()) {
      if (verdict.pastHint === null) continue

      expect(verdict.pastHint.period).toMatch(/^\d{4}~\d{4}년$/)
      const [start, end] = verdict.pastHint.period.replace('년', '').split('~').map(Number)
      expect(start).toBeLessThan(end)
      expect(end).toBeLessThan(BASE_YEAR)
      expect(verdict.pastHint.basis).toContain('직전 대운')
    }
  })

  it('표본 전원이 직전 대운을 갖는다 — 이 표본에서 되짚기가 비지 않는다', () => {
    // 어린 나이(첫 대운 진입 전)만 null 이 정당하다. 표본 6인은 전부 성인이다.
    for (const verdict of judgeAll()) expect(verdict.pastHint).not.toBeNull()
  })

  it('룰 히트는 이 테마가 읽기로 한 것(마찰 3종 + 균형추 1종)만 실린다', () => {
    const watched = ['배우자 파탄 위험', '이성 문제 가정 불안', '만혼·불화', '좋은 배우자 인연']

    for (const verdict of judgeAll()) {
      for (const hit of verdict.ruleHits) expect(watched).toContain(hit)
    }
  })

  it('판정에 테마 id 가 실려 저장본이 어느 테마인지 스스로 안다', () => {
    for (const verdict of judgeAll()) expect(verdict.themeId).toBe('same-type')
  })

  it('세운은 올해 하나만 선언한다 (되짚기는 세운이 아니라 대운에서 나온다)', () => {
    expect(sameTypeResolver.yearOffsets).toEqual([0])
    expect(sameTypeResolver.prompt.analysisType).toBe('TREND_LOVE')
  })
})

describe('same-type — L3 계약', () => {
  it('🔴 낙인·자책을 양쪽에서 막는다 (규율과 금지 소재 둘 다)', () => {
    const { rules, forbidden } = sameTypeResolver.prompt

    expect(rules.join('\n')).toMatch(/낙인을 만들지 마라/)
    expect(rules.join('\n')).toMatch(/「당신 탓」이라는 서술을 쓰지 마라/)
    expect(forbidden.join('\n')).toMatch(/나쁜 남자·나쁜 여자/)
    expect(forbidden.join('\n')).toMatch(/자책을 유도하는 서술/)
  })

  it('🔴 정신건강 진단·치료 어휘를 막는다 (§5 L2-9)', () => {
    expect(sameTypeResolver.prompt.forbidden.join('\n')).toMatch(/중독·집착·트라우마/)
  })

  it('🔴 반복의 원인을 늘 사주에서 찾지 않는다 — 열어 두는 규율이 있다', () => {
    // 직장·재물 C-1 의 「그 문제가 아닐 수 있다」 칸과 같은 양심이다. 이 테마는 판정표가
    // 없으므로 그 자리를 서술 규율이 진다.
    expect(sameTypeResolver.prompt.rules.join('\n')).toMatch(/사주 밖에 있을 수 있다/)
  })

  it('🔴 특정 인물 단정·과거 사건 창작을 막는다', () => {
    const { rules, forbidden } = sameTypeResolver.prompt

    expect(forbidden.join('\n')).toMatch(/특정 인물의 마음·행동을 단정/)
    expect(rules.join('\n')).toMatch(/상대나 사건을 지어내지 마라/)
  })

  it('🔴 통계 인용을 막는다', () => {
    expect(sameTypeResolver.prompt.forbidden.join('\n')).toMatch(/설문|통계/)
  })

  it('🔴 질문·규율 본문에 금지어가 없다 (forbidden 안 인용만 허용)', () => {
    const lines = [sameTypeResolver.prompt.question, ...sameTypeResolver.prompt.rules]

    for (const line of lines) {
      for (const word of BANNED) expect(line).not.toContain(word)
    }
  })
})
