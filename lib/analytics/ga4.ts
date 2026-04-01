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

  shareKakao: (contentType: string) => trackEvent({ action: 'share_kakao', category: 'social', label: contentType }),
  shareCopyLink: (contentType: string) =>
    trackEvent({ action: 'share_copy_link', category: 'social', label: contentType }),

  miniReading: () => trackEvent({ action: 'mini_reading', category: 'engagement' }),
  dailyFortuneView: () => trackEvent({ action: 'daily_fortune_view', category: 'engagement' }),

  pageView: (path: string) => trackEvent({ action: 'page_view', category: 'navigation', label: path }),
} as const
