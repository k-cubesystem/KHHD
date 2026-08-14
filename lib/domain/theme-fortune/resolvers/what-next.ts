/**
 * C-2 「그만두면, 그다음은 뭘 하지」 — `what-next` 의 L2 판정. ★무료 미끼(career)
 *
 * 설계 원본: `TEAM_G_DESIGN/prd/PLAN-theme-career-wealth-v1.md` §5 C-2.
 *
 * ## 🔴 이 테마는 직업을 «추천»하지 않는다
 * 주는 것은 «적성의 결»이다 — 「이 일을 하면 잘 된다」가 아니라 「이 결이 덜 지치는 자리」까지만
 * (§5 C-2 ⑨). 그래서 직업 이름조차 AI 가 고르지 않는다. **엔진이 이미 문자열로 갖고 있는 후보
 * 풀에서 L2 가 정렬해 확정**하고, AI 는 이유만 쓴다(§5 C-2 ⓒ). 폐업 직후 이용자(R14)가 이 화면을
 * 본다는 전제라 창업 권유(`CAREER_03` 원문 actionItem)도 결로만 번역된다.
 *
 * ## 🔴 무료 미끼 = 세운을 돌지 않는 테마
 * 무료의 근거는 인심이 아니라 **엔진 원가**다(§6) — `buildSajuContext` 1회로 끝나고 시기를 주지
 * 않는다(시기가 유료 테마의 값이다). 그래서 `timings` 는 항상 비고 `pastHint` 는 항상 null 이며,
 * 판정 전체가 **원국만으로** 선다 — 기준 연도가 바뀌어도 같은 답이 나온다(테스트가 고정한다).
 * `yearOffsets` 의 `[0]` 은 레지스트리 계약(«올해» 필수)을 지키기 위한 선언일 뿐 judge 는 세운을
 * 읽지 않는다.
 *
 * ## 판정 구조 — 3축 + 6조합 고정 매핑
 * 기획서는 「최고축이 첫 문장을, 최저축이 두 번째 문장을 결정한다(3×3=9조합)」고 적었다.
 * 실제 도달 가능한 조합은 **최고≠최저 6가지**다 — 동점 처리를 우선순위로 고정하면 대각선
 * (최고=최저)은 어떤 입력으로도 나오지 않고, 도달 불가능한 칸은 두지 않는다(§10-13).
 * 2×2 표가 아니므로 `matrix` 는 없다 — 화면은 표 대신 3축 삼각과 「결」 라벨을 그린다(§5 C-2 ⑦).
 */
import type { SajuContext } from '@/lib/saju-engine/context-builder'
// 🔴 값 임포트지만 «표 조회»다 — 엔진 호출(계산)이 아니라 이미 존재하는 문자열 상수를 읽는 것.
//    직업 후보를 여기서만 뽑아야 「AI가 알아서 직업을 추천」이 구조적으로 불가능해진다(§5 C-2 ⓒ).
import { SIPSEONG_MODERN } from '@/lib/saju-engine/sipseong'
import { SINSAL_MODERN } from '@/lib/saju-engine/sinsal-extended'
import {
  bandOf,
  clampScore,
  type ThemeIndicator,
  type ThemeJudgeInput,
  type ThemeResolver,
  type ThemeVerdict,
  type ThemeVerdictLabel,
} from '../verdict-types'

export const WHAT_NEXT_ID = 'what-next'

/** 세 축 — 지표 순서이자 동점 처리의 우선순위다(아래 `pickTopLow`). */
type WhatNextAxis = 'expression' | 'order' | 'venture'

const AXIS_ORDER: readonly WhatNextAxis[] = ['expression', 'order', 'venture']

/** 축마다 축을 이루는 십성 — 점수도, 직업 후보 풀의 첫 줄도 여기서 나온다(§5 C-2 ⓑ·ⓒ). */
const AXIS_SIPSEONG: Record<WhatNextAxis, readonly string[]> = {
  expression: ['식신', '상관'],
  order: ['정관', '정인'],
  venture: ['편재', '편관'],
}

/** 축에 힘을 보태는 신살(§5 C-2 L2 표의 보정 항) — 직업 후보 풀의 둘째 줄이기도 하다. */
const AXIS_SINSAL: Record<WhatNextAxis, readonly string[]> = {
  expression: ['도화살', '화개살'],
  order: ['문창귀인'],
  venture: ['역마살'],
}

/**
 * 판정 6조합 — (최고축, 최저축)의 **고정 매핑**(§5 C-2). 키는 `${top}_${low}`.
 * note 첫 문장이 최고축, 두 번째 문장이 최저축이다 — 기획서의 「첫 문장/두 번째 문장」 규칙을
 * 라벨 상수에 굽는다. 표를 고치면 「같은 사주에 다른 답」이 되므로 테스트가 여섯 칸을 고정한다.
 * 🔴 낮은 축은 모자람이 아니라 «덜 맞는 자리»로 적는다 — 무료 입구에서 결핍을 팔지 않는다.
 */
export const WHAT_NEXT_LABELS = {
  expression_order: {
    key: 'expression_order',
    label: '틀 밖에서 만드는 결',
    note: '만들어 내놓는 힘이 세 결 중 가장 앞서 있습니다. 정해진 틀을 지키는 힘은 낮은 편이라, 손이 자유로운 자리에서 덜 지치는 결입니다.',
  },
  expression_venture: {
    key: 'expression_venture',
    label: '깊게 파서 만드는 결',
    note: '만들어 내놓는 힘이 세 결 중 가장 앞서 있습니다. 판을 벌리는 힘은 낮은 편이라, 넓히기보다 한 가지를 깊게 다듬는 자리에서 힘이 나는 결입니다.',
  },
  order_expression: {
    key: 'order_expression',
    label: '자리를 단단히 다지는 결',
    note: '자리를 지키고 쌓는 힘이 세 결 중 가장 앞서 있습니다. 만들어 내놓는 힘은 낮은 편이라, 새로 짓기보다 체계가 선 자리에서 오래가는 결입니다.',
  },
  order_venture: {
    key: 'order_venture',
    label: '한 우물을 지키는 결',
    note: '자리를 지키고 쌓는 힘이 세 결 중 가장 앞서 있습니다. 판을 벌리는 힘은 낮은 편이라, 넓히기보다 한 우물을 깊게 파는 자리에서 단단해지는 결입니다.',
  },
  venture_expression: {
    key: 'venture_expression',
    label: '판을 벌여 움직이는 결',
    note: '판을 벌려 움직이는 힘이 세 결 중 가장 앞서 있습니다. 만들어 내놓는 힘은 낮은 편이라, 손으로 짓기보다 사람과 판을 움직이는 자리에서 살아나는 결입니다.',
  },
  venture_order: {
    key: 'venture_order',
    label: '길 위에서 넓히는 결',
    note: '판을 벌려 움직이는 힘이 세 결 중 가장 앞서 있습니다. 한 자리를 지키는 힘은 낮은 편이라, 매인 자리보다 움직이며 넓히는 자리에서 힘이 나는 결입니다.',
  },
} as const satisfies Record<string, ThemeVerdictLabel>

/** rule-base 26룰 중 이 테마가 읽는 것(§5 C-2 ⓓ·ⓔ) — 적성 3종 + 꽃 피는 때 3종. */
const WATCHED_RULE_IDS = new Set(['CAREER_01', 'CAREER_02', 'CAREER_03', 'EARLY_01', 'LATE_01', 'LATE_02'])

function seatPhrase(total: number, hit: number): string {
  return `자리 ${total}곳 중 ${hit}곳`
}

function hasSinsal(ctx: SajuContext, name: string): boolean {
  return ctx.analysis.sinsal.some((item) => item.name === name)
}

/** 세 축의 원점수 — 전부 원국(십성 분포 + 신살)에서만 나온다. 세운이 끼면 무료 원가 계약이 깨진다. */
function axisScores(ctx: SajuContext): Record<WhatNextAxis, number> {
  const count = (name: string): number => ctx.analysis.sipseong.distribution[name] ?? 0

  // ⓑ 자리당 22는 본보기(leave-or-stay)와 같은 눈금. 두 번째 항은 축의 «더 적극적인» 성분 —
  //    상관(틀을 깨는 표현)·정관(공적 질서)·편재(굴리는 재)가 같은 개수라도 축을 더 세게 민다.
  const expression = clampScore(
    (count('식신') + count('상관')) * 22 +
      count('상관') * 6 +
      (hasSinsal(ctx, '도화살') ? 8 : 0) +
      (hasSinsal(ctx, '화개살') ? 8 : 0)
  )
  const order = clampScore(
    (count('정관') + count('정인')) * 22 + count('정관') * 6 + (hasSinsal(ctx, '문창귀인') ? 10 : 0)
  )
  // 역마 18도 본보기의 가중 그대로 — 같은 신살이 테마마다 다른 무게를 가지면 설명이 두 개가 된다.
  const venture = clampScore(
    (count('편재') + count('편관')) * 22 + count('편재') * 6 + (hasSinsal(ctx, '역마살') ? 18 : 0)
  )

  return { expression, order, venture }
}

/**
 * 최고축·최저축 — 동점 처리가 이 함수의 전부다.
 * 최고는 **앞선 축**(선언 순서), 최저는 **뒤선 축**이 이긴다. 그래서 어떤 입력에서도 최고≠최저이고,
 * 기획서 3×3 표의 대각선(도달 불가능한 칸)이 코드에 존재하지 않는다(§10-13).
 */
function pickTopLow(scores: Record<WhatNextAxis, number>): { top: WhatNextAxis; low: WhatNextAxis } {
  let top: WhatNextAxis = 'expression'
  for (const axis of AXIS_ORDER) if (scores[axis] > scores[top]) top = axis

  let low: WhatNextAxis = 'venture'
  for (const axis of [...AXIS_ORDER].reverse()) if (scores[axis] < scores[low]) low = axis

  return { top, low }
}

/**
 * 직업 후보 3~5개 — 🔴 **엔진이 이미 갖고 있는 문자열에서만** 온다(§5 C-2 ⓒ, 네 곳 합집합).
 *
 * 순서가 곧 정렬이다: ①최고축 십성(개수 많은 쪽 먼저)의 `modernJobs` → ②최고축 신살(보유 시)의
 * `modernJobs` → ③일주 적성(`iljuCareer`) → ④일간 적성(`dayMasterJobs`). 십성이 비어 풀이 얇으면
 * 주력 십성으로 되짚는다 — 어떤 명식에도 후보가 3개 아래로 떨어지지 않게.
 *
 * ⚠️ 이 목록을 프롬프트·화면에 싣는 배선은 공용층(오케스트레이터) 몫이다 — `ThemeVerdict` 에는
 *    직업 칸이 없고, 그 자리를 여기서 새로 파면 그릇이 테마마다 갈라진다(마스터 §5-3).
 */
export function whatNextJobCandidates(ctx: SajuContext): readonly string[] {
  const { sipseong } = ctx.analysis
  const count = (name: string): number => sipseong.distribution[name] ?? 0
  const { top } = pickTopLow(axisScores(ctx))

  const pool: string[] = []

  const reps = [...AXIS_SIPSEONG[top]]
    .filter((name) => count(name) > 0)
    .sort((a, b) => count(b) - count(a) || AXIS_SIPSEONG[top].indexOf(a) - AXIS_SIPSEONG[top].indexOf(b))
  for (const name of reps) pool.push(...(SIPSEONG_MODERN[name]?.modernJobs ?? []))

  for (const name of AXIS_SINSAL[top]) if (hasSinsal(ctx, name)) pool.push(...(SINSAL_MODERN[name]?.modernJobs ?? []))

  pool.push(...ctx.mulsang.iljuCareer, ...ctx.mulsang.dayMasterJobs)

  if (new Set(pool).size < 3) pool.push(...(SIPSEONG_MODERN[sipseong.dominantSipseong]?.modernJobs ?? []))

  return [...new Set(pool)].slice(0, 5)
}

function judge(input: ThemeJudgeInput): ThemeVerdict {
  const { ctx, rules } = input
  const { sipseong } = ctx.analysis
  const count = (name: string): number => sipseong.distribution[name] ?? 0
  const seats = sipseong.items.length
  const scores = axisScores(ctx)

  // ⓐ 만들어내는 결 — 식상(식신·상관) + 도화·화개.
  const siksin = count('식신')
  const sanggwan = count('상관')
  const exprParts = [sanggwan > 0 ? `상관 ${sanggwan}` : '', siksin > 0 ? `식신 ${siksin}` : ''].filter(Boolean)
  const exprSinsal = AXIS_SINSAL.expression.filter((name) => hasSinsal(ctx, name))
  const expression: ThemeIndicator = {
    key: 'expression',
    label: '만들어내는 결',
    score: scores.expression,
    band: bandOf(scores.expression),
    basis: `${exprParts.length > 0 ? exprParts.join(' · ') : '식상 없음'}${exprSinsal.length > 0 ? ` · ${exprSinsal.join(' · ')}` : ''} — ${seatPhrase(seats, siksin + sanggwan)}`,
  }

  // ⓑ 자리를 지키는 결 — 정관·정인 + 문창귀인.
  const jeonggwan = count('정관')
  const jeongin = count('정인')
  const orderParts = [jeonggwan > 0 ? `정관 ${jeonggwan}` : '', jeongin > 0 ? `정인 ${jeongin}` : ''].filter(Boolean)
  const order: ThemeIndicator = {
    key: 'order',
    label: '자리를 지키는 결',
    score: scores.order,
    band: bandOf(scores.order),
    basis: `${orderParts.length > 0 ? orderParts.join(' · ') : '관인 없음'}${hasSinsal(ctx, '문창귀인') ? ' · 문창귀인' : ''} — ${seatPhrase(seats, jeonggwan + jeongin)}`,
  }

  // ⓒ 벌려 나가는 결 — 편재·편관 + 역마살.
  const pyeonjae = count('편재')
  const pyeongwan = count('편관')
  const ventureParts = [pyeonjae > 0 ? `편재 ${pyeonjae}` : '', pyeongwan > 0 ? `편관 ${pyeongwan}` : ''].filter(
    Boolean
  )
  const venture: ThemeIndicator = {
    key: 'venture',
    label: '벌려 나가는 결',
    score: scores.venture,
    band: bandOf(scores.venture),
    basis: `${ventureParts.length > 0 ? ventureParts.join(' · ') : '편재·편관 없음'}${hasSinsal(ctx, '역마살') ? ' · 역마살' : ''} — ${seatPhrase(seats, pyeonjae + pyeongwan)}`,
  }

  // (최고축, 최저축) → 6조합 고정 매핑. top≠low 가 pickTopLow 에서 보장되므로 키는 항상 표 안에 있다.
  const { top, low } = pickTopLow(scores)
  const verdictLabel = WHAT_NEXT_LABELS[`${top}_${low}` as keyof typeof WHAT_NEXT_LABELS]

  return {
    themeId: WHAT_NEXT_ID,
    verdictLabel,
    // 2×2 표가 아니므로 matrix 없음 — 화면은 3축 삼각 + 「결」 라벨로 그린다(§5 C-2 ⑦).
    indicators: [expression, order, venture],
    // 🔴 무료 테마는 시기를 주지 않는다 — 시기가 유료 테마의 값이다(§5 C-2). 항상 빈다.
    timings: [],
    ruleHits: rules.strongMatches
      .filter((match) => WATCHED_RULE_IDS.has(match.rule.id))
      .map((match) => match.rule.name),
    // 무료 범위 밖(§5 C-2) — 되짚기는 유료 골격의 칸이다. 근거가 있어도 싣지 않는다.
    pastHint: null,
  }
}

export const whatNextResolver: ThemeResolver = {
  themeId: WHAT_NEXT_ID,
  // 판정은 원국만 쓴다. [0] 은 레지스트리 계약(«올해» 필수)의 선언 — 세운 1회는 순수 수학이라
  // 무료 원가(§6: AI 1회 + 엔진 1회)를 늘리지 않는다.
  yearOffsets: [0],
  judge,
  prompt: {
    analysisType: 'TREND_CAREER',
    question: '그만둔 다음에 무엇을 할지가 아니라, 내 결이 본래 어느 쪽을 향해 있는지.',
    rules: [
      '창업이나 이직을 권하거나 만류하지 마라. 어느 결이 덜 지치는 자리인지 결의 방향만 설명하라.',
      'verdictLabel 을 뒤집지 마라. headline 은 그 라벨과 같은 방향이어야 한다.',
      '직업 이름은 함께 제시된 후보 목록 안에서만 쓰라. 목록 밖의 직업을 새로 만들어 내지 말고, 목록이 없으면 직업 이름 없이 결의 방향만 서술하라.',
      '「이 일을 하면 잘 된다」는 단정을 하지 마라. 「이 결이 덜 지치는 자리」까지만 말하라.',
      '낮게 나온 결을 모자람으로 서술하지 마라. 그 결은 덜 맞는 자리일 뿐이다.',
    ],
    forbidden: [
      '그만두세요·창업하세요·버티세요 같은 지시',
      '특정 자격증·학원·강의·플랫폼·프랜차이즈의 이름',
      '성공 여부·수입·연봉에 대한 예측',
      '학력·전공·나이·성별을 근거로 한 서술',
      '설문·통계 수치 인용',
    ],
  },
}
