# API Reference

해화당(Haehwadang) 서비스의 API 문서입니다.

## Server Actions

### 사주 분석 (Analysis)

#### `analyzeSajuDetail`
사용자의 사주(四柱)를 AI로 상세 분석합니다.

```typescript
import { analyzeSajuDetail } from "@/app/actions/ai-saju";

const result = await analyzeSajuDetail(
  name: string,        // 이름
  gender: string,      // 성별 ('남' | '여')
  birthDate: string,   // 생년월일 (YYYY-MM-DD)
  birthTime: string,   // 태어난 시간 (HH:mm)
  calendarType: string // 양력/음력 ('양력' | '음력')
);

// 반환값
{
  success: boolean;
  coreCharacter?: string;      // 핵심 성격 요약
  fiveElements?: {             // 오행 분포
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  detailedAnalysis?: string;   // 마크다운 형식 상세 분석
  error?: string;
}
```

**비용**: 부적 1개

---

#### `getTodayFortune`
오늘의 운세를 조회합니다.

```typescript
import { getTodayFortune } from "@/app/actions/ai-saju";

const result = await getTodayFortune(birthDate: string);

// 반환값
{
  success: boolean;
  score?: number;        // 0-100
  summary?: string;      // 한 줄 요약
  content?: string;      // 마크다운 상세 운세
  luckyColor?: string;   // 행운의 색
  luckyTime?: string;    // 행운의 시간대
  error?: string;
}
```

**비용**: 멤버십 회원 무료 / 비회원 부적 1개

---

#### `analyzeFaceForDestiny`
관상(觀相) 분석을 수행합니다.

```typescript
import { analyzeFaceForDestiny } from "@/app/actions/ai-saju";

const result = await analyzeFaceForDestiny(
  imageBase64: string,           // Base64 인코딩된 얼굴 이미지
  goal: "wealth" | "love" | "authority"  // 분석 목표
);

// 반환값
{
  success: boolean;
  currentScore?: number;         // 종합 점수 (0-100)
  confidence?: number;           // 분석 신뢰도 (0-100)
  currentAnalysis?: string;      // 마크다운 상세 분석
  fiveOrgans?: {                 // 오관(五官) 분석
    ear: { score: number; analysis: string };
    eyebrow: { score: number; analysis: string };
    eye: { score: number; analysis: string };
    nose: { score: number; analysis: string };
    mouth: { score: number; analysis: string };
  };
  threeZones?: {                 // 삼정(三停) 분석
    upper: { score: number; analysis: string };
    middle: { score: number; analysis: string };
    lower: { score: number; analysis: string };
  };
  skinColor?: {                  // 피부 찰색 분석
    complexion: string;
    healthIndicator: string;
  };
  recommendations?: string[];     // 개선 조언
  acupressure?: Array<{          // 혈자리 추천
    name: string;
    effect: string;
    location: string;
    method: string;
  }>;
  error?: string;
}
```

**비용**: 부적 2개

---

#### `analyzePalm`
손금 분석을 수행합니다.

```typescript
import { analyzePalm } from "@/app/actions/ai-saju";

const result = await analyzePalm(imageBase64: string);

// 반환값
{
  success: boolean;
  currentScore?: number;
  currentAnalysis?: string;
  majorLines?: {
    life: string;      // 생명선
    head: string;      // 두뇌선
    heart: string;     // 감정선
    fate: string;      // 운명선
  };
  acupressure?: Array<{
    name: string;
    effect: string;
    location: string;
    method: string;
  }>;
  error?: string;
}
```

**비용**: 부적 2개

---

#### `analyzeInteriorForFengshui`
풍수 인테리어 분석을 수행합니다.

```typescript
import { analyzeInteriorForFengshui } from "@/app/actions/ai-saju";

const result = await analyzeInteriorForFengshui(
  imageBase64: string,
  theme: "wealth" | "romance" | "health",
  roomType: string = "거실"
);

// 반환값
{
  success: boolean;
  currentAnalysis?: string;
  problems?: string[];
  shoppingList?: string[];
  imagePrompt?: string;
  error?: string;
}
```

**비용**: 부적 2개

---

### 가족 관리 (Family)

#### `getFamilyMembers`
등록된 가족 구성원 목록을 조회합니다.

```typescript
import { getFamilyMembers } from "@/app/actions/family-actions";

const members = await getFamilyMembers();

// 반환값
Array<{
  id: string;
  name: string;
  birth_date: string;
  birth_time?: string;
  gender: string;
  relation: string;
  is_lunar: boolean;
}>
```

---

#### `addFamilyMember`
새 가족 구성원을 추가합니다.

```typescript
import { addFamilyMember } from "@/app/actions/family-actions";

await addFamilyMember(formData: FormData);

// FormData 필드
// - name: string
// - birth_date: string (YYYY-MM-DD)
// - birth_time?: string (HH:mm)
// - gender: string
// - relation: string
// - is_lunar?: boolean
```

---

#### `updateFamilyMember`
가족 구성원 정보를 수정합니다.

```typescript
import { updateFamilyMember } from "@/app/actions/family-actions";

await updateFamilyMember(id: string, formData: FormData);
```

---

#### `deleteFamilyMember`
가족 구성원을 삭제합니다.

```typescript
import { deleteFamilyMember } from "@/app/actions/family-actions";

await deleteFamilyMember(id: string);
```

---

### 결제 (Payment)

#### `confirmPayment`
Toss Payments 결제를 확정합니다.

```typescript
import { confirmPayment } from "@/app/actions/payment-actions";

const result = await confirmPayment(
  paymentKey: string,
  orderId: string,
  talismans: number = 1
);

// 반환값
{
  success: boolean;
  orderId?: string;
  amount?: number;
  error?: string;
}
```

---

### 지갑 (Wallet)

#### `getWalletBalance`
현재 부적 잔액을 조회합니다.

```typescript
import { getWalletBalance } from "@/app/actions/wallet-actions";

const balance = await getWalletBalance();
// 반환값: number
```

---

#### `deductTalisman`
기능 사용 시 부적을 차감합니다.

```typescript
import { deductTalisman } from "@/app/actions/wallet-actions";

const result = await deductTalisman(
  featureKey: string,      // "SAJU_BASIC" | "FACE_AI" | "PALM_AI" | "FENGSHUI_AI" | "IMAGE_GEN"
  customAmount?: number    // 사용자 지정 금액 (선택)
);

// 반환값
{
  success: boolean;
  error?: string;
  remainingBalance?: number;
}
```

**기능별 비용 (feature_costs 테이블)**:
- `SAJU_BASIC`: 1 부적
- `FACE_AI`: 2 부적
- `PALM_AI`: 2 부적
- `FENGSHUI_AI`: 2 부적
- `IMAGE_GEN`: 3 부적

---

#### `addTalismans`
부적을 충전합니다.

```typescript
import { addTalismans } from "@/app/actions/wallet-actions";

const result = await addTalismans(
  amount: number,
  type: "CHARGE" | "BONUS" | "SUBSCRIPTION" = "CHARGE",
  description?: string
);

// 반환값
{
  success: boolean;
  error?: string;
}
```

---

#### `getWalletTransactions`
지갑 거래 내역을 조회합니다.

```typescript
import { getWalletTransactions } from "@/app/actions/wallet-actions";

const transactions = await getWalletTransactions(limit: number = 50);

// 반환값
Array<{
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}>
```

---

### 멤버십 구독 (Subscription)

#### `getMembershipPlans`
멤버십 상품 목록을 조회합니다.

```typescript
import { getMembershipPlans } from "@/app/actions/subscription-actions";

const plans = await getMembershipPlans();

// 반환값
Array<{
  id: string;
  name: string;
  price: number;
  interval: "MONTH" | "YEAR";
  talismans_per_period: number;
  features: object;
  is_active: boolean;
}>
```

---

#### `getSubscriptionStatus`
현재 구독 상태를 조회합니다.

```typescript
import { getSubscriptionStatus } from "@/app/actions/subscription-actions";

const status = await getSubscriptionStatus();

// 반환값
{
  isSubscribed: boolean;
  subscription: Subscription | null;
  plan: MembershipPlan | null;
}
```

---

#### `createBillingAuthUrl`
구독 결제를 위한 빌링키 발급 URL을 생성합니다.

```typescript
import { createBillingAuthUrl } from "@/app/actions/subscription-actions";

const result = await createBillingAuthUrl(planId: string);

// 반환값
{
  success: boolean;
  authUrl?: string;       // 사용자를 리디렉션할 Toss Payments URL
  customerKey?: string;   // 고객 고유 키
  error?: string;
}
```

---

#### `cancelSubscription`
구독을 해지합니다.

```typescript
import { cancelSubscription } from "@/app/actions/subscription-actions";

const result = await cancelSubscription(reason?: string);

// 반환값
{
  success: boolean;
  error?: string;
}
```

**참고**: 해지 후에도 현재 결제 기간 종료까지 서비스 이용 가능

---

#### `reactivateSubscription`
해지된 구독을 재활성화합니다.

```typescript
import { reactivateSubscription } from "@/app/actions/subscription-actions";

const result = await reactivateSubscription();

// 반환값
{
  success: boolean;
  error?: string;
}
```

---

## Supabase Database Functions

### `get_user_balance`
사용자의 부적 잔액을 조회합니다.

```sql
SELECT get_user_balance(user_id UUID) -> INTEGER
```

---

### `deduct_wallet_balance`
부적을 차감합니다.

```sql
SELECT deduct_wallet_balance(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
) -> BOOLEAN
```

---

### `add_wallet_balance`
부적을 추가합니다.

```sql
SELECT add_wallet_balance(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT
) -> BOOLEAN
```

---

## Database Schema

### 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `profiles` | 사용자 프로필 |
| `family_members` | 가족 구성원 |
| `wallets` | 사용자 지갑 (부적 잔액) |
| `wallet_transactions` | 지갑 거래 내역 |
| `analysis_history` | 분석 이력 |
| `subscriptions` | 구독 정보 |
| `subscription_payments` | 구독 결제 내역 |
| `membership_plans` | 멤버십 상품 |
| `feature_costs` | 기능별 비용 설정 |

### RLS (Row Level Security)

모든 테이블에 RLS가 활성화되어 있습니다:
- 사용자는 자신의 데이터만 조회/수정 가능
- `service_role` 키로만 전체 접근 가능

---

## Webhook Endpoints

### `/api/webhooks/toss`
Toss Payments 결제 웹훅을 처리합니다.

```typescript
// POST /api/webhooks/toss
// Content-Type: application/json

{
  eventType: "PAYMENT_CONFIRMED" | "PAYMENT_FAILED" | "BILLING_KEY_DELETED";
  data: { ... }
}
```

---

## Error Codes

| 코드 | 메시지 | 설명 |
|------|--------|------|
| `UNAUTHORIZED` | 로그인이 필요합니다 | 인증되지 않은 요청 |
| `INSUFFICIENT_BALANCE` | 부적이 부족합니다 | 잔액 부족 |
| `INVALID_PAYMENT` | 결제 정보가 올바르지 않습니다 | 결제 검증 실패 |
| `SUBSCRIPTION_NOT_FOUND` | 구독 정보를 찾을 수 없습니다 | 구독 없음 |
| `AI_ERROR` | AI 분석 중 오류가 발생했습니다 | Gemini API 오류 |

---

## Rate Limits

- 분당 최대 60회 요청
- AI 분석: 분당 10회
- 결제 관련: 분당 5회

---

## 버전 정보

- **현재 버전**: v1.0.0
- **최종 업데이트**: 2026-01-23
- **Next.js**: 15.x
- **Supabase**: Latest
