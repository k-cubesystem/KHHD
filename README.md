# 청담해화당 (Haehwadang)

> AI 기반 프리미엄 사주/운세/궁합/관상/풍수 분석 SaaS

## Tech Stack

| Layer      | Technology                    |
| ---------- | ----------------------------- |
| Framework  | Next.js 16 (App Router)       |
| Language   | TypeScript (strict)           |
| Styling    | Tailwind CSS + Shadcn/ui      |
| Database   | Supabase (PostgreSQL + RLS)   |
| AI         | Gemini 3.1 Pro / Flash        |
| Payments   | Toss Payments (위젯 + 빌링)   |
| Auth       | Supabase Auth (OAuth + Email) |
| Monitoring | Sentry + GA4                  |
| i18n       | next-intl (ko/en)             |
| Deploy     | Vercel                        |

## Quick Start

```bash
git clone <repo-url>
cd haehwadang
npm install
cp .env.example .env.local   # 환경변수 설정
npm run dev                   # http://localhost:3000
```

## Commands

```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm run lint      # ESLint
npm run test      # 테스트
npm run e2e       # E2E 테스트
```

## Features

### Core Analysis

- **사주팔자** — 천지인(天地人) 3요소 AI 분석
- **궁합** — 두 사람 오행 기반 궁합 분석
- **관상/손금** — 이미지 AI 분석 (GPT-4 Vision)
- **풍수** — 주소 기반 풍수 8방위 분석
- **오늘의 운세** — 매일 개인화 운세 + 푸시 알림

### Monetization

- **복채 시스템** — 가상 화폐 (1복채 = 1만냥)
- **3-Tier 멤버십** — Single / Family / Business
- **Toss 결제위젯** — 일반결제 + 자동결제(빌링)
- **출석체크/룰렛** — 일일 복채 보상
- **복 생태계** — 인연 관리 시 양쪽 복 포인트 적립 (SEED→FOREST 5단계)

### Engagement

- **카카오톡 공유** — JS SDK 리치 카드
- **미니 리딩** — 가입 전 즉시 체험
- **데일리 포춘 카드** — 연속 접속 스트릭
- **AI 고민상담** — 실시간 채팅

## Project Structure

```
app/
  api/cron/          # Vercel Cron (billing, daily-fortune)
  api/webhooks/      # Toss Payments webhook
  api/og/            # Dynamic OG image (Edge)
  protected/         # Auth-required pages
    analysis/        # 사주 분석 허브
    studio/          # 관상/손금/풍수
    fortune/         # 주간/월간 운세
    membership/      # 결제/구독
    family/          # 가족 관리
    ai-shaman/       # AI 상담
  actions/           # Server Actions
    ai/              # AI 분석 액션 (Gemini)
    payment/         # 결제/구독/지갑
    admin/           # 관리자 액션
    core/            # 핵심 비즈니스 로직

components/
  analysis/          # 분석 결과 UI
  payment/           # 결제 위젯
  shared/            # 공유 컴포넌트 (paywall, blur, locale)
  landing/           # 랜딩 페이지
  events/            # 출석/룰렛/이벤트

lib/
  config/            # Design tokens, 설정
  services/          # 외부 서비스 (Toss SDK)
  analytics/         # GA4 이벤트 트래킹
  domain/saju/       # 사주 계산 Pure functions

i18n/                # next-intl 설정
messages/            # ko.json, en.json
docs/                # API spec, Component catalog
```

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GOOGLE_GENERATIVE_AI_API_KEY=

# Payments (Toss)
NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY=   # 결제위젯 연동키
TOSS_PAYMENTS_SECRET_KEY=               # 시크릿키

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GA_ID=                       # Google Analytics 4
CRON_SECRET=                             # Vercel Cron 인증

# KakaoTalk (Solapi)
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
```

## Payment System

### One-time (복채 충전)

Toss 결제위젯 → `widgets.renderPaymentMethods()` → `requestPayment()` → `/api/webhooks/toss`

### Subscription (멤버십)

`payment.requestBillingAuth()` → 빌링키 발급 → 첫 결제 → `/api/cron/billing` (매일 09:00 자동 갱신)

| Plan     | Price     | Daily Limit | Family |
| -------- | --------- | ----------- | ------ |
| Single   | 9,900/mo  | 10만냥      | 3명    |
| Family   | 29,900/mo | 30만냥      | 10명   |
| Business | 99,000/mo | 100만냥     | 50명   |

### Bok Points (복 포인트)

Actions earn points: Analysis +30, Compatibility +40, Fortune +10~20, Share +20, Register +50
Tiers: SEED(0) → SPROUT(500) → FLOWER(2,000) → TREE(5,000) → FOREST(15,000)

## API Documentation

See [docs/api-spec.md](docs/api-spec.md) for full API specification.

## Design System

See [docs/components.md](docs/components.md) for component catalog and design tokens.

### Key Patterns

- **4-Protocol**: Zero-Latency + Commercialization + Security + Code Quality
- **Semantic Colors**: error/success/warning/info with light/border/text variants
- **Typography**: 10-scale system (display → overline)
- **Accessibility**: WCAG AA, `prefers-reduced-motion`, ARIA

## Deployment

```bash
# Vercel (auto-deploy on push to main)
git push origin main

# Manual
vercel --prod
```

### Cron Jobs (vercel.json)

| Job                       | Schedule      | Description           |
| ------------------------- | ------------- | --------------------- |
| `/api/cron/billing`       | 매일 09:00    | 정기결제 자동 갱신    |
| `/api/cron/daily-fortune` | 매일 22:00    | 운세 생성 + 알림톡    |
| `/api/cron/bok-missions`  | 매일 00:00    | 복 미션 일일 생성     |
| `/api/cron/bok-report`    | 매주 월 09:00 | 복 포인트 주간 리포트 |

## License

Private. All rights reserved.
