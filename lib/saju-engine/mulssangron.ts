/**
 * 해화지기 사주 엔진 - 물상론(物象論) 모듈
 * haehwajigi.md 2장: 지지(地支) 물상론 + 사주 전체 풍경화
 * 천간 물상은 sipseong.ts GAN_MULSANG에서 import
 */

import { GAN_MULSANG } from './sipseong'

// ===================== 지지 물상론 =====================

export const ZHI_MULSANG: Record<
  string,
  {
    symbol: string
    poeticDesc: string
    season: string
    energy: string
  }
> = {
  子: {
    symbol: '한밤의 깊은 물',
    poeticDesc: '고요한 자정의 샘물, 만물이 잠드는 시간 속 잠재력이 소용돌이치는 심연',
    season: '한겨울',
    energy: '수렴·잠복',
  },
  丑: {
    symbol: '얼어붙은 논밭',
    poeticDesc: '봄을 기다리며 씨앗을 품은 겨울 대지, 인내의 땅',
    season: '늦겨울',
    energy: '축적·인내',
  },
  寅: {
    symbol: '새벽 숲의 호랑이',
    poeticDesc: '동이 트기 직전 포효하는 산림의 왕, 만물이 깨어나는 첫 기운',
    season: '초봄',
    energy: '시동·돌파',
  },
  卯: {
    symbol: '활짝 핀 꽃밭',
    poeticDesc: '봄바람에 문을 활짝 연 꽃과 풀, 생명이 사방으로 뻗어가는 기운',
    season: '한봄',
    energy: '성장·확산',
  },
  辰: {
    symbol: '비를 머금은 구름',
    poeticDesc: '용이 승천하기 직전의 뇌우, 거대한 변혁을 품은 습한 대지',
    season: '늦봄',
    energy: '변혁·저장',
  },
  巳: {
    symbol: '아침 햇살의 뱀',
    poeticDesc: '풀숲 사이로 스며드는 따스한 빛, 지혜를 품고 은밀히 움직이는 기운',
    season: '초여름',
    energy: '변환·지혜',
  },
  午: {
    symbol: '정오의 태양·질주하는 말',
    poeticDesc: '하늘 꼭대기에서 만물을 내리쬐는 극양(極陽)의 불꽃, 최전성의 정점',
    season: '한여름',
    energy: '극성·분출',
  },
  未: {
    symbol: '오후의 뜨거운 들판',
    poeticDesc: '열기를 머금은 비옥한 땅, 무르익은 과실이 떨어지기 직전의 충만함',
    season: '늦여름',
    energy: '숙성·결실',
  },
  申: {
    symbol: '서늘한 바람의 원숭이',
    poeticDesc: '산을 넘나드는 날렵한 기운, 가을 서리가 내리기 시작하는 쇠의 기운',
    season: '초가을',
    energy: '결단·이동',
  },
  酉: {
    symbol: '석양의 황금빛 보석',
    poeticDesc: '하루의 성과가 빛나는 황혼, 제련을 마친 순금의 기운',
    season: '한가을',
    energy: '수렴·완성',
  },
  戌: {
    symbol: '불꽃이 스러지는 황야',
    poeticDesc: '마지막 불씨를 품은 마른 땅, 충성스러운 파수꾼이 지키는 변경',
    season: '늦가을',
    energy: '수호·퇴장',
  },
  亥: {
    symbol: '밤바다의 깊은 물결',
    poeticDesc: '모든 것을 품고 새 생명을 잉태하는 어둠 속 태초의 물, 시작과 끝이 만나는 곳',
    season: '초겨울',
    energy: '포용·잉태',
  },
}

// ===================== 오행 상호작용 =====================

const ELEMENT_RELATION: Record<string, Record<string, string>> = {
  木: { 木: '비화(比和)', 火: '생(生)', 土: '극(剋)', 金: '피극(被剋)', 水: '피생(被生)' },
  火: { 木: '피생(被生)', 火: '비화(比和)', 土: '생(生)', 金: '극(剋)', 水: '피극(被剋)' },
  土: { 木: '피극(被剋)', 火: '피생(被生)', 土: '비화(比和)', 金: '생(生)', 水: '극(剋)' },
  金: { 木: '극(剋)', 火: '피극(被剋)', 土: '피생(被生)', 金: '비화(比和)', 水: '생(生)' },
  水: { 木: '생(生)', 火: '극(剋)', 土: '피극(被剋)', 金: '피생(被生)', 水: '비화(比和)' },
}

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

// ===================== 물상 상호작용 서술 =====================

const MULSANG_INTERACTION: Record<string, Record<string, string>> = {
  甲: {
    乙: '거목 곁에 덩굴이 감겨 올라 서로 기대는 형상',
    丙: '소나무 위로 태양이 비추어 숲 전체가 빛나는 풍경',
    丁: '거목 아래 촛불이 놓여 은은한 그늘 속 빛이 깃드는 형상',
    戊: '큰 나무가 산등성이에 뿌리를 내린 장엄한 풍경',
    己: '거대한 나무가 비옥한 논밭의 양분을 끌어올리는 형상',
    庚: '거대한 소나무에 쇠도끼가 내리치는 형상 — 직접적 충돌',
    辛: '원목에 보석 칼이 정밀하게 조각을 새기는 형상',
    壬: '깊은 바다 위에 솟은 거목 — 뿌리가 물에 닿아 생명력 충만',
    癸: '이슬비가 소나무를 적시며 싹을 틔우는 자양의 형상',
  },
  乙: {
    甲: '덩굴이 거목을 타고 올라 힘을 빌리는 형상',
    丙: '작은 풀꽃이 태양 아래 활짝 피어나는 생명력',
    丁: '어둠 속 촛불이 덩굴을 비추어 그림자가 춤추는 형상',
    戊: '산 아래 풀밭이 펼쳐진 고요한 풍경',
    己: '정원의 덩굴이 옥토에 뿌리를 깊이 내리는 형상',
    庚: '무쇠 낫이 덩굴을 베어내는 날카로운 충돌',
    辛: '보석 가위로 꽃을 정돈하는 섬세한 손길',
    壬: '큰 강물에 떠내려가는 나뭇잎 — 흐름에 몸을 맡기는 형상',
    癸: '이슬비가 풀잎 위에 맺혀 영롱하게 빛나는 형상',
  },
  丙: {
    甲: '태양이 거목을 비추어 그늘과 빛이 교차하는 숲',
    乙: '태양 아래 작은 꽃들이 만개하는 들판',
    丁: '태양과 촛불이 겹쳐 빛이 넘치나 촛불은 빛을 잃는 형상',
    戊: '태양이 산을 비추어 산 전체가 금빛으로 물드는 장관',
    己: '태양이 논밭을 데워 곡식이 무르익는 풍경',
    庚: '태양의 불이 무쇠를 달구어 녹이는 제련의 형상',
    辛: '태양빛에 보석이 찬란하게 빛나는 형상',
    壬: '태양과 바다가 만나 수평선에서 장엄한 노을이 지는 풍경',
    癸: '태양이 안개를 걷어내는 형상 — 진실이 드러남',
  },
  丁: {
    甲: '촛불이 거목 아래에서 은은하게 타오르는 형상',
    乙: '촛불이 덩굴 사이로 비치는 몽환적 풍경',
    丙: '촛불이 태양 앞에서 빛을 잃지만 내면의 깊이는 유지',
    戊: '산속 동굴에서 모닥불이 타오르는 형상',
    己: '정원 한구석에 촛불이 놓여 밤을 밝히는 형상',
    庚: '모닥불이 거친 무쇠를 달구어 연장을 만드는 제련',
    辛: '촛불 아래 보석이 은은하게 빛나는 형상',
    壬: '촛불이 큰 물결에 꺼질 위기 — 작은 빛의 위태로움',
    癸: '촛불에 이슬이 맺혀 지글거리는 형상 — 감성의 충돌',
  },
  戊: {
    甲: '산에 큰 나무가 뿌리 내린 형상 — 서로 기운을 나눔',
    乙: '산기슭에 풀과 꽃이 핀 형상',
    丙: '태양이 산을 비추어 장엄함이 배가되는 풍경',
    丁: '산중 동굴에서 모닥불이 타오르는 형상',
    己: '큰 산과 논밭이 어우러진 평화로운 풍경',
    庚: '산속에서 광석이 캐어지는 형상 — 내면의 보물',
    辛: '산에서 보석이 발굴되는 형상',
    壬: '산이 큰 바다를 막아서는 형상 — 거대한 대치',
    癸: '산에 안개가 내려앉아 신비로운 풍경',
  },
  己: {
    甲: '논밭에 큰 나무가 자라 그늘을 드리우는 형상',
    乙: '정원에 덩굴이 무성하게 자라는 풍경',
    丙: '햇볕에 논밭이 따뜻해져 곡식이 익는 형상',
    丁: '밤 정원에 촛불이 놓인 형상',
    戊: '넓은 들판 너머 큰 산이 보이는 평화로운 풍경',
    庚: '옥토에서 무쇠 쟁기가 땅을 가는 형상 — 개척',
    辛: '비옥한 땅에서 보석이 캐어지는 형상',
    壬: '논밭에 큰 물이 밀려오는 형상 — 범람의 위험',
    癸: '이슬비가 논밭을 적셔 풍요를 가져다주는 형상',
  },
  庚: {
    甲: '쇠도끼가 거목을 찍는 형상 — 강렬한 충돌과 변혁',
    乙: '무쇠 낫이 잡초를 정리하는 형상',
    丙: '태양 불이 무쇠를 달구는 형상 — 제련과 변화',
    丁: '모닥불에 무쇠가 달궈져 연장이 되는 형상',
    戊: '산속 깊은 곳에 묻힌 광석의 형상',
    己: '무쇠 쟁기가 논밭을 갈아엎는 개척의 형상',
    辛: '거친 원석과 세공된 보석이 나란히 놓인 형상',
    壬: '무쇠가 물속에 가라앉아 녹슬어가는 형상',
    癸: '이슬이 쇠붙이 위에 맺혀 서리가 되는 형상',
  },
  辛: {
    甲: '보석 칼이 원목에 정밀하게 조각하는 형상',
    乙: '보석 가위가 꽃을 다듬는 섬세한 형상',
    丙: '태양빛에 보석이 찬란히 빛나는 형상',
    丁: '촛불 아래 보석이 은은하게 반짝이는 형상',
    戊: '산속에서 보석이 발견되는 형상',
    己: '비옥한 흙에서 보석이 캐어지는 형상',
    庚: '원석 옆에 세공된 보석 — 거칠고 섬세함의 대비',
    壬: '보석이 깊은 바다에 잠긴 형상 — 숨겨진 가치',
    癸: '이슬에 젖은 보석이 새벽빛에 반짝이는 형상',
  },
  壬: {
    甲: '큰 바다 위에 솟은 거목 — 생명력의 교류',
    乙: '큰 강물에 떠다니는 나뭇잎의 형상',
    丙: '바다와 태양이 수평선에서 만나는 장관',
    丁: '큰 물결이 촛불을 삼키려는 형상',
    戊: '바다가 산에 부딪혀 파도가 솟는 형상',
    己: '큰 물이 논밭에 밀려드는 형상',
    庚: '물속에 무쇠가 가라앉는 형상',
    辛: '깊은 물속에 보석이 잠긴 형상',
    癸: '큰 바다와 이슬비가 합류하여 한없이 깊어지는 형상',
  },
  癸: {
    甲: '이슬비가 거목의 뿌리를 적시는 자양의 형상',
    乙: '이슬이 풀잎 위에 맺혀 생명을 키우는 형상',
    丙: '안개가 태양에 걷히며 세상이 밝아지는 형상',
    丁: '이슬이 촛불 위에 떨어져 지글거리는 형상',
    戊: '안개가 산을 감싸 신비로운 풍경',
    己: '이슬비가 논밭을 적셔 풍요로운 수확의 형상',
    庚: '서리가 쇠붙이 위에 내리는 형상',
    辛: '새벽 이슬에 보석이 반짝이는 형상',
    壬: '이슬이 바다로 흘러들어 하나가 되는 형상',
  },
}

// ===================== 사주 풍경화 =====================

/**
 * 사주 전체 8글자를 하나의 시적 풍경으로 변환
 */
export function buildMulsangLandscape(pillars: {
  year: { gan: string; zhi: string }
  month: { gan: string; zhi: string }
  day: { gan: string; zhi: string }
  time: { gan: string; zhi: string }
}): string {
  const dayGan = pillars.day.gan
  const dayMulsang = GAN_MULSANG[dayGan]
  if (!dayMulsang) return ''

  const monthGan = pillars.month.gan
  const yearGan = pillars.year.gan
  const timeGan = pillars.time.gan
  const dayZhi = pillars.day.zhi
  const monthZhi = pillars.month.zhi

  const dayZhiMulsang = ZHI_MULSANG[dayZhi]
  const monthZhiMulsang = ZHI_MULSANG[monthZhi]
  const monthGanMulsang = GAN_MULSANG[monthGan]
  const yearGanMulsang = GAN_MULSANG[yearGan]
  const timeGanMulsang = GAN_MULSANG[timeGan]

  // 일간 중심 풍경 구성
  const lines: string[] = []

  // 1) 월지(계절) + 일간(자아) 기본 풍경
  if (monthZhiMulsang && dayMulsang) {
    lines.push(
      `${monthZhiMulsang.season}의 기운이 감도는 ${monthZhiMulsang.symbol} 위에, ${dayMulsang.symbol}(${dayGan})이 자리하고 있다.`
    )
  }

  // 2) 일지(배우자궁/내면) 풍경
  if (dayZhiMulsang) {
    lines.push(`그 뿌리는 ${dayZhiMulsang.symbol}(${dayZhi})에 닿아 ${dayZhiMulsang.energy}의 기운을 머금는다.`)
  }

  // 3) 월간(사회적 환경)과 일간의 상호작용
  if (monthGanMulsang && MULSANG_INTERACTION[dayGan]?.[monthGan]) {
    lines.push(
      `사회적 무대에서는 ${monthGanMulsang.symbol}(${monthGan})과 만나 — ${MULSANG_INTERACTION[dayGan][monthGan]}.`
    )
  }

  // 4) 년간(조상/배경) 또는 시간(미래/자녀)
  if (timeGanMulsang && MULSANG_INTERACTION[dayGan]?.[timeGan]) {
    lines.push(
      `미래를 향한 끝자리에는 ${timeGanMulsang.symbol}(${timeGan})이 놓여 ${MULSANG_INTERACTION[dayGan][timeGan]}.`
    )
  } else if (yearGanMulsang && MULSANG_INTERACTION[dayGan]?.[yearGan]) {
    lines.push(
      `뿌리의 시작점에는 ${yearGanMulsang.symbol}(${yearGan})이 자리하여 ${MULSANG_INTERACTION[dayGan][yearGan]}.`
    )
  }

  return lines.join(' ')
}

/**
 * 두 천간 간 물상 상호작용 서술
 */
export function describeMulsangInteraction(gan1: string, gan2: string): string | null {
  return MULSANG_INTERACTION[gan1]?.[gan2] || null
}

/**
 * 특정 글자의 오행 상호작용 유형 반환
 */
export function getElementInteraction(el1: string, el2: string): string {
  return ELEMENT_RELATION[el1]?.[el2] || '미정'
}

export { GAN_MULSANG, GAN_ELEMENT, ZHI_ELEMENT }
