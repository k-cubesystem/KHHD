'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { createCoupangDeeplink, hasCoupangApiKeys } from '@/lib/services/coupang-partners'
import { sanitizeSubId } from '@/lib/domain/ads/coupang'
import { SHOP_LINK_TTL_DAYS, SHOP_SUBID, coupangSearchUrl, normalizeShopKeywords } from '@/lib/domain/circle/shop-links'

/**
 * 실물 항목의 쿠팡 파트너스 링크 — 키워드별 전역 캐시(affiliate_links, 30일).
 *
 * 없는 키워드만 딥링크 API 로 만든다. 키(COUPANG_ACCESS_KEY/SECRET_KEY)가 없으면 새로 만들지 않고
 * 캐시된 것만 돌려준다 — 화면은 링크가 없으면 품목명만 보인다(빈 버튼을 남기지 않는다).
 * 🔴 대가성 고지(AD_DISCLOSURE_COUPANG)는 링크를 그리는 화면이 함께 단다.
 */
export async function getShopLinks(rawKeywords: readonly string[]): Promise<Record<string, string>> {
  const keywords = normalizeShopKeywords(rawKeywords)
  if (keywords.length === 0) return {}

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}

  const out: Record<string, string> = {}
  const cutoff = new Date(Date.now() - SHOP_LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: rows, error } = await supabase
    .from('affiliate_links')
    .select('keyword, url, created_at')
    .in('keyword', keywords)
  if (error) {
    logger.warn('[shop-links] 캐시 조회 실패:', error.message)
    return {}
  }
  for (const row of rows ?? []) {
    if ((row.created_at as string) >= cutoff) out[row.keyword as string] = row.url as string
  }

  const missing = keywords.filter((k) => !out[k])
  if (missing.length === 0 || !hasCoupangApiKeys()) return out

  const admin = createAdminClient()
  const subId = sanitizeSubId(SHOP_SUBID)
  for (const keyword of missing) {
    const url = await createCoupangDeeplink(coupangSearchUrl(keyword), subId)
    if (!url) continue
    out[keyword] = url
    const { error: upsertError } = await admin
      .from('affiliate_links')
      .upsert({ keyword, url, provider: 'coupang', created_at: new Date().toISOString() }, { onConflict: 'keyword' })
    if (upsertError) logger.warn('[shop-links] 캐시 저장 실패:', upsertError.message)
  }
  return out
}
