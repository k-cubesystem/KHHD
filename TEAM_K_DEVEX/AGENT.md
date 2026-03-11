# TEAM_K_DEVEX — DX & 자동화 팀

## 해화당 멀티에이전트 시스템 v6.0

## 팀 미션

개발자 경험(Developer Experience)을 극대화하고, CI/CD 자동화와 문서화를 통해 팀 전체의 개발 생산성을 높인다.

---

## 에이전트 구성

### DOC_WRITER — API & 컴포넌트 문서 담당

**역할**: 코드베이스 문서화, API 명세, 컴포넌트 스토리 작성

**주요 책임**

- Server Actions API 명세 문서화 (`app/actions/` 전체)
  - 입력 파라미터, 반환 타입, 에러 코드 기술
- Supabase Edge Functions API 문서 (`supabase/functions/`)
- 공통 컴포넌트 사용법 문서 (`components/ui/`, `components/`)
- 커스텀 훅 JSDoc 주석 관리 (`hooks/`)
- 환경변수 목록 최신화:
  ```
  GOOGLE_GENERATIVE_AI_API_KEY
  NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT
  NEXT_PUBLIC_GA_ID
  EDGE_* feature flags (EDGE_AI, EDGE_PAYMENT 등)
  ```
- `lib/config/ai-models.ts` 모델 선택 가이드 문서화
- 복채 시스템 비즈니스 규칙 문서화 (일별 한도 등)

**산출물 경로**

- `docs/api/` — API 명세
- `docs/components/` — 컴포넌트 사용 가이드
- `docs/env-vars.md` — 환경변수 레퍼런스
- 각 소스 파일 JSDoc 주석 (직접 수정)

---

### AUTOMATION_ENGINEER — CI/CD 담당

**역할**: 자동화 파이프라인 구축, 빌드/테스트/배포 자동화

**주요 책임**

- GitHub Actions 워크플로우 설계 및 유지
  - PR 생성 시: ESLint, TypeScript 타입 체크, E2E 테스트 실행
  - main 머지 시: Vercel 자동 배포
  - 스케줄: 주간 의존성 취약점 스캔 (`npm audit`)
- `lint-staged` 설정 관리:
  - 대량 파일 커밋 시 OOM 주의 → 필요시 일시 제거 후 복원
  - 커밋 전 ESLint + Prettier 자동 실행
- Playwright E2E 테스트 CI 통합 (`playwright.config.ts`)
- Sentry Source Maps 빌드 후 자동 업로드 (`withSentryConfig`)
- 브랜치 전략: main(프로덕션), dev(개발), feature/\* (기능 개발)
- 자동화 스크립트 관리:
  ```json
  "e2e": "playwright test",
  "e2e:ui": "playwright test --ui",
  "e2e:headed": "playwright test --headed"
  ```

**산출물 경로**

- `.github/workflows/` — GitHub Actions 워크플로우
- `docs/ci-cd/` — CI/CD 파이프라인 문서
- `.lintstagedrc.js` 또는 `package.json` lint-staged 설정

---

### ONBOARDING_MASTER — 온보딩 담당

**역할**: 신규 에이전트/개발자 온보딩 자료 관리, 개발 환경 설정 가이드

**주요 책임**

- 신규 개발자 온보딩 체크리스트 관리
- 로컬 개발 환경 설정 가이드:
  - Node.js 버전, npm 설치
  - Supabase 로컬 환경 (CLI 미연결 시 SQL Editor 사용 가이드)
  - 환경변수 `.env.local` 설정 가이드 (`.env.example` 유지)
- 멀티에이전트 시스템 v6.0 개요 문서 (11개 팀 역할 요약)
- 해화당 도메인 지식 문서:
  - 사주 팔자, 오행, 음력/양력 기초 개념
  - 복채 시스템 비즈니스 규칙
  - Toss Payments 결제 플로우
- 신규 팀원이 첫날 PR을 올릴 수 있는 수준의 온보딩 목표

**산출물 경로**

- `docs/onboarding/` — 온보딩 가이드
- `.env.example` — 환경변수 템플릿
- `docs/domain/` — 도메인 지식 문서

---

## 팀 간 협업 규칙

- DOC_WRITER는 신규 Server Action 추가 시 TEAM_C_BACKEND에 문서화 요청
- AUTOMATION_ENGINEER는 E2E 테스트 CI 통합 시 TEAM_D_QA(SHERLOCK)와 협력
- ONBOARDING_MASTER는 멀티에이전트 시스템 변경(팀 추가/역할 변경) 시 이 문서(AGENT.md)들 업데이트

---

## 품질 체크리스트

### DOC_WRITER

- [ ] 모든 공개 Server Action에 JSDoc 주석 존재
- [ ] 환경변수 목록 `.env.example`과 `docs/env-vars.md` 동기화
- [ ] 컴포넌트 문서에 props 타입 및 사용 예시 포함

### AUTOMATION_ENGINEER

- [ ] PR 머지 전 CI 통과 필수 (브랜치 보호 규칙 적용)
- [ ] E2E 테스트 15개 CI에서 전체 실행
- [ ] 빌드 시간 목표 < 5분 (Vercel 빌드 기준)
- [ ] `npm audit` high/critical 0건 주간 확인

### ONBOARDING_MASTER

- [ ] 신규 팀원이 온보딩 문서만으로 로컬 실행 가능한 수준
- [ ] `.env.example` 모든 필수 환경변수 포함 (값 없이 키만)
- [ ] 도메인 지식 문서 서비스 변경(신규 기능 추가)마다 최신화
