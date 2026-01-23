# 🤖 Claude 작업 지시서 - Phase 14

**작성일**: 2026-01-23  
**작성자**: Gemini 3 Pro  
**수신**: Claude (최신 모델)

---

## 📋 작업 개요

Gemini가 **디자인 시스템 확장 및 컴포넌트 리팩토링 기획**을 완료했습니다.  
Claude는 아래 **1번, 4번 작업**을 실행해 주세요.

---

## 🎯 1번: 새로운 기능 개발

### 목표
AI 개운 솔루션 고도화 및 새로운 분석 기능 추가

### 작업 상세

#### 1-1. 관상 분석 정확도 향상
**파일**: `app/actions/face-analysis.ts`

**현재 상태**:
- Gemini Vision API로 얼굴 이미지 분석
- 기본적인 관상학적 특징 추출

**개선 사항**:
1. **프롬프트 엔지니어링 고도화**
   ```typescript
   const prompt = `
   당신은 30년 경력의 관상학 전문가입니다.
   아래 얼굴 이미지를 분석하여 다음 항목을 정확히 평가하세요:
   
   1. 이목구비 균형 (10점 만점)
   2. 오관(五官) 분석: 귀, 눈썹, 눈, 코, 입
   3. 삼정(三停): 상정(이마), 중정(눈~코), 하정(입~턱)
   4. 피부 찰색(察色): 기색, 혈색
   5. 종합 운세: 재물운, 건강운, 인연운
   
   JSON 형식으로 응답하세요.
   `;
   ```

2. **멀티모달 분석 강화**
   - 얼굴 + 손금 이미지 동시 분석
   - 교차 검증으로 정확도 향상

3. **결과 신뢰도 점수 추가**
   ```typescript
   interface FaceAnalysisResult {
     features: FacialFeatures;
     fortune: FortunePrediction;
     confidence: number; // 0-100
     recommendations: string[];
   }
   ```

---

#### 1-2. 대운(大運) 그래프 시각화
**파일**: `components/saju/daeun-chart.tsx` (신규)

**요구사항**:
1. **Recharts 라이브러리 사용**
   ```bash
   npm install recharts
   ```

2. **10년 단위 대운 표시**
   ```tsx
   import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
   
   const data = [
     { age: '0-9', fortune: 60, element: '木' },
     { age: '10-19', fortune: 75, element: '火' },
     { age: '20-29', fortune: 85, element: '土' },
     // ...
   ];
   
   <LineChart data={data}>
     <Line type="monotone" dataKey="fortune" stroke="#D4AF37" strokeWidth={3} />
   </LineChart>
   ```

3. **오행 색상 매핑**
   - 木: #4A7C59 (Green)
   - 火: #C07055 (Red)
   - 土: #C5B358 (Gold)
   - 金: #E5E3DF (Silver)
   - 水: #4A5D7C (Blue)

---

#### 1-3. 가족 궁합 매트릭스
**파일**: `app/protected/family/compatibility-matrix/page.tsx` (신규)

**요구사항**:
1. **히트맵 스타일 매트릭스**
   ```tsx
   // 예시 데이터
   const matrix = [
     { person1: '아버지', person2: '어머니', score: 85, relation: '부부' },
     { person1: '아버지', person2: '나', score: 72, relation: '부자' },
     // ...
   ];
   ```

2. **점수별 색상 그라데이션**
   - 90-100: `bg-green-500` (매우 좋음)
   - 70-89: `bg-zen-gold` (좋음)
   - 50-69: `bg-yellow-500` (보통)
   - 0-49: `bg-red-500` (주의)

3. **클릭 시 상세 분석 모달**
   - 궁합 점수 상세 설명
   - 개선 방안 제시

---

#### 1-4. lunar-javascript 연동 강화
**파일**: `lib/saju/manse.ts`

**현재 상태**:
- 기본적인 만세력 계산만 구현

**개선 사항**:
1. **정확한 절입 시간 계산**
   ```typescript
   import { Solar, Lunar } from 'lunar-javascript';
   
   export function getAccurateSolarTerms(year: number) {
     // 24절기 정확한 시간 계산
     const solarTerms = [];
     for (let month = 1; month <= 12; month++) {
       const solar = Solar.fromYmd(year, month, 1);
       const jieqi = solar.getJieQi();
       solarTerms.push(jieqi);
     }
     return solarTerms;
   }
   ```

2. **시주(時柱) 정확도 향상**
   - 자정(23:00-01:00) 경계 처리
   - 일광절약시간(DST) 고려

---

## 🎯 4번: 문서 작성/업데이트

### 목표
개발자 온보딩 및 사용자 가이드 완성

### 작업 상세

#### 4-1. API 문서화
**파일**: `docs/API_REFERENCE.md` (신규)

**구조**:
```markdown
# API Reference

## Server Actions

### 사주 분석
- `analyzeSaju(birthData: BirthData): Promise<SajuResult>`
- `getTodayFortune(userId: string): Promise<DailyFortune>`

### 결제
- `createPayment(amount: number): Promise<PaymentResult>`
- `verifyPayment(orderId: string): Promise<boolean>`

### 멤버십
- `subscribeMembership(planId: string): Promise<Subscription>`
- `cancelSubscription(subscriptionId: string): Promise<void>`

## Supabase RPC Functions

### get_user_balance
**설명**: 사용자의 부적 잔액 조회
**파라미터**: `user_id UUID`
**반환**: `INTEGER`

### deduct_talisman
**설명**: 부적 차감
**파라미터**: `user_id UUID, amount INTEGER`
**반환**: `BOOLEAN`
```

**요구사항**:
- 모든 Server Action 100% 커버
- 파라미터 타입 명시
- 예시 코드 포함

---

#### 4-2. 컴포넌트 가이드
**파일**: `docs/COMPONENT_GUIDE.md` (신규)

**구조**:
```markdown
# Component Guide

## UX Pro Max 적용 예시

### Button with Shimmer
\`\`\`tsx
import { Button } from "@/components/ui/button";

<Button variant="default">
  시작하기
</Button>
\`\`\`

### Card with Depth
\`\`\`tsx
import { Card } from "@/components/ui/card";

<Card depth="high" hoverable>
  <CardHeader>제목</CardHeader>
  <CardContent>내용</CardContent>
</Card>
\`\`\`

### Animated Page
\`\`\`tsx
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

<motion.div variants={staggerContainer} initial="initial" animate="animate">
  <motion.h1 variants={fadeInUp}>제목</motion.h1>
  <motion.p variants={fadeInUp}>내용</motion.p>
</motion.div>
\`\`\`
```

**요구사항**:
- 20개 이상 컴포넌트 예시
- Before/After 비교
- 스크린샷 포함 (선택)

---

#### 4-3. 사용자 가이드
**파일**: `docs/USER_GUIDE.md` (업데이트)

**추가 내용**:
1. **멤버십 가입 절차**
   - 스크린샷: 멤버십 페이지
   - 단계별 설명
   - FAQ

2. **부적 충전 방법**
   - 결제 수단 안내
   - 충전 금액별 혜택
   - 환불 정책

3. **사주 분석 해석 가이드**
   - 용어 설명 (천간, 지지, 오행)
   - 결과 읽는 법
   - 활용 방법

---

#### 4-4. 개발자 온보딩
**파일**: `docs/DEVELOPER_ONBOARDING.md` (신규)

**구조**:
```markdown
# Developer Onboarding

## 1. 로컬 환경 설정

### 필수 요구사항
- Node.js 18+
- npm 9+
- Git

### 설치 단계
\`\`\`bash
git clone https://github.com/your-org/haehwadang.git
cd haehwadang
npm install
\`\`\`

### 환경 변수 설정
\`\`\`bash
cp .env.example .env.local
\`\`\`

필수 환경 변수:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `TOSS_SECRET_KEY`

## 2. Supabase 마이그레이션

\`\`\`bash
npx supabase db reset
npx supabase db push
\`\`\`

## 3. 개발 서버 실행

\`\`\`bash
npm run dev
\`\`\`

## 4. 배포 프로세스

### Vercel 배포
1. GitHub 연동
2. 환경 변수 설정
3. `git push` 시 자동 배포

### 환경 변수 체크리스트
- [ ] Supabase URL/Key
- [ ] Gemini API Key
- [ ] Toss Payments Secret
- [ ] Vercel Analytics
```

---

## 📝 작업 완료 체크리스트

### 1번: 새로운 기능 개발
- [ ] 관상 분석 프롬프트 개선
- [ ] 대운 그래프 컴포넌트 생성
- [ ] 가족 궁합 매트릭스 페이지
- [ ] lunar-javascript 연동 강화
- [ ] 빌드 테스트 성공

### 4번: 문서 작성
- [ ] API_REFERENCE.md 작성
- [ ] COMPONENT_GUIDE.md 작성 (20개 이상 예시)
- [ ] USER_GUIDE.md 업데이트
- [ ] DEVELOPER_ONBOARDING.md 작성

---

## 🚀 작업 완료 후

1. **MISSION_LOG.md 업데이트**
   ```markdown
   ## ✅ Phase 14: UX Pro Max 리팩토링 (Completed)
   - [x] 디자인 시스템 확장 (Gemini)
   - [x] 컴포넌트 리팩토링 (Gemini)
   - [x] AI 기능 고도화 (Claude)
   - [x] 문서 작성 (Claude)
   ```

2. **PHASE14_COMPLETION.md 작성**
   - 작업 내용 요약
   - 스크린샷 첨부
   - 빌드 상태 보고

3. **Gemini에게 보고**
   - 완료된 작업 목록
   - 발견된 이슈
   - 다음 단계 제안

---

## 💡 참고 사항

### 기존 파일 위치
- Server Actions: `app/actions/*.ts`
- Components: `components/**/*.tsx`
- Lib: `lib/**/*.ts`
- Docs: `docs/*.md`

### 코딩 스타일
- TypeScript strict mode
- ESLint + Prettier
- Tailwind CSS (UX Pro Max 표준 적용)
- Framer Motion (애니메이션)

### 테스트
- 로컬 빌드: `npm run build`
- 타입 체크: `npm run type-check`
- Lint: `npm run lint`

---

**작성자**: Gemini 3 Pro  
**작업 시작**: Claude 확인 후 즉시  
**예상 소요 시간**: 3-4시간
