/**
 * W-2 「돈 앞에서 나는 어떤 사람인가」 — `money-self` 의 L2 판정. ★무료 미끼(wealth)
 *
 * 설계 원본: `TEAM_G_DESIGN/prd/PLAN-theme-career-wealth-v1.md` §5 W-2.
 *
 * ## 🔴 `timings: []` 가 이 테마의 존재 이유다 (§3-2)
 * 이 테마는 기존 재물 분석의 `investmentTiming`(bestMonth·매수 시점)을 **성향형으로 대체**한
 * 자리다(§1-3·마스터 §12-5). 그래서 시기 축이 구조적으로 없다 — `timings` 는 **어떤 입력에서도
 * 빈 배열**이고, 자리가 없으므로 AI 는 「이 달에 넣으라」를 쓸 수 없다(마스터 §9-4).
 * 판정 전체가 원국만으로 서므로 기준 연도가 바뀌어도 같은 답이 나온다(테스트가 고정한다).
 * `yearOffsets` 의 `[0]` 은 레지스트리 계약(«올해» 필수)의 선언일 뿐 judge 는 세운을 읽지 않는다.
 *
 * ## 🔴 네 결 모두 강점 서술을 갖는다 — 어느 결도 열등하지 않다 (§5 W-2)
 * 편재 우세를 «투기»로 번역하는 순간 이 상품은 낙인을 판다. 엔진의 `traditionalView`(투기·불안정)
 * 가 아니라 `modernPower`(큰 그림을 보는 안목)의 결을 정본으로 쓰고, 라벨 note 네 개가 전부
 * 「~이 이 결의 강점입니다」로 닫힌다(테스트가 네 문장의 «강점»을 고정한다).
 *
 * ## 지표 순서 — 기획서 표와 다르다 (보고됨)
 * 기획서 L2 표는 쌓는·굴리는 / 흔들림 / 속도 순이지만, 4결 라벨의 두 축은 의미상
 * **쌓는·굴리는 × 결정의 속도**다(쌓아서-지키는/굴려서-키우는 = 재성 축, 빨리-정하고/늦게-정하고
 * = 속도 축). 판정표의 축은 `indicators[0]/[1]` 이어야 한다는 공통 계약에 맞춰 속도를 두 번째로
 * 올렸다 — 화면의 막대와 표가 같은 눈금을 쓰기 위함이다.
 */
import {
  bandOf,
  clampScore,
  type ThemeIndicator,
  type ThemeJudgeInput,
  type ThemeResolver,
  type ThemeVerdict,
  type ThemeVerdictLabel,
  type ThemeVerdictMatrix,
} from '../verdict-types'

export const MONEY_SELF_ID = 'money-self'

/**
 * 판정 4결 — 앞 두 지표(쌓는·굴리는 × 결정의 속도) 밴드의 **2×2 고정 매핑**(§5 W-2, 연애 L1의
 * 4결 패턴 승계). 대각선(두 축이 같은 말을 하는 칸)은 재성의 결로, 반대각선(두 축이 어긋나는
 * 칸)은 속도의 결로 이름 붙는다. 🔴 네 결 모두 강점을 갖는다 — 우열 없는 «다름»의 표다.
 */
export const MONEY_SELF_LABELS = {
  steady_keep: {
    key: 'steady_keep',
    label: '쌓아서 지키는 결',
    note: '한 번 들어온 것을 오래 쥐고, 서두르지 않는 결입니다. 큰 파도를 타지 않아도 바닥이 단단해지는 것이 이 결의 강점입니다.',
  },
  quick_short: {
    key: 'quick_short',
    label: '빨리 정하고 오래 못 보는 결',
    note: '마음이 정해지는 속도가 빠르고, 정한 뒤에는 길게 붙들지 않는 결입니다. 문이 짧게 열릴 때 먼저 움직이는 것이 이 결의 강점입니다.',
  },
  slow_long: {
    key: 'slow_long',
    label: '늦게 정하고 오래 보는 결',
    note: '판을 굴리는 쪽에 마음이 기울되, 정하기까지는 오래 재는 결입니다. 큰 그림을 끝까지 지켜보는 눈이 이 결의 강점입니다.',
  },
  roll_grow: {
    key: 'roll_grow',
    label: '굴려서 키우는 결',
    note: '들어온 것을 굴려 판을 키우는 쪽으로 손이 가는 결입니다. 흐름을 읽고 움직이는 폭이 큰 것이 이 결의 강점입니다.',
  },
} as const satisfies Record<string, ThemeVerdictLabel>

/**
 * 화면에 그려지는 판정표. openEnded 칸이 없다 — 기획서가 이 테마에 양심 칸을 두지 않았다.
 * 네 결이 전부 대등한 성향이라 「그 문제가 아닐 수 있다」로 빠질 자리 자체가 없는 구조다.
 */
const MONEY_SELF_MATRIX = {
  rowIndicatorKey: 'steady_vs_swing',
  colIndicatorKey: 'decide_speed',
  rowLabels: ['쌓는 쪽', '굴리는 쪽'],
  colLabels: ['오래 보는 쪽', '빨리 정하는 쪽'],
  cells: [
    [MONEY_SELF_LABELS.steady_keep, MONEY_SELF_LABELS.quick_short],
    [MONEY_SELF_LABELS.slow_long, MONEY_SELF_LABELS.roll_grow],
  ],
} as const satisfies ThemeVerdictMatrix

/**
 * rule-base 26룰 중 이 테마가 읽는 것(§5 W-2 ⓔ·ⓕ) — 경고 축 둘 + 버티는 축 하나.
 * 🔴 `WEALTH_RUIN_01` 의 엔진 원문 actionItem(「절대로 타인의 보증을…」)은 강한 금융 조언이라
 *    화면에 직접 노출하지 않는다 — 완화 번역은 프롬프트 규율이 강제한다(§5 W-2 ⑨).
 */
const WATCHED_RULE_IDS = new Set(['WEALTH_RUIN_01', 'WEALTH_RUIN_03', 'BENEFACTOR_03'])

/** 신강약이 흔들림을 받아내는 밑값 — 같은 편관(압박)도 신약이면 안으로 더 깊이 들어온다. */
const NERVE_BASE: Record<'신강' | '신약' | '중화', number> = { 신강: 72, 중화: 52, 신약: 34 }
const NERVE_DRAG: Record<'신강' | '신약' | '중화', number> = { 신강: 4, 중화: 7, 신약: 10 }

function seatPhrase(total: number, hit: number): string {
  return `자리 ${total}곳 중 ${hit}곳`
}

function judge(input: ThemeJudgeInput): ThemeVerdict {
  const { ctx, rules } = input
  const { sipseong, sibjiunseong, sinsal } = ctx.analysis
  const count = (name: string): number => sipseong.distribution[name] ?? 0
  const seats = sipseong.items.length

  // ⓐ+ⓓ 쌓는 결·굴리는 결 — 정재:편재의 기울기 + 밖으로 도는가(역마) 안으로 도는가(화개).
  //    기준점을 30(낮음 쪽)에 둔 것은 의도다: «굴리는 쪽» 판정은 편재 우세라는 적극적 증거가
  //    있을 때만 내린다 — 증거 없이 굴리는 성향을 붙이는 것 자체가 §3-2 가 막는 방향이다.
  const jeongjae = count('정재')
  const pyeonjae = count('편재')
  const hasYeokma = sinsal.some((item) => item.name === '역마살')
  const hasHwagae = sinsal.some((item) => item.name === '화개살')
  const swingScore = clampScore(30 + (pyeonjae - jeongjae) * 18 + (hasYeokma ? 6 : 0) - (hasHwagae ? 6 : 0))
  const jaeParts = [jeongjae > 0 ? `정재 ${jeongjae}` : '', pyeonjae > 0 ? `편재 ${pyeonjae}` : ''].filter(Boolean)
  const sinsalTail = [hasYeokma ? '역마살' : '', hasHwagae ? '화개살' : ''].filter(Boolean)
  const steadyVsSwing: ThemeIndicator = {
    key: 'steady_vs_swing',
    label: '쌓는 결·굴리는 결',
    score: swingScore,
    band: bandOf(swingScore),
    basis: `${jaeParts.length > 0 ? jaeParts.join(' · ') : '겉에 드러난 재성 없음'} — ${seatPhrase(seats, jeongjae + pyeonjae)}${sinsalTail.length > 0 ? ` · ${sinsalTail.join(' · ')}` : ''}`,
  }

  // ⓒ 결정의 속도 — 십이운성 파동(평균 기운)과 식상(내놓는 손). 둘 다 원국 값이다.
  const siksin = count('식신')
  const sanggwan = count('상관')
  const energyAdjust = sibjiunseong.overallEnergy === '왕성' ? 8 : sibjiunseong.overallEnergy === '쇠약' ? -8 : 0
  const speedScore = clampScore(sibjiunseong.averageLevel * 5 + (siksin + sanggwan) * 10 + sanggwan * 4 + energyAdjust)
  const siksangParts = [sanggwan > 0 ? `상관 ${sanggwan}` : '', siksin > 0 ? `식신 ${siksin}` : ''].filter(Boolean)
  const decideSpeed: ThemeIndicator = {
    key: 'decide_speed',
    label: '결정의 속도',
    score: speedScore,
    band: bandOf(speedScore),
    basis: `평균 기운 ${sibjiunseong.averageLevel.toFixed(1)}/12(${sibjiunseong.overallEnergy}) · ${siksangParts.length > 0 ? siksangParts.join(' · ') : '식상 없음'}`,
  }

  // ⓑ 흔들림을 견디는 결 — 신강약 대비 편관(칠살)의 압박.
  const pyeongwan = count('편관')
  const nerveScore = clampScore(
    NERVE_BASE[sipseong.strengthAssessment] - pyeongwan * NERVE_DRAG[sipseong.strengthAssessment]
  )
  const nerve: ThemeIndicator = {
    key: 'nerve',
    label: '흔들림을 견디는 결',
    score: nerveScore,
    band: bandOf(nerveScore),
    basis: `${sipseong.strengthAssessment}(중심 힘 ${sipseong.bodyStrengthScore}%) · ${pyeongwan > 0 ? `편관 ${pyeongwan}` : '편관 없음'}`,
  }

  // 2×2 고정 매핑 — 「높다」의 문턱은 밴드 경계와 같은 자리(본보기와 동일 규약).
  const rolling = steadyVsSwing.band !== 'low'
  const quick = decideSpeed.band !== 'low'
  const verdictLabel = MONEY_SELF_MATRIX.cells[rolling ? 1 : 0][quick ? 1 : 0]

  return {
    themeId: MONEY_SELF_ID,
    verdictLabel,
    matrix: MONEY_SELF_MATRIX,
    indicators: [steadyVsSwing, decideSpeed, nerve],
    // 🔴 항상 빈 배열 — 이 테마만 시기 축이 구조적으로 없다(§5 W-2·§3-2). 게이트 7번이 이 줄이다.
    timings: [],
    ruleHits: rules.strongMatches
      .filter((match) => WATCHED_RULE_IDS.has(match.rule.id))
      .map((match) => match.rule.name),
    // 무료 범위 밖(§5 W-2) — 되짚기는 유료 골격의 칸이다.
    pastHint: null,
  }
}

export const moneySelfResolver: ThemeResolver = {
  themeId: MONEY_SELF_ID,
  // 판정은 원국만 쓴다. [0] 은 레지스트리 계약(«올해» 필수)의 선언 — 세운 1회는 순수 수학이라
  // 무료 원가(§6: AI 1회 + 엔진 1회)를 늘리지 않는다.
  yearOffsets: [0],
  judge,
  prompt: {
    analysisType: 'WEALTH_DEEP',
    question: '어디에 넣을지가 아니라, 돈을 만질 때 내가 어떤 결의 사람인지.',
    rules: [
      '네 결 가운데 어느 결이 더 낫다고 말하지 마라. 각 결의 강점을 그 결의 언어로 서술하라.',
      'verdictLabel 을 뒤집지 마라. headline 은 그 라벨과 같은 방향이어야 한다.',
      '편재가 앞선 결을 투기 기질로 번역하지 마라. 큰 그림을 보는 안목의 결로 서술하라.',
      '이 풀이에는 시기 칸이 없다. 언제 넣고 언제 뺄지 같은 시점 서술을 만들어 내지 마라.',
      '보증이나 공동명의의 경계는 「남과 돈이 얽히는 자리에서 조심스러운 결」로만 서술하라. 금융 행동을 지시하지 마라.',
    ],
    forbidden: [
      '특정 상품·종목·자산군과 사고파는 시점',
      '수익률·확률·목표 금액',
      '네 결 사이의 우열·비교',
      '투기·중독 같은 낙인 어휘와 심리 진단',
      '빚투 손실률 같은 통계 수치 인용',
      '금융 상품·앱·플랫폼 추천',
    ],
  },
}
