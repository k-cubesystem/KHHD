/**
 * L3 AI 계약 — 「엔진이 판정하고 AI 는 옮겨 적는다」를 코드로 지키는 자리.
 *
 * 여기서 깨지면 결과 화면의 12개월 띠와 문장이 서로 다른 말을 한다 — 사용자는 그때 둘 중
 * 무엇을 믿어야 할지 모른다.
 */
import {
  buildThemeAdditionalContext,
  enforceMonths,
  parseThemeNarration,
  THEME_L3_FIXED_INSTRUCTION,
  THEME_OUTPUT_FORMAT_GUIDE,
  THEME_OUTPUT_FORMAT_GUIDE_FREE,
  themeOutputFormatGuide,
} from '@/lib/domain/theme-fortune/ai-contract'
import { leaveOrStayResolver } from '@/lib/domain/theme-fortune/resolvers/leave-or-stay'
import type { ThemeVerdict } from '@/lib/domain/theme-fortune/verdict-types'

const VERDICT: ThemeVerdict = {
  themeId: 'leave-or-stay',
  verdictLabel: { key: 'hold', label: '버티는 결', note: '머무는 것도 하나의 선택입니다.' },
  indicators: [
    { key: 'gwan_pressure', label: '눌리는 힘', score: 70, band: 'high', basis: '편관 2 · 정관 1' },
    { key: 'siksang_pull', label: '나가려는 힘', score: 20, band: 'low', basis: '식상 없음' },
    { key: 'year_gate', label: '올해의 문', score: 55, band: 'mid', basis: '세운 직업운 보통' },
  ],
  timings: [
    { kind: 'opportunity', year: 2026, months: [3, 9], basis: '세운 직업운 좋음' },
    { kind: 'caution', year: 2026, months: [7], basis: '세운이 일주와 지지충' },
  ],
  ruleHits: ['잦은 이동·해외운'],
  pastHint: { period: '2024년', basis: '2024 세운 甲辰(편관)이 일주와 충' },
}

const NO_TIMING_VERDICT: ThemeVerdict = { ...VERDICT, timings: [] }

function narrationJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    headline: '지금 답답한 것은 자리보다 시기에서 옵니다.',
    situation: '관성이 강하게 눌리는 구간입니다.',
    indicatorNotes: ['눌림이 큽니다', '밖으로 도는 힘은 약합니다', '올해 문은 보통입니다'],
    timingNotes: ['3월과 9월이 열립니다', '7월은 말을 아끼는 편이 좋습니다'],
    actions: ['3월에 이야기를 꺼내볼 만합니다', '기록을 남기세요', '쉬는 날을 정하세요'],
    pastEcho: '2024년 무렵 자리에 변동이 있었을 것입니다.',
    caution: '이 풀이는 결정을 대신하지 않습니다.',
    ...overrides,
  })
}

describe('고정 지시문 (마스터 §5-1)', () => {
  it('🔴 문자열이 기획서 그대로다 — 다듬지 않는다', () => {
    expect(THEME_L3_FIXED_INSTRUCTION).toBe(
      [
        '아래 [확정 판정]은 이미 계산이 끝난 값이다. 다시 계산하지 말고, 숫자를 새로 만들지 말고,',
        '판정과 어긋나는 서술을 하지 마라. 당신의 일은 이 판정을 사람의 말로 풀어 쓰는 것뿐이다.',
      ].join('\n')
    )
  })

  it('추가 컨텍스트는 고정 지시문 + 판정 JSON + 테마 질문을 함께 싣는다', () => {
    const context = buildThemeAdditionalContext(leaveOrStayResolver.prompt, VERDICT)

    expect(context).toContain(THEME_L3_FIXED_INSTRUCTION)
    expect(context).toContain('"themeId": "leave-or-stay"')
    expect(context).toContain(leaveOrStayResolver.prompt.question)
    expect(context).toContain('이직을 권하거나 만류하지 마라')
  })

  it('쓸 수 있는 달을 프롬프트에 못 박는다', () => {
    expect(buildThemeAdditionalContext(leaveOrStayResolver.prompt, VERDICT)).toContain('3·7·9월')
  })

  it('판정이 달을 확정하지 않았으면 달을 언급하지 말라고 한다', () => {
    const context = buildThemeAdditionalContext(leaveOrStayResolver.prompt, NO_TIMING_VERDICT)

    expect(context).toContain('특정 달을 언급하지 마세요')
  })
})

describe('출력 스키마 — 자리가 없으면 AI 가 쓸 수 없다 (직장·재물 §3-2)', () => {
  it('종목·매수 시점·수익률 칸을 만들지 않는다', () => {
    expect(THEME_OUTPUT_FORMAT_GUIDE).not.toMatch(/종목|매수|매도|수익률|목표가|투자 적기|bestMonth|bestWeek/)
    expect(THEME_OUTPUT_FORMAT_GUIDE_FREE).not.toMatch(/종목|매수|매도|수익률|목표가|투자 적기|bestMonth|bestWeek/)
  })

  it('점수 칸을 만들지 않는다 (밴드는 이미 L2 가 정했다)', () => {
    expect(THEME_OUTPUT_FORMAT_GUIDE).not.toMatch(/"score"|점수|등급/)
    expect(THEME_OUTPUT_FORMAT_GUIDE_FREE).not.toMatch(/"score"|점수|등급/)
  })
})

describe('무료 절단 (마스터 §7-1 · 직장·재물 게이트 8번)', () => {
  it('🔴 절단 스키마에 행동·시기 해설·되짚기 자리가 없다', () => {
    // 칸 수 차이가 곧 무료와 유료 두 상품의 구분이다 — 자리가 생기는 순간 상품 구분이 사라진다.
    expect(THEME_OUTPUT_FORMAT_GUIDE_FREE).not.toMatch(/actions|timingNotes|pastEcho/)
  })

  it('선택기는 무료에만 절단 스키마를 준다', () => {
    expect(themeOutputFormatGuide(true)).toBe(THEME_OUTPUT_FORMAT_GUIDE_FREE)
    expect(themeOutputFormatGuide(false)).toBe(THEME_OUTPUT_FORMAT_GUIDE)
  })

  it('🔴 AI 가 절단 스키마를 무시하고 써 보내도 서버가 버린다', () => {
    // 게이트는 프롬프트가 아니라 파서가 진다 — 프롬프트는 지시일 뿐 강제가 아니다.
    const narration = parseThemeNarration(narrationJson(), VERDICT, true)

    expect(narration.actions).toEqual([])
    expect(narration.timingNotes).toEqual([])
    expect(narration.pastEcho).toBe('')
    expect(narration.headline).toContain('자리보다 시기')
    expect(narration.indicatorNotes).toHaveLength(3)
  })
})

describe('🔴 월(月) 검증 — 조용히 틀린 달을 내보내지 않는다', () => {
  it('판정에 있는 달은 그대로 둔다', () => {
    expect(enforceMonths('3월과 9월이 열립니다', [3, 7, 9])).toBe('3월과 9월이 열립니다')
  })

  it('판정에 없는 달은 판정의 달로 덮는다 (문장은 지우지 않는다)', () => {
    expect(enforceMonths('5월에 움직여 보세요', [3, 7, 9])).toBe('3월에 움직여 보세요')
    expect(enforceMonths('11월과 12월을 보세요', [3])).toBe('3월과 3월을 보세요')
  })

  it('판정이 달을 확정하지 않았으면 달 표기를 걷어낸다', () => {
    expect(enforceMonths('4월에 이야기를 꺼내보세요', [])).toBe('해당 시기에 이야기를 꺼내보세요')
  })

  it('«개월»·«달» 같은 기간 표현은 건드리지 않는다', () => {
    expect(enforceMonths('앞으로 3개월은 지켜보세요', [9])).toBe('앞으로 3개월은 지켜보세요')
    expect(enforceMonths('이번 달 셋째 주', [9])).toBe('이번 달 셋째 주')
  })

  it('서술 전량(한 줄 답·상황·시기·행동)에 같은 잣대를 댄다', () => {
    const narration = parseThemeNarration(
      narrationJson({
        headline: '5월이 고비입니다',
        situation: '11월까지 눌립니다',
        timingNotes: ['1월이 열립니다', '2월은 주의'],
        actions: ['4월에 면담을 잡으세요', '기록', '휴식'],
      }),
      VERDICT
    )

    // 3 = 판정이 준 첫 달. 지어낸 달이 하나도 남지 않는다.
    expect(narration.headline).toBe('3월이 고비입니다')
    expect(narration.situation).toBe('3월까지 눌립니다')
    expect(narration.timingNotes).toEqual(['3월이 열립니다', '3월은 주의'])
    expect(narration.actions[0]).toBe('3월에 면담을 잡으세요')
  })
})

describe('서술 파싱', () => {
  it('코드펜스·잡텍스트가 섞여 있어도 JSON 을 건져낸다', () => {
    const narration = parseThemeNarration('```json\n' + narrationJson() + '\n```', VERDICT)

    expect(narration.headline).toContain('자리보다 시기')
  })

  it('칸 수를 지표 수·행동 3개에 맞춘다 (화면이 undefined 를 만나지 않는다)', () => {
    const narration = parseThemeNarration(narrationJson({ indicatorNotes: ['하나'], actions: [] }), VERDICT)

    expect(narration.indicatorNotes).toHaveLength(3)
    expect(narration.actions).toHaveLength(3)
    expect(narration.indicatorNotes[1]).toBe('')
  })

  it('🔴 과거 근거가 없으면 되짚기를 비운다 (없는 과거를 지어내 싣지 않는다)', () => {
    const narration = parseThemeNarration(narrationJson(), { ...VERDICT, pastHint: null })

    expect(narration.pastEcho).toBe('')
  })

  it('해석 불가·빈 결과는 던진다 — 액션이 그 신호로 복채를 돌려준다', () => {
    expect(() => parseThemeNarration('죄송합니다. 답변할 수 없습니다.', VERDICT)).toThrow()
    expect(() => parseThemeNarration('{ 이건 JSON 이 아니다 }', VERDICT)).toThrow()
    expect(() => parseThemeNarration(narrationJson({ headline: '' }), VERDICT)).toThrow()
  })

  it('스키마에 없는 키는 통과시키지 않는다 (자리가 없으면 화면에 못 나온다)', () => {
    const narration = parseThemeNarration(narrationJson({ investmentTiming: { bestMonth: '9월' } }), VERDICT)

    expect(Object.keys(narration).sort()).toEqual([
      'actions',
      'caution',
      'headline',
      'indicatorNotes',
      'pastEcho',
      'remedyNotes',
      'situation',
      'timingNotes',
    ])
  })
})
