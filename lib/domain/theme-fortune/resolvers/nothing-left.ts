/**
 * W-1 「버는 만큼 남지 않는 이유」 — `nothing-left` 의 L2 판정.
 *
 * 설계 원본: `TEAM_G_DESIGN/prd/PLAN-theme-career-wealth-v1.md` §5 W-1.
 *
 * ## 🔴 시기의 비대칭이 이 테마의 법적 방어다 (§3-2)
 * `timings` 는 **주의(caution)만** 낸다 — 「지출이 몰리는 달」. 기회(opportunity) 엔트리는
 * 어떤 입력에서도 만들지 않는다. 「이 달은 지출이 몰린다」는 소비자 보호 방향이지만
 * 「이 달에 넣으라」는 매수 시점 권유 방향이다 — **자리를 만들지 않으면 AI 가 쓸 수 없다**
 * (마스터 §9-4). 본보기(leave-or-stay)의 「기회 칸이 비지 않는다」 계약이 이 테마에서는
 * 정확히 반대로 뒤집혀 「기회 칸이 항상 빈다」로 고정된다(테스트가 지킨다).
 *
 * ## 🔴 「모이는 결」 칸이 이 테마의 양심이다
 * 판정 4택의 마지막 칸 「모이는 결 — 새는 데는 다른 곳」이 없으면 모든 사람에게 「당신은 돈이
 * 샌다」고 말하는 상품이 된다 — 그건 표시광고법 이전에 거짓이다(§5 W-1). 이 칸이 나오면 화면은
 * 결론 대신 고민상담으로 닫는다(openEnded).
 *
 * ## 식상생재(食傷生財) — 새 이론이 아니라 두 기존 값의 조합 (§1-5)
 * 오행 상생 사슬에서 식상의 오행은 **정의상 언제나** 재성의 오행을 생한다(일간이 생하는 것이
 * 식상, 일간이 극하는 것이 재성 — 木생火생土·木극土). 그래서 「식상생재 성립」의 실체는
 * 사슬 자체가 아니라 **두 자리가 실제로 채워져 있는가**다: 식상도 재성도 원국에 있어야
 * 버는 힘이 재물로 이어지는 통로가 «이 명식에서» 연결된다.
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

export const NOTHING_LEFT_ID = 'nothing-left'

/**
 * 판정 4택 — 앞 두 지표(버는 통로 × 새는 자리) 밴드의 **2×2 고정 매핑**(§5 W-1).
 * 표를 고치면 「같은 사주에 다른 답」이 되므로 테스트가 네 칸을 고정한다.
 */
export const NOTHING_LEFT_LABELS = {
  broken: {
    key: 'broken',
    label: '통로부터 끊긴 결',
    note: '크게 새는 자리보다, 버는 기운과 담는 그릇 사이의 통로가 먼저 눈에 띕니다. 새는 것을 막는 일보다 통로가 이어지는 자리를 보는 쪽이 먼저인 결입니다.',
  },
  passthrough: {
    key: 'passthrough',
    label: '들어오는 대로 나가는 결',
    note: '들어오는 통로는 가늘고 함께 나가는 자리는 큽니다. 돈이 머무는 시간이 짧은 구조라, 액수보다 머무는 자리가 먼저 보이는 결입니다.',
  },
  gathering: {
    key: 'gathering',
    label: '모이는 결 — 새는 데는 다른 곳',
    note: '통로도 이어져 있고 크게 새는 자리도 보이지 않습니다. 지금 남지 않는 느낌이 있다면, 그 이유가 사주의 돈 구조 밖에 있을 수 있습니다.',
    // 🔴 이 테마의 양심 — 이 칸이 나오면 화면은 결론 대신 고민상담으로 닫는다(§5 W-1).
    openEnded: true,
  },
  leaking: {
    key: 'leaking',
    label: '통로는 이어졌는데 새는 결',
    note: '버는 통로는 이어져 있는데, 함께 쓰는 자리에서 나가는 힘이 큽니다. 버는 힘의 문제가 아니라 새는 자리의 구조가 먼저인 결입니다.',
  },
} as const satisfies Record<string, ThemeVerdictLabel>

/** 이 판정이 나오면 화면은 결론 대신 고민상담으로 닫는다(§5 W-1). */
export const NOTHING_LEFT_OPEN_ENDED_KEY = NOTHING_LEFT_LABELS.gathering.key

/**
 * 화면에 그려지는 판정표.
 * 🔴 [통로 이어짐 × 새는 자리 잠잠함] 칸이 양심 칸이다 — 통로가 멀쩡하고 새지도 않는 사람에게는
 *    「이유가 다른 곳에 있을 수 있다」고 말해야 한다. 칸을 지우면 이 상품은 늘 돈 구조에서
 *    원인을 찾게 된다.
 */
const NOTHING_LEFT_MATRIX = {
  rowIndicatorKey: 'earn_channel',
  colIndicatorKey: 'leak',
  rowLabels: ['버는 통로 약함', '버는 통로 이어짐'],
  colLabels: ['새는 자리 잠잠함', '새는 자리 큼'],
  cells: [
    [NOTHING_LEFT_LABELS.broken, NOTHING_LEFT_LABELS.passthrough],
    [NOTHING_LEFT_LABELS.gathering, NOTHING_LEFT_LABELS.leaking],
  ],
} as const satisfies ThemeVerdictMatrix

/**
 * rule-base 26룰 중 이 테마가 읽는 것(§5 W-1 ⓓ).
 * `WEALTH_RUIN_02`(재물 산란)는 재성 궁 공망 + 비겁 과다를 **엔진이 이미 묶어 판정**하므로,
 * 공망을 여기서 다시 계산하지 않고 룰 히트로 읽는다 — 같은 판정을 두 곳에 적지 않는다.
 */
const WATCHED_RULE_IDS = new Set(['WEALTH_RUIN_01', 'WEALTH_RUIN_02'])

/** 신강약이 재성을 쥐는 힘의 밑값 — 신약재다(身弱財多)는 «들어와도 무거운» 구조다(§5 W-1 ⓔ). */
const HOLD_BASE: Record<'신강' | '신약' | '중화', number> = { 신강: 72, 중화: 56, 신약: 40 }
const HOLD_DRAG: Record<'신강' | '신약' | '중화', number> = { 신강: 4, 중화: 8, 신약: 12 }

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

function wealthScore(year: YearlyFortuneResult | undefined): CategoryScore | undefined {
  return year?.categories.find((category) => category.category === '재물운')
}

function chungOf(year: YearlyFortuneResult): PillarInteraction | undefined {
  return year.interactions.find((interaction) => interaction.type === '천간충' || interaction.type === '지지충')
}

function seatPhrase(total: number, hit: number): string {
  return `자리 ${total}곳 중 ${hit}곳`
}

/**
 * 시기 — 🔴 **주의만 낸다.** 올해의 `keyCautionMonths` 를 「지출이 몰리는 달」로만 쓴다.
 * 기회 분기는 이 함수에 존재하지 않는다 — 코드에 없는 분기는 어떤 프롬프트로도 살아나지 않는다.
 * 충이 일어나는 «달»은 세운 출력에 없으므로(해 단위 판정) 지어내지 않고 근거 문장에만 싣는다.
 */
function buildTimings(baseYear: number, years: ReadonlyMap<number, YearlyFortuneResult>): ThemeTiming[] {
  const fortune = years.get(baseYear)
  if (!fortune || fortune.keyCautionMonths.length === 0) return []

  const wealth = wealthScore(fortune)
  const chung = chungOf(fortune)

  return [
    {
      kind: 'caution',
      year: baseYear,
      months: [...fortune.keyCautionMonths],
      basis: chung
        ? `${baseYear} 세운 ${fortune.yearPillar.ganji}가 ${chung.pillarSource}와 ${chung.type} · 재물운 ${TREND_LABEL[wealth?.trend ?? 'neutral']} — 지출이 몰리는 달`
        : `${baseYear} 세운 ${fortune.yearPillar.ganji} · 재물운 ${TREND_LABEL[wealth?.trend ?? 'neutral']} · ${AFFINITY_LABEL[fortune.yongsinAffinity]} — 지출이 몰리는 달`,
    },
  ]
}

/**
 * 과거 역추산 근거 — 「직전 세운이 편재이면서 기신 쪽이었던 해」(§5 W-1: 그 무렵 예상 밖의
 * 큰 지출이 있었을 것). 문장은 L3 가 쓴다. 근거가 없으면 **null** — 없는 과거를 지어내지 않는다.
 */
function buildPastHint(baseYear: number, years: ReadonlyMap<number, YearlyFortuneResult>): ThemeVerdict['pastHint'] {
  const last = years.get(baseYear - 1)
  if (!last || !last.sipseongRelation.includes('편재') || last.yongsinAffinity !== 'harmful') return null

  return {
    period: `${last.year}년`,
    basis: `${last.year} 세운 ${last.yearPillar.ganji}(${last.sipseongRelation})가 ${AFFINITY_LABEL.harmful}`,
  }
}

function judge(input: ThemeJudgeInput): ThemeVerdict {
  const { ctx, baseYear, rules } = input
  const { sipseong } = ctx.analysis
  const count = (name: string): number => sipseong.distribution[name] ?? 0
  const seats = sipseong.items.length

  const years = new Map(input.yearly.map((year) => [year.year, year]))

  const siksang = count('식신') + count('상관')
  const jeongjae = count('정재')
  const pyeonjae = count('편재')
  const jaeseong = jeongjae + pyeonjae

  // ⓐ+ⓑ 버는 통로 — 식상생재의 실체는 «두 자리가 다 채워져 있는가»다(파일 머리 주석).
  //    재성이 없으면 담을 그릇이, 식상이 없으면 생조가 끊긴 반쪽 통로다 — 둘 다 «낮음»에 둔다.
  const chained = siksang > 0 && jaeseong > 0
  const channelScore = clampScore(
    chained
      ? 46 + Math.min(siksang, jaeseong) * 12 + (jeongjae > 0 ? 6 : 0)
      : jaeseong === 0
        ? siksang * 10
        : 12 + jaeseong * 4
  )
  const channelBasis = chained
    ? `식상 ${siksang} → 재성 ${jaeseong}(정재 ${jeongjae} · 편재 ${pyeonjae}) — 통로 이어짐`
    : jaeseong === 0
      ? `재성 없음 · 식상 ${siksang} — 담을 그릇이 겉에 없음`
      : `식상 없음 · 재성 ${jaeseong} — 생조가 끊긴 통로`
  const earnChannel: ThemeIndicator = {
    key: 'earn_channel',
    label: '버는 통로',
    score: channelScore,
    band: bandOf(channelScore),
    basis: channelBasis,
  }

  // ⓒ+ⓓ 새는 자리 — 비겁(비견·겁재)의 탈재 구조. 겁재는 같은 한 자리라도 재를 더 세게 가른다.
  //    공망·신약 교차는 WEALTH_RUIN 룰 히트가 이미 판정해 두었다 — 히트 수로 가산한다.
  const bigyeon = count('비견')
  const geopjae = count('겁재')
  const bigeop = bigyeon + geopjae
  const ruinHits = rules.strongMatches.filter((match) => WATCHED_RULE_IDS.has(match.rule.id))
  const leakScore = clampScore(bigeop * 16 + geopjae * 8 + ruinHits.length * 14)
  const leakParts = [geopjae > 0 ? `겁재 ${geopjae}` : '', bigyeon > 0 ? `비견 ${bigyeon}` : ''].filter(Boolean)
  const leak: ThemeIndicator = {
    key: 'leak',
    label: '새는 자리',
    score: leakScore,
    band: bandOf(leakScore),
    basis: `${leakParts.length > 0 ? leakParts.join(' · ') : '비겁 없음'} — ${seatPhrase(seats, bigeop)}${ruinHits.length > 0 ? ` · ${ruinHits.map((match) => match.rule.name).join(' · ')}` : ''}`,
  }

  // ⓔ 쥐는 힘 — 신강약 대비 재성 총량. 신약인데 재성이 많으면 들어와도 무겁다.
  const holdScore = clampScore(
    HOLD_BASE[sipseong.strengthAssessment] - jaeseong * HOLD_DRAG[sipseong.strengthAssessment]
  )
  const hold: ThemeIndicator = {
    key: 'hold',
    label: '쥐는 힘',
    score: holdScore,
    band: bandOf(holdScore),
    basis: `${sipseong.strengthAssessment} · ${jaeseong > 0 ? `재성 ${jaeseong}(정재 ${jeongjae} · 편재 ${pyeonjae})` : '재성 없음'}`,
  }

  // 2×2 고정 매핑 — 「높다」의 문턱은 밴드 경계와 같은 자리(본보기와 동일 규약).
  const channelOpen = earnChannel.band !== 'low'
  const leaking = leak.band !== 'low'
  const verdictLabel = NOTHING_LEFT_MATRIX.cells[channelOpen ? 1 : 0][leaking ? 1 : 0]

  return {
    themeId: NOTHING_LEFT_ID,
    verdictLabel,
    matrix: NOTHING_LEFT_MATRIX,
    indicators: [earnChannel, leak, hold],
    timings: buildTimings(baseYear, years),
    ruleHits: ruinHits.map((match) => match.rule.name),
    pastHint: buildPastHint(baseYear, years),
  }
}

export const nothingLeftResolver: ThemeResolver = {
  themeId: NOTHING_LEFT_ID,
  // 0=올해(지출이 몰리는 달·재물운), -1=직전 세운(되짚기 근거). §6 단가표는 «세운 1개년»이라
  // 적었지만 §5 W-1 의 pastHint(직전 세운 편재+기신)가 작년 세운을 요구한다 — 세운은 순수
  // 수학이라 AI 호출이 늘지 않으므로(§6 규칙) 단가에는 영향이 없다.
  yearOffsets: [-1, 0],
  judge,
  prompt: {
    analysisType: 'WEALTH_DEEP',
    question: '버는 힘이 모자란 것이 아니라, 번 것이 어느 자리에서 새는지.',
    rules: [
      '덜 쓰라고 훈계하지 마라. 돈이 어느 자리에서 머물고 새는지 명식의 구조로만 설명하라.',
      'verdictLabel 을 뒤집지 마라. headline 은 그 라벨과 같은 방향이어야 한다.',
      '시기는 「지출이 몰리는 달」로만 말하라. 돈을 넣기 좋은 달이나 때를 만들어 내지 마라.',
      '「모이는 결」이 나왔다면 새는 자리를 억지로 찾지 말고, 이유가 돈의 구조 밖에 있을 수 있다고 열어 두라.',
      '새는 자리를 게으름이나 무지 같은 사람 탓으로 돌리지 마라. 명식의 구조로만 설명하라.',
      'actions 는 자리의 구조를 바꾸는 일(계좌 나누기·정산 주기·함께 쓰는 돈의 경계)로 쓰라. 저축액이나 목표 금액을 정해 주지 마라.',
    ],
    forbidden: [
      '특정 금융상품·종목·자산군·플랫폼의 이름',
      '매수·매도·투자 시점, 「이 달에 넣으라」류 권유',
      '수익률·확률·목표 금액·저축액 제시',
      '소비 습관 진단·절약 훈계, 쇼핑중독·도박중독 같은 의료 어휘',
      '가난·낭비를 개인의 탓으로 돌리는 서술',
      '설문·통계 수치 인용',
    ],
  },
}
