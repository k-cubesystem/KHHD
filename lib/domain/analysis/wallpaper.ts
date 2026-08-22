/**
 * 「복 배경화면」 순수 도메인 — 배포된 6장의 정의와 잠금 규칙.
 *
 * 오행 5장(나무·불·흙·쇠·물) + 이달의 복 1장. 사용자의 용신 오행과 같은 장은 화면에서
 * 「내 오행」으로 추천되고, 잠금은 세 등급뿐이다(free · saju · journey).
 *
 * side-effect 없음(순수) — 단위테스트 대상. 화면 표현(배지·시트)은 컴포넌트가 입힌다.
 *
 * 🔴 이미지 파일 자체는 `public/` 에 있어 URL 을 아는 사람은 잠금과 무관하게 받을 수 있다.
 *    이건 과금 상품이 아니라 «완주 선물»이라 수용한 위험이다(서버 액션도 같은 주석을 진다).
 *    여기에 유료 자산을 얹으려면 파일을 Storage 서명 URL 뒤로 옮겨야 한다.
 */

/** 오행 — shrine 쪽 Element 와 같은 어휘를 쓴다(용신 값이 그 표에서 온다). */
export type WallpaperElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

/** free=항상 열림 · saju=사주 풀이 1회 필요 · journey=복주머니 완주 필요. */
export type WallpaperLock = 'free' | 'saju' | 'journey'

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
}

/**
 * 이달의 복 — 지금 배포된 판(版). 연월이 파일명에 박혀 있다.
 * 🔴 달이 바뀌면 이 상수와 `public/wallpapers/{새 id}.webp` 를 함께 갱신한다.
 *    상수만 바꾸면 없는 파일을 가리켜 깨진 그림이 된다(생성: scripts/media-assets/generate-wallpapers.mjs).
 */
export const MONTHLY_WALLPAPER_ID = 'monthly-202608'

/** 항상 무료로 여는 오행 장 — 맛보기 한 장(기획: '흙'). */
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
      lock: element === FREE_WALLPAPER_ELEMENT ? 'free' : 'saju',
      element,
    })
  ),
  {
    id: MONTHLY_WALLPAPER_ID,
    title: '이달의 복',
    subtitle: '이번 달에만 받을 수 있는 한정 배경',
    lock: 'journey',
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
  const mine = element ? WALLPAPER_SET.filter((w) => w.element === element) : []
  const rest = WALLPAPER_SET.filter((w) => !mine.includes(w))
  return [...mine, ...rest].slice(0, count)
}
