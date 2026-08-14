/**
 * L2 「나는 왜 항상 이런 사람만 만날까」 — `same-type` 의 L2 판정.
 *
 * 설계 원본: `TEAM_G_DESIGN/prd/PLAN-theme-love-v1.md` §5 L2.
 *
 * ## 🔴 낙인을 찍지 않는다 — 이 테마의 제1 규율(§5 L2-9)
 * 타깃이 「내가 문제인가」 자책 구간의 사람들이다(§5 L2-4). 판정이 확정하는 것은
 * 「당신은 나쁜 사람에게 끌린다」가 아니라 **어느 결이 익숙한가(쏠림) · 원국의 어느 자리가
 * 부딪히는가(충·형 궁위) · 그 끌림이 무엇을 소모하는가(기신)** 세 가지 사실뿐이다.
 * 정신건강 인접 주제라 진단·치료 어휘도 프롬프트가 막는다.
 *
 * ## 핵심 결정론 가설 — 「끌림 = 기신 쪽으로 기우는 관성」(§5 L2-6, 문서화 고정)
 * 새 이론이 아니라 `scoreYongsinSynergy`(기신 일치 감점)의 역방향 읽기다. 십성 편중이
 * 가리키는 오행과 기신 오행의 거리로 「치르는 값」을 재고, 계산식은 새로 만들지 않는다
 * (§3-2 규율 3 — `elementRelation` 재사용).
 *
 * ## 🔴 반복의 원인을 늘 사주에서 찾지 않는다
 * 쏠림도 약하고 부딪히는 자리도 뚜렷하지 않은 사주가 실제로 있다. 그때 이 판정은 낮은
 * 밴드를 그대로 내보내고, 프롬프트 규율이 「반복의 원인이 사주 밖에 있을 수 있다」로 열어
 * 두게 한다 — 억지로 원인을 지어내는 순간 이 상품은 자책 유도 장치가 된다(§5 L2-9).
 */
import { elementRelation, normalizeElement } from '@/lib/domain/analysis/samhap-coherence'
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

export const SAME_TYPE_ID = 'same-type'

/** 지표 3종의 키·라벨 — 테스트가 이 상수와 판정 출력을 대조한다. */
export const SAME_TYPE_INDICATORS = [
  { key: 'pull_lean', label: '끌림의 쏠림' },
  { key: 'friction_seat', label: '부딪히는 자리' },
  { key: 'gisin_toll', label: '치르는 값' },
] as const

/** 궁위 이름 — §5 L2 ⓑ 「년=집안 배경 / 월=사회 / 일=배우자 / 시=미래」 그대로. */
export const SAME_TYPE_PALACE_LABELS = {
  year: '집안',
  month: '사회',
  day: '배우자',
  time: '미래',
} as const

/**
 * 「치르는 값」 라벨 — 끌림 오행과 기신 오행의 거리 **고정 매핑표**(§9-11 초안 고정).
 * 🔴 잘잘못의 언어가 아니라 방향의 언어다 — 「~에 끌리는 당신이 문제」는 여기 어디에도 없다.
 */
export const SAME_TYPE_TOLL_LABELS = {
  direct: '끌림이 기신을 곧장 구함',
  feeds: '끌림이 기신을 살림',
  fed: '기신이 쏠림을 부추김',
  counter: '끌림이 기신과 맞섬 — 소모가 크지 않음',
  weak: '굳은 쏠림이 없어 치르는 값도 뚜렷하지 않음',
  unknown: '용신·기신 판정 없음 — 신강약만으로 짚음',
} as const

const TOLL_SCORE: Record<keyof typeof SAME_TYPE_TOLL_LABELS, number> = {
  direct: 85,
  feeds: 55,
  fed: 45,
  counter: 20,
  weak: 10,
  unknown: 30,
}

/** 신강약이 같은 소모를 얼마나 다르게 받는가 — 신약이면 같은 값도 더 크게 치른다. */
const STRENGTH_ADJUST: Record<'신강' | '신약' | '중화', number> = { 신강: -12, 중화: 0, 신약: 12 }

/** 동수 타이브레이크 단일 서열 — 엔진의 기둥 순서 타이브레이크를 쓰지 않는다(설명 불가). */
const SIPSEONG_ORDER = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const

/** 형(刑) 라벨의 한글 지지 읽기 → 한자. 계산이 아니라 표기 대응표다. */
const READING_TO_ZHI: Record<string, string> = {
  자: '子',
  축: '丑',
  인: '寅',
  묘: '卯',
  진: '辰',
  사: '巳',
  오: '午',
  미: '未',
  신: '申',
  유: '酉',
  술: '戌',
  해: '亥',
}

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

/**
 * rule-base 중 이 테마가 읽는 것 — 관계 마찰의 구조 3종 + 반대 방향 균형추 1종.
 * 🔴 균형추(좋은 배우자 인연)를 함께 읽는 이유: 마찰 룰만 실으면 이 상품은 늘 어딘가에서
 *    병을 찾아내는 화면이 된다 — 낙인 금지의 데이터판이다.
 */
const WATCHED_RULE_IDS = new Set(['DIVORCE_01', 'DIVORCE_02', 'DIVORCE_03', 'MARRIAGE_01'])

const LOVE_CATEGORY = '연애운'

const PALACE_KEYS = ['year', 'month', 'day', 'time'] as const
type PalaceKey = (typeof PALACE_KEYS)[number]

function loveScore(year: YearlyFortuneResult | undefined): CategoryScore | undefined {
  return year?.categories.find((category) => category.category === LOVE_CATEGORY)
}

function chungOf(year: YearlyFortuneResult): PillarInteraction | undefined {
  const chungs = year.interactions.filter(
    (interaction) => interaction.type === '천간충' || interaction.type === '지지충'
  )
  return chungs.find((interaction) => interaction.pillarSource === '일주') ?? chungs[0]
}

function sortedSipseong(distribution: Record<string, number>): Array<[string, number]> {
  const orderOf = (name: string): number => {
    const index = (SIPSEONG_ORDER as readonly string[]).indexOf(name)
    return index === -1 ? SIPSEONG_ORDER.length : index
  }
  return Object.entries(distribution).sort((a, b) => b[1] - a[1] || orderOf(a[0]) - orderOf(b[0]))
}

/**
 * 충·형 라벨에서 관여 글자를 꺼낸다.
 * - 충 라벨은 한자 두 글자 + '충' (`丑未충`, `丁癸충`)
 * - 형 라벨은 한글 읽기 토큰이 앞에 온다 (`진진 자형`, `인사신 삼형 (無恩之刑)`)
 * 🔴 여기서 충·형을 다시 계산하지 않는다 — L1(relations)의 라벨을 **읽기만** 한다.
 *    표를 새로 만들면 relations.ts 와 두 개의 진실이 생긴다(§3-2 규율 3).
 */
function charsOfRelationLabel(label: string): string[] {
  if (label.endsWith('충')) return [...label.slice(0, -1)]
  const token = label.split(' ')[0] ?? ''
  return [...token].map((reading) => READING_TO_ZHI[reading]).filter((zhi): zhi is string => Boolean(zhi))
}

function judge(input: ThemeJudgeInput): ThemeVerdict {
  const { ctx, baseYear, rules } = input
  const { sipseong, relations, daeun, advancedYongsin, yongsin } = ctx.analysis
  const seats = sipseong.items.length

  const years = new Map(input.yearly.map((year) => [year.year, year]))

  // 지표 1 — 끌림의 쏠림(§5 L2 ⓐ pullType): 십성 편중 상위 2종. 편중이 클수록
  // 「매번 다른 사람인데 결말은 비슷」의 결이 원국에 굳어 있다.
  const ranked = sortedSipseong(sipseong.distribution)
  const [topName, topCount] = ranked[0] ?? ['비견', 0]
  const second = ranked[1]
  const pullScore = clampScore(topCount * 22 + (second?.[1] ?? 0) * 6)
  const pullLean: ThemeIndicator = {
    key: SAME_TYPE_INDICATORS[0].key,
    label: SAME_TYPE_INDICATORS[0].label,
    score: pullScore,
    band: bandOf(pullScore),
    basis:
      topCount >= 2
        ? `${topName} ${topCount}${second && second[1] > 0 ? ` · ${second[0]} ${second[1]}` : ''} — 자리 ${seats}곳 중 ${topCount}곳으로 쏠림`
        : '십성이 고르게 퍼짐 — 한 결로 굳은 쏠림 없음',
  }

  // 지표 2 — 부딪히는 자리(§5 L2 ⓑ): 원국 충·형이 어느 궁위인가. 배우자궁(일주)이
  // 걸리면 이 테마에서는 같은 마찰도 더 무겁게 읽는다.
  const conflictLabels = [...relations.chung, ...relations.hyeong]
  const involved = new Set<PalaceKey>()
  for (const label of conflictLabels) {
    for (const char of charsOfRelationLabel(label)) {
      for (const key of PALACE_KEYS) {
        const pillar = ctx.sajuData.pillars[key]
        if (pillar.gan === char || pillar.zhi === char) involved.add(key)
      }
    }
  }
  const dayInvolved = involved.has('day')
  const frictionScore = clampScore(relations.chung.length * 18 + relations.hyeong.length * 14 + (dayInvolved ? 12 : 0))
  const uniqueLabels = [...new Set(conflictLabels)]
  const palaceNames = PALACE_KEYS.filter((key) => involved.has(key)).map((key) => SAME_TYPE_PALACE_LABELS[key])
  const frictionSeat: ThemeIndicator = {
    key: SAME_TYPE_INDICATORS[1].key,
    label: SAME_TYPE_INDICATORS[1].label,
    score: frictionScore,
    band: bandOf(frictionScore),
    basis:
      uniqueLabels.length > 0
        ? `${uniqueLabels.join(' · ')} — ${palaceNames.join('·')} 자리`
        : '원국에 충·형 없음 — 같은 자리에서 부딪히는 결이 뚜렷하지 않음',
  }

  // 지표 3 — 치르는 값(§5 L2 ⓓ): 쏠림 오행과 기신 오행의 거리. 기신을 구하거나 살리는
  // 방향일수록 그 관계에서 소모가 크다. 5단계 용신이 없으면 구판 용신으로, 그것도 없으면
  // 「판정 없음」을 **사실대로** 싣는다 — 근거 없는 소모를 지어내지 않는다.
  const gisinElement = normalizeElement(advancedYongsin?.gisin ?? yongsin?.gisin ?? null)
  const pullElement = normalizeElement(sipseong.items.find((item) => item.sipseong === topName)?.element)

  let tollKey: keyof typeof SAME_TYPE_TOLL_LABELS
  if (topCount < 2) tollKey = 'weak'
  else if (!gisinElement || !pullElement) tollKey = 'unknown'
  else {
    const relation = elementRelation(pullElement, gisinElement)
    tollKey =
      relation === 'same'
        ? 'direct'
        : relation === 'generates'
          ? 'feeds'
          : relation === 'generated_by'
            ? 'fed'
            : 'counter'
  }
  const tollScore = clampScore(TOLL_SCORE[tollKey] + STRENGTH_ADJUST[sipseong.strengthAssessment])
  const tollDetail =
    tollKey === 'weak' || tollKey === 'unknown'
      ? SAME_TYPE_TOLL_LABELS[tollKey]
      : `끌림 ${pullElement}(${topName}) ↔ 기신 ${gisinElement} — ${SAME_TYPE_TOLL_LABELS[tollKey]}`
  const gisinToll: ThemeIndicator = {
    key: SAME_TYPE_INDICATORS[2].key,
    label: SAME_TYPE_INDICATORS[2].label,
    score: tollScore,
    band: bandOf(tollScore),
    basis: `${tollDetail} · ${sipseong.strengthAssessment}`,
  }

  // 시기 — 올해 한 해만. 열리는 달은 「반복 밖의 결을 들여보기 좋은 창」으로 L3 가 옮긴다.
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

  // 되짚기(§5 L2 ⓒ 「지난 20년의 결」) — 직전 대운 10년. 사후 설명이라 사용자가 스스로
  // 검증할 수 있는 신뢰 장치다. 직전 대운이 없으면(어린 나이) null — 지어내지 않는다.
  const birthYear = Number(ctx.personInfo.birthDate.split('-')[0])
  const age = baseYear - birthYear
  const currentIndex = daeun.findIndex((entry) => entry.age <= age && age < entry.age + 10)
  const previous = currentIndex > 0 ? daeun[currentIndex - 1] : undefined
  const yongsinElement = normalizeElement(advancedYongsin?.finalYongsin ?? yongsin?.yongsin ?? null)
  const previousElement = normalizeElement(previous?.element ?? null)
  const pastHint: ThemeVerdict['pastHint'] = previous
    ? {
        period: `${birthYear + previous.age}~${birthYear + previous.age + 9}년`,
        basis: `직전 대운 ${previous.ganji}(${previous.element}) — ${
          previousElement && previousElement === gisinElement
            ? `기신 ${gisinElement} 쪽으로 흐른 10년`
            : previousElement && previousElement === yongsinElement
              ? `용신 ${yongsinElement} 쪽으로 흐른 10년`
              : '용신·기신과 비낀 10년'
        }`,
      }
    : null

  return {
    themeId: SAME_TYPE_ID,
    // 양자택일이 아니다 — 「왜」에 대한 답은 칸이 아니라 세 지표의 조합이다.
    verdictLabel: null,
    indicators: [pullLean, frictionSeat, gisinToll],
    timings,
    ruleHits: rules.strongMatches
      .filter((match) => WATCHED_RULE_IDS.has(match.rule.id))
      .map((match) => match.rule.name),
    pastHint,
  }
}

export const sameTypeResolver: ThemeResolver = {
  themeId: SAME_TYPE_ID,
  // 판정 축 3개가 전부 원국·대운에서 나온다 — 세운은 올해 하나만 시기 곁들이로 쓴다(§6 L2).
  yearOffsets: [0],
  judge,
  prompt: {
    analysisType: 'TREND_LOVE',
    question: '왜 비슷한 결의 사람을 다시 만나게 되는지, 그 반복이 어디서 시작되는지.',
    rules: [
      '반복을 잘못으로 그리지 마라. 「~한 결이 익숙합니다」까지만 서술하고 낙인을 만들지 마라.',
      '「당신 탓」이라는 서술을 쓰지 마라. 반복은 잘잘못이 아니라 결의 흐름으로 서술하라.',
      '지난 연애의 상대들을 평가하지 마라. 반복의 자리는 내담자의 사주 안에서만 짚어라.',
      '판정의 라벨과 근거 밖에서 새 원인을 만들지 마라. 쏠림도 부딪히는 자리도 낮게 나왔다면 반복의 원인이 사주 밖에 있을 수 있다고 열어 두라.',
      '되짚기(pastHint)는 그 10년의 흐름까지만 말하라. 그 시기의 상대나 사건을 지어내지 마라.',
      'actions 는 이번 주에 혼자 해볼 수 있는 일로 쓰라. 만남·헤어짐을 지시하지 마라.',
    ],
    forbidden: [
      '「나쁜 남자·나쁜 여자에게 끌린다」류 낙인 어휘',
      '「당신 탓」·자책을 유도하는 서술',
      '중독·집착·트라우마 같은 진단 어휘와 치료 처방(정신건강 인접 주제다)',
      '특정 인물의 마음·행동을 단정하는 서술(상대의 정보를 받지 않았다)',
      '운명의 상대·인연 보장 같은 어휘와 결혼·출산 시기의 단정',
      '이별·재회를 지시하는 서술',
      '설문·통계 수치 인용',
    ],
  },
}
