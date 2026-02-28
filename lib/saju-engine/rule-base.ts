/**
 * 해화지기 사주 엔진 - 사주첩경 룰베이스 엔진
 * 고전 명리서의 실전 If-Then 규칙을 알고리즘화
 * haehwajigi.md 8장: "실전 감명 로직: 3대 비법서의 교차 검증"
 */

import type { SajuData } from '@/lib/domain/saju/saju'
import type { SipseongMap } from './sipseong'
import type { WarningsResult } from './warnings'
import type { SinsalResult } from './sinsal-extended'

// ===================== 타입 정의 =====================

type RuleCategory =
  | '타향살이'
  | '이혼수'
  | '재물파탄'
  | '관재구설'
  | '귀인발복'
  | '조기성공'
  | '대기만성'
  | '건강위험'
  | '직업적성'
  | '결혼운'
  | '자녀운'

interface RuleCondition {
  type: string
  params: Record<string, unknown>
}

export interface SajuRule {
  id: string
  name: string
  source: string
  category: RuleCategory
  conditions: RuleCondition[]
  minMatch?: number // undefined = 모두 충족 필요
  conclusion: {
    summary: string
    detail: string
    severity: 'info' | 'caution' | 'warning' | 'critical'
    actionItems: string[]
  }
  weight: number
}

export interface RuleMatchResult {
  rule: SajuRule
  matchedCount: number
  totalConditions: number
  confidence: number
  matchDetails: string[]
}

export interface RuleBaseResult {
  matches: RuleMatchResult[]
  strongMatches: RuleMatchResult[]
  categories: Partial<Record<RuleCategory, RuleMatchResult[]>>
  ruleContext: string
}

// ===================== 평가 컨텍스트 =====================

interface EvalContext {
  sajuData: SajuData
  sipseong: SipseongMap
  warnings: WarningsResult
  sinsal: SinsalResult[]
  // 미리 계산된 편의 데이터
  natalZhis: string[]
  natalGans: string[]
  sinsalNames: Set<string>
  sipseongDist: Record<string, number>
  hasChung: (pos1: string, pos2: string) => boolean
  hasHyeong: (pos1: string, pos2: string) => boolean
}

// ===================== 충/형 판단 헬퍼 =====================

const CHUNG_MAP: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}

const HYEONG_GROUPS: string[][] = [
  ['寅', '巳', '申'], // 무은지형
  ['丑', '戌', '未'], // 지세지형
  ['子', '卯'], // 무례지형
]

function isChung(zhi1: string, zhi2: string): boolean {
  return CHUNG_MAP[zhi1] === zhi2
}

function isHyeong(zhi1: string, zhi2: string): boolean {
  return HYEONG_GROUPS.some((g) => g.includes(zhi1) && g.includes(zhi2) && zhi1 !== zhi2)
}

// ===================== 조건 평가 함수 =====================

function evaluateCondition(cond: RuleCondition, ctx: EvalContext): { matched: boolean; detail: string } {
  switch (cond.type) {
    case 'HAS_SINSAL': {
      const name = cond.params.name as string
      const matched = ctx.sinsalNames.has(name)
      return { matched, detail: matched ? `${name} 존재` : `${name} 없음` }
    }

    case 'PILLAR_CHUNG': {
      const p1 = cond.params.pillar1 as string // 'year'|'month'|'day'|'time'
      const p2 = cond.params.pillar2 as string
      const zhi1 = ctx.sajuData.pillars[p1 as keyof typeof ctx.sajuData.pillars]?.zhi
      const zhi2 = ctx.sajuData.pillars[p2 as keyof typeof ctx.sajuData.pillars]?.zhi
      const matched = !!(zhi1 && zhi2 && isChung(zhi1, zhi2))
      return { matched, detail: matched ? `${p1}지↔${p2}지 충` : `${p1}지↔${p2}지 충 없음` }
    }

    case 'PILLAR_HYEONG': {
      const p1 = cond.params.pillar1 as string
      const p2 = cond.params.pillar2 as string
      const zhi1 = ctx.sajuData.pillars[p1 as keyof typeof ctx.sajuData.pillars]?.zhi
      const zhi2 = ctx.sajuData.pillars[p2 as keyof typeof ctx.sajuData.pillars]?.zhi
      const matched = !!(zhi1 && zhi2 && isHyeong(zhi1, zhi2))
      return { matched, detail: matched ? `${p1}지↔${p2}지 형` : `${p1}지↔${p2}지 형 없음` }
    }

    case 'GONGMANG_AT': {
      const pillar = cond.params.pillar as string // '년지', '월지', '일지', '시지'
      const matched = ctx.warnings.gongmang.affectedPillars.includes(pillar)
      return { matched, detail: matched ? `${pillar} 공망` : `${pillar} 공망 없음` }
    }

    case 'SIPSEONG_COUNT': {
      const name = cond.params.name as string
      const op = (cond.params.op as string) || '>='
      const value = cond.params.value as number
      const count = ctx.sipseongDist[name] || 0
      const matched = op === '>=' ? count >= value : op === '==' ? count === value : count > value
      return { matched, detail: `${name} ${count}개 (${op}${value})` }
    }

    case 'STRENGTH': {
      const expected = cond.params.value as string
      const matched = ctx.sipseong.strengthAssessment === expected
      return { matched, detail: `${ctx.sipseong.strengthAssessment} (기대: ${expected})` }
    }

    case 'ELEMENT_ABSENT': {
      const el = cond.params.element as string
      const count = ctx.sajuData.elementsDistribution[el] || 0
      const matched = count === 0
      return { matched, detail: matched ? `${el} 부재` : `${el} ${count}개 존재` }
    }

    case 'ELEMENT_EXCESS': {
      const el = cond.params.element as string
      const min = cond.params.min as number
      const count = ctx.sajuData.elementsDistribution[el] || 0
      const matched = count >= min
      return { matched, detail: `${el} ${count}개 (>=${min})` }
    }

    case 'SAMJAE_ACTIVE': {
      const matched = ctx.warnings.samjae.isActive
      return { matched, detail: matched ? `삼재 발동(${ctx.warnings.samjae.phase})` : '삼재 미발동' }
    }

    case 'WONJIN_EXISTS': {
      const matched = ctx.warnings.wonjinsal.pairs.length > 0
      return { matched, detail: matched ? '원진살 존재' : '원진살 없음' }
    }

    case 'BAEKHO_EXISTS': {
      const matched = ctx.warnings.baekhosal.found
      return { matched, detail: matched ? '백호대살 존재' : '백호대살 없음' }
    }

    case 'DOMINANT_RELATION': {
      // 간단히 sipseong의 지배 관계로 판단
      const expected = cond.params.type as string // '화합' | '갈등'
      const dominant = ctx.sipseong.dominantSipseong
      const conflictTypes = ['편관', '상관', '겁재']
      const _harmonyTypes = ['정관', '정인', '식신', '정재']
      const isConflict = conflictTypes.includes(dominant)
      const matched = expected === '갈등' ? isConflict : !isConflict
      return { matched, detail: `지배 십성: ${dominant} (${isConflict ? '갈등형' : '화합형'})` }
    }

    default:
      return { matched: false, detail: `알 수 없는 조건: ${cond.type}` }
  }
}

// ===================== 25개 규칙 정의 =====================

const RULES: SajuRule[] = [
  // === 타향살이 (3) ===
  {
    id: 'TAHYANG_01',
    name: '객지 자수성가',
    source: '사주첩경',
    category: '타향살이',
    conditions: [
      { type: 'HAS_SINSAL', params: { name: '지살' } },
      { type: 'PILLAR_CHUNG', params: { pillar1: 'day', pillar2: 'month' } },
      { type: 'GONGMANG_AT', params: { pillar: '월지' } },
    ],
    minMatch: 1,
    conclusion: {
      summary: '고향을 떠나 객지에서 자수성가할 명식',
      detail: '뿌리(고향)와의 연이 약해 멀리 떠나야 발복합니다. 타향에서의 도전이 오히려 큰 성공으로 이어집니다.',
      severity: 'info',
      actionItems: ['대도시나 해외 진출을 적극 고려하십시오', '고향에 지나치게 집착하지 마십시오'],
    },
    weight: 7,
  },
  {
    id: 'TAHYANG_02',
    name: '잦은 이동·해외운',
    source: '사주첩경',
    category: '타향살이',
    conditions: [
      { type: 'HAS_SINSAL', params: { name: '역마살' } },
      { type: 'SIPSEONG_COUNT', params: { name: '편인', op: '>=', value: 2 } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '잦은 이동과 해외 생활 가능성이 높은 명식',
      detail: '역마와 편인이 결합하여 비범한 지적 호기심으로 세계를 돌아다니게 됩니다.',
      severity: 'info',
      actionItems: ['외국어 학습에 투자하십시오', '해외 관련 직종을 탐색하십시오'],
    },
    weight: 6,
  },
  {
    id: 'TAHYANG_03',
    name: '부모 떠남',
    source: '명리요강',
    category: '타향살이',
    conditions: [
      { type: 'PILLAR_CHUNG', params: { pillar1: 'year', pillar2: 'day' } },
      { type: 'HAS_SINSAL', params: { name: '역마살' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '부모와 멀리 떨어져 사는 운',
      detail: '년주와 일주의 충돌은 조상·부모 궁과 자아 궁의 불일치를 의미합니다.',
      severity: 'caution',
      actionItems: ['부모님과의 유대를 의식적으로 유지하십시오'],
    },
    weight: 5,
  },

  // === 이혼수 (3) ===
  {
    id: 'DIVORCE_01',
    name: '배우자 파탄 위험',
    source: '사주첩경',
    category: '이혼수',
    conditions: [
      { type: 'PILLAR_CHUNG', params: { pillar1: 'day', pillar2: 'month' } },
      { type: 'SIPSEONG_COUNT', params: { name: '상관', op: '>=', value: 2 } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '배우자 관계 파탄 위험이 있는 명식',
      detail: '일지(배우자궁)와 월지의 충, 상관 과다가 결합하여 결혼 생활이 불안정할 수 있습니다.',
      severity: 'warning',
      actionItems: ['배우자와의 소통에 특별히 주의하십시오', '감정적 폭발을 자제하십시오'],
    },
    weight: 8,
  },
  {
    id: 'DIVORCE_02',
    name: '이성 문제 가정 불안',
    source: '사주첩경',
    category: '이혼수',
    conditions: [
      { type: 'GONGMANG_AT', params: { pillar: '일지' } },
      { type: 'HAS_SINSAL', params: { name: '도화살' } },
      { type: 'SIPSEONG_COUNT', params: { name: '편재', op: '>=', value: 2 } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '이성 문제로 인한 가정 불안',
      detail: '일지 공망에 도화와 편재가 결합하여 외부 유혹에 취약합니다.',
      severity: 'warning',
      actionItems: ['배우자를 최우선으로 하는 의식적 노력이 필요합니다'],
    },
    weight: 7,
  },
  {
    id: 'DIVORCE_03',
    name: '만혼·불화',
    source: '명리요강',
    category: '이혼수',
    conditions: [
      { type: 'WONJIN_EXISTS', params: {} },
      { type: 'PILLAR_HYEONG', params: { pillar1: 'day', pillar2: 'time' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '만혼하거나 배우자와 불화가 잦은 명식',
      detail: '원진살과 일시 형이 결합하여 부부궁에 마찰이 끊이지 않습니다.',
      severity: 'caution',
      actionItems: ['서두르지 말고 충분히 알아본 후 결혼을 결정하십시오'],
    },
    weight: 6,
  },

  // === 재물파탄 (3) ===
  {
    id: 'WEALTH_RUIN_01',
    name: '투자·보증 손실',
    source: '사주첩경',
    category: '재물파탄',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '겁재', op: '>=', value: 2 } },
      { type: 'SIPSEONG_COUNT', params: { name: '편재', op: '>=', value: 1 } },
      { type: 'STRENGTH', params: { value: '신약' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '투자 손실, 보증 위험이 높은 명식',
      detail: '겁재가 편재를 빼앗아가는 구조입니다. 신약한 일간이 이를 제어하지 못합니다.',
      severity: 'critical',
      actionItems: ['절대로 타인의 보증을 서지 마십시오', '고위험 투자를 피하십시오'],
    },
    weight: 9,
  },
  {
    id: 'WEALTH_RUIN_02',
    name: '재물 산란',
    source: '명리요강',
    category: '재물파탄',
    conditions: [
      { type: 'GONGMANG_AT', params: { pillar: '일지' } },
      { type: 'SIPSEONG_COUNT', params: { name: '비견', op: '>=', value: 2 } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '재물이 모이지 않는 구조',
      detail: '재성 궁에 공망이 걸리고 비겁이 과다하여 모은 재물이 흩어집니다.',
      severity: 'warning',
      actionItems: ['저축 습관을 철저히 기르십시오', '공동 투자를 피하십시오'],
    },
    weight: 7,
  },
  {
    id: 'WEALTH_RUIN_03',
    name: '투기 대실패',
    source: '사주첩경',
    category: '재물파탄',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '편재', op: '>=', value: 3 } },
      { type: 'SAMJAE_ACTIVE', params: {} },
    ],
    minMatch: 2,
    conclusion: {
      summary: '투기 대실패 위험 시기',
      detail: '편재 과다에 삼재까지 겹쳐 도박적 투자가 큰 손실로 이어질 수 있습니다.',
      severity: 'critical',
      actionItems: ['삼재 기간 동안 모든 투기성 행위를 중단하십시오'],
    },
    weight: 9,
  },

  // === 관재구설 (2) ===
  {
    id: 'LEGAL_01',
    name: '법적 분쟁 위험',
    source: '사주첩경',
    category: '관재구설',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '편관', op: '>=', value: 2 } },
      { type: 'SIPSEONG_COUNT', params: { name: '상관', op: '>=', value: 1 } },
      { type: 'DOMINANT_RELATION', params: { type: '갈등' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '법적 분쟁, 시비 주의',
      detail: '편관(칠살)과 상관이 교전하여 권위와의 충돌이 빈번합니다.',
      severity: 'warning',
      actionItems: ['분쟁 발생 시 감정을 절제하고 법률 전문가에게 상담하십시오'],
    },
    weight: 8,
  },
  {
    id: 'LEGAL_02',
    name: '소송·폭력 위험',
    source: '명리요강',
    category: '관재구설',
    conditions: [
      { type: 'BAEKHO_EXISTS', params: {} },
      { type: 'SIPSEONG_COUNT', params: { name: '편관', op: '>=', value: 1 } },
      { type: 'WONJIN_EXISTS', params: {} },
    ],
    minMatch: 2,
    conclusion: {
      summary: '소송/폭력 사건 연루 위험',
      detail: '백호대살과 편관, 원진살이 결합하여 격렬한 충돌에 휘말릴 수 있습니다.',
      severity: 'critical',
      actionItems: ['위험한 장소와 사람을 피하십시오', '법적 분쟁에 특히 조심하십시오'],
    },
    weight: 9,
  },

  // === 귀인발복 (3) ===
  {
    id: 'BENEFACTOR_01',
    name: '귀인 위기 돌파',
    source: '사주첩경',
    category: '귀인발복',
    conditions: [
      { type: 'HAS_SINSAL', params: { name: '천을귀인' } },
      { type: 'SIPSEONG_COUNT', params: { name: '정인', op: '>=', value: 2 } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '귀인의 도움으로 위기를 돌파하는 명식',
      detail: '천을귀인과 정인이 결합하여 어려울 때 반드시 도움의 손길이 옵니다.',
      severity: 'info',
      actionItems: ['어른과의 관계를 소중히 여기십시오', '감사의 마음을 표현하십시오'],
    },
    weight: 7,
  },
  {
    id: 'BENEFACTOR_02',
    name: '학문·공직 발복',
    source: '사주첩경',
    category: '귀인발복',
    conditions: [
      { type: 'HAS_SINSAL', params: { name: '문창귀인' } },
      { type: 'SIPSEONG_COUNT', params: { name: '정관', op: '>=', value: 1 } },
      { type: 'STRENGTH', params: { value: '신강' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '학문/시험으로 발복, 공직 적성',
      detail: '문창귀인과 정관이 신강한 일간을 만나 학문적 성취가 탁월합니다.',
      severity: 'info',
      actionItems: ['공무원, 교수, 법조인 등 공직 계열을 고려하십시오'],
    },
    weight: 7,
  },
  {
    id: 'BENEFACTOR_03',
    name: '정직한 노력의 결실',
    source: '명리요강',
    category: '귀인발복',
    conditions: [
      { type: 'HAS_SINSAL', params: { name: '천을귀인' } },
      { type: 'SIPSEONG_COUNT', params: { name: '정재', op: '>=', value: 1 } },
      { type: 'SIPSEONG_COUNT', params: { name: '식신', op: '>=', value: 1 } },
    ],
    minMatch: 3,
    conclusion: {
      summary: '정직한 노력이 귀인을 만나 결실을 맺는 명식',
      detail: '천을귀인·정재·식신의 삼위일체로 묵묵한 노력이 반드시 보상받습니다.',
      severity: 'info',
      actionItems: ['꾸준함을 유지하고, 성급한 변화보다 점진적 성장을 추구하십시오'],
    },
    weight: 6,
  },

  // === 조기성공 / 대기만성 (3) ===
  {
    id: 'EARLY_01',
    name: '30대 이전 두각',
    source: '사주첩경',
    category: '조기성공',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '식신', op: '>=', value: 1 } },
      { type: 'STRENGTH', params: { value: '신강' } },
      { type: 'HAS_SINSAL', params: { name: '도화살' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '30대 이전에 두각을 나타내는 명식',
      detail: '신강한 기운에 식신의 표현력과 도화의 매력이 더해져 젊은 나이에 주목받습니다.',
      severity: 'info',
      actionItems: ['초반 기회를 놓치지 마십시오', '20~30대에 승부를 걸어야 합니다'],
    },
    weight: 6,
  },
  {
    id: 'LATE_01',
    name: '50대 이후 만개',
    source: '명리요강',
    category: '대기만성',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '편인', op: '>=', value: 2 } },
      { type: 'STRENGTH', params: { value: '신약' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '50대 이후 만개하는 대기만성형 명식',
      detail: '편인 과다와 신약은 젊을 때 빛을 발하기 어렵지만, 깊은 내공이 쌓이면 후반에 폭발합니다.',
      severity: 'info',
      actionItems: ['조급해하지 마십시오', '40대까지 실력을 묵묵히 쌓는 시기입니다'],
    },
    weight: 6,
  },
  {
    id: 'LATE_02',
    name: '학문 만성형',
    source: '사주첩경',
    category: '대기만성',
    conditions: [
      { type: 'HAS_SINSAL', params: { name: '화개살' } },
      { type: 'SIPSEONG_COUNT', params: { name: '편인', op: '>=', value: 1 } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '학문의 깊이를 쌓아 늦게 인정받는 명식',
      detail: '화개살과 편인이 결합하여 예술·종교·학문 분야에서 장기간 연구 후 대성합니다.',
      severity: 'info',
      actionItems: ['한 분야에 깊이 몰입하십시오', '대중의 인정보다 자기 만족을 우선하십시오'],
    },
    weight: 5,
  },

  // === 건강위험 (3) ===
  {
    id: 'HEALTH_01',
    name: '신장·방광 취약',
    source: '명리요강',
    category: '건강위험',
    conditions: [{ type: 'ELEMENT_ABSENT', params: { element: '水' } }],
    conclusion: {
      summary: '신장·방광 계통 취약 체질',
      detail: '사주에 水 기운이 전무하여 비뇨기 계통이 선천적으로 약합니다.',
      severity: 'caution',
      actionItems: ['수분 섭취를 충분히 하십시오', '신장 관련 정기 검진을 받으십시오'],
    },
    weight: 5,
  },
  {
    id: 'HEALTH_02',
    name: '심장·폐 과부하',
    source: '명리요강',
    category: '건강위험',
    conditions: [
      { type: 'ELEMENT_EXCESS', params: { element: '火', min: 3 } },
      { type: 'ELEMENT_ABSENT', params: { element: '金' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '심장·혈압 과부하, 폐 취약',
      detail: '火 과다에 金 부재로 심혈관계에 무리가 가고 호흡기가 약합니다.',
      severity: 'warning',
      actionItems: ['격렬한 운동을 피하고 심혈관 검진을 받으십시오'],
    },
    weight: 7,
  },
  {
    id: 'HEALTH_03',
    name: '사고·수술 위험',
    source: '사주첩경',
    category: '건강위험',
    conditions: [
      { type: 'SAMJAE_ACTIVE', params: {} },
      { type: 'BAEKHO_EXISTS', params: {} },
    ],
    minMatch: 2,
    conclusion: {
      summary: '사고·수술 위험 시기',
      detail: '삼재와 백호대살이 겹쳐 돌발 사고나 수술의 가능성이 높습니다.',
      severity: 'critical',
      actionItems: ['위험한 활동과 장거리 운전을 삼가십시오', '건강 검진을 즉시 받으십시오'],
    },
    weight: 9,
  },

  // === 직업적성 (3) ===
  {
    id: 'CAREER_01',
    name: '창작·예술 적성',
    source: '사주첩경',
    category: '직업적성',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '식신', op: '>=', value: 1 } },
      { type: 'SIPSEONG_COUNT', params: { name: '상관', op: '>=', value: 1 } },
      { type: 'HAS_SINSAL', params: { name: '도화살' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '창작/예술/엔터테인먼트 적성',
      detail: '식상의 표현력과 도화의 매력 자본이 결합한 타고난 크리에이터입니다.',
      severity: 'info',
      actionItems: ['창작·미디어·엔터테인먼트 분야에 진출을 고려하십시오'],
    },
    weight: 6,
  },
  {
    id: 'CAREER_02',
    name: '학자·법조인 적성',
    source: '명리요강',
    category: '직업적성',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '정관', op: '>=', value: 1 } },
      { type: 'SIPSEONG_COUNT', params: { name: '정인', op: '>=', value: 1 } },
      { type: 'HAS_SINSAL', params: { name: '문창귀인' } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '교수/법조인/고위 공무원 적성',
      detail: '정관·정인·문창의 조합은 학문과 권위를 겸비한 명석한 두뇌입니다.',
      severity: 'info',
      actionItems: ['학문·법률·행정 분야에서 커리어를 설계하십시오'],
    },
    weight: 6,
  },
  {
    id: 'CAREER_03',
    name: '무역·창업 적성',
    source: '사주첩경',
    category: '직업적성',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '편재', op: '>=', value: 1 } },
      { type: 'HAS_SINSAL', params: { name: '역마살' } },
      { type: 'SIPSEONG_COUNT', params: { name: '상관', op: '>=', value: 1 } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '무역/창업/투자 적성',
      detail: '편재의 사업 안목, 역마의 이동력, 상관의 혁신력이 결합된 기업가 기질입니다.',
      severity: 'info',
      actionItems: ['글로벌 무역이나 스타트업 창업을 고려하십시오'],
    },
    weight: 6,
  },

  // === 결혼운 / 자녀운 (2) ===
  {
    id: 'MARRIAGE_01',
    name: '좋은 배우자 인연',
    source: '명리요강',
    category: '결혼운',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '정재', op: '>=', value: 1 } },
      { type: 'SIPSEONG_COUNT', params: { name: '정관', op: '>=', value: 1 } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '좋은 배우자 인연이 있는 명식',
      detail: '정재와 정관이 함께하여 안정적이고 신뢰할 수 있는 배우자를 만납니다.',
      severity: 'info',
      actionItems: ['배우자의 의견을 존중하고 동반 성장을 추구하십시오'],
    },
    weight: 5,
  },
  {
    id: 'CHILDREN_01',
    name: '자녀복 풍부',
    source: '사주첩경',
    category: '자녀운',
    conditions: [
      { type: 'SIPSEONG_COUNT', params: { name: '식신', op: '>=', value: 1 } },
      { type: 'SIPSEONG_COUNT', params: { name: '상관', op: '>=', value: 1 } },
    ],
    minMatch: 2,
    conclusion: {
      summary: '자녀복이 풍부한 명식',
      detail: '식상이 시주에 고루 분포하여 자녀와의 관계가 원만하고 자녀가 성공합니다.',
      severity: 'info',
      actionItems: ['자녀의 창의성을 존중하고 자유롭게 키우십시오'],
    },
    weight: 5,
  },
]

// ===================== 메인 평가 함수 =====================

function buildEvalContext(
  sajuData: SajuData,
  sipseong: SipseongMap,
  warnings: WarningsResult,
  sinsal: SinsalResult[]
): EvalContext {
  return {
    sajuData,
    sipseong,
    warnings,
    sinsal,
    natalZhis: [
      sajuData.pillars.year.zhi,
      sajuData.pillars.month.zhi,
      sajuData.pillars.day.zhi,
      sajuData.pillars.time.zhi,
    ],
    natalGans: [
      sajuData.pillars.year.gan,
      sajuData.pillars.month.gan,
      sajuData.pillars.day.gan,
      sajuData.pillars.time.gan,
    ],
    sinsalNames: new Set(sinsal.map((s) => s.name)),
    sipseongDist: sipseong.distribution,
    hasChung: (p1, p2) => {
      const z1 = sajuData.pillars[p1 as keyof typeof sajuData.pillars]?.zhi
      const z2 = sajuData.pillars[p2 as keyof typeof sajuData.pillars]?.zhi
      return !!(z1 && z2 && isChung(z1, z2))
    },
    hasHyeong: (p1, p2) => {
      const z1 = sajuData.pillars[p1 as keyof typeof sajuData.pillars]?.zhi
      const z2 = sajuData.pillars[p2 as keyof typeof sajuData.pillars]?.zhi
      return !!(z1 && z2 && isHyeong(z1, z2))
    },
  }
}

export function evaluateAllRules(
  sajuData: SajuData,
  sipseong: SipseongMap,
  warnings: WarningsResult,
  sinsal: SinsalResult[]
): RuleBaseResult {
  const ctx = buildEvalContext(sajuData, sipseong, warnings, sinsal)
  const matches: RuleMatchResult[] = []

  for (const rule of RULES) {
    const results = rule.conditions.map((c) => evaluateCondition(c, ctx))
    const matchedCount = results.filter((r) => r.matched).length
    const required = rule.minMatch ?? rule.conditions.length

    if (matchedCount < 1) continue

    const confidence =
      matchedCount >= required ? 0.7 + 0.3 * (matchedCount / rule.conditions.length) : (matchedCount / required) * 0.7

    if (confidence < 0.3) continue

    matches.push({
      rule,
      matchedCount,
      totalConditions: rule.conditions.length,
      confidence,
      matchDetails: results.filter((r) => r.matched).map((r) => r.detail),
    })
  }

  // confidence 내림차순 정렬
  matches.sort((a, b) => b.confidence - a.confidence || b.rule.weight - a.rule.weight)

  const strongMatches = matches.filter((m) => m.confidence >= 0.7)

  // 카테고리별 분류
  const categories: Partial<Record<RuleCategory, RuleMatchResult[]>> = {}
  for (const m of matches) {
    if (!categories[m.rule.category]) categories[m.rule.category] = []
    categories[m.rule.category]!.push(m)
  }

  // AI 프롬프트 주입 텍스트
  const ruleContext = buildRuleContextText(strongMatches, matches)

  return { matches, strongMatches, categories, ruleContext }
}

export function buildRuleContextText(strong: RuleMatchResult[], all: RuleMatchResult[]): string {
  if (all.length === 0) return ''

  const lines: string[] = ['### 사주첩경 규칙 기반 판정 (Ground Truth)']

  if (strong.length > 0) {
    lines.push('[강력 판정] (confidence >= 0.7)')
    for (const m of strong.slice(0, 5)) {
      lines.push(
        `- ${m.rule.category}: "${m.rule.conclusion.summary}" (출처: ${m.rule.source}, 신뢰도: ${m.confidence.toFixed(2)})`
      )
      for (const a of m.rule.conclusion.actionItems) {
        lines.push(`  → ${a}`)
      }
    }
  }

  const refs = all.filter((m) => m.confidence < 0.7).slice(0, 3)
  if (refs.length > 0) {
    lines.push('[참고 판정] (0.3 <= confidence < 0.7)')
    for (const m of refs) {
      lines.push(`- ${m.rule.category}: "${m.rule.conclusion.summary}" (신뢰도: ${m.confidence.toFixed(2)})`)
    }
  }

  lines.push('')
  lines.push(
    '[판정 원칙] 위 규칙 기반 판정은 고전 명리서의 실전 공식입니다. AI는 이 판정을 최우선 Ground Truth로 채택하고, 위 결론과 모순되는 해석을 생성하지 마십시오.'
  )

  return lines.join('\n')
}
