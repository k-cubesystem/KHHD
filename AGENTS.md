# 해화당 멀티에이전트 Claude Code 시스템 v6.0

## 시스템 개요

해화당 프로젝트를 위한 11개 전문 팀 구조. 각 팀은 독립적 책임 영역을 갖되 정해진 워크플로우에 따라 협력한다.

---

## 팀 구조

### T-7 TEAM_G — 설계 & PRD

**역할**: ARCHITECT, PRD_MASTER
**책임**:

- 신규 기능의 기술 아키텍처 설계 및 PRD 작성
- 시스템 전체 의존성 분석, 인터페이스 정의
- DB 스키마 초안, API 계약서, 컴포넌트 트리 설계
  **산출물 위치**: `docs/architecture/`, `docs/prd/`
  **핵심 규칙**: 모든 신규 기능은 PRD 승인 없이 개발 착수 불가. 설계 변경 시 영향받는 모든 팀에 통보 필수.

---

### T-8 TEAM_H — 보안

**역할**: SEC_ARCHITECT, PENTESTER, COMPLIANCE
**책임**:

- 배포 전 보안 게이트 심사 (필수)
- 인증/인가, RLS 정책, API 취약점 점검
- OWASP Top10 기준 침투 테스트, CSP·환경변수 감사
- 개인정보처리방침·이용약관 컴플라이언스 검토
  **산출물 위치**: `docs/security/`
  **핵심 규칙**: 보안 게이트 통과 없이 프로덕션 배포 금지. 결제·사용자 데이터 변경 시 자동 트리거.

---

### T-1 TEAM_A — PM & 기획

**역할**: POET, VIRAL
**책임**:

- 로드맵 우선순위 관리, 스프린트 계획
- 사용자 여정 설계, 바이럴·리텐션 전략 수립
- MEMORY.md 업데이트, 팀 간 의존성 조율
  **산출물 위치**: `docs/roadmap/`, `MEMORY.md`
  **핵심 규칙**: 우선순위 변경 시 TEAM_G와 동기화. 바이럴 기능은 TEAM_H 컴플라이언스 검토 후 출시.

---

### T-2 TEAM_B — 프론트엔드

**역할**: FE_LOGIC, FE_VISUAL, PERF_HACKER
**책임**:

- Next.js App Router 컴포넌트 구현 (`app/`, `components/`)
- Shadcn/ui + Tailwind 기반 UI, Framer Motion 애니메이션
- Core Web Vitals 최적화, 번들 사이즈·이미지 최적화
- E2E 테스트 시나리오 검증 (`e2e/`)
  **산출물 위치**: `app/`, `components/`, `hooks/`, `public/`
  **핵심 규칙**: 기본 UI는 CSS transition, 분석 페이지만 Framer Motion 허용. 신규 패키지 추가 시 PERF_HACKER 승인 필수.

---

### T-3 TEAM_C — 백엔드

**역할**: BE_SYSTEM, DB_MASTER, DATA_OPS, FIN_OPS
**책임**:

- 서버 액션(`app/actions/`), Edge Functions(`supabase/functions/`) 구현
- Supabase RLS 정책, 마이그레이션, 인덱스 관리
- Gemini AI 통합, 프롬프트 엔지니어링
- 결제(Toss), 복채 시스템, 구독 로직
  **산출물 위치**: `app/actions/`, `supabase/`, `lib/`
  **핵심 규칙**: 모든 DB 변경은 마이그레이션 파일로 관리(`supabase/migrations/`). 결제 로직은 FIN_OPS 단독 담당, 변경 시 TEAM_H 보안 검토 의무.

---

### T-4 TEAM_D — QA & 배포

**역할**: SRE_MASTER, SHERLOCK, FIN_OPS
**책임**:

- Playwright E2E 테스트 실행 및 회귀 방지
- CI/CD 파이프라인 관리, 배포 게이트 운영
- Sentry 모니터링, 알림 설정, 인시던트 대응
- 결제 플로우 정합성 최종 검증
  **산출물 위치**: `e2e/`, `.github/workflows/`
  **핵심 규칙**: E2E 전체 통과 + TEAM_H 보안 게이트 통과 후에만 배포 허용. 프로덕션 장애 시 SHERLOCK이 RCA(근본원인분석) 문서 작성.

---

### T-5 TEAM_E — 팀 관리

**역할**: TEAM_MANAGER
**책임**:

- 팀 간 블로커 해소, 리소스 배분 조율
- 작업 진행 상황 추적, MEMORY.md 최종 관리
- 기술 부채 백로그 관리, 스프린트 회고
  **산출물 위치**: `MEMORY.md`, `docs/retrospectives/`
  **핵심 규칙**: 팀 간 의견 충돌 시 최종 조정권 보유. 작업 완료 시 MEMORY.md 업데이트 책임.

---

### T-6 TEAM_F — 스킬 & AI

**역할**: ALCHEMIST
**책임**:

- AI 모델 선택·프롬프트 최적화(`lib/config/ai-models.ts`)
- 새로운 AI 기능 프로토타이핑 (관상, 풍수, 사주 등)
- Gemini API 비용 최적화, 캐싱 전략
- Claude Code 커스텀 스킬 개발
  **산출물 위치**: `lib/config/`, `lib/utils/analysis-cache.ts`, `.claude/`
  **핵심 규칙**: PRO 모델(고비용)은 핵심 분석에만 사용, 나머지는 FLASH. 프롬프트 변경 시 A/B 테스트 결과 첨부.

---

### T-9 TEAM_I — 코드 리뷰

**역할**: CODE_REVIEWER, DEBT_HUNTER, REFACTOR_LEAD
**책임**:

- 모든 PR 필수 리뷰 게이트 운영
- 코드 품질, 타입 안전성, 패턴 일관성 검토
- 기술 부채 식별 및 리팩터링 계획 수립
- ESLint·TypeScript 오류 없음 확인
  **산출물 위치**: PR 리뷰 코멘트, `docs/debt/`
  **핵심 규칙**: PR 승인 없이 main 브랜치 머지 금지. DEBT_HUNTER가 부채 점수 50 초과 시 즉시 리팩터링 스프린트 요청.

---

### T-10 TEAM_J — 데이터 & BI

**역할**: PIPELINE, BI_ANALYST, AB_SCIENTIST
**책임**:

- Google Analytics, Sentry, Supabase 데이터 파이프라인 구축
- 관리자 모니터링 대시보드(`app/admin/monitoring/`) 유지보수
- A/B 테스트 설계·분석 (페이월, 넛지 모달 등)
- 사용자 행동 분석, 전환율 리포트
  **산출물 위치**: `app/admin/monitoring/`, `docs/analytics/`
  **핵심 규칙**: 개인식별정보(PII) 수집 시 TEAM_H 컴플라이언스 검토 의무. A/B 테스트 결과는 TEAM_A 의사결정에 반영.

---

### T-11 TEAM_K — DX & 자동화

**역할**: DOC_WRITER, AUTOMATION_ENGINEER, ONBOARDING_MASTER
**책임**:

- 개발 환경 설정 자동화, lint-staged·husky 관리
- 신규 팀원 온보딩 가이드 작성
- 반복 작업 스크립트화(`package.json` 스크립트, Makefile)
- 코드베이스 문서화 (JSDoc, README)
  **산출물 위치**: `docs/onboarding/`, `.github/`, `scripts/`
  **핵심 규칙**: 자동화 스크립트는 TEAM_D 검토 후 CI에 통합. 대량 커밋 시 lint-staged OOM 방지를 위해 일시 우회 가능 (복원 필수).

---

## 팀 간 워크플로우

```
[신규 기능 요청]
       │
       ▼
  T-1 TEAM_A  ── 우선순위 결정, PRD 요청
       │
       ▼
  T-7 TEAM_G  ── 아키텍처 설계, PRD 작성
       │
       ▼
  T-8 TEAM_H  ── 설계 단계 보안 검토 (초기 게이트)
       │
       ▼
 T-2/T-3 개발  ── TEAM_B + TEAM_C 병렬 구현
       │
       ▼
  T-9 TEAM_I  ── PR 코드 리뷰 게이트 (필수)
       │
       ▼
  T-4 TEAM_D  ── E2E 테스트 전체 통과 확인
       │
       ▼
  T-8 TEAM_H  ── 배포 전 보안 게이트 (필수)
       │
       ▼
  T-4 TEAM_D  ── 프로덕션 배포
       │
       ▼
 T-10 TEAM_J  ── 배포 후 지표 모니터링
```

**긴급 핫픽스**: T-4 TEAM_D 승인 하에 보안 게이트 간소화 허용 (사후 T-8 검토 의무).

**결제 관련 변경**: T-3 FIN_OPS → T-8 보안 검토 → T-4 배포 (중간 단계 생략 불가).
