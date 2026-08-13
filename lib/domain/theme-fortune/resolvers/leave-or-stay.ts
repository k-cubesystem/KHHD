/**
 * C-1 「나갈까 말까, 벌써 세 번째」 — `leave-or-stay` 의 L2 판정.
 *
 * 설계 원본: `TEAM_G_DESIGN/prd/PLAN-theme-career-wealth-v1.md` §5 C-1.
 *
 * ## 🔴 이 테마는 답을 고르지 않는다
 * 사용자가 기대하는 답은 「이직해라/버텨라」지만, 실제로 주는 답은 **「지금 답답한 게 자리
 * 문제인지 시기 문제인지」**다(직장·재물 §3-4). 그래서 판정은 «둘 중 하나»가 아니라 **네 칸**이고,
 * 그중 좌상단 「자리보다 다른 데 있는 결」이 이 테마의 양심이다 — 「직장 문제가 아닐 수 있다」는
 * 답이 반드시 존재해야 한다.
 *
 * ## 🔴 「버티는 결」을 실패로 그리지 않는다
 * 리서치가 만든 함정이다(후회하는 쪽은 나간 사람보다 안 나간 사람이 많다). 남는 쪽을 실패로
 * 서술하면 그 순간 이 상품이 **이직을 권한 것**이 된다 — 표시광고법 이전에 설계가 거짓이 된다.
 * 그래서 라벨의 `note` 와 프롬프트 규율이 둘 다 이 지점을 막는다.
 */
import type { CategoryScore, PillarInteraction, YearlyFortuneResult } from '@/lib/saju-engine/woon-calculator'
import {
  bandOf,
  clampScore,
  type ThemeIndicator,
  type ThemeJudgeInput,
  type ThemeResolver,
  type ThemeTiming,
  type ThemeVerdict,
  type ThemeVerdictLabel,
  type ThemeVerdictMatrix,
} from '../verdict-types'

export const LEAVE_OR_STAY_ID = 'leave-or-stay'

/**
 * 판정 4택 — 앞 두 지표 밴드의 **2×2 고정 매핑**(직장·재물 §5 C-1).
 * 새 계산이 아니라 표다. 표를 고치면 「같은 사주에 다른 답」이 되므로 테스트가 네 칸을 고정한다.
 */
export const LEAVE_OR_STAY_LABELS = {
  hold: {
    key: 'hold',
    label: '버티는 결',
    note: '눌리는 힘은 큰데 밖으로 도는 힘은 크지 않습니다. 머무는 것도 하나의 선택이지 밀린 것이 아닙니다.',
  },
  pushed: {
    key: 'pushed',
    label: '밀려나는 결',
    note: '눌리는 힘과 나가려는 힘이 함께 큽니다. 자리에서 오는 답답함과 안에서 나는 답답함이 겹쳐 있습니다.',
  },
  elsewhere: {
    key: 'elsewhere',
    label: '자리보다 다른 데 있는 결',
    note: '눌리는 힘도 나가려는 힘도 크지 않습니다. 지금 답답한 것이 자리에서 오지 않았을 수 있습니다.',
    // 🔴 이 테마의 양심 — 이 칸이 나오면 화면은 결론 대신 고민상담으로 닫는다(§5 C-1).
    openEnded: true,
  },
  rising: {
    key: 'rising',
    label: '스스로 뜨는 결',
    note: '눌리는 힘은 크지 않은데 밖으로 도는 힘이 큽니다. 답답함이 자리보다 내 쪽의 결에서 옵니다.',
  },
} as const satisfies Record<string, ThemeVerdictLabel>

/** 이 판정이 나오면 화면은 결론 대신 고민상담으로 닫는다(§5 C-1). */
export const LEAVE_OR_STAY_OPEN_ENDED_KEY = LEAVE_OR_STAY_LABELS.elsewhere.key

/**
 * 화면에 그려지는 판정표.
 * 🔴 좌상단(둘 다 «낮음») 칸이 이 테마의 양심이다 — 「직장 문제가 아닐 수 있다」는 답이 표에
 *    **자리로** 존재해야 한다. 칸을 지우면 이 상품은 늘 직장에서 원인을 찾게 된다.
 */
const LEAVE_OR_STAY_MATRIX = {
  rowIndicatorKey: 'gwan_pressure',
  colIndicatorKey: 'siksang_pull',
  rowLabels: ['눌리는 힘 낮음', '눌리는 힘 높음'],
  colLabels: ['나가려는 힘 낮음', '나가려는 힘 높음'],
  cells: [
    [LEAVE_OR_STAY_LABELS.elsewhere, LEAVE_OR_STAY_LABELS.rising],
    [LEAVE_OR_STAY_LABELS.hold, LEAVE_OR_STAY_LABELS.pushed],
  ],
} as const satisfies ThemeVerdictMatrix

/** rule-base 26룰 중 이 테마가 읽는 것(§5 C-1 ⓖ). 나머지 룰은 이 화면과 무관하다. */
const WATCHED_RULE_IDS = new Set(['TAHYANG_02', 'LEGAL_01', 'LEGAL_02', 'CAREER_03'])

/** 신강약이 같은 관성을 얼마나 다르게 누르는가 — 신약이면 같은 압력도 더 크게 받는다. */
const STRENGTH_ADJUST: Record<'신강' | '신약' | '중화', number> = { 신강: -12, 중화: 0, 신약: 12 }

const AFFINITY_ADJUST: Record<YearlyFortuneResult['yongsinAffinity'], number> = {
  beneficial: 12,
  neutral: 0,
  harmful: -12,
}

const AFFINITY_LABEL: Record<YearlyFortuneResult['yongsinAffinity'], string> = {
  beneficial: '용신과 맞음',
  neutral: '용신과 무관',
  harmful: '기신 쪽',
}

const TREND_LABEL: Record<CategoryScore['trend'], string> = {
  excellent: '아주 좋음',
  good: '좋음',
  neutral: '보통',
  caution: '주의',
  poor: '막힘',
}

/** 세운의 흐름이 «열렸다»고 볼 수 있는 등급. 여기가 곧 기회 시기의 문턱이다. */
const OPEN_TRENDS: ReadonlyArray<CategoryScore['trend']> = ['excellent', 'good']

function careerScore(year: YearlyFortuneResult | undefined): CategoryScore | undefined {
  return year?.categories.find((category) => category.category === '직업운')
}

function chungOf(year: YearlyFortuneResult): PillarInteraction | undefined {
  return year.interactions.find((interaction) => interaction.type === '천간충' || interaction.type === '지지충')
}

function seatPhrase(total: number, hit: number): string {
  return `자리 ${total}곳 중 ${hit}곳`
}

function buildTimings(baseYear: number, years: ReadonlyMap<number, YearlyFortuneResult>): ThemeTiming[] {
  const timings: ThemeTiming[] = []
  const window = [baseYear, baseYear + 1]

  // 기회 = 열리는 달 ∩ (직업운 흐름 «좋음» 이상)
  for (const year of window) {
    const fortune = years.get(year)
    const career = careerScore(fortune)
    if (!fortune || !career || fortune.keyOpportunityMonths.length === 0) continue
    if (!OPEN_TRENDS.includes(career.trend)) continue

    timings.push({
      kind: 'opportunity',
      year,
      months: [...fortune.keyOpportunityMonths],
      basis: `${year} 세운 ${fortune.yearPillar.ganji} · 직업운 ${TREND_LABEL[career.trend]} · ${AFFINITY_LABEL[fortune.yongsinAffinity]}`,
    })
  }

  // 두 해 다 «보통» 이하면 기회 칸이 통째로 빈다 — 그러면 화면이 「막혔다」고만 말하게 된다.
  // 흐름이 보통이라는 **사실을 basis 에 적어** 둔 채, 그나마 나은 해의 열리는 달을 남긴다.
  if (!timings.some((timing) => timing.kind === 'opportunity')) {
    const fallback = window
      .map((year) => ({ year, fortune: years.get(year) }))
      .filter((entry) => (entry.fortune?.keyOpportunityMonths.length ?? 0) > 0)
      .sort((a, b) => (careerScore(b.fortune)?.score ?? 0) - (careerScore(a.fortune)?.score ?? 0))[0]

    if (fallback?.fortune) {
      const career = careerScore(fallback.fortune)
      timings.push({
        kind: 'opportunity',
        year: fallback.year,
        months: [...fallback.fortune.keyOpportunityMonths],
        basis: `${fallback.year} 세운 ${fallback.fortune.yearPillar.ganji} · 직업운 ${TREND_LABEL[career?.trend ?? 'neutral']} — 두 해 중 흐름이 나은 쪽`,
      })
    }
  }

  // 주의 = 막히는 달. 🔴 충(沖)이 일어나는 «달»은 세운 출력에 없다(세운 대 원국은 해 단위 판정)
  //         — 지어내지 않고 근거 문장에만 싣는다.
  for (const year of window) {
    const fortune = years.get(year)
    if (!fortune || fortune.keyCautionMonths.length === 0) continue
    const chung = chungOf(fortune)

    timings.push({
      kind: 'caution',
      year,
      months: [...fortune.keyCautionMonths],
      basis: chung
        ? `${year} 세운 ${fortune.yearPillar.ganji}가 ${chung.pillarSource}와 ${chung.type}`
        : `${year} 세운 ${fortune.yearPillar.ganji} · ${AFFINITY_LABEL[fortune.yongsinAffinity]}`,
    })
  }

  return timings
}

/**
 * 과거 역추산 근거 — 「직전 세운에서 관성이 충을 만난 해」.
 * 문장은 L3 가 쓴다. 근거가 없으면 **null 을 낸다** — 없는 과거를 지어내지 않는다.
 */
function buildPastHint(baseYear: number, years: ReadonlyMap<number, YearlyFortuneResult>): ThemeVerdict['pastHint'] {
  const past = [...years.values()].filter((year) => year.year < baseYear).sort((a, b) => b.year - a.year)

  const withChung = past.filter((year) => chungOf(year) !== undefined)
  const gwanFirst = withChung.find((year) => year.sipseongRelation.includes('관')) ?? withChung[0]
  if (!gwanFirst) return null

  const chung = chungOf(gwanFirst)
  return {
    period: `${gwanFirst.year}년`,
    basis: `${gwanFirst.year} 세운 ${gwanFirst.yearPillar.ganji}(${gwanFirst.sipseongRelation})가 ${chung?.pillarSource ?? '원국'}와 ${chung?.type ?? '충'}`,
  }
}

function judge(input: ThemeJudgeInput): ThemeVerdict {
  const { ctx, baseYear, rules } = input
  const { sipseong, sinsal } = ctx.analysis
  const count = (name: string): number => sipseong.distribution[name] ?? 0
  const seats = sipseong.items.length

  const years = new Map(input.yearly.map((year) => [year.year, year]))

  // ⓐ 눌리는 힘 — 관성(정관·편관). 편관은 같은 한 개라도 더 날카롭게 누른다.
  const jeonggwan = count('정관')
  const pyeongwan = count('편관')
  const gwanTotal = jeonggwan + pyeongwan
  const gwanScore = clampScore(gwanTotal * 22 + pyeongwan * 8 + STRENGTH_ADJUST[sipseong.strengthAssessment])
  const gwanParts = [pyeongwan > 0 ? `편관 ${pyeongwan}` : '', jeonggwan > 0 ? `정관 ${jeonggwan}` : ''].filter(Boolean)
  const gwanPressure: ThemeIndicator = {
    key: 'gwan_pressure',
    label: '눌리는 힘',
    score: gwanScore,
    band: bandOf(gwanScore),
    basis: `${gwanParts.length > 0 ? gwanParts.join(' · ') : '관성 없음'} — ${seatPhrase(seats, gwanTotal)} · ${sipseong.strengthAssessment}`,
  }

  // ⓑ 나가려는 힘 — 식상(식신·상관) + 역마살.
  const siksin = count('식신')
  const sanggwan = count('상관')
  const siksangTotal = siksin + sanggwan
  const hasYeokma = sinsal.some((item) => item.name === '역마살')
  const pullScore = clampScore(siksangTotal * 22 + sanggwan * 8 + (hasYeokma ? 18 : 0))
  const pullParts = [sanggwan > 0 ? `상관 ${sanggwan}` : '', siksin > 0 ? `식신 ${siksin}` : ''].filter(Boolean)
  const siksangPull: ThemeIndicator = {
    key: 'siksang_pull',
    label: '나가려는 힘',
    score: pullScore,
    band: bandOf(pullScore),
    basis: `${pullParts.length > 0 ? pullParts.join(' · ') : '식상 없음'}${hasYeokma ? ' · 역마살' : ''} — ${seatPhrase(seats, siksangTotal)}`,
  }

  // ⓒ 올해의 문 — 세운 직업운 + 용신 친화.
  const thisYear = years.get(baseYear)
  const thisCareer = careerScore(thisYear)
  const affinity = thisYear?.yongsinAffinity ?? 'neutral'
  const gateScore = clampScore((thisCareer?.score ?? 50) + AFFINITY_ADJUST[affinity])
  const yearGate: ThemeIndicator = {
    key: 'year_gate',
    label: '올해의 문',
    score: gateScore,
    band: bandOf(gateScore),
    basis: thisYear
      ? `${baseYear} 세운 ${thisYear.yearPillar.ganji}(${thisYear.sipseongRelation}) · 직업운 ${TREND_LABEL[thisCareer?.trend ?? 'neutral']} · ${AFFINITY_LABEL[affinity]}`
      : `${baseYear} 세운 계산 없음 — 원국만으로 판정`,
  }

  // 2×2 고정 매핑. 「높다」의 문턱은 밴드 경계(BAND_THRESHOLD.mid)와 같은 자리다 —
  // 밴드와 라벨이 다른 눈금을 쓰면 화면의 막대와 판정이 서로 다른 말을 한다.
  const pressing = gwanPressure.band !== 'low'
  const pulling = siksangPull.band !== 'low'
  const verdictLabel = LEAVE_OR_STAY_MATRIX.cells[pressing ? 1 : 0][pulling ? 1 : 0]

  return {
    themeId: LEAVE_OR_STAY_ID,
    verdictLabel,
    matrix: LEAVE_OR_STAY_MATRIX,
    indicators: [gwanPressure, siksangPull, yearGate],
    timings: buildTimings(baseYear, years),
    ruleHits: rules.strongMatches
      .filter((match) => WATCHED_RULE_IDS.has(match.rule.id))
      .map((match) => match.rule.name),
    pastHint: buildPastHint(baseYear, years),
  }
}

export const leaveOrStayResolver: ThemeResolver = {
  themeId: LEAVE_OR_STAY_ID,
  // 올해·내년은 판정용, 재작년·작년은 과거 역추산용. 세운은 순수 수학이라 AI 호출이 늘지 않는다.
  yearOffsets: [-2, -1, 0, 1],
  judge,
  prompt: {
    analysisType: 'TREND_CAREER',
    question: '지금 답답한 것이 자리에서 오는 것인지, 시기에서 오는 것인지.',
    rules: [
      '이직을 권하거나 만류하지 마라. 무엇이 자리에서 오고 무엇이 시기에서 오는지만 설명하라.',
      'verdictLabel 을 뒤집지 마라. headline 은 그 라벨과 같은 방향이어야 한다.',
      '「버티는 결」이 나왔다면 그것을 패배가 아니라 선택으로 서술하라.',
      '「자리보다 다른 데 있는 결」이 나왔다면 직장에서 원인을 찾지 말고, 답이 다른 곳에 있을 수 있다고 열어 두라.',
      'actions 는 오늘·이번 주에 혼자 해볼 수 있는 일로 쓰라. 회사에 요구하는 행동을 적지 마라.',
    ],
    forbidden: [
      '이직하세요·퇴사하세요·참으세요·버티세요 같은 지시',
      '연봉·처우·회사 규모·업종 전망',
      '부당해고·권고사직·실업급여·근로계약 같은 노동 상담 어휘',
      '회사·상사·동료를 특정해 평가하는 서술(상대의 정보를 받지 않았다)',
      '설문·통계 수치 인용',
    ],
  },
}
