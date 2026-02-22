/**
 * 해화지기 사주 엔진 - 신살(神殺) 확장 모듈
 * haehwajigi.md 7장: "특수 능력치: 신살론의 현대적 직업 전문성 메타데이터"
 * 흉살 → 현대 스킬 트리(Skill Tree) 재매핑
 */

import type { SajuData } from '@/lib/domain/saju/saju'

// ===================== 신살 현대적 재해석 데이터 =====================

export const SINSAL_MODERN: Record<
  string,
  {
    hanja: string
    category: string
    traditionalView: string
    modernSkillTree: string
    modernJobs: string[]
    poeticDesc: string
  }
> = {
  역마살: {
    hanja: '驛馬殺',
    category: '이동·자유',
    traditionalView: '정착 못함, 방랑',
    modernSkillTree: '글로벌 이동력 + 다양성 적응력',
    modernJobs: [
      '여행 가이드',
      '관광 컨설턴트',
      '국제 비즈니스',
      '외교관',
      '다큐멘터리 제작자',
      '글로벌 마케팅',
      '항공 승무원',
    ],
    poeticDesc: '발이 땅에 붙지 않는 운명. 길이 당신을 부르고, 당신은 그 부름에 응하는 여정의 사람입니다.',
  },
  도화살: {
    hanja: '桃花殺',
    category: '매력·인기',
    traditionalView: '음란·풍류',
    modernSkillTree: '대중 매력 자본 + 감성 마케팅',
    modernJobs: ['연예인', '인플루언서', '마케터', '뷰티 유튜버', '모델', '이미지 컨설턴트'],
    poeticDesc: '복숭아꽃처럼 사람을 홀리는 운. 시선이 닿는 곳마다 꽃이 피는 타고난 카리스마입니다.',
  },
  홍염살: {
    hanja: '紅艶殺',
    category: '예술·매혹',
    traditionalView: '이성 문제',
    modernSkillTree: '감각적 예술성 + 비주얼 스토리텔링',
    modernJobs: ['화가', '패션 디자이너', '작곡가', '향수 조향사', '인테리어 디자이너'],
    poeticDesc: '붉은 빛깔처럼 타오르는 감성. 예술과 아름다움이 삶의 언어가 되는 운명입니다.',
  },
  화개살: {
    hanja: '華蓋殺',
    category: '학문·종교·IT',
    traditionalView: '고독·종교적 팔자',
    modernSkillTree: '딥워크(Deep Work) 메타데이터 + 집중 분석력',
    modernJobs: ['IT 코딩', '데이터 분석', '의학 연구', '철학', '명상 지도자', '종교인'],
    poeticDesc: '홀로 깊이 파고드는 천재성. 세상과 분리된 듯 보이지만 그 고독 속에서 빛이 나옵니다.',
  },
  백호대살: {
    hanja: '白虎大殺',
    category: '권력·강압',
    traditionalView: '흉사·피살',
    modernSkillTree: '극한 상황 대처 + 강력 리더십',
    modernJobs: ['강력 범죄 수사관', '군인', '소방관', '외과 의사', '벤처 캐피털리스트'],
    poeticDesc: '백호의 위엄처럼 굴복하지 않는 기운. 극한의 상황에서 빛을 발하는 숨겨진 역전의 운입니다.',
  },
  괴강살: {
    hanja: '魁罡殺',
    category: '정밀·단호',
    traditionalView: '고집·외로움',
    modernSkillTree: '냉철한 결단력 + 전문성 극대화',
    modernJobs: ['법관', '군 전략가', '수술 전문의', '항공기 조종사', '원자로 기술자'],
    poeticDesc: '타협을 모르는 순수한 힘. 세상이 흐려도 스스로의 기준으로 굳건히 서는 운명입니다.',
  },
  현침살: {
    hanja: '懸針殺',
    category: '정밀·분석',
    traditionalView: '상처·예리함',
    modernSkillTree: '극도의 집중력 + 정밀 분석',
    modernJobs: ['외과의사', '침술사', '프로그래머', '퀀트 분석가', '시계 기술자'],
    poeticDesc: '바늘처럼 예리한 통찰. 남들이 보지 못하는 핵심을 꿰뚫는 천재적 집중력입니다.',
  },
  귀문관살: {
    hanja: '鬼門關殺',
    category: '직관·영적',
    traditionalView: '신경증·귀신',
    modernSkillTree: '초감각적 직관 + 창의적 발산',
    modernJobs: ['정신과 의사', '심리학자', '영적 치유사', 'AI 연구자', '예술 치료사'],
    poeticDesc: '귀문을 넘나드는 예민함. 고통스럽기도 하지만 그 섬세함이 당신을 특별하게 만드는 천재성입니다.',
  },
  원진살: {
    hanja: '怨嗔殺',
    category: '예민·천재성',
    traditionalView: '불화·우울',
    modernSkillTree: 'IT·예술 분야 천재적 통찰력',
    modernJobs: ['천재 프로그래머', '혁신적 아티스트', '사회 비평가', '철학자'],
    poeticDesc: '세상과 늘 어긋나는 것 같은 감각. 그 어긋남이 사실은 세상을 앞서가는 통찰임을 기억하십시오.',
  },
  천을귀인: {
    hanja: '天乙貴人',
    category: '귀인·복덕',
    traditionalView: '귀인 도움',
    modernSkillTree: '네트워크 귀인 운 + 위기 탈출력',
    modernJobs: ['모든 분야 가능 (귀인의 도움을 받음)'],
    poeticDesc: '하늘이 내린 귀인운. 가장 어두운 순간, 반드시 누군가가 손을 내밀어 줄 운명입니다.',
  },
  문창귀인: {
    hanja: '文昌貴人',
    category: '학문·창의',
    traditionalView: '학문 발복',
    modernSkillTree: '학문적 성취 + 창의적 표현력',
    modernJobs: ['작가', '교수', '연구자', '기자', '콘텐츠 크리에이터'],
    poeticDesc: '문장이 하늘에 닿는 재주. 글과 지식으로 세상에 자신의 흔적을 남기는 운명입니다.',
  },
}

// ===================== 신살 계산 테이블 =====================

/** 역마살: 년지 기준 역마 지지 */
const YEOKMA_MAP: Record<string, string> = {
  申: '寅',
  子: '寅',
  辰: '寅',
  寅: '申',
  午: '申',
  戌: '申',
  巳: '亥',
  酉: '亥',
  丑: '亥',
  亥: '巳',
  卯: '巳',
  未: '巳',
}

/** 도화살: 년지·일지 기준 */
const DOHWA_MAP: Record<string, string> = {
  寅: '卯',
  午: '卯',
  戌: '卯',
  申: '酉',
  子: '酉',
  辰: '酉',
  亥: '子',
  卯: '子',
  未: '子',
  巳: '午',
  酉: '午',
  丑: '午',
}

/** 화개살 */
const HWAGAE_MAP: Record<string, string> = {
  寅: '戌',
  午: '戌',
  戌: '戌',
  申: '辰',
  子: '辰',
  辰: '辰',
  亥: '未',
  卯: '未',
  未: '未',
  巳: '丑',
  酉: '丑',
  丑: '丑',
}

/** 천을귀인 */
const CHEONUL_MAP: Record<string, string[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  庚: ['丑', '未'],
  辛: ['寅', '午'],
  壬: ['卯', '巳'],
  癸: ['巳', '卯'],
}

/** 문창귀인 */
const MUNCHANG_MAP: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
}

/** 괴강살: 특정 일주만 */
const GOEGANG_ILJU = ['庚辰', '庚戌', '壬辰', '壬戌']

/** 백호대살: 특정 일주 기준 */
const BAEKHODA_ILJU = ['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '己丑', '庚辰', '辛未', '壬戌', '癸丑']

/** 현침살: 甲·午·申·酉·辛이 포함된 경우 */
const HYEONJIM_CHARS = ['甲', '午', '申', '酉', '辛']

/** 귀문관살 쌍 */
const GWIMUN_PAIRS: Array<[string, string]> = [
  ['子', '酉'],
  ['丑', '午'],
  ['寅', '未'],
  ['卯', '申'],
  ['辰', '亥'],
  ['巳', '戌'],
]

/** 원진살 쌍 */
const WONJIN_PAIRS: Array<[string, string]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '酉'],
  ['卯', '申'],
  ['辰', '亥'],
  ['巳', '戌'],
]

export interface SinsalResult {
  name: string
  hanja: string
  category: string
  modernSkillTree: string
  modernJobs: string[]
  poeticDesc: string
}

/**
 * 사주에서 신살 전체 계산
 */
export function calculateExtendedSinsal(saju: SajuData): SinsalResult[] {
  const results: SinsalResult[] = []
  const { yearZhi, dayZhi, dayGan, pillars } = saju
  const dayGanji = pillars.day.ganji

  const allZhis = [pillars.year.zhi, pillars.month.zhi, pillars.day.zhi, pillars.time.zhi]
  const allGans = [pillars.year.gan, pillars.month.gan, pillars.day.gan, pillars.time.gan]
  const allChars = [...allGans, ...allZhis]

  const addSinsal = (name: string) => {
    const info = SINSAL_MODERN[name]
    if (info) {
      results.push({ name, ...info })
    }
  }

  // 역마살
  const yeokmaZhi = YEOKMA_MAP[yearZhi]
  if (yeokmaZhi && allZhis.slice(1).includes(yeokmaZhi)) addSinsal('역마살')

  // 도화살 (년지·일지 기준)
  const dohwaZhi = DOHWA_MAP[yearZhi] || DOHWA_MAP[dayZhi]
  if (dohwaZhi && allZhis.some((z, i) => i > 0 && z === dohwaZhi)) addSinsal('도화살')

  // 화개살
  const hwagaeZhi = HWAGAE_MAP[yearZhi]
  if (hwagaeZhi && allZhis.slice(1).includes(hwagaeZhi)) addSinsal('화개살')

  // 천을귀인
  const cheonulZhis = CHEONUL_MAP[dayGan] || []
  if (cheonulZhis.some((z) => allZhis.includes(z))) addSinsal('천을귀인')

  // 문창귀인
  const munchangZhi = MUNCHANG_MAP[dayGan]
  if (munchangZhi && allZhis.includes(munchangZhi)) addSinsal('문창귀인')

  // 괴강살
  if (GOEGANG_ILJU.includes(dayGanji)) addSinsal('괴강살')

  // 백호대살
  if (BAEKHODA_ILJU.includes(dayGanji)) addSinsal('백호대살')

  // 현침살
  if (allChars.filter((c) => HYEONJIM_CHARS.includes(c)).length >= 2) addSinsal('현침살')

  // 귀문관살
  for (const [z1, z2] of GWIMUN_PAIRS) {
    if (allZhis.includes(z1) && allZhis.includes(z2)) {
      addSinsal('귀문관살')
      break
    }
  }

  // 원진살
  for (const [z1, z2] of WONJIN_PAIRS) {
    if (allZhis.includes(z1) && allZhis.includes(z2)) {
      addSinsal('원진살')
      break
    }
  }

  return results
}
