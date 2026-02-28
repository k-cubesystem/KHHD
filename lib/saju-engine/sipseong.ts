/**
 * 해화지기 사주 엔진 - 십성(十星) 모듈
 * haehwajigi.md 4장: "사회 심리학: 십성론의 현대적 파라미터 업데이트"
 * 일간(自我)을 기준으로 8글자 전체 십성 계산 + 물상론 NLG 데이터
 */

// ===================== 오행 데이터 =====================

const GAN_ELEMENT: Record<string, string> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}

const ZHI_ELEMENT: Record<string, string> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

/** 음양: 甲丙戊庚壬 = 양(0), 乙丁己辛癸 = 음(1) */
const GAN_YINYANG: Record<string, number> = {
  甲: 0,
  乙: 1,
  丙: 0,
  丁: 1,
  戊: 0,
  己: 1,
  庚: 0,
  辛: 1,
  壬: 0,
  癸: 1,
}

/** 지지 음양 */
const ZHI_YINYANG: Record<string, number> = {
  子: 1,
  丑: 1,
  寅: 0,
  卯: 1,
  辰: 0,
  巳: 1,
  午: 0,
  未: 1,
  申: 0,
  酉: 1,
  戌: 0,
  亥: 0,
}

/** 오행 상생 (생하는 오행) */
const SAENG: Record<string, string> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}

/** 오행 상극 (극하는 오행) */
const GEUK: Record<string, string> = {
  木: '土',
  火: '金',
  土: '水',
  金: '木',
  水: '火',
}

// ===================== 천간 물상론 (haehwajigi.md 2장) =====================

export const GAN_MULSANG: Record<
  string,
  {
    symbol: string
    poeticDesc: string
    psychology: string
    modernJobs: string[]
  }
> = {
  甲: {
    symbol: '거대한 소나무·우레',
    poeticDesc: '하늘을 향해 곧게 뻗어 오르는 거목. 껍질을 깨고 나오는 생명력.',
    psychology: '시작을 잘하고, 적극적이며 도전적인 리더십. 꺾일지언정 굽히지 않는 묵직한 돌파력.',
    modernJobs: ['창업가', '건설업', '산림·환경', '법조인', '스포츠 지도자'],
  },
  乙: {
    symbol: '끈질긴 덩굴·피(Blood)',
    poeticDesc: '바위틈에서도 피어나는 끈질긴 덩굴. 스며드는 친화력.',
    psychology: '혹독한 환경에서도 살아남는 유연한 생존력과 부드러운 카리스마.',
    modernJobs: ['플로리스트', '뷰티·패션', '외교관', '심리 상담사', '유통업'],
  },
  丙: {
    symbol: '만물을 비추는 태양',
    poeticDesc: '만인에게 평등하게 에너지를 나누어주는 거대한 빛.',
    psychology: '공명정대함, 숨김없는 솔직함, 거시적 영향력.',
    modernJobs: ['방송인', '정치인', '교육자', '이벤트 기획', '태양광·에너지'],
  },
  丁: {
    symbol: '촛불·별·제련소 모닥불',
    poeticDesc: '스스로를 태워 타인을 밝히는 희생정신. 내면의 깊은 통찰.',
    psychology: '예술적이고 영적인 직관, 내면의 깊은 감수성.',
    modernJobs: ['예술가', '의료인', '종교인', '정신과 의사', '명상 지도자'],
  },
  戊: {
    symbol: '거대한 산·대지',
    poeticDesc: '만물을 품어 안는 넓고 두터운 대지.',
    psychology: '중후하고 믿음직한 포용력. 변화보다 안정을 추구하는 강인함.',
    modernJobs: ['부동산', '농업', '건축업', '군인', '공무원'],
  },
  己: {
    symbol: '비옥한 논밭·정원',
    poeticDesc: '씨앗을 품어 싹을 틔우는 따뜻한 옥토.',
    psychology: '꼼꼼하고 섬세한 관리 능력. 인내심 있는 양육자적 기질.',
    modernJobs: ['식품업', '교육', '사회복지', '원예·조경', '의료 행정'],
  },
  庚: {
    symbol: '제련되지 않은 무쇠·바위산',
    poeticDesc: '거칠지만 강인한 원석. 한번 결정하면 우직하게 밀고 나가는 돌파력.',
    psychology: '숙살지기(肅殺之氣). 결단력과 추진력. 냉정한 현실 판단.',
    modernJobs: ['군인', '경찰', '외과 의사', '엔지니어', '스포츠 선수'],
  },
  辛: {
    symbol: '이미 세공된 보석·예리한 메스',
    poeticDesc: '극도로 정밀한 미적 감각. 예리하게 사안을 파고드는 비판력.',
    psychology: '완벽주의, 도도한 매력, 예리한 분석력.',
    modernJobs: ['의사', '변호사', '보석 디자이너', '회계사', '데이터 분석가'],
  },
  壬: {
    symbol: '깊고 넓은 바다·큰 강',
    poeticDesc: '속을 알 수 없는 깊은 지혜. 선악을 구분하지 않는 거대한 포용력.',
    psychology: '비밀스럽고 철학적인 태도. 거대한 흐름을 읽는 통찰.',
    modernJobs: ['철학자', '탐정', '정보기관', '국제 무역', '해양·수산업'],
  },
  癸: {
    symbol: '이슬비·고요한 옹달샘·안개',
    poeticDesc: '만물을 적시는 이슬비. 환경에 자연스럽게 스며드는 정보 수집력.',
    psychology: '감성적이고 섬세한 태도. 만물의 생장을 돕는 치유력.',
    modernJobs: ['간호사', '상담사', '작가', '연구원', '힐링·치유'],
  },
}

// ===================== 십성 현대 해석 (haehwajigi.md 4장) =====================

export const SIPSEONG_MODERN: Record<
  string,
  {
    name: string
    hanja: string
    traditionalView: string
    modernPower: string
    modernJobs: string[]
    relationshipType: string
  }
> = {
  비견: {
    name: '비견',
    hanja: '比肩',
    traditionalView: '경쟁·분재',
    modernPower: '독립심, 자기주도성, 동등한 파트너십',
    modernJobs: ['프리랜서', '개인 사업', '스포츠'],
    relationshipType: '나와 같은 사람, 동료',
  },
  겁재: {
    name: '겁재',
    hanja: '劫財',
    traditionalView: '극단적 고집, 재물 손실',
    modernPower: '불굴의 담대함과 과단성. 이타적으로 발현 시 약자를 대변하는 힘.',
    modernJobs: ['군인', '특수경찰', '외과의사', '언론인', '인권운동가'],
    relationshipType: '강렬한 경쟁자, 혹은 의형제',
  },
  식신: {
    name: '식신',
    hanja: '食神',
    traditionalView: '의식주·수명',
    modernPower: '창의적 표현력, 생산성, 풍요로운 감성',
    modernJobs: ['요리사', '크리에이터', '디자이너', '예술가'],
    relationshipType: '내가 만들어낸 것, 표현과 생산의 에너지',
  },
  상관: {
    name: '상관',
    hanja: '傷官',
    traditionalView: '규범의 파괴, 하극상',
    modernPower: '기존의 틀을 깨부수는 폭발적 상상력, 표현력, 호승심.',
    modernJobs: ['IT 개발자', '유튜브 크리에이터', '스타트업 창업자', '혁신가'],
    relationshipType: '내가 만들어내되 통제를 벗어난 에너지',
  },
  편재: {
    name: '편재',
    hanja: '偏財',
    traditionalView: '투기·불안정 재물',
    modernPower: '큰 그림을 보는 사업가적 안목, 임기응변, 사교성',
    modernJobs: ['벤처 투자가', '영업', '무역', '코인·주식 트레이더'],
    relationshipType: '통제되지 않는 재물, 아버지(남성 기준)',
  },
  정재: {
    name: '정재',
    hanja: '正財',
    traditionalView: '안정적 재물',
    modernPower: '꼼꼼한 재무 관리, 성실한 노동의 가치',
    modernJobs: ['회계사', '은행원', '공무원', '안정적 직장인'],
    relationshipType: '정직한 노동으로 얻는 재물, 아내(남성 기준)',
  },
  편관: {
    name: '편관',
    hanja: '偏官',
    traditionalView: '질병, 강압적 환경, 관재수',
    modernPower: '과감한 행동력과 카리스마적 리더십, 뛰어난 위기관리 능력.',
    modernJobs: ['프로 스포츠 선수', '투자 은행가', '리스크 매니저', '군 장교'],
    relationshipType: '강압적 외부 환경, 나를 통제하려는 힘',
  },
  정관: {
    name: '정관',
    hanja: '正官',
    traditionalView: '명예·지위',
    modernPower: '원칙과 규율, 사회적 책임감, 명예로운 성취',
    modernJobs: ['공무원', '법조인', '대기업 임원', '교수'],
    relationshipType: '사회 규범, 직장, 남편(여성 기준)',
  },
  편인: {
    name: '편인',
    hanja: '偏印',
    traditionalView: '외로움, 치우친 사고',
    modernPower: '비범한 영감과 직관. 특정 분야에 대한 편집광적 몰입과 추상화 능력.',
    modernJobs: ['문화 예술가', '철학자', '심리학자', 'AI 연구원', '종교인'],
    relationshipType: '편향된 지식·영감의 원천, 이모/삼촌(부모의 형제)',
  },
  정인: {
    name: '정인',
    hanja: '正印',
    traditionalView: '학문·인자한 어머니',
    modernPower: '깊은 학습력, 지혜, 보호와 양육의 에너지',
    modernJobs: ['교수', '연구자', '출판·편집', '의사', '사회복지사'],
    relationshipType: '나를 생하는 따뜻한 어머니의 에너지',
  },
}

// ===================== 십성 계산 함수 =====================

export interface SipseongItem {
  position: string // 위치 (년간, 년지, 월간, 월지, 일지, 시간, 시지)
  char: string // 글자
  element: string // 오행
  sipseong: string // 십성명
  yinyang: '양' | '음'
  info: (typeof SIPSEONG_MODERN)[string]
}

/**
 * 일간을 기준으로 대상 글자의 십성 계산
 */
export function calculateSipseong(ilgan: string, targetChar: string, isZhi: boolean = false): string {
  const ilganEl = GAN_ELEMENT[ilgan]
  const targetEl = isZhi ? ZHI_ELEMENT[targetChar] : GAN_ELEMENT[targetChar]
  if (!ilganEl || !targetEl) return '미정'

  const ilganYY = GAN_YINYANG[ilgan]
  const targetYY = isZhi ? ZHI_YINYANG[targetChar] : GAN_YINYANG[targetChar]
  const sameYY = ilganYY === targetYY

  // 같은 오행
  if (ilganEl === targetEl) return sameYY ? '비견' : '겁재'
  // 일간이 대상을 생함
  if (SAENG[ilganEl] === targetEl) return sameYY ? '식신' : '상관'
  // 일간이 대상을 극함
  if (GEUK[ilganEl] === targetEl) return sameYY ? '편재' : '정재'
  // 대상이 일간을 극함
  if (GEUK[targetEl] === ilganEl) return sameYY ? '편관' : '정관'
  // 대상이 일간을 생함
  if (SAENG[targetEl] === ilganEl) return sameYY ? '편인' : '정인'

  return '미정'
}

export interface SipseongMap {
  items: SipseongItem[]
  distribution: Record<string, number>
  dominantSipseong: string
  strengthAssessment: '신강' | '신약' | '중화'
  bodyStrengthScore: number // 0-100
  summary: string
}

/**
 * 사주 전체 십성 분석
 */
export function analyzeSipseong(
  ilgan: string,
  pillars: Array<{ position: string; gan: string; zhi: string }>
): SipseongMap {
  const items: SipseongItem[] = []
  const distribution: Record<string, number> = {}

  for (const pillar of pillars) {
    // 천간 (일간 제외)
    if (pillar.gan && pillar.position !== '일간') {
      const ss = calculateSipseong(ilgan, pillar.gan, false)
      const el = GAN_ELEMENT[pillar.gan] || ''
      const yy = GAN_YINYANG[pillar.gan] === 0 ? '양' : ('음' as '양' | '음')
      items.push({
        position: `${pillar.position}간`,
        char: pillar.gan,
        element: el,
        sipseong: ss,
        yinyang: yy,
        info: SIPSEONG_MODERN[ss] || SIPSEONG_MODERN['비견'],
      })
      distribution[ss] = (distribution[ss] || 0) + 1
    }
    // 지지
    if (pillar.zhi) {
      const ss = calculateSipseong(ilgan, pillar.zhi, true)
      const el = ZHI_ELEMENT[pillar.zhi] || ''
      const yy = ZHI_YINYANG[pillar.zhi] === 0 ? '양' : ('음' as '양' | '음')
      items.push({
        position: `${pillar.position}지`,
        char: pillar.zhi,
        element: el,
        sipseong: ss,
        yinyang: yy,
        info: SIPSEONG_MODERN[ss] || SIPSEONG_MODERN['비견'],
      })
      distribution[ss] = (distribution[ss] || 0) + 1
    }
  }

  // 신강/신약 판단 (비겁+인성 = 나를 돕는 세력)
  const myForce =
    (distribution['비견'] || 0) +
    (distribution['겁재'] || 0) +
    (distribution['편인'] || 0) +
    (distribution['정인'] || 0)
  const theirForce =
    (distribution['식신'] || 0) +
    (distribution['상관'] || 0) +
    (distribution['편재'] || 0) +
    (distribution['정재'] || 0) +
    (distribution['편관'] || 0) +
    (distribution['정관'] || 0)

  const total = items.length || 1
  const bodyStrengthScore = Math.round((myForce / total) * 100)
  let strengthAssessment: '신강' | '신약' | '중화'
  if (myForce > theirForce + 1) strengthAssessment = '신강'
  else if (theirForce > myForce + 1) strengthAssessment = '신약'
  else strengthAssessment = '중화'

  const dominantSipseong = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0]?.[0] || '비견'

  const summary = `${strengthAssessment} 사주. 지배 십성: ${dominantSipseong}(${distribution[dominantSipseong]}개). 비겁·인성 ${myForce}개 vs 식재관 ${theirForce}개.`

  return { items, distribution, dominantSipseong, strengthAssessment, bodyStrengthScore, summary }
}

/**
 * 십성 상세 내러티브 생성 — 위치별 현대적 역량 매핑
 * AI 프롬프트에 주입하여 풍부한 해석을 유도
 */
export function buildSipseongNarrative(sipseongMap: SipseongMap): string {
  if (sipseongMap.items.length === 0) return ''

  const lines: string[] = []

  for (const item of sipseongMap.items) {
    const info = SIPSEONG_MODERN[item.sipseong]
    if (!info) continue
    lines.push(
      `- ${item.position} ${item.sipseong}(${info.hanja}): ${info.modernPower} → ${info.modernJobs.slice(0, 3).join(', ')}`
    )
  }

  // 지배 십성 강조
  const dominant = SIPSEONG_MODERN[sipseongMap.dominantSipseong]
  if (dominant && sipseongMap.distribution[sipseongMap.dominantSipseong] >= 2) {
    lines.push(
      `★ 지배 십성 '${sipseongMap.dominantSipseong}'(${dominant.hanja})이 사주를 관통 — ${dominant.modernPower}`
    )
  }

  return lines.join('\n')
}
