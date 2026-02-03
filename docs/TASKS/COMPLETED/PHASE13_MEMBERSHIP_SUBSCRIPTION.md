# Phase 13: Membership Subscription System (구독 결제 시스템)

**To**: Claude (Executor)
**From**: Gemini (Planner)
**Date**: 2026-01-23
**Status**: 승인 대기

---

## 1. 목표 (Objective)

Toss Payments 빌링키를 활용한 **월간 자동 결제 멤버십 시스템** 구축.
기존 단건 결제 시스템과 병행하여 **하이브리드 과금 모델** 완성.

---

## 2. 현재 상태 분석

### 이미 준비된 것
- `wallets.is_subscribed` & `subscription_end_date` 필드 존재
- `wallet_transactions.type = 'SUBSCRIPTION'` 타입 정의됨
- Toss Payments 단건 결제 연동 완료
- Admin 패널 구조 준비됨

### 구현 필요 사항
- Toss Payments **빌링키(BillingKey)** 발급 로직
- 자동 결제(Recurring) 처리 로직
- 구독 관리 UI (가입/해지/상태 확인)
- 월간 부적 자동 지급 크론잡

---

## 3. 데이터베이스 스키마

### A. `subscriptions` 테이블 (신규)
```sql
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) UNIQUE,
    billing_key TEXT NOT NULL,                    -- Toss Payments 빌링키
    customer_key TEXT NOT NULL,                   -- 고객 고유 키
    plan_type TEXT DEFAULT 'MONTHLY' CHECK (plan_type IN ('MONTHLY', 'YEARLY')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON public.subscriptions(next_billing_date);
```

### B. `subscription_payments` 테이블 (구독 결제 내역)
```sql
CREATE TABLE public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    payment_key TEXT,                             -- Toss 결제 키
    amount INTEGER NOT NULL,                      -- 결제 금액
    status TEXT DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
    failure_reason TEXT,
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### C. `membership_plans` 테이블 (구독 상품)
```sql
CREATE TABLE public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                           -- '해화 멤버십'
    price INTEGER NOT NULL,                       -- 9900
    interval TEXT DEFAULT 'MONTH' CHECK (interval IN ('MONTH', 'YEAR')),
    talismans_per_period INTEGER NOT NULL,        -- 10 (월간 부적 지급량)
    features JSONB,                               -- 추가 혜택 정보
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 데이터
INSERT INTO public.membership_plans (name, price, interval, talismans_per_period, features)
VALUES (
    '해화 멤버십',
    9900,
    'MONTH',
    10,
    '{"daily_fortune": true, "pdf_archive": true, "kakao_daily": true}'::jsonb
);
```

---

## 4. Toss Payments 빌링키 연동

### A. 빌링키 발급 Flow
```
1. [클라이언트] 구독 버튼 클릭
2. [서버] customerKey 생성 → Toss 빌링키 발급 창 호출
3. [Toss] 사용자 카드 정보 입력 → 빌링키 발급
4. [Toss → 서버] successUrl로 리다이렉트 (authKey 포함)
5. [서버] POST /v1/billing/authorizations/issue
   - authKey + customerKey → billingKey 발급
6. [서버] subscriptions 테이블에 저장
7. [서버] 첫 결제 즉시 실행
```

### B. 자동 결제 Flow (매월)
```
1. [크론잡] next_billing_date 도래한 구독 조회
2. [서버] POST /v1/billing/{billingKey}
   - amount: 9900
   - orderId: SUB_{userId}_{YYYYMM}
3. [성공 시]
   - subscription_payments 기록
   - wallets에 부적 10장 추가
   - wallet_transactions 'SUBSCRIPTION' 기록
   - next_billing_date 1개월 연장
4. [실패 시]
   - 3회 재시도 후 구독 일시정지
   - 이메일/카톡 알림
```

---

## 5. Server Actions 구현

### A. `app/actions/subscription-actions.ts`
```typescript
// 빌링키 발급 요청
export async function requestBillingKey()

// 빌링키 발급 완료 (authKey → billingKey)
export async function issueBillingKey(authKey: string, customerKey: string)

// 첫 구독 결제 실행
export async function executeFirstPayment(subscriptionId: string)

// 자동 결제 실행 (크론잡용)
export async function processRecurringPayment(subscriptionId: string)

// 구독 해지
export async function cancelSubscription(reason?: string)

// 구독 상태 조회
export async function getSubscriptionStatus()

// 구독 재활성화
export async function reactivateSubscription()
```

### B. Webhook 처리 (`/api/webhooks/toss`)
```typescript
// 결제 성공/실패 웹훅 처리
// 카드 만료, 잔액 부족 등 이벤트 처리
```

---

## 6. UI 구현

### A. 구독 가입 페이지 (`/protected/membership`)
```
┌─────────────────────────────────────────┐
│  👑 해화 멤버십                           │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │  월 9,900원                      │    │
│  │  ─────────────────────────────  │    │
│  │  ✓ 매월 부적 10장 지급 (3만원 상당) │    │
│  │  ✓ 오늘의 운세 무제한 열람         │    │
│  │  ✓ 매일 카카오톡 알림              │    │
│  │  ✓ 분석 결과 PDF 평생 보관         │    │
│  └─────────────────────────────────┘    │
│                                          │
│  [ 멤버십 시작하기 ]                      │
│                                          │
│  * 언제든 해지 가능, 위약금 없음          │
└─────────────────────────────────────────┘
```

### B. 구독 관리 페이지 (`/protected/membership/manage`)
```
┌─────────────────────────────────────────┐
│  내 멤버십                               │
│                                          │
│  상태: 구독 중 ✓                         │
│  다음 결제일: 2026년 2월 23일            │
│  결제 금액: 9,900원                      │
│                                          │
│  [ 결제 수단 변경 ]  [ 구독 해지 ]        │
│                                          │
│  ── 결제 내역 ──────────────────────     │
│  2026.01.23  9,900원  성공               │
│  2025.12.23  9,900원  성공               │
└─────────────────────────────────────────┘
```

### C. 헤더 뱃지 업데이트
```
Before: 🧧 5
After:  🧧 5  👑  (구독자 뱃지 추가)
```

### D. 오늘의 운세 페이지 (비구독자 블러 처리)
```
┌─────────────────────────────────────────┐
│  오늘의 운세                             │
│                                          │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │
│  ░░░░ 블러 처리된 콘텐츠 ░░░░░░░         │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │
│                                          │
│  🔒 멤버십 회원 전용 콘텐츠               │
│  [ 멤버십 가입하고 매일 확인하기 ]        │
└─────────────────────────────────────────┘
```

---

## 7. Admin 패널 확장

### `/admin/subscriptions`
- 전체 구독자 목록
- 구독 상태별 필터 (ACTIVE, CANCELLED, EXPIRED)
- 수동 부적 지급
- 구독 강제 해지

### `/admin/membership-plans`
- 멤버십 상품 관리
- 가격/혜택 변경

---

## 8. 크론잡 설정

### Vercel Cron 또는 Supabase Edge Functions
```typescript
// 매일 09:00 KST 실행
// 1. 당일 결제 대상 구독 조회
// 2. 자동 결제 실행
// 3. 결과 로깅

// schedule: "0 0 * * *" (UTC 00:00 = KST 09:00)
```

---

## 9. 실행 순서

### Step 1: Database Migration
- [ ] subscriptions 테이블 생성
- [ ] subscription_payments 테이블 생성
- [ ] membership_plans 테이블 생성
- [ ] RLS 정책 설정

### Step 2: Server Actions
- [ ] subscription-actions.ts 구현
- [ ] Toss 빌링키 API 연동
- [ ] Webhook 엔드포인트 생성

### Step 3: UI Pages
- [ ] /protected/membership (가입 페이지)
- [ ] /protected/membership/manage (관리 페이지)
- [ ] /protected/membership/success (가입 완료)
- [ ] 헤더 구독 뱃지 추가

### Step 4: Today's Fortune Gate
- [ ] 비구독자 블러 처리
- [ ] 구독 유도 모달

### Step 5: Admin Panel
- [ ] /admin/subscriptions 구축
- [ ] /admin/membership-plans 구축

### Step 6: Cron Job
- [ ] 자동 결제 크론 설정
- [ ] 실패 시 재시도 로직

---

## 10. 예상 파일 구조

```
app/
├── actions/
│   └── subscription-actions.ts  (신규)
├── api/
│   └── webhooks/
│       └── toss/
│           └── route.ts         (신규)
├── protected/
│   └── membership/
│       ├── page.tsx             (가입)
│       ├── manage/
│       │   └── page.tsx         (관리)
│       └── success/
│           └── page.tsx         (완료)
├── admin/
│   ├── subscriptions/
│   │   └── page.tsx             (신규)
│   └── membership-plans/
│       └── page.tsx             (신규)
components/
├── membership/
│   ├── membership-card.tsx      (신규)
│   ├── subscription-status.tsx  (신규)
│   └── subscription-badge.tsx   (신규)
supabase/
└── migrations/
    └── 20260123_subscription_system.sql (신규)
```

---

## 11. 참고 자료

- [Toss Payments 정기결제 가이드](https://docs.tosspayments.com/guides/billing)
- [Toss Payments API 레퍼런스](https://docs.tosspayments.com/reference/billing)

---

**승인 후 구현을 시작합니다.**
