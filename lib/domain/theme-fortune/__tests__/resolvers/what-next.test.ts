/**
 * C-2 「그만두면, 그다음은 뭘 하지」 판정의 계약. ★무료 미끼(career)
 *
 * ## 🔴 이 파일이 지키는 것 둘
 * ① **같은 사주 = 같은 판정** — 나아가 이 테마는 원국만 쓰므로 **기준 연도가 바뀌어도** 판정
 *    전체가 같아야 한다. 무료 입구의 답이 해마다 바뀌면 유입구가 거짓말쟁이가 된다.
 * ② **무료 절단의 리졸버 몫** — 시기는 항상 비고(시기가 유료의 값이다) 되짚기는 항상 null.
 *    직업 후보는 엔진이 이미 가진 문자열에서만 나온다 — AI 도 이 파일 밖의 코드도 직업을
 *    지어낼 수 없다(직장·재물 §5 C-2 ⓒ).
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { evaluateAllRules } from '@/lib/saju-engine/rule-base'
import { calculateYearlyFortune } from '@/lib/saju-engine/woon-calculator'
import { SIPSEONG_MODERN } from '@/lib/saju-engine/sipseong'
import { SINSAL_MODERN } from '@/lib/saju-engine/sinsal-extended'
import {
  whatNextResolver,
  whatNextJobCandidates,
  WHAT_NEXT_LABELS,
} from '@/lib/domain/theme-fortune/resolvers/what-next'
import { bandOf, type ThemeJudgeInput, type ThemeVerdict } from '@/lib/domain/theme-fortune/verdict-types'

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
    yearly: whatNextResolver.yearOffsets.map((offset) => calculateYearlyFortune(ctx, baseYear + offset)),
    rules: evaluateAllRules(ctx.sajuData, ctx.analysis.sipseong, ctx.analysis.warnings, ctx.analysis.sinsal),
  }
}

function judgeAll(baseYear = BASE_YEAR): ThemeVerdict[] {
  return PEOPLE.map((person) => whatNextResolver.judge(inputFor(person, baseYear)))
}

/** 리졸버의 동점 규칙 재서술 — 최고는 앞선 축, 최저는 뒤선 축이 이긴다. 이 자체가 계약이다. */
function topLowOf(verdict: ThemeVerdict): { top: string; low: string } {
  const axes = verdict.indicators
  let top = axes[0]
  for (const axis of axes) if (axis.score > top.score) top = axis
  let low = axes[axes.length - 1]
  for (const axis of [...axes].reverse()) if (axis.score < low.score) low = axis
  return { top: top.key, low: low.key }
}

describe('what-next — 🔴 결정론', () => {
  it('같은 사주·같은 기준 연도를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = whatNextResolver.judge(inputFor(person))
      const second = whatNextResolver.judge(inputFor(person))

      expect(first).toEqual(second)
    }
  })

  it('🔴 판정 전체가 원국에서만 선다 — 기준 연도가 바뀌어도 verdict 가 통째로 같다', () => {
    // 세 축 전부 태어난 순간에 정해진 값이고 시기·되짚기는 항상 빈다. 여기가 흔들리면
    // 「작년엔 만드는 결이라더니」가 된다 — 무료 입구가 거짓말을 하면 유료도 못 믿는다.
    for (const person of PEOPLE) {
      const now = whatNextResolver.judge(inputFor(person, BASE_YEAR))
      const later = whatNextResolver.judge(inputFor(person, BASE_YEAR + 3))

      expect(now).toEqual(later)
    }
  })

  it('사주가 다르면 판정이 한 칸에 몰려 있지 않다 (매핑이 장식이 아니다)', () => {
    const labels = new Set(judgeAll().map((verdict) => verdict.verdictLabel?.key))

    expect(labels.size).toBeGreaterThan(1)
  })
})

describe('what-next — 지표 3종', () => {
  it('정확히 셋이고, 키·라벨이 설계 그대로다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.indicators).toHaveLength(3)
      expect(verdict.indicators.map((indicator) => indicator.key)).toEqual(['expression', 'order', 'venture'])
      expect(verdict.indicators.map((indicator) => indicator.label)).toEqual([
        '만들어내는 결',
        '자리를 지키는 결',
        '벌려 나가는 결',
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

describe('what-next — 판정 6조합 (최고축×최저축 고정 매핑)', () => {
  it('여섯 칸이 다 다르고, 대각선(최고=최저) 칸은 존재하지 않는다', () => {
    // 기획서의 3×3 표에서 대각선은 동점 규칙상 도달 불가 — 도달 불가능한 칸은 두지 않는다(§10-13).
    const keys = Object.keys(WHAT_NEXT_LABELS)

    expect(keys).toHaveLength(6)
    expect(new Set(keys).size).toBe(6)
    for (const key of keys) {
      const [top, low] = key.split('_')
      expect(top).not.toBe(low)
    }
  })

  it('판정 라벨은 언제나 (최고축, 최저축)이 가리키는 칸이다', () => {
    for (const verdict of judgeAll()) {
      const { top, low } = topLowOf(verdict)

      expect(verdict.verdictLabel?.key).toBe(`${top}_${low}`)
    }
  })

  it('2×2 표가 아니므로 matrix 가 없다 — 화면은 3축 삼각으로 그린다', () => {
    for (const verdict of judgeAll()) {
      expect(verdict.verdictLabel).not.toBeNull()
      expect(verdict.matrix).toBeUndefined()
    }
  })

  it('🔴 낮은 축을 모자람·실패로 적지 않는다', () => {
    // 무료 입구에서 결핍을 팔면 그 순간 이 상품이 불안 장사가 된다(§5 C-2 ②의 서브카피 정신).
    for (const label of Object.values(WHAT_NEXT_LABELS)) {
      expect(label.note).not.toMatch(/실패|후회|늦었|손해|모자람|부족/)
      // 결론·지시가 아니라 «결»의 서술이어야 한다.
      expect(label.note).not.toMatch(/하세요|하십시오|권합니다|추천/)
      expect(label.note.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('what-next — 🔴 무료 절단의 리졸버 몫', () => {
  it('시기는 어떤 기준 연도에서도 항상 빈다 (시기가 유료 테마의 값이다)', () => {
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
    expect(whatNextResolver.yearOffsets).toEqual([0])
  })
})

describe('what-next — 직업 후보 (엔진 문자열에서만)', () => {
  it('3~5개이고, 두 번 뽑아도 같다', () => {
    for (const person of PEOPLE) {
      const ctx = buildSajuContext(person)
      const first = whatNextJobCandidates(ctx)
      const second = whatNextJobCandidates(ctx)

      expect(first.length).toBeGreaterThanOrEqual(3)
      expect(first.length).toBeLessThanOrEqual(5)
      expect(first).toEqual(second)
      expect(new Set(first).size).toBe(first.length)
    }
  })

  it('🔴 모든 후보가 L1 이 이미 가진 문자열 안에 있다 (직업을 지어내지 않는다)', () => {
    for (const person of PEOPLE) {
      const ctx = buildSajuContext(person)
      const allowed = new Set<string>([
        ...Object.values(SIPSEONG_MODERN).flatMap((entry) => entry.modernJobs),
        ...ctx.analysis.sinsal.flatMap((item) => SINSAL_MODERN[item.name]?.modernJobs ?? []),
        ...ctx.mulsang.iljuCareer,
        ...ctx.mulsang.dayMasterJobs,
      ])

      for (const job of whatNextJobCandidates(ctx)) expect(allowed).toContain(job)
    }
  })
})

describe('what-next — 룰·판정 신원', () => {
  it('룰 히트는 이 테마가 읽기로 한 것(적성 3 + 꽃 피는 때 3)만 실린다', () => {
    const watched = [
      '창작·예술 적성',
      '학자·법조인 적성',
      '무역·창업 적성',
      '30대 이전 두각',
      '50대 이후 만개',
      '학문 만성형',
    ]

    for (const verdict of judgeAll()) {
      for (const hit of verdict.ruleHits) expect(watched).toContain(hit)
    }
  })

  it('판정에 테마 id 가 실려 저장본이 어느 테마인지 스스로 안다', () => {
    for (const verdict of judgeAll()) expect(verdict.themeId).toBe('what-next')
  })
})

describe('what-next — L3 계약', () => {
  it('직장 갈래의 기존 유니온을 쓴다 (새 AnalysisType 을 만들지 않는다)', () => {
    expect(whatNextResolver.prompt.analysisType).toBe('TREND_CAREER')
  })

  it('🔴 양방향 지시를 프롬프트가 막는다 (「창업하세요」도 「버티세요」도 안 된다)', () => {
    const { rules, forbidden } = whatNextResolver.prompt

    expect(rules.join('\n')).toContain('창업이나 이직을 권하거나 만류하지 마라')
    expect(forbidden.join('\n')).toMatch(/그만두세요|창업하세요/)
    expect(forbidden.join('\n')).toMatch(/버티세요/)
  })

  it('🔴 직업 이름은 후보 목록 밖에서 만들 수 없다', () => {
    expect(whatNextResolver.prompt.rules.join('\n')).toContain('목록 밖의 직업을 새로 만들어 내지 말고')
  })

  it('🔴 광고·알선 경계 — 자격증·학원·프랜차이즈를 막는다 (무료 화면이 가장 위험한 자리다)', () => {
    const forbidden = whatNextResolver.prompt.forbidden.join('\n')

    expect(forbidden).toMatch(/자격증/)
    expect(forbidden).toMatch(/프랜차이즈/)
    expect(forbidden).toMatch(/학력|전공/)
  })

  it('🔴 통계 인용을 막는다 (테마를 만든 이유이지 결과의 근거가 아니다)', () => {
    expect(whatNextResolver.prompt.forbidden.join('\n')).toMatch(/설문|통계/)
  })

  it('판정을 뒤집지 못하게 못 박는다', () => {
    expect(whatNextResolver.prompt.rules.join('\n')).toMatch(/verdictLabel 을 뒤집지 마라/)
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
    const { question, rules } = whatNextResolver.prompt

    for (const line of [question, ...rules]) {
      for (const word of BANNED) expect(line).not.toContain(word)
    }
  })
})
