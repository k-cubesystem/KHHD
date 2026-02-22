/**
 * 해화지기 사주 엔진 - 십이운성(十二運星) 모듈
 * haehwajigi.md 5장: "에너지 사이클: 십이운성의 파동 함수 모델링"
 * 인간 생애 12단계를 파동(Sine wave)으로 모델링
 */

// ===================== 십이운성 테이블 =====================
// 일간별로 각 지지에서의 십이운성 (자평진전 기준)

const SIBJIUNSEONG_TABLE: Record<string, Record<string, string>> = {
  甲: {
    亥: '장생',
    子: '목욕',
    丑: '관대',
    寅: '건록',
    卯: '제왕',
    辰: '쇠',
    巳: '병',
    午: '사',
    未: '묘',
    申: '절',
    酉: '태',
    戌: '양',
  },
  乙: {
    午: '장생',
    巳: '목욕',
    辰: '관대',
    卯: '건록',
    寅: '제왕',
    丑: '쇠',
    子: '병',
    亥: '사',
    戌: '묘',
    酉: '절',
    申: '태',
    未: '양',
  },
  丙: {
    寅: '장생',
    卯: '목욕',
    辰: '관대',
    巳: '건록',
    午: '제왕',
    未: '쇠',
    申: '병',
    酉: '사',
    戌: '묘',
    亥: '절',
    子: '태',
    丑: '양',
  },
  丁: {
    酉: '장생',
    申: '목욕',
    未: '관대',
    午: '건록',
    巳: '제왕',
    辰: '쇠',
    卯: '병',
    寅: '사',
    丑: '묘',
    子: '절',
    亥: '태',
    戌: '양',
  },
  戊: {
    寅: '장생',
    卯: '목욕',
    辰: '관대',
    巳: '건록',
    午: '제왕',
    未: '쇠',
    申: '병',
    酉: '사',
    戌: '묘',
    亥: '절',
    子: '태',
    丑: '양',
  },
  己: {
    酉: '장생',
    申: '목욕',
    未: '관대',
    午: '건록',
    巳: '제왕',
    辰: '쇠',
    卯: '병',
    寅: '사',
    丑: '묘',
    子: '절',
    亥: '태',
    戌: '양',
  },
  庚: {
    巳: '장생',
    午: '목욕',
    未: '관대',
    申: '건록',
    酉: '제왕',
    戌: '쇠',
    亥: '병',
    子: '사',
    丑: '묘',
    寅: '절',
    卯: '태',
    辰: '양',
  },
  辛: {
    子: '장생',
    亥: '목욕',
    戌: '관대',
    酉: '건록',
    申: '제왕',
    未: '쇠',
    午: '병',
    巳: '사',
    辰: '묘',
    卯: '절',
    寅: '태',
    丑: '양',
  },
  壬: {
    申: '장생',
    酉: '목욕',
    戌: '관대',
    亥: '건록',
    子: '제왕',
    丑: '쇠',
    寅: '병',
    卯: '사',
    辰: '묘',
    巳: '절',
    午: '태',
    未: '양',
  },
  癸: {
    卯: '장생',
    寅: '목욕',
    丑: '관대',
    子: '건록',
    亥: '제왕',
    戌: '쇠',
    酉: '병',
    申: '사',
    未: '묘',
    午: '절',
    巳: '태',
    辰: '양',
  },
}

// ===================== 십이운성 에너지 레벨 =====================

export const SIBJIUNSEONG_INFO: Record<
  string,
  {
    level: number // 에너지 레벨 0-12 (파동 함수 Y값)
    phase: '성장' | '최전성' | '쇠퇴' | '전환'
    korean: string
    hanja: string
    meaning: string
    actionGuide: string
  }
> = {
  장생: {
    level: 8,
    phase: '성장',
    korean: '장생',
    hanja: '長生',
    meaning: '생명력이 싹트는 시기. 새로운 시작과 가능성이 충만하다.',
    actionGuide: '새 사업, 새 공부, 새 관계를 시작하기에 최적입니다.',
  },
  목욕: {
    level: 6,
    phase: '성장',
    korean: '목욕',
    hanja: '沐浴',
    meaning: '방황과 시련의 시기. 풍파를 겪으며 내면이 단련된다.',
    actionGuide: '유혹과 방종을 경계하고, 기초를 다지는 데 집중하세요.',
  },
  관대: {
    level: 9,
    phase: '성장',
    korean: '관대',
    hanja: '冠帶',
    meaning: '사회에 첫발을 딛는 관복의 시기. 능력이 인정받는다.',
    actionGuide: '자기계발과 네트워크 형성에 에너지를 투자하세요.',
  },
  건록: {
    level: 11,
    phase: '최전성',
    korean: '건록',
    hanja: '建祿',
    meaning: '자립과 전성의 시기. 독립하여 녹봉을 받는다.',
    actionGuide: '독립창업이나 승진·이직 등 적극적 도약을 시도하세요.',
  },
  제왕: {
    level: 12,
    phase: '최전성',
    korean: '제왕',
    hanja: '帝旺',
    meaning: '절정의 에너지. 황제처럼 모든 역량이 최고조에 달한다.',
    actionGuide: '가장 중요한 일을 결단하고 실행할 최고의 시기입니다.',
  },
  쇠: {
    level: 7,
    phase: '쇠퇴',
    korean: '쇠',
    hanja: '衰',
    meaning: '에너지가 서서히 저하되는 시기. 축적과 정리가 필요하다.',
    actionGuide: '무리한 확장보다는 내실을 다지고 수성(守城)에 집중하세요.',
  },
  병: {
    level: 4,
    phase: '쇠퇴',
    korean: '병',
    hanja: '病',
    meaning: '기운이 약해지고 건강에 주의가 필요한 시기.',
    actionGuide: '건강 관리와 재충전에 집중하고, 무리한 도전을 피하세요.',
  },
  사: {
    level: 2,
    phase: '쇠퇴',
    korean: '사',
    hanja: '死',
    meaning: '에너지가 소멸되는 시기. 이전 것을 내려놓는 과정.',
    actionGuide: '집착을 버리고 새로운 전환을 준비하는 마음가짐이 필요합니다.',
  },
  묘: {
    level: 3,
    phase: '전환',
    korean: '묘',
    hanja: '墓',
    meaning: '창고에 모든 것을 저장하는 시기. 은둔과 축적.',
    actionGuide: '공개적 활동보다 내부 역량 축적과 연구에 집중하세요.',
  },
  절: {
    level: 1,
    phase: '전환',
    korean: '절',
    hanja: '絶',
    meaning: '완전히 에너지가 끊기는 시기. 새로운 창조의 준비.',
    actionGuide: '포기와 내려놓음이 곧 새 출발의 시작임을 인식하세요.',
  },
  태: {
    level: 5,
    phase: '전환',
    korean: '태',
    hanja: '胎',
    meaning: '새 생명이 잉태되는 시기. 보이지 않는 잠재력이 형성된다.',
    actionGuide: '창의적 아이디어와 새로운 계획을 잉태하는 시기입니다.',
  },
  양: {
    level: 7,
    phase: '전환',
    korean: '양',
    hanja: '養',
    meaning: '어머니 뱃속에서 자라는 시기. 보호와 양육이 필요하다.',
    actionGuide: '도움을 받아들이고, 자신을 돌보는 데 주력하세요.',
  },
}

// ===================== 분석 함수 =====================

export interface SibjiunseongItem {
  pillarName: string
  zhi: string
  sibjiunseong: string
  level: number
  phase: string
  meaning: string
  actionGuide: string
}

export interface SibjiunseongResult {
  items: SibjiunseongItem[]
  averageLevel: number
  currentPhase: string
  strongestPosition: string
  overallEnergy: '왕성' | '보통' | '쇠약'
  waveDescription: string
}

export function analyzeSibjiunseong(ilgan: string, pillars: Array<{ name: string; zhi: string }>): SibjiunseongResult {
  const table = SIBJIUNSEONG_TABLE[ilgan]
  if (!table) {
    return {
      items: [],
      averageLevel: 5,
      currentPhase: '중화',
      strongestPosition: '일지',
      overallEnergy: '보통',
      waveDescription: '십이운성 데이터를 계산할 수 없습니다.',
    }
  }

  const items: SibjiunseongItem[] = pillars.map((p) => {
    const ss = table[p.zhi] || '미상'
    const info = SIBJIUNSEONG_INFO[ss]
    return {
      pillarName: p.name,
      zhi: p.zhi,
      sibjiunseong: ss,
      level: info?.level || 5,
      phase: info?.phase || '중화',
      meaning: info?.meaning || '',
      actionGuide: info?.actionGuide || '',
    }
  })

  const avgLevel = items.reduce((s, i) => s + i.level, 0) / (items.length || 1)
  const strongest = items.sort((a, b) => b.level - a.level)[0]

  let overallEnergy: '왕성' | '보통' | '쇠약'
  if (avgLevel >= 9) overallEnergy = '왕성'
  else if (avgLevel >= 6) overallEnergy = '보통'
  else overallEnergy = '쇠약'

  // 파동 함수 설명 생성
  const wavePoints = items.map((i) => `${i.pillarName}(${i.sibjiunseong}·${i.level})`).join(' → ')
  const waveDescription = `에너지 파동: ${wavePoints}. 평균 에너지: ${avgLevel.toFixed(1)}/12 (${overallEnergy})`

  const currentPhase = strongest?.phase || '중화'
  items.sort(
    (a, b) => pillars.findIndex((p) => p.name === a.pillarName) - pillars.findIndex((p) => p.name === b.pillarName)
  )

  return {
    items,
    averageLevel: Math.round(avgLevel * 10) / 10,
    currentPhase,
    strongestPosition: strongest?.pillarName || '일지',
    overallEnergy,
    waveDescription,
  }
}
