'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { buildJourney } from '@/lib/domain/analysis/journey'
import { isElement } from '@/lib/domain/shrine/types'
import { spendBokchae, refundBokchae } from '@/lib/services/bokchae'
import {
  PREMIUM_BUCKET,
  PREMIUM_WALLPAPER_SET,
  findPremiumWallpaperById,
  findWallpaperById,
  findWallpaperPack,
  kstDateKey,
  resolveWallpaperAccess,
  wallpaperPrice,
  type MonthlyWallpaperRef,
  type WallpaperAccess,
  type WallpaperElement,
  type WallpaperUnlockRecord,
  type WallpaperUnlockSource,
} from '@/lib/domain/analysis/wallpaper'

export interface WallpaperStatus {
  /** 사용자의 용신 오행 — 「내 오행」 추천 기준. 없으면 null. */
  element: WallpaperElement | null
  /** 본인 사주 풀이 1회 이상(analysis_history SAJU). */
  hasSaju: boolean
  /** 복주머니 5단계 완주(SAJU·FACE·HAND·FENGSHUI·SAMHAP). */
  journeyComplete: boolean
  /** subscriptions.status = 'ACTIVE' 인 본인 구독 — 있으면 전 장이 열린다. */
  isMember: boolean
  /** 내가 이미 연 장(구매·광고). */
  unlocks: WallpaperUnlockRecord[]
  /** 오늘(KST) 광고로 연 장이 있는가 — 하루 1장 상한의 화면 표기용(강제는 서버가 한다). */
  adUsedToday: boolean
  /** 이번 달 판 — DB 우선, 없으면 null(화면이 번들 폴백으로 선다). */
  monthly: MonthlyWallpaperRef | null
  /** 복채 잔액(만냥) — 잔액 부족 안내 모달이 쓴다. */
  balance: number
  /**
   * 프리미엄 «열린 장»의 원본 서명 URL(1시간) — 잠긴 장은 여기 없다.
   * 원본은 사설 버킷이라 이 맵이 유일한 통로다. 클라를 뒤져도 잠긴 장의 주소는 없다.
   */
  premiumUrls: Record<string, string>
}

export interface WallpaperUnlockResult {
  success: boolean
  error?: string
  /** 성공 시 낙관적 갱신에 쓰는 해금 기록. */
  unlock?: WallpaperUnlockRecord
  /** 구매 성공 시 남은 복채(만냥). */
  newBalance?: number
  /** 잔액 부족일 때의 현재 잔액·필요 금액 — 충전 유도 모달용. */
  balance?: number
  price?: number
}

interface UnlockRow {
  wallpaper_id: string
  source: string
  created_at: string
}

function toUnlockRecord(row: UnlockRow): WallpaperUnlockRecord | null {
  if (row.source !== 'purchase' && row.source !== 'ad') return null
  return { wallpaperId: row.wallpaper_id, source: row.source as WallpaperUnlockSource }
}

/** DB `wallpaper_monthly` 최신 행 → 화면이 쓰는 판 참조. 행이 없으면 null. */
function toMonthlyRef(row: { ym: unknown; image_url: unknown } | null | undefined): MonthlyWallpaperRef | null {
  if (!row) return null
  const { ym, image_url: url } = row
  if (typeof ym !== 'string' || typeof url !== 'string' || !ym || !url) return null
  return { ym, url }
}

/**
 * 복 배경화면 현황 — 용신 · 여정 자격 · 멤버십 · 내 해금 · 오늘 광고 사용 · 이번 달 판.
 *
 * 판정 근거는 전부 서버에서 모은다(클라 값 미신뢰). 본인 데이터만 보며,
 * analysis_history 는 user_id·target_id 를 모두 본인으로 못박아 RLS 위에서 한 번 더 좁힌다.
 * 완주 재판정은 `journey-reward.ts` 와 같은 계보다(카테고리 DISTINCT → buildJourney).
 * 비로그인은 null — 카드가 렌더되지 않는다.
 *
 * 🔴 잠금은 오행 5장에 대해서는 «표시»까지다(파일이 `public/` 에 있다 — 도메인 주석 참조).
 *    이달의 복은 크론이 공개 Storage 버킷에 올리므로 사정이 같다. 값이 낮아 수용한 위험이다.
 */
export async function getWallpaperStatus(): Promise<WallpaperStatus | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: history, error: historyError },
    { data: energy, error: energyError },
    { data: subscription },
    { data: unlockRows, error: unlockError },
    { data: monthlyRow },
    { data: wallet },
  ] = await Promise.all([
    supabase.from('analysis_history').select('category').eq('user_id', user.id).eq('target_id', user.id),
    supabase.from('user_energy_profile').select('yongsin_element').eq('user_id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('id').eq('user_id', user.id).eq('status', 'ACTIVE').limit(1).maybeSingle(),
    supabase.from('wallpaper_unlocks').select('wallpaper_id, source, created_at').eq('user_id', user.id),
    supabase.from('wallpaper_monthly').select('ym, image_url').order('ym', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
  ])

  if (historyError) logger.warn('[wallpaper] history load failed:', historyError)
  // 용신은 부가 정보 — 없으면 「내 오행」 배지만 빠지고 화면은 성립한다.
  if (energyError) logger.warn('[wallpaper] energy profile load failed:', energyError)
  // 해금 목록이 비면 «아직 아무것도 안 산 사람»으로 보일 뿐, 구매·광고 경로는 그대로 열려 있다.
  if (unlockError) logger.warn('[wallpaper] unlocks load failed:', unlockError)

  const rows = (unlockRows ?? []) as UnlockRow[]
  const unlocks = rows.map(toUnlockRecord).filter((u): u is WallpaperUnlockRecord => u !== null)
  const today = kstDateKey(new Date())
  const adUsedToday = rows.some((r) => r.source === 'ad' && kstDateKey(new Date(r.created_at)) === today)

  const categories = Array.from(
    new Set(
      (history ?? [])
        .map((r) => (r as { category: string | null }).category)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
    )
  )

  const yongsin = energy?.yongsin_element
  const element = isElement(yongsin) ? yongsin : null
  const access: WallpaperAccess = {
    hasSaju: categories.includes('SAJU'),
    journeyComplete: buildJourney(categories).allComplete,
    isMember: Boolean(subscription),
    unlocks,
    myElement: element,
  }

  return {
    element,
    hasSaju: access.hasSaju,
    journeyComplete: access.journeyComplete,
    isMember: access.isMember,
    unlocks,
    adUsedToday,
    monthly: toMonthlyRef(monthlyRow),
    balance: typeof wallet?.balance === 'number' ? wallet.balance : 0,
    premiumUrls: await signPremiumUrls(access),
  }
}

/**
 * 프리미엄 «열린 장»에만 원본 서명 URL 을 발급한다(1시간). 판정과 발급이 같은 함수에 있어
 * «잠긴 장의 URL 이 새는» 경로가 구조적으로 없다. 실패는 빈 맵 — 화면은 썸네일로 선다.
 */
async function signPremiumUrls(access: WallpaperAccess): Promise<Record<string, string>> {
  const openIds = PREMIUM_WALLPAPER_SET.filter((item) => resolveWallpaperAccess(item, access).unlocked).map(
    (item) => item.id
  )
  if (openIds.length === 0) return {}

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(PREMIUM_BUCKET).createSignedUrls(
    openIds.map((id) => `${id}.webp`),
    60 * 60
  )
  if (error || !data) {
    logger.warn('[wallpaper] premium signed urls failed:', error)
    return {}
  }

  const urls: Record<string, string> = {}
  for (const row of data) {
    if (row.signedUrl && row.path) urls[row.path.replace(/\.webp$/, '')] = row.signedUrl
  }
  return urls
}

/** 판정에 필요한 것만 다시 모은다 — 구매·광고 경로가 현황 액션과 같은 근거를 보게 하는 단일 지점. */
async function loadAccessContext(userId: string) {
  const supabase = await createClient()
  const [{ data: history }, { data: subscription }, { data: unlockRows }, { data: monthlyRow }, { data: energy }] =
    await Promise.all([
      supabase.from('analysis_history').select('category').eq('user_id', userId).eq('target_id', userId),
      supabase.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'ACTIVE').limit(1).maybeSingle(),
      supabase.from('wallpaper_unlocks').select('wallpaper_id, source, created_at').eq('user_id', userId),
      supabase
        .from('wallpaper_monthly')
        .select('ym, image_url')
        .order('ym', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('user_energy_profile').select('yongsin_element').eq('user_id', userId).maybeSingle(),
    ])

  const categories = Array.from(
    new Set(
      (history ?? [])
        .map((r) => (r as { category: string | null }).category)
        .filter((c): c is string => typeof c === 'string' && c.length > 0)
    )
  )
  const rows = (unlockRows ?? []) as UnlockRow[]

  return {
    monthly: toMonthlyRef(monthlyRow),
    rows,
    access: {
      hasSaju: categories.includes('SAJU'),
      journeyComplete: buildJourney(categories).allComplete,
      isMember: Boolean(subscription),
      unlocks: rows.map(toUnlockRecord).filter((u): u is WallpaperUnlockRecord => u !== null),
      // 프리미엄 «내게 필요한 기운» 선물 판정 — 구매 경로도 현황과 같은 근거를 봐야
      // «이미 선물로 열린 장을 파는» 일이 없다.
      myElement: isElement(energy?.yongsin_element) ? energy.yongsin_element : null,
    } satisfies WallpaperAccess,
  }
}

/**
 * 한 장 소장(복채 구매) — 검증 순서는 `purchaseDeity` 를 그대로 미러한다.
 * 로그인 → 세트에 있는 id 인가(클라 미신뢰) → 이미 열려 있으면 결제하지 않음 →
 * 차감 → 지급 → **지급 실패 시 환불**. 돈 흐름을 새로 발명하지 않는 것이 규율이다.
 *
 * 가격은 도메인 상수(`wallpaperPrice`)에서만 온다 — 클라가 보낸 금액은 쓰지 않는다.
 */
export async function purchaseWallpaper(wallpaperId: string): Promise<WallpaperUnlockResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { monthly, access } = await loadAccessContext(user.id)
  // 무료 세트 → 프리미엄 순으로 찾는다 — 프리미엄 낱장도 같은 결제 경로를 탄다(id 는 겹치지 않는다).
  const item = findWallpaperById(wallpaperId, monthly) ?? findPremiumWallpaperById(wallpaperId)
  if (!item) return { success: false, error: 'NOT_FOUND' }
  if (resolveWallpaperAccess(item, access).unlocked) return { success: false, error: 'ALREADY_UNLOCKED' }

  const price = wallpaperPrice(item)
  const paid = await spendBokchae(price, `복 배경화면 (${item.title})`)
  if (!paid.success) {
    if (paid.error === 'INSUFFICIENT_BOKCHAE') {
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
      return {
        success: false,
        error: 'INSUFFICIENT_BOKCHAE',
        balance: typeof wallet?.balance === 'number' ? wallet.balance : 0,
        price,
      }
    }
    return { success: false, error: paid.error ?? 'PAYMENT_FAILED' }
  }

  const { error: grantError } = await grantUnlock(user.id, item.id, 'purchase')
  if (grantError) {
    // 결제됐는데 지급 실패 → 복채 환불 (신위 봉안과 동일 패턴)
    await refundBokchae(user.id, price, `복 배경화면 소장 취소 환불 (${item.title})`)
    return { success: false, error: 'GRANT_FAILED' }
  }

  return { success: true, unlock: { wallpaperId: item.id, source: 'purchase' }, newBalance: paid.balance, price }
}

/**
 * 팩 소장 — «비회원에게 추천하는 세트 구매» 경로(멤버십이 제1 유도, 팩이 그다음 — CEO 확정).
 *
 * 가격은 부분 보유와 무관하게 고정이다(팩 정의 주석 참조). 이미 전부 열려 있으면 결제하지
 * 않는다. 지급은 남은 장 전부를 한 번의 upsert 로 — 실패 시 전액 환불(낱장과 같은 규율).
 */
export async function purchaseWallpaperPack(packId: string): Promise<WallpaperUnlockResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const pack = findWallpaperPack(packId)
  if (!pack) return { success: false, error: 'NOT_FOUND' }

  const { access } = await loadAccessContext(user.id)
  const missing = pack.itemIds.filter((id) => {
    const item = findPremiumWallpaperById(id)
    return item !== null && !resolveWallpaperAccess(item, access).unlocked
  })
  if (missing.length === 0) return { success: false, error: 'ALREADY_UNLOCKED' }

  const paid = await spendBokchae(pack.price, `복 배경화면 팩 (${pack.title})`)
  if (!paid.success) {
    if (paid.error === 'INSUFFICIENT_BOKCHAE') {
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
      return {
        success: false,
        error: 'INSUFFICIENT_BOKCHAE',
        balance: typeof wallet?.balance === 'number' ? wallet.balance : 0,
        price: pack.price,
      }
    }
    return { success: false, error: paid.error ?? 'PAYMENT_FAILED' }
  }

  const admin = createAdminClient()
  const { error: grantError } = await admin.from('wallpaper_unlocks').upsert(
    missing.map((id) => ({ user_id: user.id, wallpaper_id: id, source: 'purchase' as const })),
    { onConflict: 'user_id,wallpaper_id', ignoreDuplicates: true }
  )
  if (grantError) {
    logger.error('[wallpaper] pack grant failed:', grantError)
    await refundBokchae(user.id, pack.price, `복 배경화면 팩 소장 취소 환불 (${pack.title})`)
    return { success: false, error: 'GRANT_FAILED' }
  }

  return { success: true, newBalance: paid.balance, price: pack.price }
}

/**
 * 광고 보고 한 장 열기 — 하루 1장.
 *
 * 🔴 광고를 «실제로 봤는지»는 서버가 검증할 수 없다. 외부 광고 SDK 없이 우리가 직접 띄우는
 *    하우스 광고(멤버십·상점 홍보 슬라이드 + 15초 카운트다운)이고, 클라이언트가 다 봤다고
 *    신고하면 그 말을 믿는 구조다. 그래서 방어선은 «시청 검증»이 아니라 **하루 1장 상한**이다 —
 *    상한은 서버가 KST 날짜로 강제하므로, 신고를 조작해도 하루에 한 장을 넘길 수 없다.
 */
export async function unlockWallpaperByAd(wallpaperId: string): Promise<WallpaperUnlockResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'UNAUTHORIZED' }

  const { monthly, access, rows } = await loadAccessContext(user.id)
  const item = findWallpaperById(wallpaperId, monthly)
  if (!item) return { success: false, error: 'NOT_FOUND' }
  if (resolveWallpaperAccess(item, access).unlocked) return { success: false, error: 'ALREADY_UNLOCKED' }

  const today = kstDateKey(new Date())
  if (rows.some((r) => r.source === 'ad' && kstDateKey(new Date(r.created_at)) === today)) {
    return { success: false, error: 'AD_LIMIT' }
  }

  const { error: grantError } = await grantUnlock(user.id, item.id, 'ad')
  if (grantError) return { success: false, error: 'GRANT_FAILED' }

  return { success: true, unlock: { wallpaperId: item.id, source: 'ad' } }
}

/**
 * service_role 로 해금 기록 1건 — 쓰기 정책이 없는 테이블이라 이 경로가 유일하다(자가발행 차단).
 * PK(user_id, wallpaper_id) 가 중복을 막으므로 upsert 는 멱등이다.
 */
async function grantUnlock(
  userId: string,
  wallpaperId: string,
  source: WallpaperUnlockSource
): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('wallpaper_unlocks')
    .upsert(
      { user_id: userId, wallpaper_id: wallpaperId, source },
      { onConflict: 'user_id,wallpaper_id', ignoreDuplicates: true }
    )
  if (error) {
    logger.error('[wallpaper] unlock grant failed:', error)
    return { error: error.message }
  }
  return { error: null }
}
