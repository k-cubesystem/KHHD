# 결제 및 크레딧 시스템 현황 분석 및 개편안

**작성일**: 2026-01-22  
**작성자**: Antigravity AI  

---

## 1. 현재 시스템 현황 (AS-IS)

### 1.1 데이터베이스 구조
현재 시스템은 **"개별 결제 건 차감 방식"**을 사용하고 있으나, 코드 상의 불일치가 존재합니다.

- **Payments 테이블**: `credits_remaining` 컬럼 보유. 결제 건별로 잔여 크레딧을 관리.
- **Credits 테이블**: **존재하지 않음.** (그러나 코드에서는 참조 중)
- **Profiles 테이블**: `credits` 컬럼이 있으나 사용되지 않음.

### 1.2 소스 코드 불일치 (Critical)
1.  **`app/actions/payment-actions.ts`**:
    - `payments` 테이블을 조회하여 잔여 크레딧의 합(`sum`)을 계산.
    - 사용 시 가장 오래된 결제 건 찾아서 `credits_remaining - 1` 실행.
    - **문제점**: 1 크레딧 고정 차감만 구현되어 있음 (AI 비용 반영 안 됨).

2.  **`app/actions/ai-saju.ts`**:
    - `supabase.from("credits")`를 조회.
    - **문제점**: 해당 테이블이 존재하지 않아 일반 유저는 **무조건 에러 발생** (관리자는 우회).

### 1.3 비용 구조 (Constants)
| 기능 | 소모 크레딧 |
| :--- | :--- |
| 사주 분석 | 1 |
| 관상/손금/풍수 | 2 |
| AI 이미지 생성 | 5 |

---

## 2. 시스템 개편 제안 (TO-BE)

### 2.1 "통합 월렛(Wallet)" 모델 도입
파편화된 결제 건별 관리를 중단하고, 사용자별 **단일 잔액(Wallet)** 모델로 전환합니다.

#### **New Table: `credits` (User Wallet)**
```sql
CREATE TABLE public.credits (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id),
    balance INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **New Table: `credit_transactions` (History)**
```sql
CREATE TABLE public.credit_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL, -- 충전(+), 사용(-)
    type TEXT NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
    description TEXT, -- '관상 분석 사용', '3회 패키지 구매'
    metadata JSONB, -- { payment_id: "...", feature: "face_analysis" }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.2 로직 변경
1.  **결제 성공 시**:
    - `payments` 테이블에 기록 (Log 성격).
    - `credit_transactions`에 `+` 기록 추가.
    - `credits` 테이블 `balance` 증가 (Trigger).

2.  **AI 기능 사용 시**:
    - `credits` 테이블 `balance` 확인.
    - `credit_transactions`에 `-` 기록 추가.
    - `credits` 테이블 `balance` 차감.

---

## 3. 멤버십(구독) 시스템 도입 제안

### 3.1 Basic Pass (무료)
- 회원가입 시 1 크레딧 제공.
- 추가 사용 시 건별 결제 (Pay-as-you-go).

### 3.2 Premium Membership (월 14,900원) - 예정
- 매월 30 크레딧 자동 충전.
- 크레딧 단가 50% 할인 효과.
- 전용 뱃지 및 프리미엄 테마(Dark Gold) 제공.

---

## 4. 즉시 실행 계획 (Action Plan)

1.  **DB 마이그레이션**: `credits` 및 `credit_transactions` 테이블 생성.
2.  **데이터 마이그레이션**: 기존 `payments`의 잔여 크레딧을 계산하여 `credits` 테이블로 이관.
3.  **코드 수정**:
    - `payment-actions.ts`: 결제 후 월렛 충전 로직 추가.
    - `ai-saju.ts`: 올바른 `credits` 테이블 참조 및 트랜잭션 기록.

**승인 요청**: 위 "통합 월렛 모델"로의 전환을 승인해주시면 즉시 마이그레이션을 진행하겠습니다.
