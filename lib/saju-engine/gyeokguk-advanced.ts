/**
 * 해화지기 사주 엔진 - 격국(格局) 정밀 판정
 *
 * Step-by-step:
 * 1. 월지 지장간에서 본기→중기→여기 순서로 천간 투출 확인
 * 2. 투출된 천간과 일간의 십성 관계 → 격국 결정
 * 3. 비겁이면 건록격/양인격으로 전환
 * 4. 아무것도 투출 안 되면 월지 본기의 십성이 격국
 * 5. 외격 판정: 종격 5종, 전왕격 5종 (극약/극강 시)
 *
 * 참고: 자평진전(子平眞詮), 적천수(滴天髓)
 */

import type { SajuData } from '@/lib/domain/saju/saju'
import { getTouchuGans, JIJANGGAN, type TouchuResult } from './jijanggan'
import { calculateSipseong } from './sipseong'
import type { AdvancedStrengthResult, StrengthGrade } from './strength-calculator'

// ===================== 타입 정의 =====================

export interface GyeokgukResult {
  /** 격국 이름: "정관격", "편재격", "종재격" 등 */
  type: string
  /** 격국 분류: 내격(정격) or 외격(특수격) */
  category: 'inner' | 'special'
  /** 판정 근거 텍스트 */
  basis: string
  /** 외격 여부 */
  isSpecialFormat: boolean
  /** 격국 강도 1-5 */
  strength: number
  /** 격국 한자 */
  hanja: string
  /** 격국 특징 설명 */
  description: string
  /** 격국 특성 리스트 */
  characteristics: string[]
}

// ===================== 상수 데이터 =====================

/** 십성 한국어 → 격국 이름 + 한자 매핑 */
const SIPSEONG_TO_GYEOKGUK: Record<string, { name: string; hanja: string }> = {
  정관: { name: '정관격', hanja: '正官格' },
  편관: { name: '편관격', hanja: '偏官格' },
  정인: { name: '정인격', hanja: '正印格' },
  편인: { name: '편인격', hanja: '偏印格' },
  정재: { name: '정재격', hanja: '正財格' },
  편재: { name: '편재격', hanja: '偏財格' },
  식신: { name: '식신격', hanja: '食神格' },
  상관: { name: '상관격', hanja: '傷官格' },
}

/** 격국별 상세 설명 */
const GYEOKGUK_DESC: Record<string, { description: string; characteristics: string[] }> = {
  정관격: {
    description: '정관이 격국을 이루어 명예와 질서를 중시하는 정도(正道)의 사주. 조직에서 인정받으며 관직/경영에 적합.',
    characteristics: [
      '원칙과 규율을 중시하는 리더십',
      '사회적 명예와 직위를 통한 성취',
      '안정적인 커리어와 조직 내 신뢰 축적',
    ],
  },
  편관격: {
    description: '편관(칠살)이 격국을 이루어 강인한 추진력과 과단성의 사주. 제어가 되면 대권을 잡고, 안 되면 삶이 거칠어진다.',
    characteristics: [
      '과감한 결단력과 위기관리 능력',
      '권위적이나 카리스마 있는 리더십',
      '식신으로 제화(制化)되면 살인상생(殺印相生)의 귀격',
    ],
  },
  정인격: {
    description: '정인이 격국을 이루어 학문과 지혜를 품은 사주. 어머니의 후덕함처럼 주변을 감싸는 인자한 기질.',
    characteristics: [
      '깊은 학습능력과 학문적 성취',
      '인자하고 포용적인 성품',
      '교육, 연구, 출판 분야에서 두각',
    ],
  },
  편인격: {
    description: '편인이 격국을 이루어 비범한 직관과 영감의 사주. 독창적 사고를 하나 편향될 수 있다.',
    characteristics: [
      '비범한 직관력과 영감',
      '특정 분야에 대한 편집광적 몰입',
      '예술, 종교, 철학, AI/기술 연구에 적합',
    ],
  },
  정재격: {
    description: '정재가 격국을 이루어 꼼꼼한 재무 관리와 성실한 축적의 사주. 정직한 노동으로 부를 쌓는다.',
    characteristics: [
      '꼼꼼한 재무 관리와 안정적 축적',
      '성실하고 실용적인 경제관',
      '회계, 금융, 안정적 사업에 유리',
    ],
  },
  편재격: {
    description: '편재가 격국을 이루어 큰 그림을 보는 사업가 기질의 사주. 투자와 무역, 영업에서 두각을 나타낸다.',
    characteristics: [
      '사업가적 안목과 임기응변',
      '넓은 인맥과 뛰어난 사교성',
      '벤처, 무역, 투자 분야에서 성공 가능성',
    ],
  },
  식신격: {
    description: '식신이 격국을 이루어 창의력과 풍요로운 감성의 사주. 먹고 사는 문제에 강하고 기술로 입신한다.',
    characteristics: [
      '창의적 표현력과 생산성',
      '의식주에 복이 있으며 풍요로운 삶',
      '요리, 크리에이터, 디자인, 기술직에 적합',
    ],
  },
  상관격: {
    description: '상관이 격국을 이루어 기존 질서를 파괴하는 폭발적 상상력의 사주. 혁신가이나 화합이 어려울 수 있다.',
    characteristics: [
      '기존 틀을 깨는 파괴적 혁신 역량',
      '호승심이 강하고 자기표현 욕구가 뚜렷',
      'IT, 스타트업, 유튜브, 예술 분야에서 두각',
    ],
  },
  건록격: {
    description: '일간이 월지에서 건록을 얻어 자립심이 강한 사주. 독립적이고 자수성가형이나 재물 축적이 늦을 수 있다.',
    characteristics: [
      '강한 자립심과 독립적 성향',
      '자수성가형 — 부모 도움 없이 일어섬',
      '비겁이 강하므로 재성이나 관성이 필요',
    ],
  },
  양인격: {
    description: '일간이 월지에서 제왕(양인)을 얻어 강렬한 에너지의 사주. 극적인 성공과 극적인 위기가 공존한다.',
    characteristics: [
      '강렬한 에너지와 불굴의 의지',
      '양인합살(陽刃合殺) 시 대귀격',
      '관살이 양인을 제어하면 권력과 성공',
    ],
  },
  // ─── 외격(종격) ───
  종재격: {
    description: '일간이 극약하여 재성(돈/아버지)을 따르는 격. 큰 부를 얻거나 재벌가에서 역할을 맡는다.',
    characteristics: ['재물에 순응하여 부를 축적', '재성의 뜻을 따르는 삶', '비겁/인성이 오면 파격되어 위험'],
  },
  종살격: {
    description: '일간이 극약하여 관살(권력/직장)을 따르는 격. 권력자 밑에서 크게 출세한다.',
    characteristics: ['권력에 순응하여 출세', '관성의 뜻을 따르는 삶', '인성이 오면 오히려 해로울 수 있음'],
  },
  종아격: {
    description: '일간이 극약하여 식상(자식/표현력)을 따르는 격. 예술/기술로 이름을 날린다.',
    characteristics: ['표현력에 순응하여 명성 획득', '식상의 재능을 극대화', '인성이 오면 재능이 억압됨'],
  },
  종강격: {
    description: '일간이 극강하여 비겁/인성이 일간을 지배하는 격. 독립적이고 자기중심적.',
    characteristics: ['강한 자아와 독립심', '재관이 오면 큰 위기', '비겁/인성의 흐름을 따라야 길'],
  },
  종왕격: {
    description: '일간이 극강하고 인성이 뒷받침하는 격. 학문이나 종교에서 대성할 수 있다.',
    characteristics: ['학문/종교/철학에서 대성', '재관을 꺼리고 인성의 도움을 받아야', '순수한 학자/지도자의 사주'],
  },
  // ─── 외격(전왕격) ───
  곡직격: {
    description: '木이 전왕하는 봄 사주. 仁의 덕목이 극대화되어 인자하고 곧은 성품.',
    characteristics: ['木이 사주를 지배', '봄의 기운으로 생장/발전', '金이 오면 파격'],
  },
  염상격: {
    description: '火가 전왕하는 여름 사주. 禮의 덕목이 극대화되어 화려하고 열정적.',
    characteristics: ['火가 사주를 지배', '여름의 열기로 창조/변혁', '水가 오면 파격'],
  },
  가색격: {
    description: '土가 전왕하는 사주. 信의 덕목이 극대화되어 신뢰와 포용의 중심.',
    characteristics: ['土가 사주를 지배', '중앙의 안정감', '木이 오면 파격'],
  },
  종혁격: {
    description: '金이 전왕하는 가을 사주. 義의 덕목이 극대화되어 결단력과 정의감.',
    characteristics: ['金이 사주를 지배', '가을의 숙살로 결단/정리', '火가 오면 파격'],
  },
  윤하격: {
    description: '水가 전왕하는 겨울 사주. 智의 덕목이 극대화되어 지혜롭고 심오.',
    characteristics: ['水가 사주를 지배', '겨울의 지혜로 통찰/연구', '土가 오면 파격'],
  },
}

const GAN_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
}

const GAN_YINYANG: Record<string, number> = {
  甲: 0, 乙: 1, 丙: 0, 丁: 1, 戊: 0,
  己: 1, 庚: 0, 辛: 1, 壬: 0, 癸: 1,
}

/** 전왕격: 오행→격국 이름 */
const JEONWANG_MAP: Record<string, string> = {
  木: '곡직격',
  火: '염상격',
  土: '가색격',
  金: '종혁격',
  水: '윤하격',
}

// ===================== 외격(종격) 판정 =====================

/**
 * 극약일 때 종격 판정
 * 종재격: 재성이 가장 많을 때
 * 종살격: 관성이 가장 많을 때
 * 종아격: 식상이 가장 많을 때
 */
function checkJonggyeok(
  sajuData: SajuData,
  grade: StrengthGrade
): GyeokgukResult | null {
  if (grade !== '극약') return null

  const dayElement = GAN_ELEMENT[sajuData.dayMaster]
  if (!dayElement) return null

  // 비겁/인성이 하나라도 있으면 종격이 아님
  const { elementsDistribution } = sajuData
  const SAENG_BY: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }
  const motherEl = SAENG_BY[dayElement]

  // 비겁(같은 오행) 체크 — 일간 자체는 제외하므로 1개면 일간뿐
  const sameCount = elementsDistribution[dayElement] || 0
  const motherCount = elementsDistribution[motherEl] || 0

  // 천간에서 비겁이 일간 외에 있는지 확인
  const allGans = [
    sajuData.pillars.year.gan,
    sajuData.pillars.month.gan,
    sajuData.pillars.time.gan,
  ]
  const hasBigyeob = allGans.some(g => GAN_ELEMENT[g] === dayElement)
  const hasInseong = allGans.some(g => GAN_ELEMENT[g] === motherEl)

  // 비겁이 천간에 있거나, 인성이 천간에 있으면 종격 불가
  if (hasBigyeob || hasInseong) return null

  // 가장 많은 십성 카테고리 확인
  const SAENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  const GEUK: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
  const GEUK_BY: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }

  const sikEl = SAENG[dayElement] // 식상
  const jaeEl = GEUK[dayElement] // 재성
  const gwanEl = GEUK_BY[dayElement] // 관성

  const sikCount = elementsDistribution[sikEl] || 0
  const jaeCount = elementsDistribution[jaeEl] || 0
  const gwanCount = elementsDistribution[gwanEl] || 0

  const maxCount = Math.max(sikCount, jaeCount, gwanCount)
  if (maxCount < 3) return null // 너무 적으면 종격 불가

  let type: string
  let basis: string

  if (jaeCount === maxCount) {
    type = '종재격'
    basis = `일간 ${sajuData.dayMaster}이(가) 극약하여 재성(${jaeEl}) ${jaeCount}개를 따르는 종재격`
  } else if (gwanCount === maxCount) {
    type = '종살격'
    basis = `일간 ${sajuData.dayMaster}이(가) 극약하여 관성(${gwanEl}) ${gwanCount}개를 따르는 종살격`
  } else {
    type = '종아격'
    basis = `일간 ${sajuData.dayMaster}이(가) 극약하여 식상(${sikEl}) ${sikCount}개를 따르는 종아격`
  }

  const desc = GYEOKGUK_DESC[type]
  return {
    type,
    category: 'special',
    basis,
    isSpecialFormat: true,
    strength: 4,
    hanja: type,
    description: desc?.description || '',
    characteristics: desc?.characteristics || [],
  }
}

/**
 * 극강일 때 전왕격/종강격/종왕격 판정
 */
function checkJeonwanggyeok(
  sajuData: SajuData,
  grade: StrengthGrade
): GyeokgukResult | null {
  if (grade !== '극강') return null

  const dayElement = GAN_ELEMENT[sajuData.dayMaster]
  if (!dayElement) return null

  const { elementsDistribution } = sajuData
  const SAENG_BY: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }
  const motherEl = SAENG_BY[dayElement]

  const sameCount = elementsDistribution[dayElement] || 0
  const motherCount = elementsDistribution[motherEl] || 0

  // 일간 오행이 6개 이상이면 전왕격
  if (sameCount >= 6) {
    const type = JEONWANG_MAP[dayElement] || '전왕격'
    const desc = GYEOKGUK_DESC[type]
    return {
      type,
      category: 'special',
      basis: `${dayElement} 오행이 ${sameCount}개로 사주를 지배 — ${type}`,
      isSpecialFormat: true,
      strength: 5,
      hanja: type,
      description: desc?.description || `${dayElement} 전왕의 사주`,
      characteristics: desc?.characteristics || [],
    }
  }

  // 비겁 중심이면 종강격
  if (sameCount >= 4 && motherCount <= 1) {
    const desc = GYEOKGUK_DESC['종강격']
    return {
      type: '종강격',
      category: 'special',
      basis: `일간 ${sajuData.dayMaster}이(가) 극강하고 비겁(${dayElement}) ${sameCount}개가 지배 — 종강격`,
      isSpecialFormat: true,
      strength: 4,
      hanja: '從強格',
      description: desc?.description || '',
      characteristics: desc?.characteristics || [],
    }
  }

  // 인성 중심이면 종왕격
  if (motherCount >= 3) {
    const desc = GYEOKGUK_DESC['종왕격']
    return {
      type: '종왕격',
      category: 'special',
      basis: `일간 ${sajuData.dayMaster}이(가) 극강하고 인성(${motherEl}) ${motherCount}개가 뒷받침 — 종왕격`,
      isSpecialFormat: true,
      strength: 4,
      hanja: '從旺格',
      description: desc?.description || '',
      characteristics: desc?.characteristics || [],
    }
  }

  return null
}

// ===================== 내격(정격) 판정 =====================

/**
 * 건록격/양인격 판정
 * 월지가 일간의 건록 또는 제왕(양인)인 경우
 */
function checkGeollokYangin(dayMaster: string, monthZhi: string): GyeokgukResult | null {
  // 건록 체크: 일간의 12운성에서 월지가 건록인지
  const GEOLLOK_MAP: Record<string, string> = {
    甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳',
    己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
  }

  // 양인(제왕) 체크
  const YANGIN_MAP: Record<string, string> = {
    甲: '卯', 乙: '寅', 丙: '午', 丁: '巳', 戊: '午',
    己: '巳', 庚: '酉', 辛: '申', 壬: '子', 癸: '亥',
  }

  if (GEOLLOK_MAP[dayMaster] === monthZhi) {
    const desc = GYEOKGUK_DESC['건록격']
    return {
      type: '건록격',
      category: 'inner',
      basis: `월지 ${monthZhi}이(가) 일간 ${dayMaster}의 건록(建祿) — 비겁이므로 건록격으로 전환`,
      isSpecialFormat: false,
      strength: 3,
      hanja: '建祿格',
      description: desc?.description || '',
      characteristics: desc?.characteristics || [],
    }
  }

  if (YANGIN_MAP[dayMaster] === monthZhi) {
    const desc = GYEOKGUK_DESC['양인격']
    return {
      type: '양인격',
      category: 'inner',
      basis: `월지 ${monthZhi}이(가) 일간 ${dayMaster}의 양인(陽刃/帝旺) — 비겁이므로 양인격으로 전환`,
      isSpecialFormat: false,
      strength: 4,
      hanja: '陽刃格',
      description: desc?.description || '',
      characteristics: desc?.characteristics || [],
    }
  }

  return null
}

// ===================== 격국 강도 계산 =====================

function calculateGyeokgukStrength(
  touchu: TouchuResult[],
  sipseongName: string,
  sajuData: SajuData
): number {
  // 기본 강도 3
  let strength = 3

  // 투출이 본기에서 왔으면 +1
  if (touchu.length > 0 && touchu[0].source === 'bongi') strength += 1

  // 격국 십성이 사주에 2개 이상이면 +1
  const allGans = [
    sajuData.pillars.year.gan,
    sajuData.pillars.month.gan,
    sajuData.pillars.time.gan,
  ]
  const count = allGans.filter(g => calculateSipseong(sajuData.dayMaster, g) === sipseongName).length
  if (count >= 2) strength += 1

  return Math.min(5, strength)
}

// ===================== 메인 함수 =====================

/**
 * 격국 정밀 판정
 *
 * @param sajuData - 사주 기본 데이터
 * @param strengthResult - 신강/신약 정밀 판정 결과
 * @returns 격국 판정 결과
 */
export function analyzeGyeokgukAdvanced(
  sajuData: SajuData,
  strengthResult: AdvancedStrengthResult
): GyeokgukResult {
  const { dayMaster, pillars } = sajuData
  const monthZhi = pillars.month.zhi
  const { grade } = strengthResult

  // Step 5: 외격 판정 (극약/극강 시)
  const jongResult = checkJonggyeok(sajuData, grade)
  if (jongResult) return jongResult

  const jeonwangResult = checkJeonwanggyeok(sajuData, grade)
  if (jeonwangResult) return jeonwangResult

  // Step 1: 월지 지장간에서 투출 확인
  const allGans = [
    pillars.year.gan,
    pillars.month.gan,
    pillars.day.gan,  // 일간 자체도 투출 판정 대상
    pillars.time.gan,
  ]

  const touchuResults = getTouchuGans(monthZhi, allGans)

  // Step 2: 투출된 천간의 십성 → 격국
  for (const touchu of touchuResults) {
    const sipseongName = calculateSipseong(dayMaster, touchu.gan, false)

    // Step 3: 비겁이면 건록격/양인격으로 전환
    if (sipseongName === '비견' || sipseongName === '겁재') {
      const geollokResult = checkGeollokYangin(dayMaster, monthZhi)
      if (geollokResult) return geollokResult
      // 건록/양인에 해당하지 않으면 다음 투출로 넘어감
      continue
    }

    const gyeokgukInfo = SIPSEONG_TO_GYEOKGUK[sipseongName]
    if (!gyeokgukInfo) continue

    const desc = GYEOKGUK_DESC[gyeokgukInfo.name]
    const strength = calculateGyeokgukStrength(touchuResults, sipseongName, sajuData)

    return {
      type: gyeokgukInfo.name,
      category: 'inner',
      basis: touchu.basis + ` → 일간 ${dayMaster} 기준 ${sipseongName}이므로 ${gyeokgukInfo.name}`,
      isSpecialFormat: false,
      strength,
      hanja: gyeokgukInfo.hanja,
      description: desc?.description || '',
      characteristics: desc?.characteristics || [],
    }
  }

  // Step 4: 투출이 없으면 월지 본기의 십성이 격국
  const entry = JIJANGGAN[monthZhi]
  if (entry) {
    const bongiSipseong = calculateSipseong(dayMaster, entry.bongi, false)

    // 본기가 비겁이면 건록격/양인격
    if (bongiSipseong === '비견' || bongiSipseong === '겁재') {
      const geollokResult = checkGeollokYangin(dayMaster, monthZhi)
      if (geollokResult) {
        return {
          ...geollokResult,
          basis: `월지 ${monthZhi}의 본기 ${entry.bongi}이(가) 천간에 투출되지 않았으나, 본기의 십성이 ${bongiSipseong}이므로 ${geollokResult.type}`,
        }
      }
    }

    const gyeokgukInfo = SIPSEONG_TO_GYEOKGUK[bongiSipseong]
    if (gyeokgukInfo) {
      const desc = GYEOKGUK_DESC[gyeokgukInfo.name]
      return {
        type: gyeokgukInfo.name,
        category: 'inner',
        basis: `월지 ${monthZhi}의 본기 ${entry.bongi}이(가) 천간에 투출되지 않았으나, 본기의 십성 ${bongiSipseong}을 기준으로 ${gyeokgukInfo.name}`,
        isSpecialFormat: false,
        strength: 2,
        hanja: gyeokgukInfo.hanja,
        description: desc?.description || '',
        characteristics: desc?.characteristics || [],
      }
    }
  }

  // Fallback: 건록격/양인격 체크
  const fallbackGeollok = checkGeollokYangin(dayMaster, monthZhi)
  if (fallbackGeollok) return fallbackGeollok

  // 최종 Fallback
  return {
    type: '잡기격',
    category: 'inner',
    basis: `월지 ${monthZhi}에서 명확한 격국을 판정할 수 없어 잡기격으로 분류`,
    isSpecialFormat: false,
    strength: 2,
    hanja: '雜氣格',
    description: '여러 기운이 혼재된 복합적 사주. 다재다능하나 초점이 분산될 수 있다.',
    characteristics: [
      '여러 분야에 걸친 다재다능함',
      '상황에 따라 유연하게 대응하는 능력',
      '집중할 분야를 찾는 것이 핵심',
    ],
  }
}

/**
 * 격국 판정 결과를 AI 프롬프트용 텍스트로 변환한다.
 */
export function buildGyeokgukText(result: GyeokgukResult): string {
  const lines: string[] = []
  lines.push(`격국: ${result.type}(${result.hanja}) — ${result.category === 'special' ? '외격(특수격)' : '내격(정격)'}`)
  lines.push(`강도: ${'★'.repeat(result.strength)}${'☆'.repeat(5 - result.strength)} (${result.strength}/5)`)
  lines.push(`근거: ${result.basis}`)
  lines.push(`설명: ${result.description}`)
  return lines.join('\n')
}
