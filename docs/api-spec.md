# API Specification — Haehwadang

## REST API Endpoints

### 1. OG Image Generator

```
GET /api/og
```

Dynamic Open Graph image generation for social sharing.

| Param      | Type   | Default            | Description                      |
| ---------- | ------ | ------------------ | -------------------------------- |
| `title`    | string | "청담해화당"       | Image title (max 80 chars)       |
| `desc`     | string | "당신의 운명을..." | Description (max 120 chars)      |
| `score`    | string | -                  | Fortune score display            |
| `name`     | string | -                  | User name (max 20 chars)         |
| `category` | string | -                  | Analysis category (max 20 chars) |

**Response**: `image/png` (1200x630)
**Runtime**: Edge

---

### 2. Toss Payments Webhook

```
POST /api/webhooks/toss
GET  /api/webhooks/toss  → { status: "ok" }
```

Handles payment lifecycle events from Toss Payments.

**Authentication**: Basic Auth (`TOSS_PAYMENTS_SECRET_KEY:` base64-encoded)
**Security**: `crypto.timingSafeEqual()` timing-attack prevention

| Event                 | Action                                                |
| --------------------- | ----------------------------------------------------- |
| `PAYMENT.DONE`        | Mark payment completed / subscription payment SUCCESS |
| `PAYMENT.FAILED`      | Mark payment/subscription FAILED                      |
| `PAYMENT.CANCELLED`   | Mark payment cancelled                                |
| `BILLING_KEY.DELETED` | Cancel subscription, clear billing key                |
| `CARD.EXPIRED`        | Mark subscription PAYMENT_FAILED                      |

---

### 3. Billing Cron

```
GET /api/cron/billing
```

Automatic subscription renewal. Runs daily at 09:00 KST via Vercel Cron.

**Authentication**: `Authorization: Bearer <CRON_SECRET>`
**Schedule**: `0 9 * * *`

**Flow**:

1. Query ACTIVE subscriptions where `next_billing_date <= now`
2. Call Toss Billing API for each
3. On success: extend period, grant talismans
4. On failure: retry next day (max 3 retries → PAYMENT_FAILED)

**Response**:

```json
{
  "success": true,
  "stats": { "processed": 5, "success": 4, "failed": 1, "errors": [...] }
}
```

---

### 4. Daily Fortune Cron

```
GET /api/cron/daily-fortune
```

Generate daily fortune for all active subscribers + send KakaoTalk notifications.

**Authentication**: `Authorization: Bearer <CRON_SECRET>`
**Schedule**: `0 22 * * *` (10 PM KST)
**Concurrency**: 5 parallel (Gemini API throttle)

---

## Server Actions

### Payment (`app/actions/payment/`)

| Action                                           | Description                               |
| ------------------------------------------------ | ----------------------------------------- |
| `confirmPayment(paymentKey, orderId, talismans)` | Confirm one-time payment via Toss API     |
| `createBillingAuthUrl(planId)`                   | Create billing auth URL for subscription  |
| `issueBillingKey(authKey, customerKey)`          | Issue billing key from Toss               |
| `executeFirstPayment(customerKey)`               | Execute first subscription payment        |
| `cancelSubscription(reason?)`                    | Cancel active subscription (grace period) |
| `reactivateSubscription()`                       | Reactivate cancelled subscription         |
| `getWalletBalance()`                             | Get user's bokchae balance                |
| `deductTalismans(cost, featureKey)`              | Deduct bokchae for feature usage          |
| `addTalismans(amount, type, description)`        | Add bokchae to wallet                     |
| `getMembershipPlans()`                           | Get active membership plans               |
| `getSubscriptionStatus()`                        | Check user's subscription status          |

### AI Analysis (`app/actions/ai/`)

| Action                                                   | Description                                    |
| -------------------------------------------------------- | ---------------------------------------------- |
| `analyzeCheonjiinAction(targetId)`                       | Full Cheonjiin (Heaven-Earth-Human) analysis   |
| `analyzeCompatibility(targetId1, targetId2)`             | Two-person compatibility analysis              |
| `analyzeCelebrityCompatibility(targetId, celebrityName)` | Celebrity compatibility                        |
| `generateFortune(targetId, type)`                        | Generate fortune (daily/weekly/monthly/yearly) |
| `generateImage(prompt)`                                  | AI image generation                            |
| `shamanChat(message, conversationId)`                    | AI counseling chat                             |
| `analyzeTrend(targetId)`                                 | Trend analysis                                 |
| `analyzeWealth(targetId)`                                | Wealth fortune analysis                        |

### Core (`app/actions/core/`)

| Action                                  | Description                       |
| --------------------------------------- | --------------------------------- |
| `startFateAnalysis(formData)`           | Start comprehensive fate analysis |
| `sendNotification(userId, title, body)` | Send push notification            |

### Admin (`app/actions/admin/`)

| Action                                       | Description                        |
| -------------------------------------------- | ---------------------------------- |
| `getDashboardStats()`                        | Dashboard statistics               |
| `getHourlyTraffic(hours)`                    | Hourly traffic data                |
| `getRetentionCohort(days)`                   | D1/D7/D30 retention cohort         |
| `getConversionMetrics()`                     | Signup → Analysis → Payment funnel |
| `sendGlobalNotification(title, message)`     | Broadcast notification             |
| `issueCouponToAll(code, amount, expiryDays)` | Bulk coupon distribution           |

---

## Environment Variables

| Variable                               | Scope         | Description                |
| -------------------------------------- | ------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Client+Server | Supabase project URL       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Client+Server | Supabase anon key          |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server only   | Supabase service role key  |
| `GOOGLE_GENERATIVE_AI_API_KEY`         | Server only   | Gemini AI API key          |
| `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY` | Client        | Toss widget client key     |
| `TOSS_PAYMENTS_SECRET_KEY`             | Server only   | Toss secret key            |
| `CRON_SECRET`                          | Server only   | Vercel Cron auth token     |
| `NEXT_PUBLIC_APP_URL`                  | Client+Server | Application base URL       |
| `NEXT_PUBLIC_GA_ID`                    | Client        | Google Analytics 4 ID      |
| `SOLAPI_API_KEY`                       | Server only   | Solapi (KakaoTalk) API key |
| `SOLAPI_API_SECRET`                    | Server only   | Solapi API secret          |
