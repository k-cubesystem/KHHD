# ARCH-design-overhaul: 시스템 아키텍처

버전: v1.0 | 작성: TEAM_G | 날짜: 2026-03-31

---

## 1. 아키텍처 개요

### 변경 범위 다이어그램

```
                   ┌──────────────────┐
                   │    Landing Page   │
                   │  ★ 미니 리딩 추가  │
                   │  ★ 소셜 프루프    │
                   └────────┬─────────┘
                            │
                   ┌────────▼─────────┐
                   │    Auth Wall      │
                   │  (기존 유지)       │
                   └────────┬─────────┘
                            │
              ┌─────────────▼──────────────┐
              │      Main Dashboard         │
              │  ★ 데일리 포춘 카드 (최상단) │
              │    MasterpieceSection        │
              │    Studio Grid (2col)        │
              │    Theme Grid (2col)         │
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │     Analysis Result          │
              │  ★ 블러 프리미엄 섹션        │
              │  ★ 카카오 공유 CTA           │
              │  ★ 단일 페이월 CTA           │
              └─────────────┬──────────────┘
                            │
              ┌─────────────▼──────────────┐
              │     Error Boundaries         │
              │  ★ 전 라우트 그룹 커버리지    │
              └────────────────────────────┘

외부 의존성:
  [카카오 JS SDK] ←→ [공유 컴포넌트]
  [GA4 SDK]       ←→ [이벤트 트래킹]
```

---

## 2. 기술 스택 선정

| 레이어          | 기술                         | 선정 이유                                   |
| --------------- | ---------------------------- | ------------------------------------------- |
| 카카오 공유     | Kakao JavaScript SDK v2      | 리치 미리보기 카드 지원, 한국 앱 de-facto   |
| 이벤트 트래킹   | GA4 (gtag.js)                | 이미 CSP에 허용, @next/third-parties 설치됨 |
| 클라이언트 사주 | lib/domain/saju/saju.ts      | 순수 함수, 서버 없이 계산 가능              |
| 스켈레톤 UI     | Shadcn Skeleton              | 이미 설치된 UI 라이브러리                   |
| 블러 효과       | CSS backdrop-filter: blur()  | 네이티브, 제로 번들 비용                    |
| 에러 바운더리   | Next.js error.tsx convention | 프레임워크 내장, 추가 의존성 없음           |

### 추가 의존성

```
devDependencies: 없음
dependencies:
  - 없음 (카카오 SDK는 script tag로 로드)
```

**번들 영향**: 카카오 SDK ~25KB (lazy load), GA4 ~20KB (이미 로드됨) → 실질 추가 0KB

---

## 3. 컴포넌트 설계

### 신규 컴포넌트

```
components/
├── landing/
│   └── ★ mini-reading-section.tsx     ← 미니 리딩 (클라이언트 전용)
├── analysis/
│   └── ★ daily-fortune-card.tsx       ← 대시보드 데일리 카드
├── shared/
│   ├── ★ blur-premium-section.tsx     ← 블러 프리미엄 래퍼
│   └── ★ kakao-share-button.tsx       ← 카카오 SDK 공유 버튼
├── providers/
│   └── ★ kakao-sdk-provider.tsx       ← SDK 초기화 + 컨텍스트
└── error/
    └── ★ route-error-boundary.tsx     ← 재사용 에러 UI 컴포넌트
```

### 수정 컴포넌트

```
수정 파일:
├── app/page.tsx                        ← 미니 리딩 + 소셜 프루프 추가
├── components/analysis/AnalysisDashboard.tsx  ← 데일리 카드 삽입
├── components/share/viral-share-button.tsx     ← 카카오 SDK 통합
├── components/shared/paywall-modal.tsx         ← 단일 CTA 리디자인
├── app/protected/analysis/error.tsx    ← 신규
├── app/protected/studio/error.tsx      ← 신규
├── app/protected/fortune/error.tsx     ← 신규
├── app/protected/membership/error.tsx  ← 신규
└── lib/config/design-tokens.ts         ← 시맨틱 컬러 추가
```

### 컴포넌트 상세 설계

#### mini-reading-section.tsx

```typescript
// 서버 액션 없음 — 순수 클라이언트 계산
interface MiniReadingResult {
  animal: string // 띠 (12지)
  element: string // 오행 (목화토금수)
  dayMaster: string // 일간
  personality: string // 성격 한 줄
}

// getSajuData(year, month, day, hour) → 4주 8자 → 띠+오행+일간 추출
// lib/domain/saju/saju.ts의 기존 함수 활용
// hour는 null (시간 미입력)
```

#### daily-fortune-card.tsx

```typescript
interface DailyFortuneCardProps {
  userId: string
  userName: string
}

// 기존 DailyFortuneView에서 요약 추출
// - 서버 액션: getDailyFortune(userId) 호출
// - 캐시: React Query staleTime 30분
// - 스트릭: 출석 시스템 (attendance_logs) 연동
// - 스켈레톤: Shadcn Skeleton 3줄
```

#### blur-premium-section.tsx

```typescript
interface BlurPremiumSectionProps {
  children: ReactNode
  isLocked: boolean
  featureKey: string // 복채 비용 조회용
  onUnlock: () => void // 결제 모달 열기
}

// CSS: position: relative + 자식에 filter: blur(8px)
// 오버레이: absolute + gradient + CTA 버튼
```

#### kakao-share-button.tsx

```typescript
interface KakaoShareProps {
  title: string
  description: string
  imageUrl: string // OG 이미지 URL
  webUrl: string // 공유 링크
  buttonTitle?: string // CTA 텍스트
}

// Kakao.Link.sendDefault({
//   objectType: 'feed',
//   content: { title, description, imageUrl, link: { webUrl, mobileWebUrl } },
//   buttons: [{ title: buttonTitle, link: { webUrl, mobileWebUrl } }]
// })
```

---

## 4. 데이터 모델

### 기존 테이블 활용 (변경 없음)

- `attendance_logs`: 연속 접속 스트릭 카운터
- `analysis_history`: 분석 결과 (블러/언락 상태 판별)
- `wallets`: 복채 잔고 (블러 언락 비용)
- `feature_costs`: 기능별 복채 비용

### 신규 테이블: 없음

모든 데이터는 기존 테이블로 충분.

### 로컬 상태

```typescript
// localStorage
'haehwadang:mini-reading-last' // 마지막 미니 리딩 결과 캐시
'haehwadang:streak-animation' // 스트릭 애니메이션 표시 여부
```

---

## 5. API 설계 원칙

### 신규 API: 없음

모든 기능이 기존 서버 액션 + 클라이언트 계산으로 구현 가능.

### 기존 API 활용

| 기능        | 서버 액션                | 위치                              |
| ----------- | ------------------------ | --------------------------------- |
| 데일리 포춘 | `generateDailyFortune()` | app/actions/fortune/daily.ts      |
| 출석 스트릭 | `getAttendanceStatus()`  | app/actions/payment/attendance.ts |
| 복채 비용   | `getFeatureCost()`       | app/actions/payment/wallet.ts     |
| 미니 리딩   | 클라이언트 전용          | lib/domain/saju/saju.ts           |
| OG 이미지   | GET `/api/og`            | app/api/og/route.tsx              |

### 외부 SDK

#### 카카오 JS SDK

```
로드: <script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js">
초기화: Kakao.init(NEXT_PUBLIC_KAKAO_JS_KEY)
공유: Kakao.Share.sendDefault({...})
```

- **로딩**: dynamic import, 공유 버튼 클릭 시 lazy load
- **CSP**: `script-src`에 `t1.kakaocdn.net` 이미 허용됨
- **환경변수**: `NEXT_PUBLIC_KAKAO_JS_KEY` (클라이언트 노출 OK)

#### GA4

```
이미 설정됨: @next/third-parties GoogleAnalytics
이벤트 추가만 필요:
  gtag('event', 'share_kakao', { content_type, item_id })
  gtag('event', 'mini_reading', { animal, element })
  gtag('event', 'daily_fortune_view', { streak })
  gtag('event', 'paywall_impression', { feature_key })
  gtag('event', 'paywall_click', { action: 'unlock' })
```

---

## 6. 데이터 흐름 (주요 유스케이스별)

### UC-01: 미니 리딩 (비회원)

```
[Landing Page]
    │
    ▼ 생년월일 입력
[클라이언트 getSajuData(year, month, day, null)]
    │ 순수 함수 — 서버 호출 없음
    ▼
[결과: 띠 + 오행 + 성격 1줄]
    │
    ▼ "전체 사주풀이 보기" 클릭
[/auth/signup → /protected/analysis]
```

### UC-02: 데일리 포춘 카드

```
[Dashboard Mount]
    │
    ▼ React Query: getDailyFortune(userId)
[서버] daily.ts → Gemini Flash → 캐시 24h
    │
    ▼ 결과 (요약 1-2줄)
[DailyFortuneCard 렌더링]
    │
    ├─ 스트릭: getAttendanceStatus() → 연속 일수
    └─ "자세히 보기" → /protected/analysis/today
```

### UC-03: 카카오톡 공유

```
[분석 결과 페이지 하단]
    │
    ▼ "카카오톡 공유" 클릭
[KakaoShareButton]
    │
    ├─ SDK 미로드 → lazy load kakao.min.js (~25KB)
    ├─ Kakao.Share.sendDefault({
    │    objectType: 'feed',
    │    content: { title, description, imageUrl, link }
    │  })
    │
    ▼ 카카오톡 앱에서 리치 카드 표시
[수신자] → 카드 클릭 → /share/[token] → 가입 유도
```

### UC-04: 블러 프리미엄

```
[분석 결과 렌더링]
    │
    ├─ 무료 섹션 (1-2개): 정상 렌더링
    │
    └─ 프리미엄 섹션: BlurPremiumSection 래핑
        │
        ├─ isLocked=true → blur(8px) + 오버레이
        │    └─ "잠금 해제" 클릭 → PaywallModal (단일 CTA)
        │
        └─ isLocked=false → 정상 렌더링
```

---

## 7. 확장성 & 보안 고려사항

### 보안

- 카카오 JS SDK 키: `NEXT_PUBLIC_*` 접두사 (클라이언트 노출 의도)
  - 키 자체는 도메인 제한 설정 (카카오 개발자 콘솔)
- 미니 리딩: 클라이언트 전용, 민감 데이터 전송 없음
- 블러: CSS 전용 — 서버에서 프리미엄 데이터 자체를 미전송하는 옵션 검토
  - **Phase 1**: CSS blur (빠른 구현, 개발자 도구로 우회 가능)
  - **Phase 2**: 서버에서 프리미엄 섹션 미전송 (완전 보호)
- 공유 토큰: 기존 share_token 메커니즘 활용

### 성능

- 카카오 SDK: lazy load (공유 버튼 클릭 시)
- 데일리 포춘: React Query 30분 캐시 + 서버 24h 캐시
- 미니 리딩: 0ms 응답 (클라이언트 순수 함수)
- 블러: CSS transform (GPU 가속, 0 JS 비용)
- 에러 바운더리: 번들 사이즈 영향 없음 (프레임워크 내장)

### 확장성

- 카카오 SDK → 추후 미니앱 전환 시 동일 키 재활용
- GA4 이벤트 → 추후 A/B 테스트 기반 제공
- 블러 시스템 → 추후 구독 티어별 공개 섹션 수 조절
- 데일리 카드 → 추후 푸시 알림 연동 (Web Push API)

---

## 8. 기술 부채 & 향후 개선 항목

| 항목                   | 현재 상태                       | 개선 방향                       | 우선순위 |
| ---------------------- | ------------------------------- | ------------------------------- | -------- |
| 블러 CSS 전용          | 개발자 도구로 우회 가능         | 서버에서 프리미엄 데이터 미전송 | P2       |
| ReviewMarquee 하드코딩 | 20개 가짜 리뷰                  | 실제 리뷰 DB + 관리자 승인      | P3       |
| 애니메이션 혼재        | Framer Motion + CSS @keyframes  | 하나로 통일 (CSS 우선)          | P3       |
| 타이포 스케일 미정의   | 파일별 ad-hoc                   | design-tokens.ts에 체계화       | Phase 3  |
| 데스크탑 뷰            | max-w-[480px] 고정              | 태블릿/데스크탑 적응형          | 장기     |
| 인스타그램 스토리 공유 | 미구현                          | Canvas → 이미지 → 공유          | P3       |
| Web Push               | 미구현 (sw-register.tsx만 존재) | FCM 연동                        | 장기     |

---

## 9. 파일 변경 영향도 매트릭스

| 파일                                          | 변경 유형  | Phase | 영향 범위       |
| --------------------------------------------- | ---------- | ----- | --------------- |
| `app/page.tsx`                                | 수정       | 1     | 랜딩 페이지     |
| `components/landing/mini-reading-section.tsx` | 신규       | 1     | 랜딩            |
| `components/analysis/daily-fortune-card.tsx`  | 신규       | 1     | 대시보드        |
| `components/analysis/AnalysisDashboard.tsx`   | 수정       | 1     | 대시보드        |
| `components/shared/kakao-share-button.tsx`    | 신규       | 1     | 결과 페이지     |
| `components/providers/kakao-sdk-provider.tsx` | 신규       | 1     | 앱 전역         |
| `components/share/viral-share-button.tsx`     | 수정       | 1     | 공유 다이얼로그 |
| `lib/kakao-sdk.ts`                            | 신규       | 1     | SDK 유틸리티    |
| `components/shared/blur-premium-section.tsx`  | 신규       | 2     | 결과 페이지     |
| `components/shared/paywall-modal.tsx`         | 수정       | 2     | 페이월          |
| `app/protected/*/error.tsx`                   | 신규 (4개) | 2     | 에러 처리       |
| `components/error/route-error-boundary.tsx`   | 신규       | 2     | 공용 에러 UI    |
| `lib/config/design-tokens.ts`                 | 수정       | 3     | 디자인 시스템   |
| `tailwind.config.ts`                          | 수정       | 3     | 전체 스타일     |

---

_작성: TEAM_G (ARCHITECT) | 날짜: 2026-03-31_
