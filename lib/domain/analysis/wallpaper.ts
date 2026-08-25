/**
 * 「복 배경화면」 순수 도메인 — 배포된 6장의 정의와 접근 규칙.
 *
 * 오행 5장(나무·불·흙·쇠·물) + 이달의 복 1장. 사용자의 용신 오행과 같은 장은 화면에서
 * 「내 오행」으로 추천된다.
 *
 * 🔴 **2026-08-24 — 이 여섯 장은 전부 무료다**(CEO 지시). 종전의 «기본 무료 1장 + 사주/완주
 * 선물 + 구매/광고 해금» 은 이 세트에서 내려갔다. 값을 받는 자리는 앞으로 나올 **프리미엄
 * 세트**가 지고, 그때 쓸 잠금·구매·광고 기계장치(`resolveWallpaperAccess` 이하)는 손대지 않고
 * 그대로 남겨 두었다 — 새 세트에 `lock: 'saju' | 'journey'` 를 주면 즉시 다시 돈다.
 *
 * **접근 모델** — 다섯 경로의 순수 OR. 우선순위는 «표기»에만 쓰고 판정에는 쓰지 않는다:
 *   ① 무료 ② 멤버십 ACTIVE ③ 구매(복채) ④ 광고 해금(하루 1장) ⑤ 여정 보너스.
 *
 * side-effect 없음(순수) — 단위테스트 대상. 화면 표현(배지·시트)은 컴포넌트가 입힌다.
 *
 * 🔴 이미지 파일 자체는 `public/`(오행 5장)에 있어 URL 을 아는 사람은 잠금과 무관하게 받을 수
 *    있다. 복채가 걸린 지금도 이건 그대로다 — 값이 낮고(1~2만냥) 이미 라이브에 나간 자산이라
 *    수용한 위험이다. 서명 URL 로 옮기려면 여섯 장 전부 Storage 로 이사시켜야 한다.
 *    이달의 복만은 크론이 Storage(공개 버킷)에 올린다.
 */

/** 오행 — shrine 쪽 Element 와 같은 어휘를 쓴다(용신 값이 그 표에서 온다). */
export type WallpaperElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

/**
 * free=항상 열림 · saju=사주 풀이 1회 필요 · journey=복주머니 완주 필요 ·
 * premium=멤버십/구매로만 (여정 보너스 없음 — 단 «내게 필요한 기운» 1장은 사주 선물, 아래 참조).
 */
export type WallpaperLock = 'free' | 'saju' | 'journey' | 'premium'

export interface WallpaperItem {
  /** 파일명이자 화면 key. `public/wallpapers/{id}.webp` 와 1:1. */
  id: string
  title: string
  /** 카드·시트에 쓰는 한 줄 설명. */
  subtitle: string
  lock: WallpaperLock
  /** 오행 장이면 그 오행, 이달의 복이면 null. */
  element: WallpaperElement | null
}

/** 잠금 사유 문구 — 화면 세 곳(카드·시트·배지)이 같은 문자열을 쓴다. */
export const WALLPAPER_LOCK_REASON: Record<Exclude<WallpaperLock, 'free'>, string> = {
  saju: '사주 풀이 1회 후 열립니다',
  journey: '복주머니 완주 후 열립니다',
  premium: '멤버십이면 전부 열립니다',
}

/**
 * 이달의 복 — 리포에 «번들»로 들어 있는 폴백 판(版). `public/wallpapers/monthly-202608.webp`.
 *
 * 🔴 더 이상 «이번 달 판»의 정본이 아니다(2026-08-22 확장). 정본은 DB `wallpaper_monthly` 이고,
 *    매월 1일 크론(`/api/cron/wallpaper-monthly`)이 새 판을 만들어 넣는다. 이 상수는 DB 행이
 *    아직 없을 때만 쓰이는 안전망이므로 **손으로 매달 갱신할 필요가 없다**(21차d 의 수동 갱신
 *    경고는 이 확장으로 해소됨). 세트 id 자리표시자 역할도 겸한다.
 */
export const MONTHLY_WALLPAPER_ID = 'monthly-202608'

/**
 * 맛보기 한 장이었던 자리. 🔴 **2026-08-24부터 여섯 장 전부 무료**라 이 상수는 판정에 쓰이지
 * 않는다(«어느 장이 대표 무료인가»를 가리키는 표시로만 남겼다). 유료는 앞으로 나올
 * 프리미엄 세트가 진다 — 잠금·구매·광고 해금 기계장치는 그대로 살아 있다.
 */
export const FREE_WALLPAPER_ELEMENT: WallpaperElement = 'earth'

const ELEMENT_META: Record<WallpaperElement, { title: string; subtitle: string }> = {
  wood: { title: '나무', subtitle: '짙은 숲과 금빛 솔·대나무' },
  fire: { title: '불', subtitle: '진홍 불꽃과 금빛 연등' },
  earth: { title: '흙', subtitle: '황토 산자락과 달항아리' },
  metal: { title: '쇠', subtitle: '흑백의 달과 백자' },
  water: { title: '물', subtitle: '심청 물결과 금빛 잉어' },
}

/** 오행 순서 — 상생(목→화→토→금→수) 차례. 화면 정렬도 이 순서를 따른다. */
export const WALLPAPER_ELEMENT_ORDER: readonly WallpaperElement[] = ['wood', 'fire', 'earth', 'metal', 'water']

/**
 * 배포된 배경화면 6장. 오행 5장 + 이달의 복 1장.
 * 🔴 여기 id 를 바꾸면 `public/wallpapers/` 파일과 생성 스크립트 스펙도 같이 바꿔야 한다.
 */
export const WALLPAPER_SET: readonly WallpaperItem[] = [
  ...WALLPAPER_ELEMENT_ORDER.map(
    (element): WallpaperItem => ({
      id: `element-${element}`,
      title: ELEMENT_META[element].title,
      subtitle: ELEMENT_META[element].subtitle,
      lock: 'free',
      element,
    })
  ),
  {
    id: MONTHLY_WALLPAPER_ID,
    title: '이달의 복',
    subtitle: '이번 달에만 받을 수 있는 한정 배경',
    lock: 'free',
    element: null,
  },
]

/** `public/` 기준 배경화면 경로. 동일 출처라 `<a download>` 가 그대로 저장으로 동작한다. */
export function wallpaperPath(id: string): string {
  return `/wallpapers/${id}.webp`
}

/** `monthly-YYYYMM` — 주어진 시각이 속한 달의 이달의 복 id. */
export function monthlyWallpaperId(now: Date): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `monthly-${year}${month}`
}

/**
 * 배포된 이달의 복이 «이번 달» 판인가. false 면 새 판을 만들어 교체할 때가 된 것이다.
 * 화면은 이 값으로 무엇을 감추지 않는다 — 지난 달 판이라도 그림은 멀쩡히 보여준다
 * (감추면 빈 자리가 남고, 갱신 누락이 사용자에게 손실로 보인다).
 */
export function isMonthlyWallpaperCurrent(now: Date): boolean {
  return monthlyWallpaperId(now) === MONTHLY_WALLPAPER_ID
}

/** 사용자의 열람 자격 — 서버가 판정해 내려주는 값(클라 값 신뢰 금지). */
export interface WallpaperEntitlement {
  /** 본인 사주 풀이(analysis_history SAJU) 1회 이상. */
  hasSaju: boolean
  /** 복주머니 5단계 완주. */
  journeyComplete: boolean
}

export interface WallpaperUnlockState {
  unlocked: boolean
  /** 잠겼을 때만 채워지는 사유 문구. */
  reason: string | null
}

/**
 * 한 장의 잠금 판정. free 는 무조건 열리고, saju/journey 는 자격을 본다.
 * 완주(journeyComplete)는 사주를 포함하므로 saju 장도 자연히 열린다.
 */
export function resolveWallpaperUnlock(item: WallpaperItem, entitlement: WallpaperEntitlement): WallpaperUnlockState {
  if (item.lock === 'free') return { unlocked: true, reason: null }
  const unlocked = item.lock === 'saju' ? entitlement.hasSaju : entitlement.journeyComplete
  return unlocked ? { unlocked: true, reason: null } : { unlocked: false, reason: WALLPAPER_LOCK_REASON[item.lock] }
}

/** 「내 오행」 배지 대상인가 — 용신이 없으면(null) 어느 장도 추천하지 않는다. */
export function isMyElement(item: WallpaperItem, element: WallpaperElement | null): boolean {
  return element !== null && item.element === element
}

/**
 * 카드 썸네일 3장 — 내 오행 장을 맨 앞에 두고 세트 순서로 채운다.
 * 용신이 없으면 세트 앞 세 장(나무·불·흙) 그대로.
 */
export function wallpaperPreview(element: WallpaperElement | null, count = 3): WallpaperItem[] {
  return orderWallpapersByElement(WALLPAPER_SET, element).slice(0, count)
}

/** 내 오행 장을 맨 앞으로 끌어올린 정렬 — 나머지는 세트 순서 그대로. */
export function orderWallpapersByElement<T extends WallpaperItem>(
  items: readonly T[],
  element: WallpaperElement | null
): T[] {
  const mine = element ? items.filter((w) => w.element === element) : []
  const rest = items.filter((w) => !mine.includes(w))
  return [...mine, ...rest]
}

// ── 값(복채) ────────────────────────────────────────────────────────────────

/**
 * 소장 가격(만냥) — 신위·테마팩과 같은 단위다(`price_bokchae`, 화면 표기 「N만냥」).
 * 오행 한 장 1만냥 · 이달의 복 2만냥(그 달에만 나오는 한정판이라 두 배).
 * 🔴 서버 액션이 이 값을 읽어 차감한다. 클라가 보낸 금액은 쓰지 않는다.
 */
export const WALLPAPER_PRICE_ELEMENT = 1
export const WALLPAPER_PRICE_MONTHLY = 2

/**
 * 한 장의 소장 가격(만냥). 프리미엄은 낱장 균일가(팩이 본진), 무료 세트에서는
 * 오행이 없는 장(이달의 복)이 한정판 가격을 받는다.
 * 🔴 element 로 먼저 갈리면 프리미엄 비오행 장(재물·가족·연애·성공)이 이달의 복 가격을
 *    받는다 — lock 검사부터.
 */
export function wallpaperPrice(item: WallpaperItem): number {
  if (item.lock === 'premium') return PREMIUM_PRICE_SINGLE
  return item.element === null ? WALLPAPER_PRICE_MONTHLY : WALLPAPER_PRICE_ELEMENT
}

// ── 접근 모델 ───────────────────────────────────────────────────────────────

/** 해금 출처 — DB `wallpaper_unlocks.source` 체크 제약과 같은 어휘. */
export type WallpaperUnlockSource = 'purchase' | 'ad'

/** 내가 이미 연 장 한 건. */
export interface WallpaperUnlockRecord {
  wallpaperId: string
  source: WallpaperUnlockSource
}

/** 열린 근거 — 표기용. 판정은 OR 이므로 순서는 «무엇이라 적을까»에만 쓴다. */
export type WallpaperAccessVia = 'free' | 'purchase' | 'ad' | 'member' | 'saju' | 'journey'

/** 근거별 한 줄 배지 문구. 잠긴 장에는 붙지 않는다. */
export const WALLPAPER_ACCESS_LABEL: Record<WallpaperAccessVia, string> = {
  free: '기본 제공',
  purchase: '소장 완료',
  ad: '오늘 열림',
  member: '멤버십',
  saju: '사주 풀이 선물',
  journey: '복주머니 완주 선물',
}

/**
 * 사용자의 접근 자격 — 서버가 판정해 내려주는 값(클라 값 신뢰 금지).
 * 여정 자격(`WallpaperEntitlement`)에 멤버십·해금 목록을 얹은 것이다.
 */
export interface WallpaperAccess extends WallpaperEntitlement {
  /** subscriptions.status = 'ACTIVE' 인 본인 구독이 있는가. */
  isMember: boolean
  /** 내 해금 기록(구매·광고). */
  unlocks: readonly WallpaperUnlockRecord[]
  /**
   * 사용자의 용신 오행 — 프리미엄 «내게 필요한 기운» 선물 판정에만 쓴다.
   * 없으면(미풀이·구버전 호출) 선물 경로만 닫히고 나머지 판정은 그대로다.
   */
  myElement?: WallpaperElement | null
}

export interface WallpaperAccessState {
  unlocked: boolean
  /** 열렸을 때만 채워지는 근거. */
  via: WallpaperAccessVia | null
  /** 잠겼을 때만 채워지는 사유 문구(여정 경로 기준). */
  reason: string | null
}

/** 이 장을 이미 산(또는 광고로 연) 기록이 있는가. */
function findUnlock(item: WallpaperItem, access: WallpaperAccess): WallpaperUnlockRecord | undefined {
  return access.unlocks.find((u) => u.wallpaperId === item.id)
}

/**
 * 한 장의 접근 판정 — 다섯 경로의 OR.
 *
 * 표기 우선순위는 «소유가 먼저»다: 기본 무료 → 구매 → 광고 → 멤버십 → 여정 보너스.
 * 구매를 멤버십보다 앞에 두는 이유는, 멤버십이 끝나도 산 장은 남기 때문이다 —
 * 화면이 「멤버십」이라 적어두면 해지 뒤에 사라질 것처럼 읽힌다.
 */
export function resolveWallpaperAccess(item: WallpaperItem, access: WallpaperAccess): WallpaperAccessState {
  if (item.lock === 'free') return { unlocked: true, via: 'free', reason: null }

  const unlock = findUnlock(item, access)
  if (unlock) return { unlocked: true, via: unlock.source, reason: null }
  if (access.isMember) return { unlocked: true, via: 'member', reason: null }

  if (item.lock === 'premium') {
    // 프리미엄의 유일한 무상 경로 — 사주를 마친 사람에게 «내게 필요한 기운»(용신 오행) 1장.
    // 풀이가 처방하고, 선물로 맛보이고, 나머지는 멤버십이 연다(PRD v2 §4).
    if (access.hasSaju && item.element !== null && item.element === (access.myElement ?? null)) {
      return { unlocked: true, via: 'saju', reason: null }
    }
    return { unlocked: false, via: null, reason: WALLPAPER_LOCK_REASON.premium }
  }

  const bonus = item.lock === 'saju' ? access.hasSaju : access.journeyComplete
  if (bonus) return { unlocked: true, via: item.lock, reason: null }

  return { unlocked: false, via: null, reason: WALLPAPER_LOCK_REASON[item.lock] }
}

// ── 이달의 복 — 달마다 갈리는 판(版) ────────────────────────────────────────

/** DB `wallpaper_monthly` 한 행 — 크론이 만들어 넣는 이번 달 판. */
export interface MonthlyWallpaperRef {
  /** 'YYYYMM'. */
  ym: string
  /** 공개 Storage URL. */
  url: string
}

/** KST 기준 'YYYYMM' — 크론과 화면이 같은 달을 봐야 하므로 서울 시각으로 센다. */
export function kstYearMonth(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}`
}

/** KST 기준 'YYYY-MM-DD' — 광고 하루 1장 상한의 날짜 키. */
export function kstDateKey(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/** 'YYYYMM' → 그 판의 배경화면 id. 달마다 다른 한정판이라 id 도 달마다 갈린다. */
export function monthlyWallpaperIdForYm(ym: string): string {
  return `monthly-${ym}`
}

/** 'YYYYMM' → 「이달의 복 (9월)」. 한자 없이 한글로만 적는다. */
export function monthlyWallpaperTitle(ym: string): string {
  const month = Number(ym.slice(4, 6))
  return Number.isFinite(month) && month >= 1 && month <= 12 ? `이달의 복 (${month}월)` : '이달의 복'
}

/** Storage 오브젝트 이름 — 버킷 `wallpapers` 안의 경로. 크론이 upsert 로 덮는다. */
export function monthlyWallpaperObject(ym: string): string {
  return `monthly-${ym}.webp`
}

// ── 화면용 세트 ─────────────────────────────────────────────────────────────

/** 그리기에 필요한 것까지 채운 한 장 — 도메인 정의 + 실제 파일 주소. */
export interface WallpaperDisplayItem extends WallpaperItem {
  /** 미리보기 `<img src>`. */
  href: string
  /** 「받기」 링크 — 교차 출처(Storage)면 저장이 되도록 질의를 붙인다. */
  downloadHref: string
}

/**
 * 저장 링크 — 동일 출처(`/wallpapers/...`)는 `download` 속성이 그대로 먹지만,
 * Storage 공개 URL 은 교차 출처라 브라우저가 `download` 를 무시하고 탭 이동을 한다.
 * Supabase Storage 는 `?download` 질의에 Content-Disposition: attachment 로 답한다.
 */
export function wallpaperDownloadHref(href: string): string {
  if (!/^https?:\/\//.test(href)) return href
  return href.includes('?') ? `${href}&download` : `${href}?download`
}

/**
 * 화면에 세울 여섯 장 — 오행 5장은 번들 고정, 이달의 복만 DB 행을 따른다.
 * DB 행이 없으면(크론 첫 실행 전·실패) 번들 폴백으로 선다. 빈 자리를 남기지 않는 것이 규율이다.
 */
export function buildWallpaperDisplaySet(monthly: MonthlyWallpaperRef | null): WallpaperDisplayItem[] {
  return WALLPAPER_SET.map((item) => {
    if (item.element !== null) {
      const href = wallpaperPath(item.id)
      return { ...item, href, downloadHref: wallpaperDownloadHref(href) }
    }
    const id = monthly ? monthlyWallpaperIdForYm(monthly.ym) : item.id
    const href = monthly ? monthly.url : wallpaperPath(item.id)
    return {
      ...item,
      id,
      title: monthly ? monthlyWallpaperTitle(monthly.ym) : item.title,
      href,
      downloadHref: wallpaperDownloadHref(href),
    }
  })
}

/** 화면 세트에서 id 로 한 장 찾기 — 서버 액션이 클라가 보낸 id 를 검증할 때 쓴다. */
export function findWallpaperById(id: string, monthly: MonthlyWallpaperRef | null): WallpaperDisplayItem | null {
  return buildWallpaperDisplaySet(monthly).find((w) => w.id === id) ?? null
}

// ── 프리미엄 「채운(彩運)」 — 기운을 채우는 17장 (PRD v2) ──────────────────

/** 5과(科) — 세트의 묶음이자 화면의 소제목. */
export type PremiumCategory = 'gi' | 'jae' | 'ga' | 'yeon' | 'seong'

export const PREMIUM_CATEGORY_ORDER: readonly PremiumCategory[] = ['gi', 'jae', 'ga', 'yeon', 'seong']

export const PREMIUM_CATEGORY_META: Record<PremiumCategory, { title: string; subtitle: string }> = {
  gi: { title: '기운 보충', subtitle: '사주에 부족한 오행 기운을 채웁니다' },
  jae: { title: '재물운', subtitle: '황금빛으로 재물의 기운을 부릅니다' },
  ga: { title: '가족 평안', subtitle: '집안의 안정과 평화와 건강을 빕니다' },
  yeon: { title: '연애·사랑운', subtitle: '도화(桃花)의 기운으로 인연을 부릅니다' },
  seong: { title: '성공·명예운', subtitle: '오르고, 이루고, 날아오릅니다' },
}

export interface PremiumWallpaperItem extends WallpaperItem {
  category: PremiumCategory
}

/**
 * 「채운」 17장 — id 는 Storage(`wallpapers-premium/{id}.webp`)·썸네일·생성 스크립트와 1:1.
 * 🔴 여기 id 를 바꾸면 Storage 오브젝트·`public/wallpapers/premium-thumbs/`·
 *    `scripts/media-assets/generate-wallpapers.mjs` 의 PREMIUM_SPECS 도 같이 바꿔야 한다.
 * gi 과만 element 를 갖는다 — «내게 필요한 기운»(용신) 배지·선물 판정의 근거다.
 */
export const PREMIUM_WALLPAPER_SET: readonly PremiumWallpaperItem[] = [
  {
    id: 'gi-wood',
    title: '푸른 새벽 숲',
    subtitle: '나무 기운 — 성장과 시작',
    lock: 'premium',
    element: 'wood',
    category: 'gi',
  },
  {
    id: 'gi-fire',
    title: '타오르는 연등',
    subtitle: '불 기운 — 열정과 활력',
    lock: 'premium',
    element: 'fire',
    category: 'gi',
  },
  {
    id: 'gi-earth',
    title: '황금 들녘',
    subtitle: '흙 기운 — 안정과 중심',
    lock: 'premium',
    element: 'earth',
    category: 'gi',
  },
  {
    id: 'gi-metal',
    title: '서리 내린 달',
    subtitle: '쇠 기운 — 결단과 결실',
    lock: 'premium',
    element: 'metal',
    category: 'gi',
  },
  {
    id: 'gi-water',
    title: '달빛 물결',
    subtitle: '물 기운 — 지혜와 흐름',
    lock: 'premium',
    element: 'water',
    category: 'gi',
  },
  {
    id: 'jae-koi',
    title: '황금 잉어',
    subtitle: '재물이 뛰어오릅니다',
    lock: 'premium',
    element: null,
    category: 'jae',
  },
  {
    id: 'jae-sack',
    title: '만복 복주머니',
    subtitle: '복이 쏟아집니다',
    lock: 'premium',
    element: null,
    category: 'jae',
  },
  { id: 'jae-tree', title: '돈나무', subtitle: '재물이 열립니다', lock: 'premium', element: null, category: 'jae' },
  {
    id: 'ga-crane',
    title: '학 가족',
    subtitle: '온 가족이 평안합니다',
    lock: 'premium',
    element: null,
    category: 'ga',
  },
  {
    id: 'ga-hearth',
    title: '등불 켠 집',
    subtitle: '집안이 화목합니다',
    lock: 'premium',
    element: null,
    category: 'ga',
  },
  {
    id: 'ga-pomegranate',
    title: '다복 석류',
    subtitle: '자손과 다복이 깃듭니다',
    lock: 'premium',
    element: null,
    category: 'ga',
  },
  {
    id: 'yeon-wonang',
    title: '원앙 한 쌍',
    subtitle: '인연이 깃듭니다',
    lock: 'premium',
    element: null,
    category: 'yeon',
  },
  {
    id: 'yeon-dohwa',
    title: '도화 만개',
    subtitle: '사랑이 피어납니다',
    lock: 'premium',
    element: null,
    category: 'yeon',
  },
  {
    id: 'yeon-hojeop',
    title: '나비의 춤',
    subtitle: '설레는 만남이 날아듭니다',
    lock: 'premium',
    element: null,
    category: 'yeon',
  },
  {
    id: 'seong-yongmun',
    title: '등용문',
    subtitle: '시험과 승진이 뚫립니다',
    lock: 'premium',
    element: null,
    category: 'seong',
  },
  {
    id: 'seong-haetsal',
    title: '첫 햇살',
    subtitle: '시작이 길합니다',
    lock: 'premium',
    element: null,
    category: 'seong',
  },
  {
    id: 'seong-bonghwang',
    title: '봉황 비상',
    subtitle: '큰 운이 날아듭니다',
    lock: 'premium',
    element: null,
    category: 'seong',
  },
]

/** 프리미엄 낱장 가격(만냥). 팩이 본진이고 낱장은 기준점이다(복채 최소 단위 제약 — PRD v1 §6ⓐ). */
export const PREMIUM_PRICE_SINGLE = 1

/** Storage 사설 버킷 — 원본은 서명 URL 로만 나간다. */
export const PREMIUM_BUCKET = 'wallpapers-premium'

/** 공개 썸네일(360×640 q60) — 잠긴 장의 흐릿한 미리보기용. 마케팅 자산이라 공개가 의도다. */
export function premiumThumbPath(id: string): string {
  return `/wallpapers/premium-thumbs/${id}.webp`
}

/** 팩 — 멤버십이 제1 유도이고, 팩은 «비회원에게 추천하는 세트 구매» 경로다(CEO 확정). */
export interface WallpaperPack {
  id: string
  title: string
  /** 가격(만냥). 부분 보유와 무관하게 고정 — 낱장을 먼저 산 사람이 손해 보지 않도록 화면이 안내한다. */
  price: number
  itemIds: readonly string[]
}

export const WALLPAPER_PACKS: readonly WallpaperPack[] = [
  {
    id: 'pack-gi',
    title: '기운 보충 5장',
    price: 3,
    itemIds: PREMIUM_WALLPAPER_SET.filter((w) => w.category === 'gi').map((w) => w.id),
  },
  {
    id: 'pack-bok',
    title: '복 배경화면 12장',
    price: 3,
    itemIds: PREMIUM_WALLPAPER_SET.filter((w) => w.category !== 'gi').map((w) => w.id),
  },
  { id: 'pack-all', title: '채운 전체 17장', price: 5, itemIds: PREMIUM_WALLPAPER_SET.map((w) => w.id) },
]

export function findWallpaperPack(packId: string): WallpaperPack | null {
  return WALLPAPER_PACKS.find((p) => p.id === packId) ?? null
}

/** 프리미엄 한 장의 화면 표시형 — 원본 서명 URL 은 열린 장에만 온다(액션이 발급). */
export interface PremiumDisplayItem extends PremiumWallpaperItem {
  /** 미리보기 `<img src>` — 열려 있으면 서명 URL(원본), 잠겨 있으면 공개 썸네일. */
  href: string
  /** 「받기」 링크 — 서명 URL 이 있을 때만. 잠긴 장은 null(받기 버튼이 서지 않는다). */
  downloadHref: string | null
}

/**
 * 프리미엄 17장의 화면 세트. `signedUrls` 는 액션이 «열린 장에만» 발급한 서명 URL 맵 —
 * 잠긴 장은 썸네일로 서고, URL 이 없으니 클라를 뒤져도 원본 주소가 없다.
 */
export function buildPremiumDisplaySet(signedUrls: Readonly<Record<string, string>>): PremiumDisplayItem[] {
  return PREMIUM_WALLPAPER_SET.map((item) => {
    const signed = signedUrls[item.id]
    return {
      ...item,
      href: signed ?? premiumThumbPath(item.id),
      downloadHref: signed ? wallpaperDownloadHref(signed) : null,
    }
  })
}

/** 프리미엄에서 id 로 한 장 — 서버 액션의 클라 id 검증용(무료 세트는 findWallpaperById). */
export function findPremiumWallpaperById(id: string): PremiumWallpaperItem | null {
  return PREMIUM_WALLPAPER_SET.find((w) => w.id === id) ?? null
}
