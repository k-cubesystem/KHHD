/**
 * 멤버십 등급 차등 — 단일 출처(서버·클라이언트 공용).
 *
 * 2026-09-18 이용권 전환 D2: 복채 지급을 빼면 세 등급이 같은 상품이 된다(라이브 인연·보관 한도가 전 등급 동일).
 * 그래서 등급을 «월 이용권 · 한도 · 기능» 세 축으로 다시 가른다. 숫자·기능 판정은 이 파일에서만 한다.
 *
 * 🔴 기능 판정은 서버가 한다(액션 입구). 화면 판정은 안내·업셀용일 뿐이다.
 */

export type MembershipTier = 'SINGLE' | 'FAMILY' | 'BUSINESS'

/** getActiveMembership().tier 가 돌려줄 수 있는 값 전부. MASTER=관리자, MEMBER=등급 조회 실패 폴백. */
export type ResolvedTier = MembershipTier | 'MASTER' | 'MEMBER'

const TIER_RANK: Record<ResolvedTier, number> = {
  MEMBER: 1,
  SINGLE: 1,
  FAMILY: 2,
  BUSINESS: 3,
  MASTER: 99,
}

export const TIER_LABEL: Record<MembershipTier, string> = {
  SINGLE: '싱글',
  FAMILY: '패밀리',
  BUSINESS: '비즈니스',
}

export function isMembershipTier(value: unknown): value is MembershipTier {
  return value === 'SINGLE' || value === 'FAMILY' || value === 'BUSINESS'
}

/** 등급 표시명 — 상단 바 팝업들이 같은 말을 쓴다. 숫자·주기는 적지 않는다(표시광고법 규율, CLAUDE.md). */
export function planDisplayName(limits: { is_subscribed?: boolean | null; tier?: string | null } | null): string {
  if (!limits?.is_subscribed) return '무료 회원'
  if (isMembershipTier(limits.tier)) return `${TIER_LABEL[limits.tier]} 멤버십`
  if (limits.tier === 'MASTER') return '관리자'
  if (limits.tier === 'TESTER') return '테스터'
  return '멤버십 회원'
}

function rankOf(tier: string | null | undefined): number {
  if (!tier) return 0
  return (TIER_RANK as Record<string, number>)[tier] ?? 0
}

/** 이 등급이 요구 등급 이상인지. 비회원(null)은 언제나 false. */
export function tierAtLeast(tier: string | null | undefined, required: MembershipTier): boolean {
  return rankOf(tier) >= TIER_RANK[required]
}

/**
 * 등급으로 여는 기능.
 *  - familyMap: 가족 기운 지도 · 처방전 AI 풀이 — 패밀리부터
 *  - togetherView: 둘·셋·넷 함께 보기(여러 사람을 한 번에 읽는 풀이) — 비즈니스
 */
export type TierFeature = 'familyMap' | 'togetherView'

export const FEATURE_MIN_TIER: Record<TierFeature, MembershipTier> = {
  familyMap: 'FAMILY',
  togetherView: 'BUSINESS',
}

export const TIER_FEATURE_LABEL: Record<TierFeature, string> = {
  familyMap: '가족 기운 지도·처방전',
  togetherView: '둘·셋·넷 함께 보기',
}

export function tierAllows(tier: string | null | undefined, feature: TierFeature): boolean {
  return tierAtLeast(tier, FEATURE_MIN_TIER[feature])
}

/** 받침이 있으면 «은», 없으면 «는». 「처방전는」 같은 비문을 막는다. */
export function topicParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasFinal = code >= 0 && code <= 11_171 && code % 28 !== 0
  return hasFinal ? '은' : '는'
}

/** 막혔을 때 안내 한 줄 — 「가족 기운 지도·처방전은 패밀리 멤버십부터 쓸 수 있어요」 */
export function tierUpsellLine(feature: TierFeature): string {
  const label = TIER_FEATURE_LABEL[feature]
  return `${label}${topicParticle(label)} ${TIER_LABEL[FEATURE_MIN_TIER[feature]]} 멤버십부터 쓸 수 있어요`
}

/**
 * 신위·테마의 개방선(shrine_deities.required_tier · shrine_theme_packs.required_tier).
 * null = 누구나. 등급이 모자라면 «더 높은 등급에서 열린다»고 안내한다(구매 경로는 없다).
 */
export function tierUnlocks(tier: string | null | undefined, requiredTier: string | null | undefined): boolean {
  if (!requiredTier) return true
  if (!isMembershipTier(requiredTier)) return false
  return tierAtLeast(tier, requiredTier)
}
