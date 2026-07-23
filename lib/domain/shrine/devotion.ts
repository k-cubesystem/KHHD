/**
 * 신당 기원(祈願) 도메인 — 기도(소원) 누적일 → 단(壇/레벨) → 보상 트랙.
 * 클라이언트·서버 공용 순수 로직 (side-effect 없음). DB 시드(테마 code·신물 name)와 일치.
 * 근거: 발주서 5차 + 사용자 조정(2026-07-24): 기간 대폭 연장·명칭 기원→기원.
 *
 * 곡선(사용자 확정): 1단 = 누적 7일, 2단 = 30일, 이후 단마다 +30일.
 * 누적 임계값: 1단=7, 2단=30, 3단=60, 4단=90 … N단(N≥2)=30×(N-1) … 20단=570.
 */

/** 기원 최고 단(상한). */
export const DEVOTION_MAX_LEVEL = 20

/** level 도달 최소 누적 기도일: 1단=7, N단(N≥2)=30×(N-1). level<=0 → 0. */
function thresholdFor(level: number): number {
  if (level <= 0) return 0
  return level === 1 ? 7 : 30 * (level - 1)
}

/**
 * 각 단 도달 최소 누적 기도일 (index 0 = 1단, 길이 = DEVOTION_MAX_LEVEL).
 * [7,30,60,90,120,150,180,210,240,270,300,330,360,390,420,450,480,510,540,570]
 */
export const DEVOTION_THRESHOLDS: readonly number[] = Object.freeze(
  Array.from({ length: DEVOTION_MAX_LEVEL }, (_, i) => thresholdFor(i + 1))
)

/** 누적 기도일 → 기원 단(0~20). 0일=0단, 1일=1단. 음수/소수/비유한 방어. */
export function levelFromDays(totalDays: number): number {
  const n = Number.isFinite(totalDays) ? Math.floor(totalDays) : 0
  if (n < DEVOTION_THRESHOLDS[0]) return 0
  for (let k = DEVOTION_MAX_LEVEL; k >= 1; k--) {
    if (n >= DEVOTION_THRESHOLDS[k - 1]) return k
  }
  return 0
}

/** 다음 단까지 남은 기도일. 최고 단이면 0. */
export function daysToNextLevel(totalDays: number): number {
  const n = Number.isFinite(totalDays) ? Math.max(0, Math.floor(totalDays)) : 0
  const level = levelFromDays(n)
  if (level >= DEVOTION_MAX_LEVEL) return 0
  // THRESHOLDS[level-1]=현재 단 도달일, THRESHOLDS[level]=다음 단 도달일
  const nextThreshold = DEVOTION_THRESHOLDS[level]
  return Math.max(0, nextThreshold - n)
}

export interface DevotionProgress {
  /** 정규화된 누적 기도일(소수/음수 제거). */
  totalDays: number
  /** 현재 기원 단(0~20). */
  level: number
  /** 다음 단(최고 단이면 null). */
  nextLevel: number | null
  /** 다음 단 도달 누적일(최고 단이면 null). */
  nextThreshold: number | null
  /** 다음 단까지 남은 일수(최고 단이면 0). */
  daysToNext: number
}

/** 누적 기도일로부터 단·다음목표를 한 번에 계산. 결정론. */
export function devotionProgress(totalDays: number): DevotionProgress {
  const n = Number.isFinite(totalDays) ? Math.max(0, Math.floor(totalDays)) : 0
  const level = levelFromDays(n)
  const atMax = level >= DEVOTION_MAX_LEVEL
  const nextThreshold = atMax ? null : DEVOTION_THRESHOLDS[level]
  const daysToNext = atMax ? 0 : Math.max(0, (nextThreshold as number) - n)
  return { totalDays: n, level, nextLevel: atMax ? null : level + 1, nextThreshold, daysToNext }
}

// ─── 보상 트랙 (테마·신물 교차 · 저가→고가 · 프리미엄 최상위권) ─────────────────
//
// 설계 근거(스스로 내린 결정 — 카탈로그 실측 반영):
//  · 무료 테마 choga(초가)는 항상 보유 → 제외. 유료 테마 7종 전부 보상화.
//  · 신물은 '스타터킷 자동지급분'(놋방울·청죽·물항아리·은풍경)을 제외 — 모든 유저가
//    이미 보유해 보상으로서 무의미(즉시 '보유 중')하기 때문. 남는 유료 신물 3종
//    (복 부적·황금 등불·기억의 함)만 보상화 → 모든 보상이 '실제로 아직 없는 것'.
//  · 저가(1만)→고가(3만) 단조 정렬. 프리미엄 테마 별밭(byeolbat)은 최상위권(9단),
//    최고가·기능형 신물 기억의 함(3만, 대화보존 효험)은 정점(10단).
//  · 아이템은 shrine_item_catalog 에 code 컬럼이 없어 이름(name)을 안정 키로 사용.

export type DevotionRewardKind = 'theme' | 'item'

export interface DevotionReward {
  /** 이 보상을 여는 기원 단(1~20). */
  level: number
  kind: DevotionRewardKind
  /** theme: shrine_theme_packs.code · item: shrine_item_catalog.name (아이템은 code 컬럼 없음 → 이름 키) */
  code: string
  /** 지급 수량(아이템만 의미, 기본 1). */
  qty: number
}

export const DEVOTION_REWARDS: readonly DevotionReward[] = Object.freeze([
  { level: 1, kind: 'theme', code: 'banga', qty: 1 }, // 조선 반가 · 1만 · 木
  { level: 2, kind: 'item', code: '복 부적', qty: 1 }, // 1만 · 土 · 출석 보너스 효험
  { level: 3, kind: 'theme', code: 'yonggung', qty: 1 }, // 용궁 · 1만 · 水
  { level: 4, kind: 'theme', code: 'dokkaebi', qty: 1 }, // 도깨비 불 · 1만 · 火
  { level: 5, kind: 'theme', code: 'seolbit', qty: 1 }, // 설빛 서고 · 1만 · 金
  { level: 6, kind: 'theme', code: 'daljip', qty: 1 }, // 달집 마당 · 1만 · 土
  { level: 7, kind: 'theme', code: 'hongsal', qty: 1 }, // 홍살문 안뜰 · 1만 · 火
  { level: 8, kind: 'item', code: '황금 등불', qty: 1 }, // 2만 · 金 · 전설
  { level: 9, kind: 'theme', code: 'byeolbat', qty: 1 }, // 별밭 천문각 · 2만 · 프리미엄(최상위권)
  { level: 10, kind: 'item', code: '기억의 함', qty: 1 }, // 3만 · 대화보존 효험(정점)
] as const)

/** 특정 단에 걸린 보상(없으면 null). */
export function rewardForLevel(level: number): DevotionReward | null {
  return DEVOTION_REWARDS.find((r) => r.level === level) ?? null
}

/** 테마 code 를 여는 기원 단(트랙에 없으면 null). 구매처 "기원 N단 무료" 병기용. */
export function devotionLevelForTheme(code: string): number | null {
  return DEVOTION_REWARDS.find((r) => r.kind === 'theme' && r.code === code)?.level ?? null
}

/** 신물 name 을 여는 기원 단(트랙에 없으면 null). 구매처 "기원 N단 무료" 병기용. */
export function devotionLevelForItem(name: string): number | null {
  return DEVOTION_REWARDS.find((r) => r.kind === 'item' && r.code === name)?.level ?? null
}

/** 마지막 보상이 걸린 단(이후는 정진 구간, 새 보상 없음). */
export const DEVOTION_LAST_REWARD_LEVEL: number = DEVOTION_REWARDS[DEVOTION_REWARDS.length - 1]?.level ?? 0
