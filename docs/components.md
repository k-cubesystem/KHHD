# Component Catalog — Haehwadang

## Layout Components

| Component      | Path                               | Description                         |
| -------------- | ---------------------------------- | ----------------------------------- |
| `BottomNav`    | `components/layout/bottom-nav.tsx` | 하단 네비게이션 (5 tabs, i18n)      |
| `MobileHeader` | `components/mobile-header.tsx`     | 상단 헤더 (뒤로가기, 브랜드, 홈)    |
| `HeroCarousel` | `components/HeroCarousel.tsx`      | 랜딩 히어로 3-slide carousel (ARIA) |

## Analysis Components

| Component               | Path                                                        | Description                              |
| ----------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| `AnalysisDashboard`     | `components/analysis/AnalysisDashboard.tsx`                 | 분석 메인 대시보드 (카드 그리드)         |
| `DailyFortuneCard`      | `components/analysis/daily-fortune-card.tsx`                | 오늘의 운세 요약 카드 (GA4)              |
| `DailyFortuneView`      | `components/analysis/daily-fortune-view.tsx`                | 오늘의 운세 상세 뷰                      |
| `SajuResultClient`      | `app/protected/analysis/saju-result/saju-result-client.tsx` | 사주 분석 결과 (프리미엄 블러)           |
| `CheonjiinSummary`      | `components/analysis/cheonjiin/CheonjiinSummary.tsx`        | 천지인 요약                              |
| `CheonSection`          | `components/analysis/cheonjiin/CheonSection.tsx`            | 천(하늘) 섹션                            |
| `InSection`             | `components/analysis/cheonjiin/InSection.tsx`               | 인(사람) 섹션                            |
| `JiSection`             | `components/analysis/cheonjiin/JiSection.tsx`               | 지(땅) 섹션                              |
| `CheonjiinLoadingState` | `components/analysis/cheonjiin/CheonjiinLoadingState.tsx`   | 분석 로딩 애니메이션                     |
| `BokHubSection`         | `components/analysis/bok-hub-section.tsx`                   | 복 관리 허브 (등급 바 + 미션 체크리스트) |

## Payment & Membership

| Component              | Path                                               | Description                   |
| ---------------------- | -------------------------------------------------- | ----------------------------- |
| `PaymentWidget`        | `components/payment/payment-widget.tsx`            | 결제위젯 (Toss widgets API)   |
| `PaywallModal`         | `components/shared/paywall-modal.tsx`              | 페이월 모달 (단일 CTA, i18n)  |
| `PremiumBlurSection`   | `components/shared/premium-blur-section.tsx`       | 프리미엄 블러 오버레이 (i18n) |
| `MembershipCard`       | `components/membership/membership-card.tsx`        | 멤버십 구독 카드              |
| `MembershipNudgeModal` | `components/membership/membership-nudge-modal.tsx` | 멤버십 넛지 모달              |

## Shared Components

| Component            | Path                                       | Description                     |
| -------------------- | ------------------------------------------ | ------------------------------- |
| `LocaleSwitcher`     | `components/shared/locale-switcher.tsx`    | 언어 전환 (admin only, ko/en)   |
| `KakaoShareButton`   | `components/shared/kakao-share-button.tsx` | 카카오톡 공유 (GA4)             |
| `SajuLoadingOverlay` | `components/shared/SajuLoadingOverlay.tsx` | 분석 로딩 오버레이              |
| `GuestGate`          | `components/guest-gate.tsx`                | 비회원 잠금 (블러 + CTA, i18n)  |
| `GuestCTACard`       | `components/guest-cta-card.tsx`            | 비회원 CTA 카드 (i18n)          |
| `EventPopup`         | `components/EventPopup.tsx`                | 이벤트 팝업 (포커스 트랩)       |
| `BokUpsellModal`     | `components/shared/bok-upsell-modal.tsx`   | 인연 한도 업셀 모달 (한지+단청) |

## Landing Components

| Component            | Path                                          | Description                          |
| -------------------- | --------------------------------------------- | ------------------------------------ |
| `MiniReadingSection` | `components/landing/mini-reading-section.tsx` | 미니 리딩 (생년월일 → 띠/오행, i18n) |

## Events & Engagement

| Component             | Path                                          | Description           |
| --------------------- | --------------------------------------------- | --------------------- |
| `DailyCheckIn`        | `components/events/daily-check-in.tsx`        | 출석 체크 (복채 보상) |
| `LuckyRoulette`       | `components/events/lucky-roulette.tsx`        | 럭키 룰렛 (복채 보상) |
| `SeasonalEventBanner` | `components/events/seasonal-event-banner.tsx` | 시즌 이벤트 배너      |

## Studio Components

| Component    | Path                 | Description  |
| ------------ | -------------------- | ------------ |
| Face reading | `components/studio/` | 관상 분석 UI |
| Palm reading | `components/studio/` | 손금 분석 UI |
| Fengshui     | `components/studio/` | 풍수 분석 UI |

## Design System

### Color Tokens (`lib/config/design-tokens.ts`)

```
Gold:    300 #F4E4BA → 500 #D4AF37 → 700 #8C7B50
Error:   #EF4444 (light/border/text variants)
Success: #22C55E (light/border/text variants)
Warning: #F59E0B (light/border/text variants)
Info:    #3B82F6 (light/border/text variants)
```

### Typography Scale (`tailwind.config.ts`)

```
display    → 28px / 1.2 / -0.03em / 600
heading-1  → 24px / 1.2 / -0.02em / 600
heading-2  → 20px / 1.25 / -0.02em / 600
heading-3  → 18px / 1.3 / -0.01em / 600
heading-4  → 16px / 1.4 / -0.01em / 600
body-lg    → 16px / 1.7 / -0.02em / 300
body       → 14px / 1.6 / -0.02em / 300
body-sm    → 13px / 1.5 / -0.01em / 300
caption    → 12px / 1.5 / 0em / 400
overline   → 11px / 1.4 / 0.08em / 600
```

### Obangsaek (오방색)

```
red:    #C83232 (朱 — CTA, 강조)
blue:   #2D5F8A (靑 — 정보, 링크)
yellow: #D4A017 (黃 — 골드)
white:  #F5F0E8 (白 — 한지 배경)
black:  #1A1714 (玄 — 배경)
```

### Traditional CSS Utilities

```
.hanji-card, .dancheong-border-top, .dancheong-divider, .bok-badge, .traditional-grid-bg
```

### Accessibility

- WCAG AA contrast: all text ≥ `/60` opacity on dark backgrounds
- `prefers-reduced-motion`: all animations disabled
- Focus ring: `outline: 2px solid var(--color-info)`
- Korean typography: `word-break: keep-all`, `line-break: strict`
- Carousel ARIA: `role="region"`, `aria-roledescription="carousel"`, `aria-live="polite"`
