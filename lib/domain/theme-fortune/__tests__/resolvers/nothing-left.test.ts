/**
 * W-1 「버는 만큼 남지 않는 이유」 판정의 계약.
 *
 * ## 🔴 이 파일이 지키는 것 둘
 * ① **같은 사주 = 같은 판정**(마스터 §5-1) — 원국 세 축은 기준 연도가 바뀌어도 같다.
 * ② **시기의 비대칭**(직장·재물 §3-2) — 본보기(leave-or-stay)의 「기회 칸이 비지 않는다」가
 *    이 테마에서는 정확히 반대로 뒤집힌다: **기회 칸이 항상 빈다.** 「지출이 몰리는 달」(주의)은
 *    소비자 보호 방향이지만 「넣기 좋은 달」(기회)은 매수 시점 권유 방향이다. 이 비대칭이
 *    무너지면 자본시장법 경계가 무너진다 — 그래서 테스트가 여러 기준 연도에서 못 박는다.
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import { nothingLeftResolver, NOTHING_LEFT_LABELS } from '@/lib/domain/theme-fortune/resolvers/nothing-left'
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

/** 본보기와 같은 표본. 이 여섯이 판정표 네 칸을 전부 밟는다(아래 도달 테스트). */
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
    yearly: nothingLeftResolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset)),
    rules: evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal),
  }
}

function judgeAll(baseYear = BASE_YEAR): ThemeVerdict[] {
  return PEOPLE.map((person) => nothingLeftResolver.judge(inputFor(person, baseYear)))
}

describe('nothing-left — 🔴 결정론', () => {
  it('같은 사주·같은 기준 연도를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = nothingLeftResolver.judge(inputFor(person))
      const second = nothingLeftResolver.judge(inputFor(person))

      expect(first).toEqual(second)
    }
  })

  it('원국에서 나오는 세 축과 판정 라벨은 기준 연도가 바뀌어도 같다', () => {
    // 「버는 통로」·「새는 자리」·「쥐는 힘」은 태어난 순간에 정해진 값이다. 여기가 흔들리면
    // 「작년엔 모이는 결이라더니」가 된다. 해에 따라 달라지는 것은 시기·되짚기뿐이다.
    for (const person of PEOPLE) {
      const now = nothingLeftResolver.judge(inputFor(person, BASE_YEAR))
      const later = nothingLeftResolver.judge(inputFor(person, BASE_YEAR + 3))

      expect(now.indicators).toEqual(later.indicators)
      expect(now.verdictLabel).toEqual(later.verdictLabel)
    }
  })
})

describe('nothing-left — 지표 3종', () => {
  it('정확히 셋이고, 키·라벨이 설계 그대로다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators).toHaveLength(3)
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual(['earn_channel', 'leak', 'hold'])
      expect(verdict.indicators.map((indicator) => indicator.label)).toEqual(['버는 통로', '새는 자리', '쥐는 힘'])
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

describe('nothing-left — 판정 4택 (2×2 고정 매핑)', () => {
  it('네 칸이 다 다르고, [통로 이어짐 × 잠잠함] 칸은 「모이는 결」이다', () => {
    // 🔴 이 칸이 이 테마의 양심이다 — 모든 사람에게 「당신은 돈이 샌다」고 말하는 상품은
    //    거짓이다(§5 W-1). 지우면 상품이 늘 돈 구조에서 원인을 찾게 된다.
    const verdict = judgeAll()[0]
    const matrix = verdict.matrix
    if (!matrix) throw new Error('판정표가 없다')

    const keys = matrix.cells.flat().map((cell) => cell.key)
    expect(new Set(keys).size).toBe(4)
    expect(matrix.cells[1][0]).toEqual(NOTHING_LEFT_LABELS.gathering)
    expect(matrix.cells[1][0].openEnded).toBe(true)
  })

  it('🔴 표본 여섯이 네 칸을 전부 밟는다 — 도달 불가능한 칸이 없다 (§10-13)', () => {
    // 「모이는 결」 경로가 코드에는 있는데 실제로 절대 나오지 않는다면 그건 없는 것과 같고,
    // 상품은 항상 불안을 파는 구조가 된다.
    const labels = new Set(judgeAll().map((verdict) => verdict.verdictLabel?.key))

    expect(labels).toEqual(new Set(['broken', 'passthrough', 'gathering', 'leaking']))
  })

  it('판정 라벨은 언제나 앞 두 축 밴드가 가리키는 칸이다', () => {
    for (const verdict of judgeAll()) {
      const matrix = verdict.matrix
      if (!matrix) throw new Error('판정표가 없다')

      const channelOpen = verdict.indicators[0].band !== 'low'
      const leaking = verdict.indicators[1].band !== 'low'

      expect(verdict.verdictLabel).toEqual(matrix.cells[channelOpen ? 1 : 0][leaking ? 1 : 0])
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

  it('🔴 새는 결을 사람 탓·실패로 적지 않는다', () => {
    // 「돈이 새는 자리」는 명식의 구조이지 게으름·무지가 아니다(§5 W-1 ⑨).
    for (const label of Object.values(NOTHING_LEFT_LABELS)) {
      expect(label.note).not.toMatch(/실패|후회|늦었|손해|게으|낭비/)
      expect(label.note).not.toMatch(/하세요|하십시오|권합니다|추천/)
    }
  })
})

describe('nothing-left — 🔴 시기의 비대칭 (§3-2)', () => {
  it('기회 칸은 어떤 기준 연도에서도 항상 빈다 — 「넣기 좋은 달」은 존재하지 않는다', () => {
    // 본보기의 「기회 칸이 비지 않는다」가 이 테마에서는 반대로 고정된다. 재물운이 아무리
    // 좋은 해라도 기회 엔트리는 없다 — 지출 경계는 소비자 보호, 매수 시점은 투자 권유다.
    for (const baseYear of [BASE_YEAR, BASE_YEAR + 1, BASE_YEAR + 4]) {
      for (const verdict of judgeAll(baseYear)) {
        expect(timingsOf(verdict, 'opportunity')).toEqual([])
      }
    }
  })

  it('주의는 올해 하나뿐이고, 달은 세운이 준 달에서만 온다 (지어내지 않는다)', () => {
    for (const person of PEOPLE) {
      const input = inputFor(person)
      const verdict = nothingLeftResolver.judge(input)

      for (const timing of verdict.timings) {
        expect(timing.kind).toBe('caution')
        expect(timing.year).toBe(BASE_YEAR)
        expect(timing.basis).toContain('지출이 몰리는 달')

        const fortune = input.yearly.find((year) => year.year === timing.year)
        if (!fortune) throw new Error(`판정에 없는 해가 실렸다: ${timing.year}`)
        for (const month of timing.months) {
          expect(month).toBeGreaterThanOrEqual(1)
          expect(month).toBeLessThanOrEqual(12)
          expect(fortune.keyCautionMonths).toContain(month)
        }
      }
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

describe('nothing-left — 되짚기·룰', () => {
  it('과거 근거는 «있으면 직전 해 형식», 없으면 null 이다 (지어낸 과거를 싣지 않는다)', () => {
    for (const verdict of judgeAll()) {
      if (verdict.pastHint === null) continue

      expect(verdict.pastHint.period).toMatch(/^\d{4}년$/)
      expect(Number(verdict.pastHint.period.slice(0, 4))).toBe(BASE_YEAR - 1)
      expect(verdict.pastHint.basis.trim().length).toBeGreaterThan(0)
    }
  })

  it('룰 히트는 이 테마가 읽기로 한 것(재물파탄 2종)만 실린다', () => {
    const watched = ['투자·보증 손실', '재물 산란']

    for (const verdict of judgeAll()) {
      for (const hit of verdict.ruleHits) expect(watched).toContain(hit)
    }
  })

  it('판정에 테마 id 가 실려 저장본이 어느 테마인지 스스로 안다', () => {
    for (const verdict of judgeAll()) expect(verdict.themeId).toBe('nothing-left')
  })

  it('세운 선언은 올해 + 직전 해다 (되짚기 근거용 — §6 단가에는 영향 없음)', () => {
    expect(nothingLeftResolver.yearOffsets).toEqual([-1, 0])
    expect(nothingLeftResolver.yearOffsets).toContain(0)
  })
})

describe('nothing-left — L3 계약', () => {
  it('재물 갈래의 기존 유니온을 쓴다 (정재/편재 서술 규율이 이미 있는 프롬프트)', () => {
    expect(nothingLeftResolver.prompt.analysisType).toBe('WEALTH_DEEP')
  })

  it('🔴 투자 자문 경계 — 종목·매수 시점·수익률·목표 금액을 막는다', () => {
    const forbidden = nothingLeftResolver.prompt.forbidden.join('\n')

    expect(forbidden).toMatch(/종목/)
    expect(forbidden).toMatch(/매수|매도/)
    expect(forbidden).toMatch(/수익률/)
    expect(forbidden).toMatch(/목표 금액/)
  })

  it('🔴 시기의 비대칭을 규율로도 못 박는다 — 「지출이 몰리는 달」로만', () => {
    const rules = nothingLeftResolver.prompt.rules.join('\n')

    expect(rules).toContain('「지출이 몰리는 달」로만 말하라')
    expect(rules).toContain('돈을 넣기 좋은 달이나 때를 만들어 내지 마라')
  })

  it('🔴 훈계·낙인 금지 — 절약 훈계와 사람 탓을 막는다', () => {
    const { rules, forbidden } = nothingLeftResolver.prompt

    expect(rules.join('\n')).toContain('덜 쓰라고 훈계하지 마라')
    expect(rules.join('\n')).toContain('사람 탓으로 돌리지 마라')
    expect(forbidden.join('\n')).toMatch(/절약 훈계/)
    expect(forbidden.join('\n')).toMatch(/의료 어휘/)
  })

  it('🔴 「모이는 결」이 나오면 열어 두라는 규율이 있다 (양심 칸의 서술 짝)', () => {
    expect(nothingLeftResolver.prompt.rules.join('\n')).toContain('돈의 구조 밖에 있을 수 있다고 열어 두라')
  })

  it('판정을 뒤집지 못하게 못 박는다', () => {
    expect(nothingLeftResolver.prompt.rules.join('\n')).toMatch(/verdictLabel 을 뒤집지 마라/)
  })

  it('금지어가 질문·규율에 없다 (레지스트리 계약 §9-3 과 같은 배열)', () => {
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
    const { question, rules } = nothingLeftResolver.prompt

    for (const line of [question, ...rules]) {
      for (const word of BANNED) expect(line).not.toContain(word)
    }
  })
})
