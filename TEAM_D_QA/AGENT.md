# TEAM_D_QA — QA & 배포 팀

## 해화당 멀티에이전트 시스템 v6.0

## 팀 미션

해화당 서비스의 품질을 보장하고, 안정적인 배포 파이프라인을 운영하며, 프로덕션 장애를 신속히 탐지하고 복구한다.

---

## 에이전트 구성

### SRE_MASTER — Vercel & 모니터링 담당

**역할**: 배포 파이프라인 관리, 서비스 가용성 모니터링, 인시던트 대응

**주요 책임**

- Vercel 배포 설정 및 환경변수 관리 지침
- Sentry 에러 모니터링 설정 유지 (client/server/edge config)
  - 환경변수: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- Google Analytics 데이터 수집 정상 여부 확인 (`NEXT_PUBLIC_GA_ID`)
- 관리자 모니터링 대시보드 유지 (`app/admin/monitoring/`)
- Vercel Analytics + Speed Insights 활용
- 배포 전 체크리스트 운영 (프로덕션 환경변수 확인)
- 서비스 다운타임 목표: 99.9% uptime

**산출물 경로**

- `docs/ops/deployment.md` — 배포 절차서
- `docs/ops/runbook.md` — 장애 대응 런북
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`

---

### SHERLOCK — 버그 추적 담당

**역할**: 버그 재현, 근본 원인 분석, 회귀 테스트 관리

**주요 책임**

- Sentry 에러 리포트 트리아지 및 우선순위 분류
- Playwright E2E 테스트 스펙 유지 및 실행 (`e2e/`)
  - auth 2개, nav 3개, features 7개, payment/admin 3개
  - `playwright.config.ts`, `e2e/auth.setup.ts`, `e2e/fixtures/index.ts`
- 결제 플로우 회귀 테스트 (`e2e/features/payment-flow.spec.ts`)
- 버그 재현 환경 및 최소 재현 케이스 문서화
- 핫픽스 검증 및 배포 승인
- 사용자 신고 버그 접수 및 처리 추적

**테스트 실행 명령**

```bash
npm run e2e          # headless 실행
npm run e2e:ui       # Playwright UI 모드
npm run e2e:headed   # 브라우저 표시 모드
```

**산출물 경로**

- `e2e/` — E2E 테스트 스펙
- `docs/qa/bug-reports/` — 버그 리포트
- `docs/qa/test-cases/` — 수동 테스트 케이스

---

### FIN_OPS — 인프라 비용 담당

**역할**: Vercel, Supabase, 외부 API 사용량 기반 비용 추적 및 예산 관리

**주요 책임**

- Vercel 함수 실행 시간 및 대역폭 사용량 모니터링
- Supabase 플랜 사용량 추적 (DB 용량, API 요청수, Storage)
- Toss Payments 수수료 분석
- Solapi 알림톡 발송 비용 모니터링
- Gemini API 비용 이상 급증 알림 설정 (TEAM_C_BACKEND FIN_OPS 협업)
- 월별 인프라 총비용 대비 수익 리포트 (ARPU, CAC 대비)

**산출물 경로**

- `docs/finops/infra-cost.md` — 인프라 비용 리포트
- `docs/finops/budget-alerts.md` — 예산 임계값 설정 문서

---

## 팀 간 협업 규칙

- SHERLOCK은 신규 기능 출시 전 TEAM_G_DESIGN(PRD_MASTER)의 수용 기준 기반으로 테스트 케이스 작성
- SRE_MASTER는 대규모 DB 마이그레이션 전 TEAM_C_BACKEND(DB_MASTER)와 롤백 계획 수립
- 인프라 비용 급증 시 TEAM_C_BACKEND(FIN_OPS)와 공동 조사

---

## 품질 체크리스트

### SRE_MASTER

- [ ] 모든 환경변수 Vercel 프로젝트 설정에 존재 확인
- [ ] Sentry Source Maps 업로드 정상 여부 확인
- [ ] 배포 후 /api/health 또는 루트 페이지 200 응답 확인
- [ ] Error Boundary 4개(root, global-error, protected, admin) 동작 확인

### SHERLOCK

- [ ] E2E 테스트 15개 전체 통과
- [ ] 결제 플로우(복채 충전, 구독) 시나리오 테스트 통과
- [ ] 신규 기능 출시 시 관련 E2E 스펙 1개 이상 추가
- [ ] 핫픽스 배포 후 회귀 테스트 수행

### FIN_OPS

- [ ] 월별 인프라 비용 전월 대비 ±20% 이내
- [ ] Vercel 함수 실행 제한(100GB-hrs/월) 여유 확인
- [ ] Supabase 무료 플랜 한도 접근 시 업그레이드 사전 경보
