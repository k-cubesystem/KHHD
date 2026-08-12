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
  voucherPurchase: (kind: string, value: number) =>
    trackEvent({ action: 'purchase', category: 'voucher', label: kind, value }),
  bokchaeCharge: (amount: number) => trackEvent({ action: 'bokchae_charge', category: 'payment', value: amount }),

  // ── 결제 퍼널 (로드맵 P1-5) — 상점 진입 → 탭 → 결제 시도 → 성공/실패 ──
  // 이탈 지점을 보려면 네 단계가 모두 찍혀야 한다. GA4 에서 storeView→checkoutStart 전환율로 확인.
  storeView: (tab: string) => trackEvent({ action: 'store_view', category: 'funnel', label: tab }),
  storeTab: (tab: string) => trackEvent({ action: 'store_tab', category: 'funnel', label: tab }),
  checkoutStart: (plan: string, value: number) =>
    trackEvent({ action: 'checkout_start', category: 'funnel', label: plan, value }),
  checkoutFail: (plan: string, reason: string) =>
    trackEvent({ action: 'checkout_fail', category: 'funnel', label: `${plan}:${reason}` }),

  // ── 결제 도우미 — 상점의 «복채 vs 멤버십» 안내 모달.
  //    open 의 label 은 auto(첫 진입 자동) / manual(«결제 안내» 버튼) — 자동 노출이 실제로
  //    읽히는지, 나중에 다시 열어보는 사람이 있는지를 갈라 본다.
  //    cta 의 label 은 bokchae | membership | voucher | manage.
  paymentGuideOpen: (trigger: string) =>
    trackEvent({ action: 'payment_guide_open', category: 'funnel', label: trigger }),
  paymentGuideClose: () => trackEvent({ action: 'payment_guide_close', category: 'funnel' }),
  paymentGuideCta: (target: string) => trackEvent({ action: 'payment_guide_cta', category: 'funnel', label: target }),

  shareKakao: (contentType: string) => trackEvent({ action: 'share_kakao', category: 'social', label: contentType }),
  shareCopyLink: (contentType: string) =>
    trackEvent({ action: 'share_copy_link', category: 'social', label: contentType }),

  // 허브 상단 섹션 바로가기 — label 은 앵커 id(hub-studio…). 어느 섹션이 실제로 멀어서
  // 건너뛰어지는지 보면 다음 재편 때 순서를 근거로 바꿀 수 있다.
  hubSectionJump: (sectionId: string) =>
    trackEvent({ action: 'hub_section_jump', category: 'engagement', label: sectionId }),

  // 종합사주풀이 여정(Journey) — 노출·단계 클릭
  journeyView: (variant: string) => trackEvent({ action: 'journey_view', category: 'engagement', label: variant }),
  journeyStep: (stage: string) => trackEvent({ action: 'journey_step_click', category: 'engagement', label: stage }),

  miniReading: () => trackEvent({ action: 'mini_reading', category: 'engagement' }),
  dailyFortuneView: () => trackEvent({ action: 'daily_fortune_view', category: 'engagement' }),

  bokPointsEarn: (amount: number) => trackEvent({ action: 'bok_points_earn', category: 'engagement', value: amount }),
  bokMissionComplete: () => trackEvent({ action: 'bok_mission_complete', category: 'engagement' }),
  familyAdd: () => trackEvent({ action: 'family_add', category: 'engagement' }),

  // ── 가족 초대(R-2) — 링크 발급 ↔ 수락. label 은 관계(어머니·배우자…)로, 어느 자리가 실제로
  //    연결되는지 본다. 수락은 반드시 클라이언트에서 찍는다(서버 액션의 trackEvent 는 무발화).
  inviteCreated: (relationship: string) =>
    trackEvent({ action: 'invite_created', category: 'family', label: relationship }),
  inviteAccepted: (relationship: string) =>
    trackEvent({ action: 'invite_accepted', category: 'family', label: relationship }),

  // ── 신탁 웹푸시(R-1) — 구독 ↔ 해지 ──
  pushSubscribed: () => trackEvent({ action: 'push_subscribed', category: 'notification' }),
  pushUnsubscribed: () => trackEvent({ action: 'push_unsubscribed', category: 'notification' }),

  pageView: (path: string) => trackEvent({ action: 'page_view', category: 'navigation', label: path }),

  shrineCreate: (theme: string) => trackEvent({ action: 'shrine_create', category: 'shrine', label: theme }),
  shrineWishAdd: (category: string) => trackEvent({ action: 'shrine_wish_add', category: 'shrine', label: category }),
  shrineItemPurchase: (itemType: string, price: number) =>
    trackEvent({ action: 'shrine_item_purchase', category: 'shrine', label: itemType, value: price }),
  shrineVisit: () => trackEvent({ action: 'shrine_visit', category: 'shrine' }),
  shrineShare: (platform: string) => trackEvent({ action: 'shrine_share', category: 'social', label: platform }),
} as const
