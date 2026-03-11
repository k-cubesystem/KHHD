# 해화당 멀티에이전트 Claude Code 시스템 v6.0 — CEO 가이드

## 프로젝트 개요

**해화당**: 한국 사주/궁합/관상/풍수 SaaS 플랫폼
**스택**: Next.js 16.1.4 App Router · Supabase · Gemini AI · Toss Payments
**구조**: 11개 팀 / 25개 에이전트

---

## 1. 토큰 최적화 판단 로직 (5단계)

### Step 1: 인텐트 파싱

요청을 받으면 즉시 두 가지를 확인한다.

- **팀**: 어느 팀이 담당하는가? (아래 팀 디스패치 규칙 참조)
- **스코프**: 신규 기능 / 버그픽스 / 리팩토링 / 인프라 중 무엇인가?

### Step 2: 토큰 비용 추정

| 항목                            | 토큰 소모      |
| ------------------------------- | -------------- |
| 파일 1개 로드                   | 600~1,200 토큰 |
| MEMORY.md                       | ~1,500 토큰    |
| GUIDE.md / AGENTS.md / PRIME.md | 각 ~500 토큰   |
| 컨텍스트 윈도우 안전 한계       | 20,000 토큰    |

필요 파일 수를 곱하여 총 비용을 빠르게 추정한다.

### Step 3: 20,000 토큰 초과 시 세션 분할

- 하나의 작업이 추정치를 초과하면 **서브태스크로 분할**한다.
- 각 세션은 독립적으로 완결되도록 설계한다.
- 세션 간 상태는 MEMORY.md에 기록하여 인계한다.

### Step 4: 최소 파일 로드

- 목표 달성에 **직접 필요한 파일만** 로드한다.
- 관련 있어 보여도 수정하지 않을 파일은 로드하지 않는다.
- 디렉터리 구조 파악에는 Glob/Grep을 우선 사용한다.

### Step 5: 명확한 완료 기준으로 실행

작업 시작 전 완료 기준을 명시한다.

- 어떤 파일이 생성/수정되는가?
- 어떤 테스트/빌드가 통과해야 하는가?
- MEMORY.md에 무엇을 기록할 것인가?

---

## 2. 세션 관리 규칙

### 기본 원칙

- **세션당 기능 1개**: 한 세션에 여러 기능을 섞지 않는다.
- **항상 /guide로 시작**: 작업 전 계획을 수립하고 팀을 확인한다.
- **컨텍스트 초기화 금지**: 세션 도중 불필요한 파일 재로드를 삼간다.

### 파일 로드 순서

```
GUIDE.md → AGENTS.md → PRIME.md → memory/MEMORY.md
```

이 순서로 로드하면 프로젝트 맥락을 최소 토큰으로 확보할 수 있다.

### 세션 종료 시 체크리스트

1. 변경사항 커밋 (커밋 메시지: `feat/fix/refactor: 한줄 요약`)
2. MEMORY.md 업데이트 (작업 날짜, 완료 항목, 남은 항목)
3. 다음 세션에 필요한 컨텍스트를 MEMORY.md에 메모

---

## 3. 팀 디스패치 규칙

| 요청 유형                       | 담당 팀             | 예시                                |
| ------------------------------- | ------------------- | ----------------------------------- |
| 사주/궁합/관상/풍수 AI 로직     | **AI팀**            | 프롬프트 수정, 모델 전환, 분석 품질 |
| Gemini API 연동, Edge Functions | **AI팀 / 인프라팀** | invoke-edge, rate-limiter, 캐싱     |
| 결제, 구독, 복채 충전           | **결제팀**          | Toss Payments, 웹훅, 상품 정보      |
| Supabase DB, RLS, 마이그레이션  | **DB팀**            | 테이블 추가, 인덱스, RPC            |
| 사용자 인증, 세션, 미들웨어     | **인증팀**          | Supabase Auth, 관리자 권한          |
| 페이지 UI, 컴포넌트             | **프론트팀**        | Shadcn/ui, Tailwind, Framer Motion  |
| 관리자 대시보드, 모니터링       | **어드민팀**        | Recharts, 통계, 사용자 관리         |
| 알림톡, 이메일, SNS 공유        | **알림팀**          | Solapi, OG 이미지, 레퍼럴           |
| PWA, 성능, SEO                  | **최적화팀**        | SW, next/image, 메타태그            |
| E2E 테스트, 단위 테스트         | **QA팀**            | Playwright, 스펙 작성               |
| CSP, Sentry, 환경변수           | **인프라팀**        | next.config, middleware             |

### 복합 요청 처리

여러 팀에 걸친 요청은 **주 담당 팀**을 먼저 정하고 순차 실행한다.
예: "결제 후 알림톡 발송" → 결제팀 완료 후 → 알림팀 실행

---

## 4. 핵심 경로 참조

```
app/actions/
  ai/          # saju, cheonjiin, compatibility, fortune, image, shaman-chat
  payment/     # wallet, subscription, attendance, products
  user/        # destiny, family, history, referral, free-quota
  admin/       # dashboard, monitoring
  core/        # notification, business-inquiry

lib/
  config/      # ai-models.ts (PRO/FLASH 상수)
  services/    # solapi.ts
  saju-engine/ # woon-calculator, compatibility-engine
  supabase/    # invoke-edge.ts, edge-config.ts
  utils/       # analysis-cache.ts, image.ts

components/
  premium/     # paywall-modal, insufficient-bokchae-modal
  saju/        # knowledge-graph-viewer

supabase/functions/  # 11개 Edge Functions
e2e/                 # Playwright 스펙
```

---

## 5. 주요 규칙 & 주의사항

- **환경변수**: `GOOGLE_GENERATIVE_AI_API_KEY` 단일 사용 (통일 완료)
- **AI 모델**: PRO(`gemini-3.1-pro-preview`) — 사주/궁합/관상/이미지
  FLASH(`gemini-3-flash-preview`) — 채팅/트렌드/운세/일반
- **마이그레이션**: Supabase CLI 미연결 → SQL Editor에서 직접 실행
- **lint-staged**: 대량 파일 커밋 시 OOM 위험 → 임시 비활성화 후 복원
- **복채 한도**: SINGLE 10만/일 · FAMILY 30만/일 · BUSINESS 100만/일
- **Edge Functions**: 기본 비활성 (`EDGE_*=true` 환경변수로 점진 전환)

---

## 6. 현재 남은 로드맵

| ID  | 작업                      | 상태   |
| --- | ------------------------- | ------ |
| E6  | 다국어 i18n (영어/일본어) | 미완료 |

---

_최종 업데이트: 2026-03-11 | 시스템 버전 v6.0_
