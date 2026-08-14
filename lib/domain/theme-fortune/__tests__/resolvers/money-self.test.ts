/**
 * W-2 「돈 앞에서 나는 어떤 사람인가」 판정의 계약. ★무료 미끼(wealth)
 *
 * ## 🔴 이 파일이 지키는 것 둘
 * ① **`timings` 는 항상 빈 배열** — 직장·재물 게이트 7번(«W-2 의 timings 는 항상 빈 배열»)을
 *    리졸버 쪽에서 지키는 자리가 여기다. 이 테마는 `investmentTiming`(매수 시점)을 성향형으로
 *    대체한 자리라, 시기 칸이 생기는 순간 존재 이유가 무너진다(§3-2·마스터 §12-5).
 * ② **네 결의 대등함** — 어느 결도 열등하지 않다. 라벨 네 개가 전부 강점 서술을 갖는 것을
 *    문자열로 고정한다(«투기형» 낙인은 여기서 구조적으로 차단된다).
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import { moneySelfResolver, MONEY_SELF_LABELS } from '@/lib/domain/theme-fortune/resolvers/money-self'
import {
  BAND_THRESHOLD,
  bandOf,
  type ThemeJudgeInput,
  type ThemeVerdict,
} from '@/lib/domain/theme-fortune/verdict-types'

/** 기준 연도를 고정한다 — 오늘 날짜가 바뀌어도 이 파일의 기대값은 안 바뀐다. */
const BASE_YEAR = 2026

/** 본보기(leave-or-stay)와 같은 표본 — 값이 아니라 **법칙**을 검증하는 데 쓴다. */
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
    yearly: moneySelfResolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset)),
    rules: evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal),
  }
}

function judgeAll(baseYear = BASE_YEAR): ThemeVerdict[] {
  return PEOPLE.map((person) => moneySelfResolver.judge(inputFor(person, baseYear)))
}

describe('money-self — 🔴 결정론', () => {
  it('같은 사주·같은 기준 연도를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = moneySelfResolver.judge(inputFor(person))
      const second = moneySelfResolver.judge(inputFor(person))

      expect(first).toEqual(second)
    }
  })

  it('🔴 판정 전체가 원국에서만 선다 — 기준 연도가 바뀌어도 verdict 가 통째로 같다', () => {
    // 돈 앞의 «성향»은 태어난 순간의 결이지 올해의 운이 아니다. 세운이 조금이라도 끼면
    // 「작년엔 쌓는 결이라더니」가 되고, 성향형 테마의 전제가 무너진다.
    for (const person of PEOPLE) {
      const now = moneySelfResolver.judge(inputFor(person, BASE_YEAR))
      const later = moneySelfResolver.judge(inputFor(person, BASE_YEAR + 3))

      expect(now).toEqual(later)
    }
  })

  it('사주가 다르면 판정이 한 칸에 몰려 있지 않다 (표가 장식이 아니다)', () => {
    const labels = new Set(judgeAll().map((verdict) => verdict.verdictLabel?.key))

    expect(labels.size).toBeGreaterThan(1)
  })
})

describe('money-self — 지표 3종', () => {
  it('정확히 셋이고, 키·라벨이 설계 그대로다 (표의 두 축이 앞에 온다)', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators).toHaveLength(3)
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual(['steady_vs_swing', 'decide_speed', 'nerve'])
      expect(verdict.indicators.map((indicator) => indicator.label)).toEqual([
        '쌓는 결·굴리는 결',
        '결정의 속도',
        '흔들림을 견디는 결',
      ])
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

describe('money-self — 판정 4결 (2×2 고정 매핑)', () => {
  it('네 칸이 다 다르고, 어느 칸에도 openEnded 가 없다 (네 결이 대등한 «다름»의 표다)', () => {
    const verdict = judgeAll()[0]
    const matrix = verdict.matrix
    if (!matrix) throw new Error('판정표가 없다')

    const cells = matrix.cells.flat()
    expect(new Set(cells.map((cell) => cell.key)).size).toBe(4)
    for (const cell of cells) expect(cell.openEnded).toBeUndefined()
  })

  it('판정 라벨은 언제나 앞 두 축 밴드가 가리키는 칸이다', () => {
    for (const verdict of judgeAll()) {
      const matrix = verdict.matrix
      if (!matrix) throw new Error('판정표가 없다')

      const rolling = verdict.indicators[0].band !== 'low'
      const quick = verdict.indicators[1].band !== 'low'

      expect(verdict.verdictLabel).toEqual(matrix.cells[rolling ? 1 : 0][quick ? 1 : 0])
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

  it('🔴 네 결 모두 강점 서술을 갖는다 — 어느 결도 열등하지 않다', () => {
    // 편재 우세를 «투기»로, 빠른 결정을 «충동»으로 번역하는 순간 이 상품은 낙인을 판다.
    for (const label of Object.values(MONEY_SELF_LABELS)) {
      expect(label.note).toContain('강점')
      expect(label.note).not.toMatch(/투기|충동|중독/)
      expect(label.note).not.toMatch(/실패|후회|늦었|손해/)
      expect(label.note).not.toMatch(/하세요|하십시오|권합니다|추천/)
    }
  })
})

describe('money-self — 🔴 시기 없음 (게이트 7번)', () => {
  it('timings 는 어떤 사주·어떤 기준 연도에서도 항상 빈 배열이다', () => {
    // 자리를 만들지 않으면 AI 가 쓸 수 없다(마스터 §9-4). 이 빈 배열이 §3-2 의 실질적 집행이고,
    // 공용 프롬프트는 빈 배열을 보고 「특정 달을 언급하지 마세요」를 자동 주입한다.
    for (const baseYear of [BASE_YEAR, BASE_YEAR + 1, BASE_YEAR + 4]) {
      for (const verdict of judgeAll(baseYear)) {
        expect(verdict.timings).toEqual([])
      }
    }
  })

  it('되짚기는 항상 null 이다 (무료 범위 밖)', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.pastHint).toBeNull()
    }
  })

  it('세운 선언은 [0] 하나뿐이다 — 무료 원가 계약(§6)', () => {
    expect(moneySelfResolver.yearOffsets).toEqual([0])
  })
})

describe('money-self — 룰·판정 신원', () => {
  it('룰 히트는 이 테마가 읽기로 한 것(경고 축 2 + 버티는 축 1)만 실린다', () => {
    const watched = ['투자·보증 손실', '투기 대실패', '정직한 노력의 결실']

    for (const verdict of judgeAll()) {
      for (const hit of verdict.ruleHits) expect(watched).toContain(hit)
    }
  })

  it('판정에 테마 id 가 실려 저장본이 어느 테마인지 스스로 안다', () => {
    for (const verdict of judgeAll()) expect(verdict.themeId).toBe('money-self')
  })
})

describe('money-self — L3 계약', () => {
  it('재물 갈래의 기존 유니온을 쓴다 (새 AnalysisType 을 만들지 않는다)', () => {
    expect(moneySelfResolver.prompt.analysisType).toBe('WEALTH_DEEP')
  })

  it('🔴 자본시장법 경계 — 상품·종목·시점·수익률·목표 금액을 막는다', () => {
    const forbidden = moneySelfResolver.prompt.forbidden.join('\n')

    expect(forbidden).toMatch(/상품|종목/)
    expect(forbidden).toMatch(/시점/)
    expect(forbidden).toMatch(/수익률/)
    expect(forbidden).toMatch(/목표 금액/)
  })

  it('🔴 시기 칸이 없음을 규율로도 못 박는다', () => {
    expect(moneySelfResolver.prompt.rules.join('\n')).toContain('이 풀이에는 시기 칸이 없다')
  })

  it('🔴 우열 금지 — 어느 결이 더 낫다고 말할 수 없다', () => {
    const { rules, forbidden } = moneySelfResolver.prompt

    expect(rules.join('\n')).toContain('어느 결이 더 낫다고 말하지 마라')
    expect(forbidden.join('\n')).toMatch(/우열/)
  })

  it('🔴 낙인 금지 — 편재 우세를 투기로 번역하지 않는다', () => {
    const { rules, forbidden } = moneySelfResolver.prompt

    expect(rules.join('\n')).toContain('투기 기질로 번역하지 마라')
    expect(forbidden.join('\n')).toMatch(/낙인 어휘/)
  })

  it('🔴 통계 인용을 막는다 (빚투 손실률은 테마를 만든 이유이지 결과의 근거가 아니다)', () => {
    expect(moneySelfResolver.prompt.forbidden.join('\n')).toMatch(/통계/)
  })

  it('판정을 뒤집지 못하게 못 박는다', () => {
    expect(moneySelfResolver.prompt.rules.join('\n')).toMatch(/verdictLabel 을 뒤집지 마라/)
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
    const { question, rules } = moneySelfResolver.prompt

    for (const line of [question, ...rules]) {
      for (const word of BANNED) expect(line).not.toContain(word)
    }
  })
})
