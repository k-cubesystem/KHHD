/**
 * 해화지기 사주 엔진 - 궁합(宮合) 엔진 v2
 * 8개 카테고리 가중치 융합 알고리즘
 */

import type { SajuContext } from './context-builder'
import { CHEONGAN_HAP, CHEONGAN_CHUNG, JIJI_YUKHAP, JIJI_SAMHAP, JIJI_CHUNG, JIJI_HYEONG } from './relations'
import { calculateSipseong, SIPSEONG_MODERN } from './sipseong'
import { SINSAL_MODERN } from './sinsal-extended'
import { describeMulsangInteraction, ZHI_MULSANG } from './mulssangron'

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

const SAENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const GEUK: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
const SAENG_BY: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }

const ALL_ELEMENTS = ['木', '火', '土', '金', '水']
const ELEMENT_KR: Record<string, string> = { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' }

// ===================== 원진·귀문 =====================

const WONJIN_PAIRS: [string, string][] = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '酉'],
  ['卯', '申'],
  ['辰', '亥'],
  ['巳', '戌'],
]

const GWIMUN_PAIRS: [string, string][] = [
  ['寅', '丑'],
  ['戌', '亥'],
  ['辰', '巳'],
  ['申', '未'],
]

// ===================== 타입 =====================

export type CompatibilityRelationType = 'lover' | 'spouse' | 'friend' | 'business' | 'parent_child'

export interface CategoryScore {
  category: string
  label: string
  score: number // 0-100
  maxScore: number
  details: string[]
}

export interface CompatibilityEngineResult {
  totalScore: number
  categories: CategoryScore[]
  mulsangNarrative: string
  luckyActions: string[]
  relationType: CompatibilityRelationType
  engineVersion: string
}

// ===================== 관계별 가중치 =====================

const CATEGORY_WEIGHTS: Record<CompatibilityRelationType, number[]> = {
  //          일간  일지  오행  용신  십성  원진  신살  대운
  lover: [0.18, 0.18, 0.12, 0.12, 0.15, 0.1, 0.08, 0.07],
  spouse: [0.15, 0.2, 0.15, 0.1, 0.15, 0.1, 0.05, 0.1],
  friend: [0.15, 0.12, 0.15, 0.08, 0.2, 0.1, 0.1, 0.1],
  business: [0.12, 0.08, 0.1, 0.18, 0.25, 0.08, 0.1, 0.09],
  parent_child: [0.2, 0.15, 0.18, 0.1, 0.18, 0.08, 0.06, 0.05],
}

// 관계 타입 매핑 (다양한 입력 → 5개 핵심 타입)
function normalizeRelationType(rel: string): CompatibilityRelationType {
  const map: Record<string, CompatibilityRelationType> = {
    lover: 'lover',
    dating: 'lover',
    crush: 'lover',
    marriage: 'spouse',
    spouse: 'spouse',
    friend: 'friend',
    best_friend: 'friend',
    roommate: 'friend',
    siblings: 'friend',
    business_partner: 'business',
    coworker: 'business',
    boss_employee: 'business',
    mentor_mentee: 'business',
    investor: 'business',
    client: 'business',
    team_project: 'business',
    part_timer: 'business',
    parent_child: 'parent_child',
    in_laws: 'parent_child',
  }
  return map[rel] || 'lover'
}

// ===================== 카테고리별 분석 =====================

/** 1. 일간 궁합 */
function scoreDayMaster(dm1: string, dm2: string): CategoryScore {
  let score = 50
  const details: string[] = []
  const el1 = GAN_ELEMENT[dm1]
  const el2 = GAN_ELEMENT[dm2]

  // 천간합
  if (CHEONGAN_HAP[dm1]?.partner === dm2) {
    score += 35
    details.push(`${CHEONGAN_HAP[dm1].label} — 천생의 합`)
  }
  // 천간충
  if (CHEONGAN_CHUNG[dm1] === dm2) {
    score -= 30
    details.push(`${dm1}${dm2}충 — 일간이 정면 충돌`)
  }
  // 상생
  if (SAENG[el1] === el2) {
    score += 20
    details.push(`${ELEMENT_KR[el1]}→${ELEMENT_KR[el2]} 상생 — 기운을 나눠주는 관계`)
  } else if (SAENG[el2] === el1) {
    score += 20
    details.push(`${ELEMENT_KR[el2]}→${ELEMENT_KR[el1]} 상생 — 기운을 받는 관계`)
  }
  // 상극
  if (GEUK[el1] === el2) {
    score -= 15
    details.push(`${ELEMENT_KR[el1]}→${ELEMENT_KR[el2]} 상극 — 한쪽이 제압`)
  } else if (GEUK[el2] === el1) {
    score -= 15
    details.push(`${ELEMENT_KR[el2]}→${ELEMENT_KR[el1]} 상극 — 한쪽이 제압`)
  }
  // 비화
  if (el1 === el2) {
    score += 10
    details.push(`같은 ${ELEMENT_KR[el1]} 오행 — 동질감이 강한 관계`)
  }

  if (details.length === 0) details.push('특별한 천간 관계 없음')

  return { category: 'dayMaster', label: '일간 궁합', score: clamp(score), maxScore: 100, details }
}

/** 2. 일지 궁합 */
function scoreDayBranch(dz1: string, dz2: string): CategoryScore {
  let score = 50
  const details: string[] = []

  // 육합
  for (const yh of JIJI_YUKHAP) {
    if ((yh.zhis[0] === dz1 && yh.zhis[1] === dz2) || (yh.zhis[0] === dz2 && yh.zhis[1] === dz1)) {
      score += 35
      details.push(`${yh.label} — 은밀하고 끈끈한 결합`)
      break
    }
  }

  // 삼합 반합
  for (const sh of JIJI_SAMHAP) {
    if (sh.zhis.includes(dz1) && sh.zhis.includes(dz2)) {
      score += 25
      details.push(`${sh.label} (반합) — 같은 국(局)의 에너지`)
      break
    }
  }

  // 충
  if (JIJI_CHUNG[dz1] === dz2) {
    score -= 35
    details.push(`${dz1}${dz2}충 — 일지 정면충돌 (배우자궁 갈등)`)
  }

  // 형
  for (const h of JIJI_HYEONG) {
    if (h.zhis.includes(dz1) && h.zhis.includes(dz2) && h.zhis.length === 2) {
      score -= 20
      details.push(`${h.label} — 서로를 다치게 할 수 있는 관계`)
      break
    }
  }

  if (details.length === 0) details.push('일지 간 특별한 합충 관계 없음')

  return { category: 'dayBranch', label: '일지 궁합', score: clamp(score), maxScore: 100, details }
}

/** 3. 오행 보완 */
function scoreElementBalance(ctx1: SajuContext, ctx2: SajuContext): CategoryScore {
  let score = 50
  const details: string[] = []
  const dist1 = ctx1.sajuData.elementsDistribution
  const dist2 = ctx2.sajuData.elementsDistribution

  for (const el of ALL_ELEMENTS) {
    const c1 = dist1[el] || 0
    const c2 = dist2[el] || 0
    // 한쪽이 부족(0-1)한데 다른 쪽이 충분(2+)하면 보완
    if (c1 <= 1 && c2 >= 2) {
      score += 12
      details.push(`${ctx1.personInfo.name}의 부족한 ${ELEMENT_KR[el]}을 ${ctx2.personInfo.name}이 채워줌`)
    } else if (c2 <= 1 && c1 >= 2) {
      score += 12
      details.push(`${ctx2.personInfo.name}의 부족한 ${ELEMENT_KR[el]}을 ${ctx1.personInfo.name}이 채워줌`)
    }
    // 양쪽 다 과잉(3+)이면 공명 과잉
    if (c1 >= 3 && c2 >= 3) {
      score -= 8
      details.push(`양쪽 모두 ${ELEMENT_KR[el]} 과잉 — 에너지 쏠림 주의`)
    }
  }

  if (details.length === 0) details.push('오행 보완 관계가 뚜렷하지 않음')

  return { category: 'elementBalance', label: '오행 보완', score: clamp(score), maxScore: 100, details }
}

/** 4. 용신 시너지 */
function scoreYongsinSynergy(ctx1: SajuContext, ctx2: SajuContext): CategoryScore {
  let score = 50
  const details: string[] = []
  const y1 = ctx1.analysis.tripleYongsin?.finalYongsin || ctx1.analysis.yongsin?.yongsin
  const g1 = ctx1.analysis.tripleYongsin?.finalGisin
  const y2 = ctx2.analysis.tripleYongsin?.finalYongsin || ctx2.analysis.yongsin?.yongsin
  const g2 = ctx2.analysis.tripleYongsin?.finalGisin

  const dm1El = GAN_ELEMENT[ctx1.sajuData.dayMaster]
  const dm2El = GAN_ELEMENT[ctx2.sajuData.dayMaster]

  // 상대 일간이 내 용신 오행
  if (y1 && dm2El === y1) {
    score += 25
    details.push(
      `${ctx2.personInfo.name}의 일간(${ELEMENT_KR[dm2El]})이 ${ctx1.personInfo.name}의 용신 — 천운의 조력자`
    )
  }
  if (y2 && dm1El === y2) {
    score += 25
    details.push(
      `${ctx1.personInfo.name}의 일간(${ELEMENT_KR[dm1El]})이 ${ctx2.personInfo.name}의 용신 — 천운의 조력자`
    )
  }

  // 기신 충돌
  if (g1 && dm2El === g1) {
    score -= 20
    details.push(`${ctx2.personInfo.name}의 일간이 ${ctx1.personInfo.name}의 기신 — 기운 충돌`)
  }
  if (g2 && dm1El === g2) {
    score -= 20
    details.push(`${ctx1.personInfo.name}의 일간이 ${ctx2.personInfo.name}의 기신 — 기운 충돌`)
  }

  if (details.length === 0) details.push('용신 관계가 뚜렷하지 않음')

  return { category: 'yongsinSynergy', label: '용신 시너지', score: clamp(score), maxScore: 100, details }
}

/** 5. 십성 관계 */
function scoreSipseongRelation(ctx1: SajuContext, ctx2: SajuContext): CategoryScore {
  let score = 50
  const details: string[] = []
  const dm1 = ctx1.sajuData.dayMaster
  const dm2 = ctx2.sajuData.dayMaster

  // A 기준 B의 십성
  const sipseongAB = calculateSipseong(dm1, dm2)
  // B 기준 A의 십성
  const sipseongBA = calculateSipseong(dm2, dm1)

  // 십성별 궁합 선호도 점수
  const SIPSEONG_PREFERENCE: Record<string, number> = {
    정재: 20,
    편재: 15,
    정관: 18,
    편관: 5,
    정인: 15,
    편인: 8,
    식신: 18,
    상관: 10,
    비견: 12,
    겁재: -5,
  }

  const scoreAB = SIPSEONG_PREFERENCE[sipseongAB] ?? 0
  const scoreBA = SIPSEONG_PREFERENCE[sipseongBA] ?? 0

  score += Math.round((scoreAB + scoreBA) / 2)

  const modernAB = SIPSEONG_MODERN[sipseongAB]
  const modernBA = SIPSEONG_MODERN[sipseongBA]
  details.push(
    `${ctx1.personInfo.name}에게 ${ctx2.personInfo.name}은 ${sipseongAB}${modernAB ? ` (${modernAB.relationshipType})` : ''}`
  )
  details.push(
    `${ctx2.personInfo.name}에게 ${ctx1.personInfo.name}은 ${sipseongBA}${modernBA ? ` (${modernBA.relationshipType})` : ''}`
  )

  return { category: 'sipseongRelation', label: '십성 관계', score: clamp(score), maxScore: 100, details }
}

/** 6. 원진·귀문 */
function scoreWonjinGwimun(dz1: string, dz2: string): CategoryScore {
  let score = 80
  const details: string[] = []

  for (const [a, b] of WONJIN_PAIRS) {
    if ((a === dz1 && b === dz2) || (a === dz2 && b === dz1)) {
      score -= 30
      details.push(`${dz1}${dz2} 원진 — 근본적으로 서로 미워하는 기운`)
      break
    }
  }

  for (const [a, b] of GWIMUN_PAIRS) {
    if ((a === dz1 && b === dz2) || (a === dz2 && b === dz1)) {
      score -= 20
      details.push(`${dz1}${dz2} 귀문 — 정신적 불안과 의심이 생기는 관계`)
      break
    }
  }

  if (details.length === 0) details.push('원진·귀문 관계 없음 — 기본적으로 안정적')

  return { category: 'wonjinGwimun', label: '원진·귀문', score: clamp(score), maxScore: 100, details }
}

/** 7. 신살 호환 */
function scoreSinsalCompat(ctx1: SajuContext, ctx2: SajuContext): CategoryScore {
  let score = 60
  const details: string[] = []

  const names1 = new Set(ctx1.analysis.sinsal.map((s) => s.name))
  const names2 = new Set(ctx2.analysis.sinsal.map((s) => s.name))

  // 도화 + 화개 조합 (한쪽 매력 + 한쪽 깊이)
  if ((names1.has('도화살') && names2.has('화개살')) || (names2.has('도화살') && names1.has('화개살'))) {
    score += 20
    details.push('도화살 + 화개살 — 매력과 깊이가 어우러지는 시너지')
  }

  // 양쪽 백호대살
  if (names1.has('백호대살') && names2.has('백호대살')) {
    score -= 15
    details.push('쌍방 백호대살 — 강한 에너지 충돌 위험')
  }

  // 천을귀인 쌍방 (sinsal-extended에서 이름으로 판별)
  if (names1.has('천을귀인') && names2.has('천을귀인')) {
    score += 25
    details.push('쌍방 천을귀인 — 서로에게 귀인이 되어주는 행운의 관계')
  }

  // 양쪽 역마살 — 함께 움직이는 관계
  if (names1.has('역마살') && names2.has('역마살')) {
    score += 10
    details.push('쌍방 역마살 — 함께 세계를 누비는 동반자')
  }

  if (details.length === 0) details.push('특별한 신살 시너지 없음')

  return { category: 'sinsalCompat', label: '신살 호환', score: clamp(score), maxScore: 100, details }
}

/** 8. 대운 동기화 */
function scoreDaeunSync(ctx1: SajuContext, ctx2: SajuContext): CategoryScore {
  let score = 50
  const details: string[] = []

  const daeun1 = getCurrentDaeun(ctx1)
  const daeun2 = getCurrentDaeun(ctx2)

  if (daeun1 && daeun2) {
    const el1 = daeun1.element
    const el2 = daeun2.element

    if (el1 === el2) {
      score += 20
      details.push(`같은 ${ELEMENT_KR[el1]} 대운 — 에너지 리듬이 일치`)
    } else if (SAENG[el1] === el2 || SAENG[el2] === el1) {
      score += 15
      details.push(`대운 ${ELEMENT_KR[el1]}↔${ELEMENT_KR[el2]} 상생 — 함께 성장하는 시기`)
    } else if (GEUK[el1] === el2 || GEUK[el2] === el1) {
      score -= 15
      details.push(`대운 ${ELEMENT_KR[el1]}↔${ELEMENT_KR[el2]} 상극 — 인생 리듬 충돌기`)
    }

    // 에너지 레벨 유사도 (십이운성 평균 비교)
    const avg1 = ctx1.analysis.sibjiunseong.averageLevel
    const avg2 = ctx2.analysis.sibjiunseong.averageLevel
    const diff = Math.abs(avg1 - avg2)
    if (diff <= 2) {
      score += 15
      details.push('에너지 레벨 유사 — 삶의 템포가 비슷')
    } else if (diff >= 5) {
      score -= 10
      details.push('에너지 레벨 차이 큼 — 삶의 속도 조절 필요')
    }
  } else {
    details.push('대운 정보 부족으로 동기화 분석 제한')
  }

  if (details.length === 0) details.push('대운 동기화 보통')

  return { category: 'daeunSync', label: '대운 동기화', score: clamp(score), maxScore: 100, details }
}

// ===================== 유틸리티 =====================

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v))
}

function getCurrentDaeun(ctx: SajuContext): { element: string; ganji: string } | null {
  const birthYear = parseInt(ctx.personInfo.birthDate.split('-')[0])
  const currentYear = new Date().getFullYear()
  const age = currentYear - birthYear
  const daeun = ctx.analysis.daeun.find((d) => d.age <= age && d.age + 10 > age)
  return daeun ? { element: daeun.element, ganji: daeun.ganji } : null
}

function buildMulsangNarrative(ctx1: SajuContext, ctx2: SajuContext): string {
  const dm1 = ctx1.sajuData.dayMaster
  const dm2 = ctx2.sajuData.dayMaster
  const dz1 = ctx1.sajuData.pillars.day.zhi
  const dz2 = ctx2.sajuData.pillars.day.zhi

  const ganInteraction = describeMulsangInteraction(dm1, dm2)
  const zhiMulsang1 = ZHI_MULSANG[dz1]
  const zhiMulsang2 = ZHI_MULSANG[dz2]

  const parts: string[] = []

  if (ganInteraction) {
    parts.push(`${ctx1.personInfo.name}(${dm1})과 ${ctx2.personInfo.name}(${dm2})이 만나면 — ${ganInteraction}.`)
  }

  if (zhiMulsang1 && zhiMulsang2) {
    parts.push(
      `두 사람의 내면 무대: ${zhiMulsang1.symbol}(${dz1})과 ${zhiMulsang2.symbol}(${dz2})이 어우러져 ${zhiMulsang1.energy}과 ${zhiMulsang2.energy}의 조화를 이룬다.`
    )
  }

  return parts.join(' ') || '두 사람의 기운이 만나 새로운 풍경을 그립니다.'
}

function buildLuckyActions(ctx1: SajuContext, ctx2: SajuContext, totalScore: number): string[] {
  const actions: string[] = []
  const y1 = ctx1.analysis.tripleYongsin?.finalYongsin || ctx1.analysis.yongsin?.yongsin
  const y2 = ctx2.analysis.tripleYongsin?.finalYongsin || ctx2.analysis.yongsin?.yongsin

  // 공통 용신 활용
  if (y1 && y2 && y1 === y2) {
    actions.push(`${ELEMENT_KR[y1]} 기운을 함께 활용하세요 (${getElementTip(y1)})`)
  } else {
    if (y1) actions.push(`${ctx1.personInfo.name}을 위해 ${ELEMENT_KR[y1]} 기운 활용 (${getElementTip(y1)})`)
    if (y2) actions.push(`${ctx2.personInfo.name}을 위해 ${ELEMENT_KR[y2]} 기운 활용 (${getElementTip(y2)})`)
  }

  if (totalScore >= 80) {
    actions.push('함께하는 활동을 늘려 시너지를 극대화하세요')
  } else if (totalScore < 60) {
    actions.push('서로의 다름을 인정하는 대화 시간을 정기적으로 가지세요')
    actions.push('갈등 시 제3자의 중재를 적극 활용하세요')
  }

  const dm1El = GAN_ELEMENT[ctx1.sajuData.dayMaster]
  const dm2El = GAN_ELEMENT[ctx2.sajuData.dayMaster]
  if (dm1El && dm2El && GEUK[dm1El] === dm2El) {
    const mediator = SAENG[dm1El]
    if (mediator) actions.push(`${ELEMENT_KR[mediator]} 기운으로 중재하세요 (${getElementTip(mediator)})`)
  }

  return actions.length > 0 ? actions : ['서로의 장점을 인정하는 대화를 나누세요']
}

function getElementTip(el: string): string {
  const tips: Record<string, string> = {
    木: '나무·초록·동쪽·봄 활동',
    火: '밝은 빛·빨간색·남쪽·열정적 활동',
    土: '노란색·중앙·안정적 공간',
    金: '흰색·서쪽·가을 산책',
    水: '검은색·북쪽·수변 데이트',
  }
  return tips[el] || ''
}

// ===================== 메인 함수 =====================

export function calculateCompatibility(
  ctx1: SajuContext,
  ctx2: SajuContext,
  relationship: string
): CompatibilityEngineResult {
  const relType = normalizeRelationType(relationship)
  const weights = CATEGORY_WEIGHTS[relType]
  const dm1 = ctx1.sajuData.dayMaster
  const dm2 = ctx2.sajuData.dayMaster
  const dz1 = ctx1.sajuData.pillars.day.zhi
  const dz2 = ctx2.sajuData.pillars.day.zhi

  const categories: CategoryScore[] = [
    scoreDayMaster(dm1, dm2),
    scoreDayBranch(dz1, dz2),
    scoreElementBalance(ctx1, ctx2),
    scoreYongsinSynergy(ctx1, ctx2),
    scoreSipseongRelation(ctx1, ctx2),
    scoreWonjinGwimun(dz1, dz2),
    scoreSinsalCompat(ctx1, ctx2),
    scoreDaeunSync(ctx1, ctx2),
  ]

  // 가중치 적용 총점
  let totalScore = 0
  for (let i = 0; i < categories.length; i++) {
    totalScore += categories[i].score * weights[i]
  }
  totalScore = Math.round(clamp(totalScore))

  const mulsangNarrative = buildMulsangNarrative(ctx1, ctx2)
  const luckyActions = buildLuckyActions(ctx1, ctx2, totalScore)

  return {
    totalScore,
    categories,
    mulsangNarrative,
    luckyActions,
    relationType: relType,
    engineVersion: 'v2',
  }
}
