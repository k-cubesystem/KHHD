# API Reference

해화당 프로젝트의 모든 Server Actions와 API 엔드포인트를 문서화합니다.

**작성일**: 2026-02-03
**버전**: 1.0.0

---

## 목차

- [사주 분석](#사주-분석)
- [가족 관리](#가족-관리)
- [궁합 분석](#궁합-분석)
- [일일 운세](#일일-운세)
- [AI 기능](#ai-기능)
- [결제 시스템](#결제-시스템)
- [멤버십](#멤버십)
- [지갑 (부적)](#지갑-부적)
- [초대 시스템](#초대-시스템)
- [알림](#알림)

---

## 사주 분석

### `analyzeSajuDetail`

**파일**: `app/actions/ai-saju.ts`

사주 상세 분석을 수행합니다.

**파라미터**:
```typescript
interface BirthData {
  name: string;
  birthDate: string;      // YYYY-MM-DD
  birthTime?: string;     // HH:mm
  calendarType: 'solar' | 'lunar';
  gender: 'male' | 'female';
}

analyzeSajuDetail(birthData: BirthData): Promise<SajuResult>
```

**반환값**:
```typescript
interface SajuResult {
  pillars: {
    year: { heavenly: string; earthly: string };
    month: { heavenly: string; earthly: string };
    day: { heavenly: string; earthly: string };
    time?: { heavenly: string; earthly: string };
  };
  analysis: string;       // AI 생성 분석 결과
  elements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
}
```

**사용 예시**:
```typescript
import { analyzeSajuDetail } from "@/app/actions/ai-saju";

const result = await analyzeSajuDetail({
  name: "홍길동",
  birthDate: "1990-01-01",
  birthTime: "14:30",
  calendarType: "solar",
  gender: "male"
});

console.log(result.pillars); // 사주 사주(四柱)
console.log(result.analysis); // AI 분석 결과
```

---

### `startFateAnalysis`

**파일**: `app/actions/analysis-actions.ts`

천지인 통합 분석을 시작합니다 (관상, 손금 포함).

**파라미터**:
```typescript
startFateAnalysis(formData: FormData): Promise<void>
```

**FormData 필드**:
- `memberId`: string (필수) - 가족 구성원 ID
- `homeAddress`: string (선택) - 거주지 주소
- `faceImage`: File (선택) - 얼굴 사진
- `handImage`: File (선택) - 손금 사진

**사용 예시**:
```typescript
import { startFateAnalysis } from "@/app/actions/analysis-actions";

const formData = new FormData();
formData.append("memberId", "member-123");
formData.append("homeAddress", "서울시 강남구");
formData.append("faceImage", faceFile);

await startFateAnalysis(formData);
// 분석이 완료되면 /protected/history로 리다이렉트
```

---

## 가족 관리

### `getFamilyMembers`

**파일**: `app/actions/family-actions.ts`

현재 사용자의 모든 가족 구성원을 조회합니다.

**파라미터**: 없음

**반환값**:
```typescript
interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  birth_date: string;
  birth_time: string | null;
  calendar_type: 'solar' | 'lunar';
  gender: 'male' | 'female';
  created_at: string;
}

getFamilyMembers(): Promise<FamilyMember[]>
```

**사용 예시**:
```typescript
import { getFamilyMembers } from "@/app/actions/family-actions";

const members = await getFamilyMembers();
console.log(`총 ${members.length}명의 가족 구성원`);
```

---

### `addFamilyMember`

가족 구성원을 추가합니다.

**파라미터**:
```typescript
addFamilyMember(formData: FormData): Promise<void>
```

**FormData 필드**:
- `name`: string (필수)
- `relationship`: string (필수)
- `birth_date`: string (필수) - YYYY-MM-DD
- `birth_time`: string (선택) - HH:mm 또는 "unknown"
- `calendar_type`: "solar" | "lunar" (필수)
- `gender`: "male" | "female" (필수)

**사용 예시**:
```typescript
const formData = new FormData();
formData.append("name", "홍길동");
formData.append("relationship", "아들");
formData.append("birth_date", "2010-05-15");
formData.append("birth_time", "09:30");
formData.append("calendar_type", "solar");
formData.append("gender", "male");

await addFamilyMember(formData);
```

---

### `updateFamilyMember`

가족 구성원 정보를 수정합니다.

**파라미터**:
```typescript
updateFamilyMember(id: string, formData: FormData): Promise<void>
```

**사용 예시**:
```typescript
await updateFamilyMember("member-123", formData);
```

---

### `deleteFamilyMember`

가족 구성원을 삭제합니다.

**파라미터**:
```typescript
deleteFamilyMember(id: string): Promise<void>
```

**사용 예시**:
```typescript
await deleteFamilyMember("member-123");
```

---

## 궁합 분석

### `calculateCompatibility`

**파일**: `app/actions/compatibility-actions.ts`

두 사람의 궁합을 분석합니다.

**파라미터**:
```typescript
interface CompatibilityRequest {
  person1: BirthData;
  person2: BirthData;
}

calculateCompatibility(data: CompatibilityRequest): Promise<CompatibilityResult>
```

**반환값**:
```typescript
interface CompatibilityResult {
  score: number;          // 0-100
  analysis: string;       // AI 생성 분석
  strengths: string[];    // 강점
  challenges: string[];   // 주의사항
  advice: string;        // 조언
}
```

**사용 예시**:
```typescript
import { calculateCompatibility } from "@/app/actions/compatibility-actions";

const result = await calculateCompatibility({
  person1: {
    name: "홍길동",
    birthDate: "1990-01-01",
    calendarType: "solar",
    gender: "male"
  },
  person2: {
    name: "김영희",
    birthDate: "1992-05-15",
    calendarType: "solar",
    gender: "female"
  }
});

console.log(`궁합 점수: ${result.score}점`);
```

---

### `createCompatibilityInvite`

궁합 분석 초대 코드를 생성합니다.

**반환값**:
```typescript
createCompatibilityInvite(): Promise<{
  success: boolean;
  inviteCode?: string;
  error?: string;
}>
```

**사용 예시**:
```typescript
const { success, inviteCode } = await createCompatibilityInvite();
if (success) {
  console.log(`초대 코드: ${inviteCode}`);
  // 공유 링크: /invite/${inviteCode}
}
```

---

## 일일 운세

### `generateDailyFortune`

**파일**: `app/actions/daily-fortune.ts`

사용자의 오늘 운세를 생성합니다.

**파라미터**:
```typescript
generateDailyFortune(userId: string, birthData: BirthData): Promise<DailyFortune>
```

**반환값**:
```typescript
interface DailyFortune {
  date: string;           // YYYY-MM-DD
  overallScore: number;   // 0-100
  fortune: string;        // 종합 운세
  wealth: number;         // 재물운 (0-5)
  love: number;           // 애정운 (0-5)
  health: number;         // 건강운 (0-5)
  career: number;         // 직업운 (0-5)
  luckyColor: string;
  luckyNumber: number;
  advice: string;
}
```

**사용 예시**:
```typescript
import { generateDailyFortune } from "@/app/actions/daily-fortune";

const fortune = await generateDailyFortune(userId, birthData);
console.log(`오늘의 총운: ${fortune.overallScore}점`);
console.log(`행운의 색: ${fortune.luckyColor}`);
```

---

### `getTodayFortune`

**파일**: `app/actions/ai-saju.ts`

간단한 생년월일로 오늘의 운세를 조회합니다.

**파라미터**:
```typescript
getTodayFortune(birthDate: string): Promise<string>
```

**사용 예시**:
```typescript
const fortune = await getTodayFortune("1990-01-01");
console.log(fortune); // AI 생성 운세 텍스트
```

---

## AI 기능

### `analyzeFaceForDestiny`

**파일**: `app/actions/ai-image.ts`

관상 분석을 수행합니다.

**파라미터**:
```typescript
type FaceDestinyGoal = 'wealth' | 'love' | 'career' | 'health';

analyzeFaceForDestiny(
  imageBase64: string,
  goal: FaceDestinyGoal
): Promise<FaceAnalysisResult>
```

**반환값**:
```typescript
interface FaceAnalysisResult {
  analysis: string;       // 관상 분석 결과
  score: number;          // 0-100
  recommendations: string[];
  warnings?: string[];
}
```

**사용 예시**:
```typescript
const result = await analyzeFaceForDestiny(base64Image, 'wealth');
console.log(`재물운 점수: ${result.score}점`);
```

---

### `analyzePalm`

손금 분석을 수행합니다.

**파라미터**:
```typescript
analyzePalm(imageBase64: string): Promise<PalmAnalysisResult>
```

**사용 예시**:
```typescript
const result = await analyzePalm(base64Image);
console.log(result.analysis);
```

---

### `analyzeInteriorForFengshui`

풍수지리 인테리어 분석을 수행합니다.

**파라미터**:
```typescript
type InteriorTheme = 'wealth' | 'health' | 'love' | 'career';

analyzeInteriorForFengshui(
  imageBase64: string,
  theme: InteriorTheme,
  roomType: string
): Promise<FengshuiResult>
```

**사용 예시**:
```typescript
const result = await analyzeInteriorForFengshui(
  base64Image,
  'wealth',
  '침실'
);
console.log(result.recommendations);
```

---

### `sendShamanChatMessage`

**파일**: `app/actions/ai-shaman-chat.ts`

AI 역술인과 대화합니다.

**파라미터**:
```typescript
sendShamanChatMessage(
  message: string,
  conversationHistory: ChatMessage[]
): Promise<string>
```

**사용 예시**:
```typescript
const response = await sendShamanChatMessage(
  "올해 재물운이 어떤가요?",
  []
);
console.log(response);
```

---

### `generateDestinyImage`

AI로 개운 이미지를 생성합니다.

**파라미터**:
```typescript
generateDestinyImage(prompt: string): Promise<{
  success: boolean;
  imageUrl?: string;
  error?: string;
}>
```

**사용 예시**:
```typescript
const { imageUrl } = await generateDestinyImage(
  "재물운을 높이는 금빛 용"
);
```

---

## 결제 시스템

### `confirmPayment`

**파일**: `app/actions/payment-actions.ts`

Toss Payments 결제를 승인하고 부적을 충전합니다.

**파라미터**:
```typescript
confirmPayment(
  paymentKey: string,
  orderId: string,
  talismans: number = 1
): Promise<{
  success: boolean;
  error?: string;
}>
```

**사용 예시**:
```typescript
// Toss 결제 위젯 승인 후
const result = await confirmPayment(
  paymentKey,
  orderId,
  10  // 10개 부적 충전
);

if (result.success) {
  console.log("결제 완료!");
}
```

---

## 멤버십

### `getMembershipPlans`

**파일**: `app/actions/subscription-actions.ts`

사용 가능한 모든 멤버십 플랜을 조회합니다.

**반환값**:
```typescript
interface MembershipPlan {
  id: string;
  name: string;           // "무료", "프리미엄", "VIP"
  price: number;
  billingInterval: 'month' | 'year';
  features: string[];
  limits: {
    dailyTalismans: number;
    relationships: number;
    resultStorage: number;
  };
}

getMembershipPlans(): Promise<MembershipPlan[]>
```

**사용 예시**:
```typescript
const plans = await getMembershipPlans();
const premium = plans.find(p => p.name === "프리미엄");
console.log(`가격: ${premium.price}원/월`);
```

---

### `getSubscriptionStatus`

현재 사용자의 구독 상태를 조회합니다.

**반환값**:
```typescript
getSubscriptionStatus(): Promise<{
  active: boolean;
  planId?: string;
  planName?: string;
  expiresAt?: string;
  autoRenew?: boolean;
}>
```

**사용 예시**:
```typescript
const status = await getSubscriptionStatus();
if (status.active) {
  console.log(`${status.planName} 구독 중`);
  console.log(`만료일: ${status.expiresAt}`);
}
```

---

### `createBillingAuthUrl`

정기 결제 인증 URL을 생성합니다.

**파라미터**:
```typescript
createBillingAuthUrl(planId: string): Promise<{
  success: boolean;
  authUrl?: string;
  error?: string;
}>
```

**사용 예시**:
```typescript
const { authUrl } = await createBillingAuthUrl("premium-monthly");
window.location.href = authUrl; // Toss 인증 페이지로 이동
```

---

## 지갑 (부적)

### `getWalletBalance`

**파일**: `app/actions/wallet-actions.ts`

사용자의 부적 잔액을 조회합니다.

**반환값**:
```typescript
getWalletBalance(): Promise<number>
```

**사용 예시**:
```typescript
const balance = await getWalletBalance();
console.log(`보유 부적: ${balance}개`);
```

---

### `deductTalisman`

부적을 차감합니다.

**파라미터**:
```typescript
deductTalisman(
  amount: number,
  reason: string
): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}>
```

**사용 예시**:
```typescript
const result = await deductTalisman(1, "사주 분석");
if (result.success) {
  console.log(`남은 부적: ${result.newBalance}개`);
}
```

---

### `addTalismans`

부적을 충전합니다.

**파라미터**:
```typescript
addTalismans(
  amount: number,
  source: 'purchase' | 'membership' | 'admin'
): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}>
```

**사용 예시**:
```typescript
await addTalismans(10, 'purchase');
```

---

### `getWalletTransactions`

지갑 거래 내역을 조회합니다.

**파라미터**:
```typescript
getWalletTransactions(limit: number = 50): Promise<Transaction[]>
```

**반환값**:
```typescript
interface Transaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  reason: string;
  balance_after: number;
  created_at: string;
}
```

**사용 예시**:
```typescript
const transactions = await getWalletTransactions(20);
transactions.forEach(tx => {
  console.log(`${tx.created_at}: ${tx.amount}개 (${tx.reason})`);
});
```

---

### `getFeatureCost`

특정 기능의 부적 비용을 조회합니다.

**파라미터**:
```typescript
getFeatureCost(featureKey: string): Promise<number>
```

**사용 예시**:
```typescript
const cost = await getFeatureCost("saju_analysis");
console.log(`사주 분석 비용: ${cost}개 부적`);
```

---

## 초대 시스템

### `createInviteCode`

**파일**: `app/actions/invite-actions.ts`

초대 코드를 생성합니다.

**파라미터**:
```typescript
createInviteCode(userId: string): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}>
```

**사용 예시**:
```typescript
const { code } = await createInviteCode(userId);
console.log(`초대 링크: /invite/${code}`);
```

---

### `getInviterByCode`

초대 코드로 초대자 정보를 조회합니다.

**파라미터**:
```typescript
getInviterByCode(code: string): Promise<{
  success: boolean;
  inviter?: InviteData;
  error?: string;
}>
```

**반환값**:
```typescript
interface InviteData {
  name: string;
  birthDate: string;
  gender: string;
}
```

---

## 알림

### `sendKakaoNotification`

**파일**: `app/actions/notification.ts`

카카오톡 알림을 발송합니다.

**파라미터**:
```typescript
sendKakaoNotification(
  userId: string,
  templateId: string,
  variables: Record<string, string>
): Promise<void>
```

**사용 예시**:
```typescript
await sendKakaoNotification(
  userId,
  "daily_fortune",
  {
    name: "홍길동",
    fortune: "오늘은 좋은 날입니다"
  }
);
```

---

## 멤버십 제한 확인

### `getUserTierLimits`

**파일**: `app/actions/membership-limits.ts`

사용자의 멤버십 등급별 제한을 조회합니다.

**반환값**:
```typescript
getUserTierLimits(): Promise<{
  dailyTalismans: number;
  relationships: number;
  resultStorage: number;
}>
```

---

### `canAddRelationship`

가족 구성원 추가 가능 여부를 확인합니다.

**반환값**:
```typescript
canAddRelationship(): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
}>
```

**사용 예시**:
```typescript
const check = await canAddRelationship();
if (!check.allowed) {
  alert(`제한 초과: ${check.current}/${check.limit}`);
}
```

---

### `canUseTalisman`

부적 사용 가능 여부를 확인합니다 (일일 제한).

**반환값**:
```typescript
canUseTalisman(): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  message?: string;
}>
```

---

## Supabase RPC Functions

### `get_user_balance`

사용자 지갑 잔액 조회 (데이터베이스 함수)

**파라미터**: `user_id UUID`
**반환**: `INTEGER`

**SQL 사용 예시**:
```sql
SELECT get_user_balance('user-uuid-here');
```

---

### `deduct_talisman`

부적 차감 (데이터베이스 함수)

**파라미터**:
- `user_id UUID`
- `amount INTEGER`

**반환**: `BOOLEAN`

**SQL 사용 예시**:
```sql
SELECT deduct_talisman('user-uuid', 1);
```

---

## 에러 처리

모든 Server Actions는 다음 패턴으로 에러를 처리합니다:

```typescript
try {
  // 작업 수행
  return { success: true, data: result };
} catch (error) {
  console.error("Error:", error);
  return { success: false, error: error.message };
}
```

**사용 예시**:
```typescript
const result = await someAction();

if (!result.success) {
  toast.error(result.error);
  return;
}

// 성공 처리
console.log(result.data);
```

---

## 인증 요구사항

대부분의 Server Actions는 인증된 사용자만 호출할 수 있습니다.

```typescript
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  throw new Error("인증된 사용자가 아닙니다.");
}
```

**미인증 시 동작**:
- 에러 발생 또는 빈 배열 반환
- `/auth/sign-up`으로 리다이렉트 (클라이언트에서 처리)

---

## 비용 정보

### 부적 소비 기능

| 기능 | 비용 |
|------|------|
| 사주 분석 | 1개 |
| 궁합 분석 | 1개 |
| 관상 분석 | 1개 |
| 손금 분석 | 1개 |
| 풍수지리 | 1개 |
| AI 역술인 대화 | 0개 (무료) |
| 오늘의 운세 | 0개 (무료) |

---

## 변경 이력

- **2026-02-03**: 초기 문서 작성 (Claude)
- Phase 14 완료 기준

---

**작성자**: Claude Sonnet 4.5
**Gemini 검토**: 대기 중
