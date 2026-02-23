/**
 * 해화지기 사주 엔진 - 경고/단점 분석 모듈 (engine02.md 기반)
 * 기구신 추출, 공망/삼재 연산, 흉살 감지, 일간별 핵심 단점 파악
 * "진정한 리스크 매니지먼트: 강점보다 약점을 먼저 꿰뚫어야 한다"
 */

import type { SajuData } from '@/lib/domain/saju/saju'
import type { YongsinAnalysis } from '@/lib/domain/saju/saju-analysis'
import type { SipseongMap } from './sipseong'
import { BAEKHODA_ILJU, WONJIN_PAIRS } from './sinsal-extended'

// ===================== 상수 데이터 =====================

const GAN_INDEX: Record<string, number> = {
  甲: 0,
  乙: 1,
  丙: 2,
  丁: 3,
  戊: 4,
  己: 5,
  庚: 6,
  辛: 7,
  壬: 8,
  癸: 9,
}

const ZHI_INDEX: Record<string, number> = {
  子: 0,
  丑: 1,
  寅: 2,
  卯: 3,
  辰: 4,
  巳: 5,
  午: 6,
  未: 7,
  申: 8,
  酉: 9,
  戌: 10,
  亥: 11,
}
const ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ZHI_KOR: Record<string, string> = {
  子: '자(쥐)',
  丑: '축(소)',
  寅: '인(호랑이)',
  卯: '묘(토끼)',
  辰: '진(용)',
  巳: '사(뱀)',
  午: '오(말)',
  未: '미(양)',
  申: '신(원숭이)',
  酉: '유(닭)',
  戌: '술(개)',
  亥: '해(돼지)',
}

/** 기구신 오행 → 회피 파라미터 매핑 (engine02.md 표) */
const GIGUSIN_MAP: Record<
  string,
  {
    colorKorean: string
    colors: string[]
    direction: string
    numbers: number[]
    relationship: string
  }
> = {
  木: {
    colorKorean: '청·녹색',
    colors: ['#228B22', '#006400', '#00FF7F'],
    direction: '동쪽',
    numbers: [3, 8],
    relationship: '비겁 — 경쟁자, 동업자 관계',
  },
  火: {
    colorKorean: '적·자색',
    colors: ['#FF0000', '#8B0000', '#FF1493'],
    direction: '남쪽',
    numbers: [2, 7],
    relationship: '식상 — 무리한 표현, 아랫사람 갈등',
  },
  土: {
    colorKorean: '황·갈색',
    colors: ['#DAA520', '#8B6914', '#D2B48C'],
    direction: '중앙',
    numbers: [5, 0],
    relationship: '재성 — 무리한 투자, 이성 관계',
  },
  金: {
    colorKorean: '백·은색',
    colors: ['#FFFFFF', '#C0C0C0', '#E8E8E8'],
    direction: '서쪽',
    numbers: [4, 9],
    relationship: '관성 — 권위주의 상사, 관재구설',
  },
  水: {
    colorKorean: '흑·회색',
    colors: ['#000000', '#2F4F4F', '#696969'],
    direction: '북쪽',
    numbers: [1, 6],
    relationship: '인성 — 계약·문서 과부하, 의존 관계',
  },
}

/** 구신: 기신을 생하는 오행 (기신의 어머니) */
const GUSIN_FROM_GISIN: Record<string, string> = {
  木: '水',
  火: '木',
  土: '火',
  金: '土',
  水: '金',
}
const ELEMENT_KOR: Record<string, string> = { 木: '목(木)', 火: '화(火)', 土: '토(土)', 金: '금(金)', 水: '수(水)' }

/** 삼재 발동 매핑: 생년 지지 → 삼재 3년 지지 (들삼재, 눌삼재, 날삼재 순) */
const SAMJAE_MAP: Record<string, [string, string, string]> = {
  申: ['寅', '卯', '辰'],
  子: ['寅', '卯', '辰'],
  辰: ['寅', '卯', '辰'],
  亥: ['巳', '午', '未'],
  卯: ['巳', '午', '未'],
  未: ['巳', '午', '未'],
  寅: ['申', '酉', '戌'],
  午: ['申', '酉', '戌'],
  戌: ['申', '酉', '戌'],
  巳: ['亥', '子', '丑'],
  酉: ['亥', '子', '丑'],
  丑: ['亥', '子', '丑'],
}

/** 일간별 타고난 핵심 단점 (engine02.md: 긍정 편향 극복 원칙) */
const DAY_MASTER_FLAWS: Record<
  string,
  {
    flaws: string[]
    blindSpots: string[]
    relationshipIssue: string
    healthRisks: string[]
  }
> = {
  甲: {
    flaws: [
      '강한 고집이 타인의 의견을 차단함',
      '한 방향으로만 뚫으려 해 유연성이 부족함',
      '자존심이 상하면 비이성적 결정을 내림',
    ],
    blindSpots: ['협력보다 독립을 과신하는 경향', '결과에 집착해 과정에서 관계를 해침'],
    relationshipIssue: '권위적 태도로 수평적 인간관계 형성이 어려움',
    healthRisks: ['간·담낭 계통 질환', '근육 경직·관절 이상'],
  },
  乙: {
    flaws: [
      '독립성이 약해 타인에게 지나치게 의존함',
      '외부 자극에 과민하게 흔들려 결정이 늦음',
      '내면의 불안을 숨기다 한꺼번에 폭발함',
    ],
    blindSpots: ['헌신처럼 보이지만 사실은 두려움에서 기인한 행동', '칭찬에 취약해 냉정한 판단이 흐려짐'],
    relationshipIssue: '감정 과의존으로 상대가 답답함을 느낌',
    healthRisks: ['폐·기관지 약화', '면역 저하·알레르기'],
  },
  丙: {
    flaws: [
      '자기 확신이 지나쳐 주변의 경고를 무시함',
      '에너지를 분산시켜 한 분야를 깊게 파지 못함',
      '인정 욕구가 강해 타인 평가에 지나치게 반응함',
    ],
    blindSpots: ['화려함 뒤에 내면의 공허를 가리는 경향', '충동적 결정 후 책임 회피'],
    relationshipIssue: '자기 중심적 관심 독점으로 관계가 일방통행이 됨',
    healthRisks: ['심장·혈압 이상', '안구 피로·시력 저하'],
  },
  丁: {
    flaws: [
      '감정 기복이 심해 관계의 일관성이 낮음',
      '집착적 완벽주의로 스스로를 소진시킴',
      '내면의 상처를 오래 품어 분노가 누적됨',
    ],
    blindSpots: ['사소한 배신도 오래 기억하는 복수심', '이상과 현실의 괴리를 타인 탓으로 돌림'],
    relationshipIssue: '기대치가 높아 상대가 늘 부족하게 느껴짐',
    healthRisks: ['심장·신경계 불안정', '불면증·만성 피로'],
  },
  戊: {
    flaws: [
      '변화를 거부하고 현상 유지에 집착함',
      '무거운 책임감이 유연성을 가로막음',
      '고집스러운 침묵으로 갈등이 내재화됨',
    ],
    blindSpots: ['과묵함이 무관심으로 해석됨', '변화의 신호를 뒤늦게 인식하는 경향'],
    relationshipIssue: '감정 표현 부족으로 상대가 외로움을 느낌',
    healthRisks: ['비위·소화기 계통', '당뇨·혈당 불균형'],
  },
  己: {
    flaws: [
      '지나친 걱정과 세밀함이 행동력을 저해함',
      '우유부단함으로 기회를 반복적으로 놓침',
      '타인 감정에 과도하게 개입해 경계가 무너짐',
    ],
    blindSpots: ['봉사처럼 보이나 무의식적 통제욕이 숨어있음', '낮은 자존감을 헌신으로 보상하려 함'],
    relationshipIssue: '지나친 간섭으로 상대의 자율성을 침해함',
    healthRisks: ['위장·비장 이상', '만성 소화불량·복부 팽만'],
  },
  庚: {
    flaws: [
      '냉철함이 공감 능력 부족으로 오해받음',
      '원칙 고수가 인간관계를 차갑게 만듦',
      '강한 자존심이 용서와 화해를 어렵게 함',
    ],
    blindSpots: ['효율 중심 사고로 감정을 비합리적이라 무시함', '목표 달성 후 공허함을 다음 목표로 채우는 반복'],
    relationshipIssue: '다가가기 어려운 분위기로 깊은 관계 형성이 힘듦',
    healthRisks: ['폐·대장 계통', '피부 트러블·호흡기 질환'],
  },
  辛: {
    flaws: [
      '예민함이 과도해 작은 자극에도 상처를 받음',
      '완벽주의 기준이 타인에게도 강요됨',
      '내면의 날카로움이 언어로 표출되어 갈등 유발',
    ],
    blindSpots: ['외모·환경 완벽 집착으로 에너지가 소진됨', '자신의 취약함을 절대 인정하지 않으려 함'],
    relationshipIssue: '비판적 눈빛이 상대에게 위축감을 줌',
    healthRisks: ['폐·기관지 민감', '피부 질환·알레르기'],
  },
  壬: {
    flaws: [
      '감정의 깊이를 드러내지 않아 불신을 유발함',
      '흐름을 따르다 주관 없이 방황하기도 함',
      '욕심의 범위가 넓어 집중력이 분산됨',
    ],
    blindSpots: ['자유를 추구한다는 명분으로 책임을 회피함', '신비주의적 태도로 진짜 의도를 감춤'],
    relationshipIssue: '깊어질수록 사라지는 특성으로 친밀감 형성이 어려움',
    healthRisks: ['신장·방광 계통', '부종·냉증'],
  },
  癸: {
    flaws: [
      '지나친 내성이 기회를 놓치게 만듦',
      '부정적 감정을 속으로만 삭여 우울감으로 이어짐',
      '자기 보호 본능이 강해 진정한 친밀감 형성이 어려움',
    ],
    blindSpots: ['감수성을 이용해 동정을 유도하는 경향', '실패에 대한 두려움이 시작 자체를 막음'],
    relationshipIssue: '피해의식이 강해 작은 갈등도 큰 상처로 남음',
    healthRisks: ['신장·생식기 이상', '혈액순환 장애·냉증'],
  },
}

/** 십성 과다 단점 (2개 이상일 때 발동) */
const SIPSEONG_EXCESS_FLAWS: Record<string, { weakness: string; mitigation: string }> = {
  비견: {
    weakness: '경쟁 심리가 과해 협력을 거부, 재물이 흩어지고 관계가 분열됨',
    mitigation: '동업 전 계약 명확화, 독불장군식 결정 경계',
  },
  겁재: {
    weakness: '충동적 경쟁심으로 투자 손실·대인 분쟁이 잦고, 재물이 새나가는 구멍이 생김',
    mitigation: '재정 규칙 수립, 즉흥 투자 금지',
  },
  식신: {
    weakness: '현실 감각 없는 낙관주의로 행동이 산만해지고, 나태함으로 이어짐',
    mitigation: '구체적 목표·마감일 설정, 규율 강화',
  },
  상관: {
    weakness: '자기표현 욕구가 통제를 잃어 분쟁을 자초하고, 윗사람과의 마찰이 잦아짐',
    mitigation: '언어 절제 훈련, 감정 일기 작성',
  },
  편재: {
    weakness: '투기성 욕망으로 무리한 모험을 감행, 재물 손실과 이성 문제가 불거짐',
    mitigation: '재테크 전문가 활용, 이성 관계 경계 설정',
  },
  정재: {
    weakness: '소유욕·통제 욕구가 강해 인간관계가 경직되고 변화를 극도로 거부함',
    mitigation: '유연성 훈련, 작은 위험 감수 연습',
  },
  편관: {
    weakness: '권위에 대한 반발과 공격성이 강해지고, 과로와 스트레스로 건강이 소진됨',
    mitigation: '규칙적 해소 루틴, 상사와의 소통 채널 확보',
  },
  정관: {
    weakness: '체면·규율 집착으로 자유로운 발상을 억압, 기회 앞에서 과도하게 망설임',
    mitigation: '적정 기준 설정, 완벽주의 기준 낮추기',
  },
  편인: {
    weakness: '현실 도피와 고독감이 깊어지고, 예민함이 의심으로 변해 신뢰 관계 붕괴',
    mitigation: '실행력 강화 과제, 규칙적 사회 참여',
  },
  정인: {
    weakness: '의존성이 강해져 독립적 판단력이 약화되고, 소극적 태도로 기회를 놓침',
    mitigation: '독립적 실행 습관, 결정 권한 스스로 행사',
  },
}

// ===================== 타입 정의 =====================

export interface GigusinWarning {
  gisinElement: string // 기신 오행 (예: '金')
  gusinElement: string // 구신 오행 (기신을 생하는 오행)
  gisinKorean: string
  gusinKorean: string
  avoidColors: string[] // 회피 색상 이름 (예: ['백·은색'])
  avoidColorHexes: string[] // hex 코드
  avoidDirections: string[]
  avoidNumbers: number[]
  avoidRelationships: string[]
  description: string
}

export interface GongmangResult {
  zhi1: string // 첫 번째 공망 지지
  zhi2: string // 두 번째 공망 지지
  zhi1Kor: string
  zhi2Kor: string
  affectedPillars: string[] // 공망이 있는 기둥 (예: ['년지', '시지'])
  hasSevere: boolean // 일지·월지에 공망 있으면 중증
  description: string
  warning: string
}

export interface SamjaeResult {
  isActive: boolean
  phase: '들삼재' | '눌삼재' | '날삼재' | null
  samjaeYears: number[] // 삼재 3년
  currentYear: number
  description: string
  warning: string
}

export interface WonjinsalResult {
  found: boolean
  pairs: string[] // 예: ['子-未', '寅-酉']
  warning: string
}

export interface BaekhoResult {
  found: boolean
  dayPillar: string
  cautions: string[]
  warning: string
}

export interface DayMasterWeaknessResult {
  dayMaster: string
  flaws: string[]
  blindSpots: string[]
  relationshipIssue: string
  healthRisks: string[]
}

export interface SipseongExcessResult {
  list: Array<{ sipseong: string; count: number; weakness: string; mitigation: string }>
  hasExcess: boolean
}

export interface WarningsResult {
  gigusin: GigusinWarning | null
  gongmang: GongmangResult
  samjae: SamjaeResult
  wonjinsal: WonjinsalResult
  baekhosal: BaekhoResult
  dayMasterWeakness: DayMasterWeaknessResult
  sipseongExcess: SipseongExcessResult
  riskScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskLabel: string
  urgentActions: string[] // 즉각 행동 지침 최대 5개
  warningContext: string // AI 프롬프트 주입용 텍스트
}

// ===================== 계산 함수 =====================

/**
 * 공망(空亡) 계산 — engine02.md 모듈로 연산 기반
 * 일주의 천간·지지로 해당 순(旬)의 마지막 두 지지(공망) 도출
 */
function calculateGongmang(dayGan: string, dayZhi: string, allZhis: Record<string, string>): GongmangResult {
  const ganIdx = GAN_INDEX[dayGan] ?? 0
  const zhiIdx = ZHI_INDEX[dayZhi] ?? 0

  // 해당 순(旬)의 시작 지지 인덱스: (지지인덱스 - 천간인덱스 + 12) mod 12
  const sunStartZhiIdx = (((zhiIdx - ganIdx) % 12) + 12) % 12
  // 공망 = 시작 지지에서 10번째, 11번째 지지
  const gm1 = ZHI_LIST[(sunStartZhiIdx + 10) % 12]
  const gm2 = ZHI_LIST[(sunStartZhiIdx + 11) % 12]

  // 원국 내 공망 해당 기둥 확인
  const affectedPillars: string[] = []
  if (allZhis.year === gm1 || allZhis.year === gm2) affectedPillars.push('년지')
  if (allZhis.month === gm1 || allZhis.month === gm2) affectedPillars.push('월지')
  if (allZhis.day === gm1 || allZhis.day === gm2) affectedPillars.push('일지')
  if (allZhis.time === gm1 || allZhis.time === gm2) affectedPillars.push('시지')

  // 일지·월지 공망은 중증 (인생 핵심 기반이 흔들림)
  const hasSevere = affectedPillars.some((p) => p === '일지' || p === '월지')

  const desc =
    affectedPillars.length > 0
      ? `${affectedPillars.join('·')}에 공망이 작용 — 해당 기둥이 상징하는 영역(${affectedPillars.map((p) => pillarMeaning(p)).join(', ')})에서 노력이 허망해지거나 결과가 흩어지는 경향이 있습니다.`
      : `원국 내 기둥에는 공망 해당 없음. 단, 공망 지지(${ZHI_KOR[gm1]}, ${ZHI_KOR[gm2]}) 해(年)와 월에는 중요 결정을 삼가십시오.`

  return {
    zhi1: gm1,
    zhi2: gm2,
    zhi1Kor: ZHI_KOR[gm1] ?? gm1,
    zhi2Kor: ZHI_KOR[gm2] ?? gm2,
    affectedPillars,
    hasSevere,
    description: desc,
    warning: hasSevere
      ? `⚠️ 핵심 공망 — ${affectedPillars.join('·')}에 공망 작용. 부동산·결혼·사업 등 생애 기반 결정 전 반드시 개운법 실천 후 진행.`
      : affectedPillars.length > 0
        ? `공망 주의 — ${affectedPillars.join('·')} 해당. 공망 연·월에 계약·투자를 보류하십시오.`
        : `공망 지지(${gm1}·${gm2}) 해에는 중요 결정을 피하십시오.`,
  }
}

/** 기둥 위치별 상징 */
function pillarMeaning(pillar: string): string {
  const map: Record<string, string> = {
    년지: '조상·어린시절·사회적 기반',
    월지: '부모·직업·현재 환경',
    일지: '배우자·내 몸·일상',
    시지: '자녀·노년·미래',
  }
  return map[pillar] ?? pillar
}

/**
 * 삼재(三災) 판별 — 생년 지지 × 현재 연도 지지
 */
function calculateSamjae(yearZhi: string): SamjaeResult {
  const now = new Date()
  const currentYear = now.getFullYear()

  // 현재 연도의 지지 산출 (甲子년 1984 기준)
  const BASE_YEAR = 1984
  const currentZhiIdx = (((currentYear - BASE_YEAR) % 12) + 12) % 12
  const currentZhi = ZHI_LIST[currentZhiIdx]

  const triggers = SAMJAE_MAP[yearZhi]
  if (!triggers) {
    return { isActive: false, phase: null, samjaeYears: [], currentYear, description: '삼재 해당 없음', warning: '' }
  }

  // 삼재 3개년의 실제 연도 계산
  const firstTriggerZhiIdx = ZHI_INDEX[triggers[0]]
  const yearsToFirst = (((firstTriggerZhiIdx - currentZhiIdx) % 12) + 12) % 12
  const firstSamjaeYear = currentYear + yearsToFirst - (yearsToFirst === 0 ? 0 : 0)

  // 현재 삼재 구간인지 확인
  const phaseIdx = triggers.indexOf(currentZhi)
  const phases: ('들삼재' | '눌삼재' | '날삼재')[] = ['들삼재', '눌삼재', '날삼재']

  if (phaseIdx !== -1) {
    const phase = phases[phaseIdx]
    const startYear = currentYear - phaseIdx
    const samjaeYears = [startYear, startYear + 1, startYear + 2]

    const phaseWarnings: Record<'들삼재' | '눌삼재' | '날삼재', string> = {
      들삼재: '갑작스러운 재난·건강 악화·이사·이직 주의. 새로운 시작은 삼재 이후로 미루십시오.',
      눌삼재: '삼재 정점. 금전 손실·소송 분쟁·건강 문제가 겹칩니다. 투자·보증은 절대 금지.',
      날삼재: '마무리 구간. 대인 이별과 금전 손실 조심. 감사와 인내로 삼재를 마무리하십시오.',
    }

    return {
      isActive: true,
      phase,
      samjaeYears,
      currentYear,
      description: `${samjaeYears[0]}~${samjaeYears[2]}년 삼재 중 현재 ${phase} 구간`,
      warning: `🔴 삼재 발동 (${phase}): ${phaseWarnings[phase]}`,
    }
  }

  // 미발동: 다음 삼재 시작년 안내
  const nextStart = currentYear + yearsToFirst
  return {
    isActive: false,
    phase: null,
    samjaeYears: [nextStart, nextStart + 1, nextStart + 2],
    currentYear,
    description: `현재 삼재 미발동. 다음 삼재: ${nextStart}~${nextStart + 2}년`,
    warning: '',
  }
}

/**
 * 기구신(忌仇神) 경고 생성 — 용신·기신 기반
 */
function buildGigusinWarning(yongsin: YongsinAnalysis | null): GigusinWarning | null {
  if (!yongsin || !yongsin.gisin) return null

  const gisin = yongsin.gisin // 기신 오행
  const gusin = GUSIN_FROM_GISIN[gisin] ?? '' // 구신 오행

  const gisinMap = GIGUSIN_MAP[gisin]
  const gusinMap = gusin ? GIGUSIN_MAP[gusin] : null

  const avoidColors: string[] = []
  const avoidColorHexes: string[] = []
  const avoidDirections: string[] = []
  const avoidNumbers: number[] = []
  const avoidRelationships: string[] = []

  if (gisinMap) {
    avoidColors.push(gisinMap.colorKorean)
    avoidColorHexes.push(...gisinMap.colors)
    avoidDirections.push(gisinMap.direction)
    avoidNumbers.push(...gisinMap.numbers)
    avoidRelationships.push(gisinMap.relationship)
  }
  if (gusinMap) {
    avoidColors.push(gusinMap.colorKorean)
    avoidColorHexes.push(...gusinMap.colors)
    if (!avoidDirections.includes(gusinMap.direction)) avoidDirections.push(gusinMap.direction)
    avoidNumbers.push(...gusinMap.numbers.filter((n) => !avoidNumbers.includes(n)))
    avoidRelationships.push(gusinMap.relationship)
  }

  return {
    gisinElement: gisin,
    gusinElement: gusin,
    gisinKorean: ELEMENT_KOR[gisin] ?? gisin,
    gusinKorean: ELEMENT_KOR[gusin] ?? gusin,
    avoidColors,
    avoidColorHexes: [...new Set(avoidColorHexes)],
    avoidDirections,
    avoidNumbers: [...new Set(avoidNumbers)].sort((a, b) => a - b),
    avoidRelationships,
    description: `기신: ${ELEMENT_KOR[gisin]} / 구신: ${ELEMENT_KOR[gusin] ?? '없음'} — 해당 오행이 당신의 운을 소모시킵니다.`,
  }
}

/**
 * 원진살(怨嗔殺) 검출 — 원국 내 지지 쌍 확인
 */
function detectWonjinsal(zhiList: string[]): WonjinsalResult {
  const found: string[] = []
  for (const [z1, z2] of WONJIN_PAIRS) {
    if (zhiList.includes(z1) && zhiList.includes(z2)) {
      found.push(`${z1}-${z2}`)
    }
  }
  return {
    found: found.length > 0,
    pairs: found,
    warning:
      found.length > 0
        ? `원진살(${found.join(', ')}): 이유 없이 반목·결별하는 에너지가 원국에 내재됩니다. 중요한 파트너십 전 상대방 지지를 반드시 확인하십시오.`
        : '',
  }
}

/**
 * 백호대살(白虎大殺) — 특정 일주 검출
 */
function detectBaekhosal(dayPillar: string): BaekhoResult {
  const found = BAEKHODA_ILJU.includes(dayPillar)
  return {
    found,
    dayPillar,
    cautions: found
      ? [
          '충돌·사고의 기운이 강합니다. 안전 운전, 과격한 스포츠 자제',
          '언어·행동의 날카로움으로 분쟁을 자초할 수 있습니다',
          '의료·수술·법적 분쟁 상황에서 각별히 신중하십시오',
        ]
      : [],
    warning: found
      ? `백호대살 일주(${dayPillar}): 강한 충돌 기운 — 분쟁·사고·수술 상황에서 반드시 방어적으로 행동하십시오.`
      : '',
  }
}

/**
 * 통합 위험 점수 계산 (0-100)
 */
function calculateRiskScore(
  samjae: SamjaeResult,
  gongmang: GongmangResult,
  wonjinsal: WonjinsalResult,
  baekhosal: BaekhoResult,
  gigusin: GigusinWarning | null,
  sipseongExcess: SipseongExcessResult,
  bodyStrengthScore: number
): { score: number; level: 'low' | 'medium' | 'high' | 'critical'; label: string } {
  let score = 10

  if (samjae.isActive) {
    score += samjae.phase === '눌삼재' ? 25 : samjae.phase === '들삼재' ? 18 : 12
  }
  if (gongmang.hasSevere) score += 20
  else if (gongmang.affectedPillars.length > 0) score += 10
  if (wonjinsal.found) score += wonjinsal.pairs.length * 8
  if (baekhosal.found) score += 8
  if (gigusin) score += 8
  score += sipseongExcess.list.length * 5

  // 신강·신약 극단일 때 위험도 증가
  const deviation = Math.abs(bodyStrengthScore - 50)
  if (deviation > 35) score += 12
  else if (deviation > 20) score += 6

  const clamped = Math.min(100, score)
  const level: 'low' | 'medium' | 'high' | 'critical' =
    clamped < 25 ? 'low' : clamped < 50 ? 'medium' : clamped < 75 ? 'high' : 'critical'
  const labels = { low: '안정', medium: '주의', high: '경계', critical: '위기' }

  return { score: clamped, level, label: labels[level] }
}

/**
 * 즉각 행동 지침 생성
 */
function buildUrgentActions(
  samjae: SamjaeResult,
  gongmang: GongmangResult,
  gigusin: GigusinWarning | null,
  wonjinsal: WonjinsalResult,
  baekhosal: BaekhoResult
): string[] {
  const actions: string[] = []

  if (samjae.isActive) {
    if (samjae.phase === '눌삼재') actions.push('삼재 정점입니다. 보증·투자·창업·이사를 즉시 보류하십시오.')
    else if (samjae.phase === '들삼재')
      actions.push(`삼재 ${samjae.phase} 시작. 큰 결정은 ${samjae.samjaeYears[2] + 1}년 이후로 미루십시오.`)
    else actions.push(`삼재 ${samjae.phase} — 마무리 구간. 새로운 투자나 관계 시작을 삼가십시오.`)
  }

  if (gongmang.hasSevere) {
    actions.push(`핵심 공망(${gongmang.affectedPillars.join('·')}) — 생애 중요 결정 전 개운법을 반드시 실천하십시오.`)
  } else if (gongmang.affectedPillars.length > 0) {
    actions.push(`공망 연·월(${gongmang.zhi1Kor}, ${gongmang.zhi2Kor} 해당 시기)에 계약·투자를 보류하십시오.`)
  }

  if (gigusin) {
    const colors = gigusin.avoidColors.join(', ')
    actions.push(`${colors} 계열 의류·소품을 멀리하십시오. 기신 에너지가 일상에서 강화됩니다.`)
    if (gigusin.avoidDirections.length > 0) {
      actions.push(`${gigusin.avoidDirections.join('·')} 방향의 침실·책상 배치를 피하고 해당 방위 이동을 줄이십시오.`)
    }
  }

  if (wonjinsal.found) {
    actions.push(`원진살 내재 — 중요 대화 전 감정 상태를 먼저 점검하십시오. 이유 없는 반감이 생길 수 있습니다.`)
  }

  if (baekhosal.found) {
    actions.push(`백호대살 일주 — 운전·스포츠·의료 상황에서 방어적으로 행동하고 분쟁을 선제 회피하십시오.`)
  }

  return actions.slice(0, 5)
}

// ===================== 메인 함수 =====================

/**
 * 단점/경고 전체 분석
 */
export function analyzeWarnings(
  sajuData: SajuData,
  yongsin: YongsinAnalysis | null,
  sipseong: SipseongMap
): WarningsResult {
  const { pillars, dayMaster } = sajuData

  const zhiList = [pillars.year.zhi, pillars.month.zhi, pillars.day.zhi, pillars.time.zhi]
  const allZhis = {
    year: pillars.year.zhi,
    month: pillars.month.zhi,
    day: pillars.day.zhi,
    time: pillars.time.zhi,
  }

  // 1. 기구신
  const gigusin = buildGigusinWarning(yongsin)

  // 2. 공망
  const gongmang = calculateGongmang(dayMaster, pillars.day.zhi, allZhis)

  // 3. 삼재
  const samjae = calculateSamjae(pillars.year.zhi)

  // 4. 원진살
  const wonjinsal = detectWonjinsal(zhiList)

  // 5. 백호대살
  const baekhosal = detectBaekhosal(pillars.day.ganji)

  // 6. 일간별 단점
  const dayMasterWeakness: DayMasterWeaknessResult = {
    dayMaster,
    ...(DAY_MASTER_FLAWS[dayMaster] ?? {
      flaws: [],
      blindSpots: [],
      relationshipIssue: '',
      healthRisks: [],
    }),
  }

  // 7. 십성 과다 단점
  const excessList = Object.entries(sipseong.distribution)
    .filter(([, count]) => count >= 2)
    .map(([ss, count]) => ({
      sipseong: ss,
      count,
      weakness: SIPSEONG_EXCESS_FLAWS[ss]?.weakness ?? '',
      mitigation: SIPSEONG_EXCESS_FLAWS[ss]?.mitigation ?? '',
    }))
    .filter((item) => item.weakness)
  const sipseongExcess: SipseongExcessResult = { list: excessList, hasExcess: excessList.length > 0 }

  // 8. 통합 위험 점수
  const {
    score: riskScore,
    level: riskLevel,
    label: riskLabel,
  } = calculateRiskScore(samjae, gongmang, wonjinsal, baekhosal, gigusin, sipseongExcess, sipseong.bodyStrengthScore)

  // 9. 즉각 행동 지침
  const urgentActions = buildUrgentActions(samjae, gongmang, gigusin, wonjinsal, baekhosal)

  // 10. AI 프롬프트 주입용 텍스트
  const warningContext = buildWarningContextText({
    riskScore,
    riskLabel,
    gigusin,
    gongmang,
    samjae,
    wonjinsal,
    baekhosal,
    dayMasterWeakness,
    sipseongExcess,
  })

  return {
    gigusin,
    gongmang,
    samjae,
    wonjinsal,
    baekhosal,
    dayMasterWeakness,
    sipseongExcess,
    riskScore,
    riskLevel,
    riskLabel,
    urgentActions,
    warningContext,
  }
}

function buildWarningContextText(data: {
  riskScore: number
  riskLabel: string
  gigusin: GigusinWarning | null
  gongmang: GongmangResult
  samjae: SamjaeResult
  wonjinsal: WonjinsalResult
  baekhosal: BaekhoResult
  dayMasterWeakness: DayMasterWeaknessResult
  sipseongExcess: SipseongExcessResult
}): string {
  const { riskScore, riskLabel, gigusin, gongmang, samjae, wonjinsal, baekhosal, dayMasterWeakness, sipseongExcess } =
    data

  const lines: string[] = [`### 경고·단점 분석 — 위험 지수: ${riskScore}/100 (${riskLabel})`, '']

  if (dayMasterWeakness.flaws.length > 0) {
    lines.push(`[일간 핵심 약점]`)
    dayMasterWeakness.flaws.forEach((f) => lines.push(`• ${f}`))
    lines.push(`사각지대: ${dayMasterWeakness.blindSpots.join(' / ')}`)
    lines.push(`대인관계: ${dayMasterWeakness.relationshipIssue}`)
    lines.push(`건강 취약: ${dayMasterWeakness.healthRisks.join(', ')}`)
    lines.push('')
  }

  if (gigusin) {
    lines.push(`[기구신] 기신: ${gigusin.gisinKorean} / 구신: ${gigusin.gusinKorean}`)
    lines.push(
      `회피 색상: ${gigusin.avoidColors.join(', ')} | 방향: ${gigusin.avoidDirections.join(', ')} | 숫자: ${gigusin.avoidNumbers.join(', ')}`
    )
    lines.push('')
  }

  if (samjae.isActive) {
    lines.push(`[삼재 발동] ${samjae.phase} — ${samjae.warning}`)
    lines.push('')
  }

  if (gongmang.affectedPillars.length > 0) {
    lines.push(`[공망] ${gongmang.warning}`)
    lines.push('')
  }

  if (wonjinsal.found) {
    lines.push(`[원진살] ${wonjinsal.warning}`)
    lines.push('')
  }

  if (baekhosal.found) {
    lines.push(`[백호대살] ${baekhosal.warning}`)
    lines.push('')
  }

  if (sipseongExcess.hasExcess) {
    lines.push('[십성 과다 단점]')
    sipseongExcess.list.forEach((item) => lines.push(`• ${item.sipseong}(×${item.count}): ${item.weakness}`))
    lines.push('')
  }

  lines.push('[분석 원칙]')
  lines.push('위 경고 데이터를 근거로 내담자의 단점과 회피해야 할 상황을 정확히 짚어주십시오.')
  lines.push('과도한 위로나 희망적 서술로 경고를 희석하지 마십시오. 사실 기반의 균형 잡힌 진단이 진짜 도움입니다.')

  return lines.join('\n')
}
