/**
 * 풍수 테마 1 「손 없는 날은 다 같은 날이 아니다」 — `moving-day` 의 L2 판정.
 *
 * 설계 원본: `TEAM_G_DESIGN/prd/PLAN-theme-fengshui-v1.md` §4 테마 1.
 *
 * ## 🔴 기획서의 날짜 달력은 여기 없다 — 달(月)까지만 가른다
 * 기획서 ⑥은 «기간 내 모든 날»의 일진을 돌려 등급을 매기는 일(日) 단위 달력 상품이다. 그 계산은
 * 이사 희망 기간이라는 별도 입력과 일진 반복 호출이 필요한데, 이 골격의 판정 입력
 * (`ThemeJudgeInput`)은 사주 컨텍스트와 주입된 세운뿐이고 판정 함수는 엔진을 부르지 못한다.
 * 그래서 이 판정은 **올해와 내년 중 어느 해, 어느 달의 문이 열려 있는지**까지만 가른다 —
 * 날짜 그리드는 기획서의 결정론 모듈(`fengshui-cross` `rankMoveDates`)이 설 때 그 화면의 몫이다.
 *
 * ## 🔴 손 없는 날을 계산하지 않는다
 * 이 테마의 차별점은 «손 없는 날이라고 다 같지 않다»(기획서 ⑥ ⚠️ — 손없는날은 전 국민 공통이라
 * 개인화 가치가 없다)이지, 손 없는 날을 우리가 다시 짚어 주는 것이 아니다. 세운 출력에는 날(日)
 * 단위 정보가 없으므로 음력 날짜를 여기서 계산해 실으면 「엔진에 없는 날을 지어낸 것」이 된다.
 * 달은 `keyOpportunityMonths`/`keyCautionMonths` 에서만 온다(마스터 §5-4).
 *
 * ## 이 테마는 답을 고르지 않는다
 * 「이사 가라/미뤄라」가 아니라 시기를 갈라 줄 뿐이다. 그래서 판정 라벨(양자택일)이 없고
 * (`verdictLabel: null`), **시기(timings)가 상품의 핵심**이다. AI 가 날짜를 고르는 순간 같은
 * 사람이 두 번 눌렀을 때 다른 날이 나오고, 기획서 ⑥ 🔴 그대로 「이 기능은 끝난다」.
 */
import { JIJI_CHUNG } from '@/lib/saju-engine/relations'
import type { PillarInteraction, YearlyFortuneResult } from '@/lib/saju-engine/woon-calculator'
import type { SajuData } from '@/lib/domain/saju/saju'
import {
  bandOf,
  clampScore,
  type ThemeIndicator,
  type ThemeJudgeInput,
  type ThemeResolver,
  type ThemeTiming,
  type ThemeVerdict,
} from '../verdict-types'

export const MOVING_DAY_ID = 'moving-day'

/** 지표 키·라벨 — 화면·테스트가 대조하는 고정 문자열. 순서가 곧 결과 화면 3번 칸의 순서다. */
export const MOVING_DAY_INDICATOR_KEYS = ['move_energy', 'gate_this_year', 'gate_next_year'] as const
export const MOVING_DAY_INDICATOR_LABELS = ['움직이는 힘', '올해의 문', '내년의 문'] as const

/** rule-base 26룰 중 이 테마가 읽는 것 — 타향살이 3룰(이동·이거의 고전 소재). 나머지는 무관하다. */
const WATCHED_RULE_IDS = new Set(['TAHYANG_01', 'TAHYANG_02', 'TAHYANG_03'])

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

const TREND_LABEL: Record<YearlyFortuneResult['totalTrend'], string> = {
  excellent: '아주 좋음',
  good: '좋음',
  neutral: '보통',
  caution: '주의',
  poor: '막힘',
}

/**
 * 원국 네 지지의 궁 이름 — 충이 어느 자리를 흔드는지 basis 에 그대로 적는다.
 * 이사 소재에서 월지(뿌리·기반)와 일지(앉은 자리)가 요지이고, 그 이름이 곧 근거 문장이 된다.
 */
const NATAL_SEATS: ReadonlyArray<{ readonly pillar: 'year' | 'month' | 'day' | 'time'; readonly label: string }> = [
  { pillar: 'year', label: '년지' },
  { pillar: 'month', label: '월지' },
  { pillar: 'day', label: '일지' },
  { pillar: 'time', label: '시지' },
]

interface NatalChungPair {
  readonly left: string
  readonly right: string
  readonly ganji: string
}

/**
 * 원국 안의 지지충 쌍 — 태어날 때 새겨진 «변동·이동»의 자리(relations.ts JIJI_CHUNG 주석 그대로).
 *
 * 🔴 `JIJI_CHUNG` 은 **상수 표를 임포트**한 것이지 엔진 호출이 아니다. 전승 표를 여기 다시 적으면
 *    세 번째 사본이 된다(기획서 §3-3 — `ELEMENT_DIRECTION` 이 이미 2곳 중복인 것과 같은 사고 경로).
 *    `ctx.analysis.relations.chung` 은 라벨만 주고 **어느 궁인지**를 주지 않아 여기서 자리를 되짚는다.
 */
function natalChungPairs(sajuData: SajuData): NatalChungPair[] {
  const seats = NATAL_SEATS.map((seat) => ({ label: seat.label, zhi: sajuData.pillars[seat.pillar].zhi }))
  const pairs: NatalChungPair[] = []
  for (let i = 0; i < seats.length; i += 1) {
    for (let j = i + 1; j < seats.length; j += 1) {
      if (JIJI_CHUNG[seats[i].zhi] === seats[j].zhi) {
        pairs.push({ left: seats[i].label, right: seats[j].label, ganji: `${seats[i].zhi}${seats[j].zhi}충` })
      }
    }
  }
  return pairs
}

/**
 * 「문」 점수 — 세운 종합 흐름 + 용신 친화.
 * 직업·재물 한 갈래가 아니라 `totalScore` 를 쓰는 이유: 이사는 집안 전체가 움직이는 일이라
 * 한 카테고리로 좁히면 판정이 좁아진다(기획서 테마 1 ④의 타깃은 특정 직군이 아니다).
 */
function gateScoreOf(fortune: YearlyFortuneResult | undefined): number {
  if (!fortune) return 50
  return clampScore(fortune.totalScore + AFFINITY_ADJUST[fortune.yongsinAffinity])
}

/** 이동수의 정통 근거는 지지충이다 — 있으면 그쪽을, 없으면 천간충을 근거로 쓴다. */
function chungOf(fortune: YearlyFortuneResult | undefined): PillarInteraction | undefined {
  if (!fortune) return undefined
  return (
    fortune.interactions.find((interaction) => interaction.type === '지지충') ??
    fortune.interactions.find((interaction) => interaction.type === '천간충')
  )
}

function buildGate(index: 1 | 2, year: number, fortune: YearlyFortuneResult | undefined): ThemeIndicator {
  const score = gateScoreOf(fortune)
  const chung = chungOf(fortune)
  return {
    key: MOVING_DAY_INDICATOR_KEYS[index],
    label: MOVING_DAY_INDICATOR_LABELS[index],
    score,
    band: bandOf(score),
    basis: fortune
      ? `${year} 세운 ${fortune.yearPillar.ganji}(${fortune.sipseongRelation}) · 흐름 ${TREND_LABEL[fortune.totalTrend]} · ${AFFINITY_LABEL[fortune.yongsinAffinity]}${chung ? ` · ${chung.pillarSource}와 ${chung.type}` : ''}`
      : `${year} 세운 계산 없음 — 원국만으로 판정`,
  }
}

function buildTimings(baseYear: number, years: ReadonlyMap<number, YearlyFortuneResult>): ThemeTiming[] {
  const timings: ThemeTiming[] = []
  const window = [baseYear, baseYear + 1]

  // 기회 = 문이 «낮음»이 아닌 해의 열리는 달. 문턱은 문 지표의 밴드와 같은 자리(bandOf)다 —
  // 지표는 «문이 닫혔다»는데 시기 칸이 그 해의 달을 권하면 화면이 서로 다른 말을 한다.
  for (const year of window) {
    const fortune = years.get(year)
    if (!fortune || fortune.keyOpportunityMonths.length === 0) continue
    if (bandOf(gateScoreOf(fortune)) === 'low') continue

    timings.push({
      kind: 'opportunity',
      year,
      months: [...fortune.keyOpportunityMonths],
      basis: `${year} 세운 ${fortune.yearPillar.ganji} · 흐름 ${TREND_LABEL[fortune.totalTrend]} · ${AFFINITY_LABEL[fortune.yongsinAffinity]}`,
    })
  }

  // 두 해 다 문이 낮으면 기회 칸이 통째로 빈다 — 그러면 화면이 「갈 때가 없다」고만 말하게 된다.
  // 문이 낮다는 **사실을 basis 에 남긴 채**, 두 해 중 그나마 문이 열린 쪽의 달을 싣는다.
  if (!timings.some((timing) => timing.kind === 'opportunity')) {
    const fallback = window
      .map((year) => ({ year, fortune: years.get(year) }))
      .filter((entry) => (entry.fortune?.keyOpportunityMonths.length ?? 0) > 0)
      .sort((a, b) => gateScoreOf(b.fortune) - gateScoreOf(a.fortune))[0]

    if (fallback?.fortune) {
      timings.push({
        kind: 'opportunity',
        year: fallback.year,
        months: [...fallback.fortune.keyOpportunityMonths],
        basis: `${fallback.year} 세운 ${fallback.fortune.yearPillar.ganji} · 흐름 ${TREND_LABEL[fallback.fortune.totalTrend]} — 두 해 중 문이 더 열린 쪽`,
      })
    }
  }

  // 주의 = 막히는 달. 🔴 충이 일어나는 «달»은 세운 출력에 없다(해 단위 판정) — 지어내지 않고
  //         근거 문장에만 싣는다(본보기 leave-or-stay 와 같은 규율).
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
 * 과거 역추산 근거 — 「직전 세운에서 충이 들어 자리·거처가 움직이기 쉬웠던 해」.
 * 지지충(이동수)의 해를 먼저 찾고, 없으면 천간충의 해를 쓴다. 문장은 L3 가 쓰고,
 * 근거가 없으면 **null 을 낸다** — 없는 과거를 지어내지 않는다.
 */
function buildPastHint(baseYear: number, years: ReadonlyMap<number, YearlyFortuneResult>): ThemeVerdict['pastHint'] {
  const past = [...years.values()].filter((year) => year.year < baseYear).sort((a, b) => b.year - a.year)

  const withChung = past.filter((year) => chungOf(year) !== undefined)
  const moved =
    withChung.find((year) => year.interactions.some((interaction) => interaction.type === '지지충')) ?? withChung[0]
  if (!moved) return null

  const chung = chungOf(moved)
  return {
    period: `${moved.year}년`,
    basis: `${moved.year} 세운 ${moved.yearPillar.ganji}(${moved.sipseongRelation})가 ${chung?.pillarSource ?? '원국'}와 ${chung?.type ?? '충'}`,
  }
}

function judge(input: ThemeJudgeInput): ThemeVerdict {
  const { ctx, baseYear, rules } = input
  const { sinsal, relations } = ctx.analysis

  const years = new Map(input.yearly.map((year) => [year.year, year]))

  // ⓐ 움직이는 힘 — 역마살 + 원국 지지충 + 뿌리 궁 공망. 태어날 때 정해진 값이라 해가 바뀌어도
  //    같다(테스트가 고정한다). ⚠️ 지살은 엔진이 계산하지 않는다(`calculateExtendedSinsal` 10종에
  //    없음) — 기획서 §2-2 표에 있어도 여기서 쓰면 항상 거짓이 된다. 역마살만 실값이다.
  const hasYeokma = sinsal.some((item) => item.name === '역마살')
  const chungPairs = natalChungPairs(ctx.sajuData)
  const monthVoid = relations.gongmang.includes(ctx.sajuData.pillars.month.zhi)
  const yearVoid = relations.gongmang.includes(ctx.sajuData.pillars.year.zhi)
  const moveScore = clampScore(
    (hasYeokma ? 26 : 0) + chungPairs.length * 16 + (monthVoid ? 12 : 0) + (yearVoid ? 8 : 0)
  )
  const moveParts = [
    hasYeokma ? '역마살' : '',
    ...chungPairs.map((pair) => `${pair.left}-${pair.right} ${pair.ganji}`),
    monthVoid ? '월지 공망' : '',
    yearVoid ? '년지 공망' : '',
  ].filter(Boolean)
  const moveEnergy: ThemeIndicator = {
    key: MOVING_DAY_INDICATOR_KEYS[0],
    label: MOVING_DAY_INDICATOR_LABELS[0],
    score: moveScore,
    band: bandOf(moveScore),
    basis:
      moveParts.length > 0
        ? `${moveParts.join(' · ')} — 원국에 새겨진 이동의 결`
        : '역마살·원국 지지충·뿌리 궁 공망 없음 — 움직임이 급하지 않은 원국',
  }

  // ⓑⓒ 올해의 문 · 내년의 문 — 이 상품의 실제 질문은 「올해 갈까 내년 갈까」다. 두 해의 문을
  //      나란히 세워야 시기 칸(timings)이 갈라 주는 답과 지표가 같은 그림이 된다.
  const gateThisYear = buildGate(1, baseYear, years.get(baseYear))
  const gateNextYear = buildGate(2, baseYear + 1, years.get(baseYear + 1))

  return {
    themeId: MOVING_DAY_ID,
    // 양자택일이 아니다 — 「가라/마라」를 고르는 순간 기획서 ⑨(이사 지시 금지)를 코드가 어긴다.
    verdictLabel: null,
    indicators: [moveEnergy, gateThisYear, gateNextYear],
    timings: buildTimings(baseYear, years),
    ruleHits: rules.strongMatches
      .filter((match) => WATCHED_RULE_IDS.has(match.rule.id))
      .map((match) => match.rule.name),
    pastHint: buildPastHint(baseYear, years),
  }
}

export const movingDayResolver: ThemeResolver = {
  themeId: MOVING_DAY_ID,
  // 올해·내년은 문·시기용, 재작년·작년은 과거 역추산용. 세운은 순수 수학이라 AI 호출이 늘지 않는다.
  yearOffsets: [-2, -1, 0, 1],
  judge,
  prompt: {
    // 기획서 §3-4 가 지정한 «사진 없는 1종»의 기존 경로는 trend_estate 이고, 그 경로의 실제
    // AnalysisType 이 TREND_WEALTH 다(`app/actions/ai/trend.ts` — estate → TREND_WEALTH).
    // 🔴 TREND_ESTATE 라는 타입은 존재하지 않는다 — 새로 만들지 않는다(마스터 §5-4).
    analysisType: 'TREND_WEALTH',
    question: '이사를 생각하는 지금, 어느 해 어느 달의 문이 열려 있는지.',
    rules: [
      '날짜를 고르지 마라. 판정의 timings 에 있는 해와 달까지만 말하고, 특정 일(日)이나 음력 날짜를 지정하지 마라.',
      '이사하라고도 미루라고도 말하지 마라. 어느 시기의 문이 열려 있는지만 설명하라.',
      '손 없는 날은 「모두에게 같은 날이 나에게도 맞는 날은 아니다」의 맥락으로만 언급하라. 이 판정에는 날(日) 단위 정보가 없다.',
      '「이 달에 옮기면 좋아진다」처럼 효과를 달지 마라. 「이 달이 당신 사주와 어긋나지 않는 달」까지만 말하라.',
      'actions 는 시기를 좁히는 준비(후보 달 표시, 가족과 상의할 것 정리, 짐 정리 순서)처럼 오늘 혼자 할 수 있는 일로 쓰라.',
    ],
    forbidden: [
      '「이 날 이사하면 재물이 는다」류의 효과 단정',
      '이사업체·포장이사·견적 비교 같은 업체 알선·추천',
      '매매·전세·월세의 유불리, 시세·집값 전망, 부동산 투자 판단',
      '특정 일(日)·음력 날짜·손 없는 날 날짜 계산(판정에 날 단위 정보가 없다)',
      '방위·층수·평면 판단(방위 입력을 받지 않았다 — 이 풀이는 시기만 본다)',
      '전세사기·보증금·권리관계·계약 안전 같은 법률 상담 어휘',
    ],
  },
}
