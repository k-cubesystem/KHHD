type GtagEvent = {
  action: string
  category: string
  label?: string
  value?: number
}

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { gtag?: (...a: unknown[]) => void }
  w.gtag?.(...args)
}

export function trackEvent({ action, category, label, value }: GtagEvent) {
  gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
  })
}

export const GA = {
  signUp: () => trackEvent({ action: 'sign_up', category: 'auth' }),
  login: () => trackEvent({ action: 'login', category: 'auth' }),

  analysisStart: (type: string) => trackEvent({ action: 'analysis_start', category: 'analysis', label: type }),
  analysisComplete: (type: string) => trackEvent({ action: 'analysis_complete', category: 'analysis', label: type }),

  paywallView: () => trackEvent({ action: 'paywall_view', category: 'conversion' }),
  paywallClick: (cta: string) => trackEvent({ action: 'paywall_click', category: 'conversion', label: cta }),

  membershipPurchase: (plan: string, value: number) =>
    trackEvent({ action: 'purchase', category: 'membership', label: plan, value }),
  bokchaeCharge: (amount: number) => trackEvent({ action: 'bokchae_charge', category: 'payment', value: amount }),

  // ── 결제 퍼널 (로드맵 P1-5) — 상점 진입 → 탭 → 결제 시도 → 성공/실패 ──
  // 이탈 지점을 보려면 네 단계가 모두 찍혀야 한다. GA4 에서 storeView→checkoutStart 전환율로 확인.
  storeView: (tab: string) => trackEvent({ action: 'store_view', category: 'funnel', label: tab }),
  storeTab: (tab: string) => trackEvent({ action: 'store_tab', category: 'funnel', label: tab }),
  checkoutStart: (plan: string, value: number) =>
    trackEvent({ action: 'checkout_start', category: 'funnel', label: plan, value }),
  checkoutFail: (plan: string, reason: string) =>
    trackEvent({ action: 'checkout_fail', category: 'funnel', label: `${plan}:${reason}` }),

  shareKakao: (contentType: string) => trackEvent({ action: 'share_kakao', category: 'social', label: contentType }),
  shareCopyLink: (contentType: string) =>
    trackEvent({ action: 'share_copy_link', category: 'social', label: contentType }),

  miniReading: () => trackEvent({ action: 'mini_reading', category: 'engagement' }),
  dailyFortuneView: () => trackEvent({ action: 'daily_fortune_view', category: 'engagement' }),

  bokPointsEarn: (amount: number) => trackEvent({ action: 'bok_points_earn', category: 'engagement', value: amount }),
  bokMissionComplete: () => trackEvent({ action: 'bok_mission_complete', category: 'engagement' }),
  familyAdd: () => trackEvent({ action: 'family_add', category: 'engagement' }),

  pageView: (path: string) => trackEvent({ action: 'page_view', category: 'navigation', label: path }),

  shrineCreate: (theme: string) => trackEvent({ action: 'shrine_create', category: 'shrine', label: theme }),
  shrineWishAdd: (category: string) => trackEvent({ action: 'shrine_wish_add', category: 'shrine', label: category }),
  shrineItemPurchase: (itemType: string, price: number) =>
    trackEvent({ action: 'shrine_item_purchase', category: 'shrine', label: itemType, value: price }),
  shrineVisit: () => trackEvent({ action: 'shrine_visit', category: 'shrine' }),
  shrineShare: (platform: string) => trackEvent({ action: 'shrine_share', category: 'social', label: platform }),
} as const
