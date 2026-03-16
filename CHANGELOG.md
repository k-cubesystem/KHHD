# 📜 CHANGELOG — 시스템 진화 이력

> 이 파일은 멀티 에이전트 시스템 자체의 변경 이력을 기록합니다.
> 관리: TEAM_E_MGMT

---

## v4.1 (2026.02.25) — 현재 버전

### ➕ 추가
- `TEAM_I_REVIEW`: 코드 리뷰 & 기술 부채 전문가 (CODE_REVIEWER · DEBT_HUNTER · REFACTOR_LEAD)
- `TEAM_J_DATA`: 데이터 파이프라인 & BI 전문가 (PIPELINE_ENGINEER · BI_ANALYST · AB_SCIENTIST)
- `MEMORY/MEMORY.md`: 세션 간 프로젝트 컨텍스트 유지 시스템
- `CHANGELOG.md`: 시스템 진화 이력 추적
- `SHARED/CONVENTIONS.md` 대폭 강화: 실전 코딩 규칙 추가
- `PRIME.md` v4.1: 신규 팀 통합, 보안팀 프로토콜 추가
- `GUIDE.md` v4.1: 신규 팀 라우팅 (코드리뷰, 데이터 분석 키워드)

### 🔧 개선
- `setup.sh` v4.1: TEAM_I, TEAM_J 서브에이전트 추가
- `AGENTS.md` v4.1: 10개 팀 / 22개 에이전트로 확장

### 📊 현재 시스템 규모
- 팀: 10개 (G, H, A, B, C, D, E, F, I, J + GUIDE)
- 에이전트: 22개
- 커스텀 명령어: 8개
- 서브에이전트: 10개

---

## v4.0 (2026.02.24)

### ➕ 추가
- `TEAM_H_SECURITY`: 보안 전문가 (SEC_ARCHITECT · PENTESTER · COMPLIANCE)
- `GUIDE.md`: CEO 대화형 가이드 — 모든 대화의 첫 번째 인식
- `AGENTS.md` v4.0: GUIDE + 보안팀 통합
- `setup.sh`: Claude Code 자동 설치 스크립트
- 커스텀 명령어: /security, /guide 추가

---

## v3.1 (2026.02.24)

### ➕ 추가
- `TEAM_G_DESIGN`: 시스템 설계 & PRD 전문가 (ARCHITECT · PRD_MASTER)
- `운영매뉴얼.md`: CEO를 위한 완전 사용 가이드

---

## v3.0 (2026.02.23) — TRINITY INTEGRATED

### ➕ 추가
- `PRIME.md`: CTO 오케스트레이터 파일 분리
- PRIME 15개 에이전트를 6개 팀에 배치
- ZERO-LATENCY 5대 규칙 명문화
- COMMERCIALIZATION 3대 표준 명문화

---

## v2.0 (2026.02.23)

### ➕ 추가
- `TEAM_E_MGMT`: 팀 관리 & 운영 에이전트
- `TEAM_F_SKILLS`: 스킬 관리 에이전트 (ALCHEMIST 포함)
- `SHARED/TEAM_STATUS.md`: 팀 현황 대시보드
- `SHARED/SKILL_REGISTRY.md`: 스킬 레지스트리

---

## v1.0 (2026.02.23) — 최초 생성

- TEAM_A_PM, TEAM_B_FRONTEND, TEAM_C_BACKEND, TEAM_D_QA 4개 팀 구성
- AGENTS.md, SHARED/ 기본 구조 수립

---

*관리: TEAM_E_MGMT | 업데이트 시마다 가장 위에 추가*

---

## v5.1 (2026.02.26) — 토큰 최적화 통합

### ➕ 추가
- `GUIDE.md` v5.1: 토큰 효율 원칙 섹션 추가
  - 토큰 소모 구조 이해 (고정 비용 ~5,000 + 가변 비용)
  - 5가지 낭비 패턴 & 해결책
  - 작업 규모 판단 기준 (소형/중형/대형/초대형)
  - 작업 유형별 최적 로드 파일 가이드
  - 세션 분할 가이드 & 예시
  - 응답 형식에 📊작업규모 + 🔋예상토큰 + ⚡토큰최적화전략 추가

### 🔧 개선
- `.claude/commands/guide.md`: 토큰 예측 + 세션 분할 계획 포함 형식으로 업데이트
- `patch_guide_command.sh`: 기존 설치 환경 패치용 스크립트 추가

### 📊 현재 시스템 규모
- 팀: 11개 | 에이전트: 25개 | 명령어: 12개 | 서브에이전트: 11개

---

## v5.2 (2026.02.26) — GUIDE 토큰 판단 로직 내재화

### 핵심 변경
- `GUIDE.md` v5.2 완전 재작성
  - 토큰 비용 기준표: 파일별/작업별 정확한 수치 내장
  - GUIDE 판단 로직 5단계: 요청 → 규모분류 → 예산계산 → 분할설계 → 지시문생성
  - 세션 가용 공간 계산 (초반 190K → 30턴 후 30K 이하로 감소)
  - 파일 로드 최소화 원칙 (작업 유형별 필요 최소 파일 명시)
  - 세션 간 인수인계 규칙 (어디에 저장하고 어떻게 이어받는지)
  - 실전 예시 3개: 소형/대형/낭비감지
  - 응답 형식에 토큰 breakdown 필수 포함
- `setup.sh` /guide 명령어: 토큰 판단 로직 실행 형식으로 업데이트

### 이전 버전과의 차이
- v5.1: 토큰 관련 "설명 텍스트"만 있었음
- v5.2: GUIDE가 실제 응답할 때 토큰을 계산하고 행동하는 로직 내재화
