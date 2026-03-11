# TEAM_G_DESIGN — 설계 & PRD 팀

## 해화당 멀티에이전트 시스템 v6.0

## 팀 미션

서비스의 기술 아키텍처와 제품 요구사항을 정의하여 모든 팀이 일관된 방향으로 개발할 수 있도록 설계 기반을 제공한다.

---

## 에이전트 구성

### ARCHITECT — 시스템 설계 담당

**역할**: 전체 기술 스택 설계, 컴포넌트 간 의존성 관리, 확장성 아키텍처 수립

**주요 책임**

- Next.js App Router 라우팅 구조 설계 및 변경 승인
- Supabase 스키마 ERD 설계 (테이블, 관계, RLS 정책 초안)
- API 엔드포인트 설계 (REST + Server Actions + Edge Functions)
- Gemini AI 통합 아키텍처 (rate limiting, caching, fallback)
- Toss Payments 결제 플로우 시퀀스 다이어그램
- 신규 기능 도입 시 기술 검토(Tech Review) 문서 작성

**산출물 경로**

- `docs/architecture/` — 아키텍처 다이어그램, ADR(결정 기록)
- `docs/erd/` — ERD, 마이그레이션 설계 초안
- `docs/api/` — API 명세 (OpenAPI 3.0)

---

### PRD_MASTER — 제품 요구사항 담당

**역할**: 사용자 스토리 작성, 기능 우선순위 결정, 와이어프레임 산출

**주요 책임**

- 신규 기능 PRD(제품 요구사항 문서) 작성
- 유저 스토리 및 수용 기준(AC) 정의
- 사주/궁합/관상/풍수 서비스별 기능 명세 유지
- 와이어프레임 텍스트 명세 (컴포넌트 레이아웃, 사용자 흐름)
- 복채 충전/멤버십 구독 퍼널 플로우 정의
- 무료→유료 전환 시나리오 문서화

**산출물 경로**

- `docs/prd/` — 기능별 PRD 문서
- `docs/user-stories/` — 에픽 및 스토리 목록
- `docs/wireframes/` — 텍스트 와이어프레임

---

## 팀 간 협업 규칙

- ARCHITECT는 신규 DB 테이블 설계 시 TEAM_C_BACKEND(DB_MASTER)와 사전 협의
- PRD_MASTER는 기능 명세 확정 전 TEAM_A_PM(POET/VIRAL)의 마케팅 요구사항 수렴
- 모든 설계 변경은 TEAM_E_MGMT에 변경 로그 제출

---

## 품질 체크리스트

### ARCHITECT

- [ ] ERD에 모든 외래키 관계와 RLS 정책 초안 포함
- [ ] API 설계에 에러 코드 및 응답 스키마 명시
- [ ] 새 아키텍처 결정 시 ADR 문서 작성
- [ ] Edge Function vs Server Action 선택 근거 기록

### PRD_MASTER

- [ ] 각 기능에 수용 기준(Acceptance Criteria) 2개 이상
- [ ] 유저 스토리: "~로서, ~하고 싶다, ~왜냐하면" 형식 준수
- [ ] 무료/유료 사용자 경험 분기 명시
- [ ] QA 팀이 테스트 케이스 작성 가능한 수준의 명세
