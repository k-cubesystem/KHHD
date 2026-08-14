/**
 * 풍수 테마 2 「집이 문제인가, 때가 문제인가」 — `house-or-timing` 의 L2 판정.
 *
 * 설계 원본: `TEAM_G_DESIGN/prd/PLAN-theme-fengshui-v1.md` §4 테마 2.
 *
 * ## 🔴 기획서의 집(宅) 축은 여기서 잴 수 없다 — 축을 정직하게 바꿨다
 * 기획서 ⑥의 집 축은 실측 향(→ 방위 오행 ↔ 용신)과 사진에서 읽은 지배 오행으로 잰다. 이 골격의
 * 판정 입력(`ThemeJudgeInput`)에는 향도 사진도 없다 — **사주는 그 집을 모른다.** 그래서 집 축을
 * 「이 집이 나쁜가」가 아니라 **「터의 기운에 크게 감응하는 원국인가」**(역마·거처 궁의 충·뿌리
 * 공망·귀문의 예민함)로 바꿨다. 이 판정이 말할 수 있는 것은 «집을 실제로 살펴볼 결인가»까지이고,
 * 그 집 자체의 실사는 사진·방위를 받는 기존 풍수 기능의 몫이다(프롬프트 규율이 이 경계를 지킨다).
 *
 * ## 때(時) 축은 기획서 그대로 — 「이사 온 뒤 1~3년」을 되짚는다
 * 기획서 ⑥의 때 축은 입주 년월의 간지 교차인데 입주 시기 입력이 없으므로, 타깃 정의(④ 「이사 후
 * 1~3년」)를 창으로 삼아 **지난 세 해 세운**(기신·충형·막힘)을 합산한다. 입주가 그 창 안에 있는
 * 사용자에게는 같은 질문에 같은 재료로 답하는 셈이다.
 *
 * ## 🔴 「둘 다 아닌 결」이 이 테마의 양심이다
 * 기획서 ⑨: «「둘 다 아님」 판정이 반드시 존재해야 한다 — 없으면 항상 불안을 파는 구조가 된다.»
 * 직장·재물 §3-6 도 이 규율을 «풍수 테마2에서 확립»이라고 인용한다 — 여기가 그 원산지다.
 * 좌상단(둘 다 낮음) 칸이 그 자리이고, 그 판정이 나오면 화면은 결론 대신 고민상담으로 닫는다.
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
  type ThemeVerdictLabel,
  type ThemeVerdictMatrix,
} from '../verdict-types'

export const HOUSE_OR_TIMING_ID = 'house-or-timing'

/**
 * 판정 4택 — 앞 두 지표 밴드의 **2×2 고정 매핑**(기획서 ⑦ 「원인 귀속 카드 4택」).
 * 기획서 ⑥의 문턱(점수 차 ≥20 / 둘 다 40 미만 / 둘 다 60 이상)은 골격의 밴드 경계 하나로
 * 통일했다 — 눈금이 둘이면 화면의 막대와 판정표가 서로 다른 말을 한다(본보기 C-1 과 같은 이유).
 */
export const HOUSE_OR_TIMING_LABELS = {
  neither: {
    key: 'neither',
    label: '둘 다 아닌 결',
    note: '지나온 몇 해의 흐름도, 터에 감응하는 기운도 크지 않습니다. 꼬였다고 느낀 것이 집과 때 밖에서 왔을 수 있습니다.',
    // 🔴 이 테마의 양심 — 이 칸이 나오면 화면은 결론 대신 고민상담으로 닫는다(기획서 ⑨).
    openEnded: true,
  },
  place: {
    key: 'place',
    label: '터를 살펴볼 결',
    note: '때의 흐름은 눌리지 않았는데 터의 기운에 감응하는 결이 큽니다. 답답함이 거처 쪽에서 왔을 수 있습니다.',
  },
  time: {
    key: 'time',
    label: '때가 눌렀던 결',
    note: '지나온 몇 해의 흐름이 눌려 있었습니다. 꼬였다고 느낀 것이 집보다 때에서 왔을 수 있습니다.',
  },
  both: {
    key: 'both',
    label: '둘이 겹친 결',
    note: '눌린 때를 지나는 동안 터에 감응하는 기운도 큽니다. 두 결이 겹쳐 더 무겁게 느껴졌을 수 있습니다.',
  },
} as const satisfies Record<string, ThemeVerdictLabel>

/** 이 판정이 나오면 화면은 결론 대신 고민상담으로 닫는다(기획서 ⑨ 「둘 다 아님」 경로). */
export const HOUSE_OR_TIMING_OPEN_ENDED_KEY = HOUSE_OR_TIMING_LABELS.neither.key

/**
 * 화면에 그려지는 판정표.
 * 🔴 좌상단(둘 다 «낮음»)이 「둘 다 아닌 결」이어야 한다 — 이 칸을 지우면 이 상품은 «무조건
 *    뭔가 나쁘다»가 되고, 그건 표시광고법 이전에 상품으로서 거짓이다(기획서 ⑥ 🔴 그대로).
 */
const HOUSE_OR_TIMING_MATRIX = {
  rowIndicatorKey: 'time_pressure',
  colIndicatorKey: 'place_resonance',
  rowLabels: ['때의 눌림 낮음', '때의 눌림 높음'],
  colLabels: ['터의 감응 낮음', '터의 감응 높음'],
  cells: [
    [HOUSE_OR_TIMING_LABELS.neither, HOUSE_OR_TIMING_LABELS.place],
    [HOUSE_OR_TIMING_LABELS.time, HOUSE_OR_TIMING_LABELS.both],
  ],
} as const satisfies ThemeVerdictMatrix

/** 「이사 후 1~3년」(기획서 ④ 타깃)이 곧 되짚기 창이다 — 지난 세 해 세운을 본다. */
const LOOKBACK_YEARS = 3

/**
 * rule-base 26룰 중 이 테마가 읽는 것 — 터·거처를 옮기며 사는 결의 두 룰.
 * (TAHYANG_03 「부모 떠남」은 부모 궁 서사라 이 화면과 무관하다.)
 */
const WATCHED_RULE_IDS = new Set(['TAHYANG_01', 'TAHYANG_02'])

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

/** 거처와 직결되는 두 궁 — 일지(앉은 자리)·월지(뿌리·기반). basis 에 이 이름이 그대로 실린다. */
const DWELLING_SEATS = new Set(['일지', '월지'])

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
 * 원국 안의 지지충 쌍 — 거처 궁(일지·월지)이 얽힌 것만 이 테마의 소재다.
 * 🔴 `JIJI_CHUNG` 은 상수 표 임포트이지 엔진 호출이 아니다. 표를 여기 다시 적으면 세 번째 사본이
 *    된다(기획서 §3-3 — 전승 표는 한 갈래·한 곳). `relations.chung` 라벨에는 궁 이름이 없어 되짚는다.
 */
function dwellingChungPairs(sajuData: SajuData): NatalChungPair[] {
  const seats = NATAL_SEATS.map((seat) => ({ label: seat.label, zhi: sajuData.pillars[seat.pillar].zhi }))
  const pairs: NatalChungPair[] = []
  for (let i = 0; i < seats.length; i += 1) {
    for (let j = i + 1; j < seats.length; j += 1) {
      if (JIJI_CHUNG[seats[i].zhi] !== seats[j].zhi) continue
      if (!DWELLING_SEATS.has(seats[i].label) && !DWELLING_SEATS.has(seats[j].label)) continue
      pairs.push({ left: seats[i].label, right: seats[j].label, ganji: `${seats[i].zhi}${seats[j].zhi}충` })
    }
  }
  return pairs
}

/** 한 해의 눌림 — 기신 쪽 / 지지충·형 / 흐름 막힘·주의. 점수와 함께 «무엇이» 눌렀는지를 남긴다. */
interface YearPressure {
  readonly year: number
  readonly ganji: string
  readonly sipseongRelation: string
  readonly points: number
  readonly notes: readonly string[]
}

function pressureOf(fortune: YearlyFortuneResult): YearPressure {
  let points = 0
  const notes: string[] = []

  if (fortune.yongsinAffinity === 'harmful') {
    points += 12
    notes.push('기신 쪽')
  }
  // 강한 부딪힘은 지지충·지지형까지다(woon-calculator 의 strongNegative 와 같은 눈) —
  // 천간충·파·해까지 세면 거의 모든 해가 «눌린 해»가 되어 판정이 항상 때를 탓하게 된다.
  const clash = fortune.interactions.find(
    (interaction) => interaction.type === '지지충' || interaction.type === '지지형'
  )
  if (clash) {
    points += 10
    notes.push(`${clash.pillarSource}와 ${clash.type}`)
  }
  if (fortune.totalTrend === 'poor') {
    points += 12
    notes.push('흐름 막힘')
  } else if (fortune.totalTrend === 'caution') {
    points += 7
    notes.push('흐름 주의')
  }

  return {
    year: fortune.year,
    ganji: fortune.yearPillar.ganji,
    sipseongRelation: fortune.sipseongRelation,
    points,
    notes,
  }
}

/** 「올해의 문」 — 세운 종합 흐름 + 용신 친화. 되짚기로 닫지 않고 여기서부터 어떻게 열리는지를 세운다. */
function gateScoreOf(fortune: YearlyFortuneResult | undefined): number {
  if (!fortune) return 50
  return clampScore(fortune.totalScore + AFFINITY_ADJUST[fortune.yongsinAffinity])
}

function chungOf(fortune: YearlyFortuneResult | undefined): PillarInteraction | undefined {
  if (!fortune) return undefined
  return (
    fortune.interactions.find((interaction) => interaction.type === '지지충') ??
    fortune.interactions.find((interaction) => interaction.type === '천간충')
  )
}

function buildTimings(baseYear: number, years: ReadonlyMap<number, YearlyFortuneResult>): ThemeTiming[] {
  const timings: ThemeTiming[] = []
  const window = [baseYear, baseYear + 1]

  // 기회 = 문이 «낮음»이 아닌 해의 열리는 달 — 문턱은 올해의 문 지표와 같은 눈금(bandOf)이다.
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

  // 되짚는 테마일수록 「그래서 언제 풀리나」가 비면 안 된다 — 두 해 다 낮으면 그나마 열린 쪽을
  // 남기되, 흐름이 낮다는 사실은 basis 가 그대로 말한다.
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

  // 주의 = 막히는 달. 충의 «달»은 세운 출력에 없으므로 근거 문장에만 싣는다.
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
 * 과거 역추산 근거 — 지난 세 해 중 가장 세게 눌린 해. 「그 무렵부터 꼬였다고 느끼셨을 것」의
 * 재료다. 🔴 문턱(20점)을 두는 이유: 충 하나만 있고 흐름이 좋았던 해까지 «눌린 해»로 되짚으면
 * 지어낸 과거가 된다 — 근거가 약하면 null 이 정직하다.
 */
function buildPastHint(pressures: readonly YearPressure[]): ThemeVerdict['pastHint'] {
  const worst = [...pressures]
    .filter((pressure) => pressure.points >= 20)
    .sort((a, b) => b.points - a.points || b.year - a.year)[0]
  if (!worst) return null

  return {
    period: `${worst.year}년`,
    basis: `${worst.year} 세운 ${worst.ganji}(${worst.sipseongRelation}) · ${worst.notes.join(' · ')}`,
  }
}

function judge(input: ThemeJudgeInput): ThemeVerdict {
  const { ctx, baseYear, rules } = input
  const { sinsal, relations } = ctx.analysis

  const years = new Map(input.yearly.map((year) => [year.year, year]))

  // ⓐ 때의 눌림 — 지난 세 해 세운의 기신·충형·막힘 합산. 이 축은 기준 연도를 따라 움직이는 것이
  //    설계다(«이사 온 뒤로 꼬였다»는 지금 시점의 질문이라, 해가 바뀌면 되짚는 창도 옮겨 간다).
  const lookback = [...years.values()]
    .filter((year) => year.year >= baseYear - LOOKBACK_YEARS && year.year < baseYear)
    .sort((a, b) => a.year - b.year)
  const pressures = lookback.map(pressureOf)
  const pressed = pressures.filter((pressure) => pressure.points > 0)
  const timeScore = clampScore(pressures.reduce((sum, pressure) => sum + pressure.points, 0))
  const timePressure: ThemeIndicator = {
    key: HOUSE_OR_TIMING_MATRIX.rowIndicatorKey,
    label: '때의 눌림',
    score: timeScore,
    band: bandOf(timeScore),
    basis:
      pressed.length > 0
        ? `${pressed.map((pressure) => `${pressure.year} ${pressure.ganji}(${pressure.notes.join('·')})`).join(' / ')} — 지난 세 해 중 ${pressed.length}해가 눌림`
        : `지난 세 해(${baseYear - LOOKBACK_YEARS}~${baseYear - 1}) 세운에 기신·충형·막힘 없음`,
  }

  // ⓑ 터의 감응 — 원국이 거처의 기운을 얼마나 크게 받는 결인가. 역마살(이거·이동)·거처 궁의
  //    충(앉은 자리 동요)·월지 공망(뿌리 빈 결)·귀문관살(터를 타는 예민함). 태어날 때 정해진
  //    값이라 해가 바뀌어도 같다. ⚠️ 지살은 엔진이 계산하지 않는다 — 역마살만 실값이다.
  const hasYeokma = sinsal.some((item) => item.name === '역마살')
  const hasGwimun = sinsal.some((item) => item.name === '귀문관살')
  const dwellingPairs = dwellingChungPairs(ctx.sajuData)
  const monthVoid = relations.gongmang.includes(ctx.sajuData.pillars.month.zhi)
  const placeScore = clampScore(
    (hasYeokma ? 22 : 0) + dwellingPairs.length * 18 + (monthVoid ? 14 : 0) + (hasGwimun ? 12 : 0)
  )
  const placeParts = [
    hasYeokma ? '역마살' : '',
    ...dwellingPairs.map((pair) => `${pair.left}-${pair.right} ${pair.ganji}`),
    monthVoid ? '월지 공망' : '',
    hasGwimun ? '귀문관살' : '',
  ].filter(Boolean)
  const placeResonance: ThemeIndicator = {
    key: HOUSE_OR_TIMING_MATRIX.colIndicatorKey,
    label: '터의 감응',
    score: placeScore,
    band: bandOf(placeScore),
    basis:
      placeParts.length > 0
        ? `${placeParts.join(' · ')} — 터에 감응하는 원국 소재`
        : '역마살·거처 궁 충·월지 공망·귀문관살 없음 — 터에 크게 감응하지 않는 원국',
  }

  // ⓒ 올해의 문 — 진단으로 닫지 않는다. 여기서부터 어떻게 열리는지가 이 화면의 마지막 문장이다.
  const thisYear = years.get(baseYear)
  const gateScore = gateScoreOf(thisYear)
  const gateChung = chungOf(thisYear)
  const yearGate: ThemeIndicator = {
    key: 'year_gate',
    label: '올해의 문',
    score: gateScore,
    band: bandOf(gateScore),
    basis: thisYear
      ? `${baseYear} 세운 ${thisYear.yearPillar.ganji}(${thisYear.sipseongRelation}) · 흐름 ${TREND_LABEL[thisYear.totalTrend]} · ${AFFINITY_LABEL[thisYear.yongsinAffinity]}${gateChung ? ` · ${gateChung.pillarSource}와 ${gateChung.type}` : ''}`
      : `${baseYear} 세운 계산 없음 — 원국만으로 판정`,
  }

  // 2×2 고정 매핑. 「높다」의 문턱은 밴드 경계와 같은 자리다 — 막대와 판정표가 한 눈금을 쓴다.
  const pressing = timePressure.band !== 'low'
  const resonating = placeResonance.band !== 'low'
  const verdictLabel = HOUSE_OR_TIMING_MATRIX.cells[pressing ? 1 : 0][resonating ? 1 : 0]

  return {
    themeId: HOUSE_OR_TIMING_ID,
    verdictLabel,
    matrix: HOUSE_OR_TIMING_MATRIX,
    indicators: [timePressure, placeResonance, yearGate],
    timings: buildTimings(baseYear, years),
    ruleHits: rules.strongMatches
      .filter((match) => WATCHED_RULE_IDS.has(match.rule.id))
      .map((match) => match.rule.name),
    pastHint: buildPastHint(pressures),
  }
}

export const houseOrTimingResolver: ThemeResolver = {
  themeId: HOUSE_OR_TIMING_ID,
  // -3~-1 은 「이사 후 1~3년」 되짚기(기획서 ④), 0·+1 은 올해의 문과 시기. 세운은 순수 수학이다.
  yearOffsets: [-3, -2, -1, 0, 1],
  judge,
  prompt: {
    // 기획서 §3-4 의 부동산 계열 기존 경로(trend_estate)가 코드에서 TREND_WEALTH 다
    // (`app/actions/ai/trend.ts` — estate → TREND_WEALTH). 새 타입을 만들지 않는다(마스터 §5-4).
    analysisType: 'TREND_WEALTH',
    question: '이사 온 뒤로 꼬였다고 느끼는 것이 집에서 온 것인지, 때에서 온 것인지.',
    rules: [
      'verdictLabel 을 뒤집지 마라. headline 은 그 라벨과 같은 방향이어야 한다.',
      '집 자체를 평하지 마라. 이 판정은 때의 흐름과 터에 감응하는 결을 본 것이지 그 집의 방위·구조를 본 것이 아니다 — 집을 실제로 보려면 사진과 방위가 필요하다고 밝혀라.',
      '「때가 눌렀던 결」이 나왔다면 지나온 몇 해가 왜 눌렸는지를 설명하고, 그 흐름이 지나가는 쪽도 함께 말하라.',
      '「둘 다 아닌 결」이 나왔다면 집과 때에서 원인을 찾지 말고, 답이 다른 곳에 있을 수 있다고 열어 두라.',
      '무섭게 말하지 마라. 눌린 자리는 「균형을 잃은 상태」로 말하고 곧바로 오늘 할 수 있는 처방을 붙여라.',
      '이사를 권하지 마라. 이사 없이, 큰돈 들이지 않고 바꿀 수 있는 것부터 말하라.',
    ],
    forbidden: [
      '「이 집에 살면 화를 입는다」류의 공포 조장',
      '「이사 가세요」·「이 집을 떠나세요」·「계약을 정리하세요」 같은 지시',
      '집값·시세·매매 시점·부동산 투자 판단',
      '전세사기·보증금·권리분석·안전 점검 같은 법률·안전 상담 어휘',
      '풍수 시공·인테리어 업체·개운 물품 구매 권유',
      '가족 중 누구 때문에 꼬였다는 서술',
    ],
  },
}
