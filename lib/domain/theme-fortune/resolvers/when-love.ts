/**
 * L3 「내 인연은 언제 오나」 — `when-love` 의 L2 판정.
 *
 * 설계 원본: `TEAM_G_DESIGN/prd/PLAN-theme-love-v1.md` §5 L3.
 *
 * ## 🔴 이 테마의 상품은 timings 다 — 「막연한 «곧» 말고, 달을 짚는다」
 * 그리고 그 달은 **코드가 확정한다**(§5 L3 ⓑ·§3-3). 현행 궁합 프롬프트가 «"내년 봄" 등
 * 구체적으로»라고 AI 에게 시켜서 모델이 매번 다른 달을 지어내던 경로를 여기서 끊는다 —
 * 달은 세운의 `keyOpportunityMonths`/`keyCautionMonths` 에서만 오고, AI 는 옮겨 적는다.
 *
 * ## 🔴 「온다」가 아니라 「열린다」(§5 L3-9 사건 예언 금지)
 * 「11월에 인연이 옵니다」는 검증 불가능한 예언이자 표시광고 위험이다. 판정이 확정하는 것은
 * 「그 달은 합(合)이 드는 달」이라는 역학 사실까지고, 프롬프트 규율이 그것을
 * **«약속을 잡아볼 만한 달»** — 행동하기 좋은 창 — 으로만 번역하게 한다.
 *
 * ## 연도 창은 3개년(올해·내년·내후년)
 * §5 L3 ⓐ가 명시한 창이다. ⚠️ §6 단가 표는 「세운 ×1개년」으로 적혀 있는데 이는 §5 와
 * 모순 — 설계 절(§5)이 정본이고, 세운은 순수 수학이라 몇 해를 돌려도 AI 호출이 늘지
 * 않으므로 단가 근거도 흔들리지 않는다(§6 마지막 단락이 스스로 그렇게 말한다).
 * 다만 시기 칸은 «기회 1~2 + 주의 1~2» 그릇이므로 세 해 전부가 아니라
 * **가장 가까운 창부터 둘까지만** 싣는다.
 */
import { normalizeElement } from '@/lib/domain/analysis/samhap-coherence'
import type { CategoryScore, PillarInteraction, YearlyFortuneResult } from '@/lib/saju-engine/woon-calculator'
import {
  bandOf,
  clampScore,
  type ThemeIndicator,
  type ThemeJudgeInput,
  type ThemeResolver,
  type ThemeTiming,
  type ThemeVerdict,
} from '../verdict-types'

export const WHEN_LOVE_ID = 'when-love'

/** 지표 3종의 키·라벨 — 테스트가 이 상수와 판정 출력을 대조한다. */
export const WHEN_LOVE_INDICATORS = [
  { key: 'yeon_seat', label: '인연의 자리' },
  { key: 'window_open', label: '열리는 창' },
  { key: 'turn_year', label: '결이 바뀌는 때' },
] as const

/**
 * 「여는 해」의 신호 3종 — §5 L3 ⓐ(배우자성 세운 진입·용신 친화) + ⓒ(일지와 세운의 합).
 * 이 셋 중 하나라도 있어야 그 해가 기회 시기로 실린다. 라벨은 근거 문장에 그대로 들어간다.
 */
export const WHEN_LOVE_WINDOW_SIGNS = {
  open: '연애운 열림',
  entry: '인연 별이 드는 해',
  dayHap: '세운이 배우자궁(일지)과 지지합',
} as const

const TREND_LABEL: Record<CategoryScore['trend'], string> = {
  excellent: '아주 좋음',
  good: '좋음',
  neutral: '보통',
  caution: '주의',
  poor: '막힘',
}

const AFFINITY_LABEL: Record<YearlyFortuneResult['yongsinAffinity'], string> = {
  beneficial: '용신과 맞음',
  neutral: '용신과 무관',
  harmful: '기신 쪽',
}

/** 세운의 흐름이 «열렸다»고 볼 수 있는 등급 — 직장·재물 세트와 같은 문턱을 쓴다. */
const OPEN_TRENDS: ReadonlyArray<CategoryScore['trend']> = ['excellent', 'good']

/** rule-base 중 이 테마가 읽는 것 — 정재·정관 동반(안정된 인연 자리)뿐이다.
 *  🔴 「만혼·불화」(DIVORCE_03)는 일부러 읽지 않는다 — 그 이름이 L3 로 흘러가면
 *     「늦었다」는 조바심 서술이 되고, 그건 이 테마의 forbidden 과 정면충돌한다. */
const WATCHED_RULE_IDS = new Set(['MARRIAGE_01'])

const LOVE_CATEGORY = '연애운'

function loveScore(year: YearlyFortuneResult | undefined): CategoryScore | undefined {
  return year?.categories.find((category) => category.category === LOVE_CATEGORY)
}

function chungOf(year: YearlyFortuneResult): PillarInteraction | undefined {
  const chungs = year.interactions.filter(
    (interaction) => interaction.type === '천간충' || interaction.type === '지지충'
  )
  return chungs.find((interaction) => interaction.pillarSource === '일주') ?? chungs[0]
}

/** §5 L3 ⓒ — 세운 지지가 배우자궁(일지)과 맺는 합. 해 단위 사실이고 달은 ⓑ가 확정한다. */
function hasDayBranchHap(year: YearlyFortuneResult): boolean {
  return year.interactions.some((interaction) => interaction.type === '지지합' && interaction.pillarSource === '일주')
}

interface YearSignals {
  readonly fortune: YearlyFortuneResult
  readonly open: boolean
  readonly entry: boolean
  readonly dayHap: boolean
}

function signalsOf(fortune: YearlyFortuneResult, spouseStars: readonly string[]): YearSignals {
  const love = loveScore(fortune)
  return {
    fortune,
    open: love ? OPEN_TRENDS.includes(love.trend) : false,
    entry: spouseStars.includes(fortune.sipseongRelation),
    dayHap: hasDayBranchHap(fortune),
  }
}

function judge(input: ThemeJudgeInput): ThemeVerdict {
  const { ctx, baseYear, rules } = input
  const { sipseong, sinsal, daeun, advancedYongsin, yongsin } = ctx.analysis
  const count = (name: string): number => sipseong.distribution[name] ?? 0
  const seats = sipseong.items.length

  const years = new Map(input.yearly.map((year) => [year.year, year]))
  const window = [baseYear, baseYear + 1, baseYear + 2]

  // 지표 1 — 인연의 자리(원국): 배우자성(남=재성/여=관성) + 도화살(사람이 다가오는 힘).
  // 🔴 태어난 순간에 정해진 값이라 기준 연도가 바뀌어도 흔들리지 않아야 한다.
  const isMale = ctx.personInfo.gender === 'male'
  const jeongName = isMale ? '정재' : '정관'
  const pyeonName = isMale ? '편재' : '편관'
  const spouseStars = [jeongName, pyeonName] as const
  const jeong = count(jeongName)
  const pyeon = count(pyeonName)
  const starTotal = jeong + pyeon
  const hasDohwa = sinsal.some((item) => item.name === '도화살')
  const hasCheoneul = sinsal.some((item) => item.name === '천을귀인')
  const seatScore = clampScore(starTotal * 22 + jeong * 8 + (hasDohwa ? 12 : 0) + (hasCheoneul ? 6 : 0))
  const starParts = [jeong > 0 ? `${jeongName} ${jeong}` : '', pyeon > 0 ? `${pyeonName} ${pyeon}` : ''].filter(Boolean)
  const yeonSeat: ThemeIndicator = {
    key: WHEN_LOVE_INDICATORS[0].key,
    label: WHEN_LOVE_INDICATORS[0].label,
    score: seatScore,
    band: bandOf(seatScore),
    basis: `${starParts.length > 0 ? starParts.join(' · ') : '배우자성 없음'} — 자리 ${seats}곳 중 ${starTotal}곳${hasDohwa ? ' · 도화살' : ''}${hasCheoneul ? ' · 천을귀인' : ''}`,
  }

  // 지표 2 — 열리는 창: 세 해에 신호 3종(연애운 열림·배우자성 진입·일지 합)이 몇 번 드는가.
  const signals = window
    .map((year) => years.get(year))
    .filter((fortune): fortune is YearlyFortuneResult => fortune !== undefined)
    .map((fortune) => signalsOf(fortune, spouseStars))
  const windowScore = clampScore(
    signals.reduce((sum, signal) => sum + (signal.open ? 22 : 0) + (signal.entry ? 12 : 0) + (signal.dayHap ? 8 : 0), 0)
  )
  const signalParts = signals
    .filter((signal) => signal.open || signal.entry || signal.dayHap)
    .map((signal) => {
      const love = loveScore(signal.fortune)
      const parts = [
        signal.open ? `연애운 ${TREND_LABEL[love?.trend ?? 'neutral']}` : '',
        signal.entry ? `${WHEN_LOVE_WINDOW_SIGNS.entry}(${signal.fortune.sipseongRelation})` : '',
        signal.dayHap ? WHEN_LOVE_WINDOW_SIGNS.dayHap : '',
      ].filter(Boolean)
      return `${signal.fortune.year} ${parts.join('·')}`
    })
  const windowOpen: ThemeIndicator = {
    key: WHEN_LOVE_INDICATORS[1].key,
    label: WHEN_LOVE_INDICATORS[1].label,
    score: windowScore,
    band: bandOf(windowScore),
    basis:
      signalParts.length > 0
        ? signalParts.join(' / ')
        : `${baseYear}~${baseYear + 2} 세 해에 열림·인연 별·배우자궁 합 신호 없음`,
  }

  // 지표 3 — 결이 바뀌는 때(§5 L3 ⓓ): 다음 대운 전환이 얼마나 가까운가. 3개년 창 안에
  // 들면 「곧」이고, 멀수록 낮아진다. 다음 대운 오행이 용신/기신 쪽이면 소폭 가감.
  const birthYear = Number(ctx.personInfo.birthDate.split('-')[0])
  const next = daeun.find((entry) => birthYear + entry.age > baseYear)
  const yongsinElement = normalizeElement(advancedYongsin?.finalYongsin ?? yongsin?.yongsin ?? null)
  const gisinElement = normalizeElement(advancedYongsin?.gisin ?? yongsin?.gisin ?? null)
  let turnScore = 12
  let turnBasis = '대운 전환 계산 없음 — 원국·세운만으로 짚음'
  if (next) {
    const transitionYear = birthYear + next.age
    const distance = transitionYear - baseYear
    const nextElement = normalizeElement(next.element)
    const affinityBonus =
      nextElement && nextElement === yongsinElement ? 12 : nextElement && nextElement === gisinElement ? -12 : 0
    turnScore = clampScore((distance <= 2 ? 70 : 72 - distance * 6) + affinityBonus)
    turnBasis = `대운 교체 ${transitionYear}년(${next.age}세 무렵) — ${next.ganji}(${next.element})${
      nextElement && nextElement === yongsinElement
        ? ' · 용신 쪽'
        : nextElement && nextElement === gisinElement
          ? ' · 기신 쪽'
          : ''
    }`
  }
  const turnYear: ThemeIndicator = {
    key: WHEN_LOVE_INDICATORS[2].key,
    label: WHEN_LOVE_INDICATORS[2].label,
    score: turnScore,
    band: bandOf(turnScore),
    basis: turnBasis,
  }

  // ── 시기 — 이 테마의 상품 ──────────────────────────────────────────────
  // 기회 = 신호가 든 해의 열리는 달, 가장 가까운 창부터 둘까지(§5 L3 ⓑ·ⓒ).
  const timings: ThemeTiming[] = []
  const openYears = signals.filter((signal) => signal.open || signal.entry || signal.dayHap)
  for (const signal of openYears.slice(0, 2)) {
    const { fortune } = signal
    if (fortune.keyOpportunityMonths.length === 0) continue
    const love = loveScore(fortune)
    const extras = [
      signal.entry ? ` · 세운 십성 ${fortune.sipseongRelation} — ${WHEN_LOVE_WINDOW_SIGNS.entry}` : '',
      signal.dayHap ? ` · ${WHEN_LOVE_WINDOW_SIGNS.dayHap}` : '',
    ].join('')
    timings.push({
      kind: 'opportunity',
      year: fortune.year,
      months: [...fortune.keyOpportunityMonths],
      basis: `${fortune.year} 세운 ${fortune.yearPillar.ganji} · 연애운 ${TREND_LABEL[love?.trend ?? 'neutral']} · ${AFFINITY_LABEL[fortune.yongsinAffinity]}${extras}`,
    })
  }

  // 세 해 모두 신호가 없으면 — 「창이 없다」로 화면을 닫지 않는다. 흐름이 그나마 나은 해의
  // 열리는 달을 근거 문장에 그 사실을 적은 채로 싣는다(막혔다고만 말하지 않는다).
  if (timings.length === 0) {
    const fallback = [...signals].sort(
      (a, b) =>
        (loveScore(b.fortune)?.score ?? 0) - (loveScore(a.fortune)?.score ?? 0) || a.fortune.year - b.fortune.year
    )[0]
    if (fallback && fallback.fortune.keyOpportunityMonths.length > 0) {
      const love = loveScore(fallback.fortune)
      timings.push({
        kind: 'opportunity',
        year: fallback.fortune.year,
        months: [...fallback.fortune.keyOpportunityMonths],
        basis: `${fallback.fortune.year} 세운 ${fallback.fortune.yearPillar.ganji} · 연애운 ${TREND_LABEL[love?.trend ?? 'neutral']} — 세 해 중 흐름이 나은 쪽`,
      })
    }
  }

  // 주의 = 충이 드는 달. 가까운 두 해만 — 겁주는 달력이 아니라 피해 갈 달 표시다.
  for (const year of window.slice(0, 2)) {
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

  return {
    themeId: WHEN_LOVE_ID,
    // 양자택일이 아니다 — 이 테마의 답은 칸이 아니라 달이 실린 timings 다.
    verdictLabel: null,
    indicators: [yeonSeat, windowOpen, turnYear],
    timings,
    ruleHits: rules.strongMatches
      .filter((match) => WATCHED_RULE_IDS.has(match.rule.id))
      .map((match) => match.rule.name),
    // 과거 역추산은 이 테마 설계에 없다(§5 L3) — 없는 과거를 지어내지 않는다.
    pastHint: null,
  }
}

export const whenLoveResolver: ThemeResolver = {
  themeId: WHEN_LOVE_ID,
  // 올해·내년·내후년(§5 L3 ⓐ). 세운은 순수 수학이라 AI 호출이 늘지 않는다(§6).
  yearOffsets: [0, 1, 2],
  judge,
  prompt: {
    analysisType: 'TREND_LOVE',
    question: '인연의 흐름이 열리는 달이 언제인지, 그때까지 무엇을 해두면 좋은지.',
    rules: [
      '「이 달에 인연이 옵니다」라고 쓰지 마라. 열리는 달은 사람이 모이고 마음이 열리는 결 — 약속을 잡아볼 만한 달 — 로만 서술하라.',
      '달과 해는 판정의 timings 에 실린 것만 쓰라. 새 달·새 해를 만들지 마라.',
      '만남의 사건·장소·인물을 예언하지 마라. 흐름이 열리는 창과 그때 해볼 행동까지만 말하라.',
      '창이 멀어도 기다리라고 닫지 마라. 지금 할 수 있는 준비를 함께 서술하라.',
      '인연의 자리가 낮게 나온 것을 인연이 없다로 읽지 마라. 자리의 틀이 옅다는 뜻으로만 서술하라.',
      'actions 는 열리는 달에 혼자 정해 해볼 수 있는 생활 행동으로 쓰라(모임에 나가기·연락처 정리처럼).',
    ],
    forbidden: [
      '「N월에 인연이 옵니다」식 사건 예언',
      '결혼·출산 시기의 단정',
      '운명의 상대·천생연분·인연 보장 같은 어휘',
      '「인연이 없는 사주」류 단정',
      '특정 인물의 마음·행동을 단정하는 서술(상대의 정보를 받지 않았다)',
      '이별·재회를 지시하는 서술',
      '나이를 이유로 늦었다고 조바심을 주는 서술',
      '설문·통계 수치 인용',
    ],
  },
}
