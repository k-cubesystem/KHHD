/**
 * L1 「내가 좋아하는 사람 말고, 날 좋아해주는 사람」 — `attracts-me` 의 L2 판정.
 *
 * 설계 원본: `TEAM_G_DESIGN/prd/PLAN-theme-love-v1.md` §5 L1.
 *
 * ## 🔴 이 테마는 사람을 맞히지 않는다
 * 제목의 「날 좋아해주는 사람」은 **화자의 바람**이지 특정인에 대한 단정이 아니다(§5 L1 서두 —
 * 그래서 CEO 원문에서 「궁합」만 덜어냈다). 상대의 생년월일을 받지 않는 SOLO 테마이므로
 * 「그 사람은 당신을 좋아합니다」는 이 판정 어디에도 자리가 없다. 코드가 확정하는 것은
 * **내 사주가 편안해하는 결**과 **내가 끌리는 결**, 그리고 둘 사이의 간극뿐이다.
 *
 * ## 🔴 감탄 지점은 간극 게이지다 (§5 L1-7 — 「CEO 예시의 심장」)
 * 「내가 고른 사람은 늘 나를 힘들게 했다」는 감각(§5 L1-4)에 대한 이 상품의 답은
 * 「끌리는 결」과 「편안한 결」이 같은지(같음)·살리는지(상생)·거스르는지(상극)의 3판정이다.
 * 이 판정은 §5 L1 ⓕ 그대로 `elementRelation` 재사용 — 새 합충 규칙을 만들면
 * `compatibility-engine` 과 두 개의 진실이 생긴다(§3-2 규율 3).
 *
 * ## 🔴 배우자성이 없는 사주를 「인연 없음」으로 읽지 않는다
 * 표본에서도 절반이 배우자성 0 이다. 0 은 「무(無) — 틀이 정해지지 않은 자리」 라벨이고
 * (§5 L1 ⓑ), 프롬프트 규율이 「인연이 없다」로의 번역을 막는다. 「~한 사람을 만나면
 * 행복해집니다」가 아니라 「~한 결에서 덜 지칩니다」가 이 테마의 문장 규격이다(§5 L1-9).
 */
import { elementRelation, normalizeElement, type Element5 } from '@/lib/domain/analysis/samhap-coherence'
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

export const ATTRACTS_ME_ID = 'attracts-me'

/** 지표 3종의 키·라벨 — 테스트가 이 상수와 판정 출력을 대조한다. */
export const ATTRACTS_ME_INDICATORS = [
  { key: 'welcome_seat', label: '맞이하는 자리' },
  { key: 'pull_lean', label: '끌림의 쏠림' },
  { key: 'gap_between', label: '끌림과 편안함의 간극' },
] as const

/**
 * 4결 라벨 — 배우자성 우세 십성의 **고정 매핑표**(§5 L1 ⓒ, §9-11 초안 고정).
 * 계산이 아니라 표다. 여기 없는 유형을 AI 가 새로 만들지 못하게 프롬프트가 못 박는다.
 */
export const ATTRACTS_ME_STAR_LABELS = {
  정재: '곁에 오래 머무는 결',
  편재: '밝고 넓게 다가오는 결',
  정관: '반듯하고 약속을 지키는 결',
  편관: '강하게 이끄는 결',
  /** 배우자성 0 — 틀이 없다는 사실이지 인연이 없다는 판정이 아니다(§5 L1 ⓑ). */
  무: '무(無) — 정해진 틀이 없는 자리',
} as const

/** 간극 3판정 라벨(§5 L1 ⓕ 같음/상생/상극) + 쏠림이 굳지 않은 사주의 정직한 네 번째 칸. */
export const ATTRACTS_ME_GAP_LABELS = {
  same: '같음 — 끌리는 결과 편안한 결이 한 결',
  saeng: '상생 — 다르지만 서로 살리는 결',
  geuk: '상극 — 서로 거스르는 결',
  weak: '쏠림 없음 — 간극을 잴 만큼 굳은 끌림이 없음',
} as const

/**
 * 간극 점수 — 밴드가 곧 3판정이 되도록 값을 밴드 중앙에 박는다(같음=낮음 / 상생=보통 / 상극=높음).
 * 화면의 막대와 간극 게이지가 같은 눈금을 쓰게 하는 장치다 — 점수를 따로 계산하면
 * 「게이지는 상극인데 막대는 보통」이 생긴다.
 */
const GAP_SCORE = { same: 15, saeng: 50, geuk: 85, weak: 20 } as const

/**
 * 덜 지치는 오행 = 나를 생(生)하는 오행(인성 오행) — §5 L1 ⓓ 「SAENG 역방향 조회」.
 * 순환표 5칸이라 표로 박아 둔다(엔진 재호출 금지 — 판정은 순수 함수다).
 */
const INSEONG_OF: Record<Element5, Element5> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }

/**
 * 십성 동수(同數) 타이브레이크의 단일 서열.
 * 🔴 엔진의 `dominantSipseong` 은 동수일 때 **기둥 순서**로 갈려 근거를 설명할 수 없다 —
 *    여기서는 고정 서열로 가른다(같은 사주 = 같은 끌림 이름).
 */
const SIPSEONG_ORDER = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const

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

/** rule-base 중 이 테마가 읽는 것 — 정재·정관 동반(§5 L1 ⓒ의 「머무는 결」과 같은 사실)뿐이다. */
const WATCHED_RULE_IDS = new Set(['MARRIAGE_01'])

const LOVE_CATEGORY = '연애운'

function loveScore(year: YearlyFortuneResult | undefined): CategoryScore | undefined {
  return year?.categories.find((category) => category.category === LOVE_CATEGORY)
}

/** 배우자궁(일주)의 충을 우선으로 찾는다 — 연애 테마에서 의미가 가장 큰 자리다. */
function chungOf(year: YearlyFortuneResult): PillarInteraction | undefined {
  const chungs = year.interactions.filter(
    (interaction) => interaction.type === '천간충' || interaction.type === '지지충'
  )
  return chungs.find((interaction) => interaction.pillarSource === '일주') ?? chungs[0]
}

function seatPhrase(total: number, hit: number): string {
  return `자리 ${total}곳 중 ${hit}곳`
}

/** 십성 분포를 «개수 내림차순 → 고정 서열» 로 정렬해 돌려준다. */
function sortedSipseong(distribution: Record<string, number>): Array<[string, number]> {
  const orderOf = (name: string): number => {
    const index = (SIPSEONG_ORDER as readonly string[]).indexOf(name)
    return index === -1 ? SIPSEONG_ORDER.length : index
  }
  return Object.entries(distribution).sort((a, b) => b[1] - a[1] || orderOf(a[0]) - orderOf(b[0]))
}

function judge(input: ThemeJudgeInput): ThemeVerdict {
  const { ctx, baseYear, rules } = input
  const { sipseong, sinsal } = ctx.analysis
  const count = (name: string): number => sipseong.distribution[name] ?? 0
  const seats = sipseong.items.length

  const years = new Map(input.yearly.map((year) => [year.year, year]))

  // ⓑ 배우자 자리의 별 — 남=재성(정재·편재) / 여=관성(정관·편관). §5 L1 ⓑ 그대로.
  const isMale = ctx.personInfo.gender === 'male'
  const jeongName = isMale ? '정재' : '정관'
  const pyeonName = isMale ? '편재' : '편관'
  const jeong = count(jeongName)
  const pyeon = count(pyeonName)
  const starTotal = jeong + pyeon

  // ⓒ 4결 라벨 — 우세 십성의 고정 매핑. 동수면 정(正) 쪽 — 「머무는 결」 판정은 보수 쪽으로 갈라
  //    같은 사주가 실행마다 다른 결이 되는 일을 막는다.
  const starLabel =
    starTotal === 0
      ? ATTRACTS_ME_STAR_LABELS.무
      : jeong >= pyeon
        ? ATTRACTS_ME_STAR_LABELS[jeongName]
        : ATTRACTS_ME_STAR_LABELS[pyeonName]

  // ⓐ 배우자궁 풍경 — 일지는 근거 문장에 사실로 싣는다(물상 서술은 L3 의 몫).
  const dayPillar = ctx.sajuData.pillars.day
  const hasDohwa = sinsal.some((item) => item.name === '도화살')
  const hasCheoneul = sinsal.some((item) => item.name === '천을귀인')

  // 지표 1 — 맞이하는 자리: 배우자성이 원국에 마련된 정도. 도화살(매력·인기)은 사람이
  // 다가오는 힘이므로 가산하고, 천을귀인은 귀인 운으로 소폭만 얹는다.
  const welcomeScore = clampScore(starTotal * 22 + jeong * 8 + (hasDohwa ? 12 : 0) + (hasCheoneul ? 6 : 0))
  const starParts = [jeong > 0 ? `${jeongName} ${jeong}` : '', pyeon > 0 ? `${pyeonName} ${pyeon}` : ''].filter(Boolean)
  const welcomeSeat: ThemeIndicator = {
    key: ATTRACTS_ME_INDICATORS[0].key,
    label: ATTRACTS_ME_INDICATORS[0].label,
    score: welcomeScore,
    band: bandOf(welcomeScore),
    basis: `${starParts.length > 0 ? starParts.join(' · ') : '배우자성 없음'} — ${seatPhrase(seats, starTotal)} · ${starLabel}${hasDohwa ? ' · 도화살' : ''} · 배우자궁 ${dayPillar.zhi}(${dayPillar.zhiElement})`,
  }

  // 지표 2 — 끌림의 쏠림: 십성 편중 상위 2종(§5 L1 ⓕ 의 「내 십성 편중 상위」).
  // 편중이 클수록 끌림이 한 결로 굳어 있다.
  const ranked = sortedSipseong(sipseong.distribution)
  const [topName, topCount] = ranked[0] ?? ['비견', 0]
  const second = ranked[1]
  const pullScore = clampScore(topCount * 22 + (second?.[1] ?? 0) * 6)
  const pullLean: ThemeIndicator = {
    key: ATTRACTS_ME_INDICATORS[1].key,
    label: ATTRACTS_ME_INDICATORS[1].label,
    score: pullScore,
    band: bandOf(pullScore),
    basis:
      topCount >= 2
        ? `${topName} ${topCount}${second && second[1] > 0 ? ` · ${second[0]} ${second[1]}` : ''} — ${seatPhrase(seats, topCount)}으로 쏠림`
        : `십성이 고르게 퍼짐 — 한 결로 굳은 쏠림 없음`,
  }

  // 지표 3 — 간극(§5 L1 ⓕ): 덜 지치는 오행(인성 오행, ⓓ) vs 쏠림 오행 → 같음/상생/상극.
  // 쏠림 자체가 굳지 않은 사주(상위 십성 2개 미만)는 간극을 재지 않는다 — 없는 끌림을
  // 지어내 상극이라 겁주는 것이 이 테마가 가장 먼저 막는 거짓이다.
  const dayElement = normalizeElement(ctx.sajuData.dayMasterElement)
  const comfortElement = dayElement ? INSEONG_OF[dayElement] : null
  const pullElement = normalizeElement(sipseong.items.find((item) => item.sipseong === topName)?.element)

  let gapKey: keyof typeof ATTRACTS_ME_GAP_LABELS = 'weak'
  let gapBasis = `쏠림이 굳지 않음 — ${ATTRACTS_ME_GAP_LABELS.weak}`
  if (topCount >= 2 && comfortElement && pullElement) {
    const relation = elementRelation(pullElement, comfortElement)
    gapKey = relation === 'same' ? 'same' : relation === 'generates' || relation === 'generated_by' ? 'saeng' : 'geuk'
    gapBasis = `끌림 ${pullElement}(${topName}) ↔ 편안함 ${comfortElement}(인성 오행) — ${ATTRACTS_ME_GAP_LABELS[gapKey]}`
  }
  const gapScore = clampScore(GAP_SCORE[gapKey])
  const gapBetween: ThemeIndicator = {
    key: ATTRACTS_ME_INDICATORS[2].key,
    label: ATTRACTS_ME_INDICATORS[2].label,
    score: gapScore,
    band: bandOf(gapScore),
    basis: gapBasis,
  }

  // 시기 — 이 테마의 상품은 원국이고 시기는 곁들이다(§6 L1: 엔진 1회 = 사주와 같은 무게).
  // 올해 한 해만 다루고, 달은 세운이 준 것만 싣는다.
  const timings: ThemeTiming[] = []
  const thisYear = years.get(baseYear)
  const thisLove = loveScore(thisYear)
  if (thisYear && thisYear.keyOpportunityMonths.length > 0) {
    timings.push({
      kind: 'opportunity',
      year: baseYear,
      months: [...thisYear.keyOpportunityMonths],
      basis: `${baseYear} 세운 ${thisYear.yearPillar.ganji} · 연애운 ${TREND_LABEL[thisLove?.trend ?? 'neutral']} · ${AFFINITY_LABEL[thisYear.yongsinAffinity]}`,
    })
  }
  if (thisYear && thisYear.keyCautionMonths.length > 0) {
    const chung = chungOf(thisYear)
    timings.push({
      kind: 'caution',
      year: baseYear,
      months: [...thisYear.keyCautionMonths],
      basis: chung
        ? `${baseYear} 세운 ${thisYear.yearPillar.ganji}가 ${chung.pillarSource}와 ${chung.type}`
        : `${baseYear} 세운 ${thisYear.yearPillar.ganji} · ${AFFINITY_LABEL[thisYear.yongsinAffinity]}`,
    })
  }

  return {
    themeId: ATTRACTS_ME_ID,
    // 양자택일이 아니다 — 이 테마의 답은 칸이 아니라 간극 게이지(지표 3)다.
    verdictLabel: null,
    indicators: [welcomeSeat, pullLean, gapBetween],
    timings,
    ruleHits: rules.strongMatches
      .filter((match) => WATCHED_RULE_IDS.has(match.rule.id))
      .map((match) => match.rule.name),
    // 과거 역추산은 이 테마 설계에 없다(§5 L1) — 없는 과거를 지어내지 않는다.
    pastHint: null,
  }
}

export const attractsMeResolver: ThemeResolver = {
  themeId: ATTRACTS_ME_ID,
  // 올해 하나면 된다 — 판정 축 3개가 전부 원국에서 나오고, 세운은 시기 곁들이용이다(§6 L1).
  yearOffsets: [0],
  judge,
  prompt: {
    analysisType: 'TREND_LOVE',
    question: '내가 끌리는 사람 말고, 내 사주가 편안해하는 사람은 어떤 결인지.',
    rules: [
      '누가 나를 좋아할지 맞히려 하지 마라. 어떤 결 곁에서 덜 지치는지만 설명하라.',
      '판정의 라벨과 근거 밖에서 새 유형·새 결을 만들지 마라.',
      '만남의 효과를 단정하지 마라. 「~한 사람을 만나면 행복해진다」가 아니라 「~한 결에서 덜 지친다」로 서술하라.',
      '배우자성이 「무(無)」로 나온 사주를 인연이 없는 사주로 읽지 마라. 틀이 정해지지 않아 여러 결이 드나들 수 있는 자리로 서술하라.',
      '끌리는 결을 잘못으로 그리지 마라. 간극은 고칠 결함이 아니라 알아 두는 지도다.',
      'actions 는 이번 주에 혼자 해볼 수 있는 일로 쓰라. 특정 인물을 향한 행동을 적지 마라.',
    ],
    forbidden: [
      '「그 사람은 당신을 좋아합니다」처럼 특정 인물의 마음을 단정하는 서술(상대의 정보를 받지 않았다)',
      '운명의 상대·천생연분·인연 보장 같은 어휘',
      '결혼·출산 시기의 단정',
      '「인연이 없는 사주」류 단정',
      '외모·나이·직업·조건으로 사람을 고르라는 조언',
      '이별·재회를 지시하는 서술',
      '설문·통계 수치 인용',
    ],
  },
}
