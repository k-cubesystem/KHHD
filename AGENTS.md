# 🏢 멀티 에이전트 시스템 — 시스템 헌법

> **이 파일을 반드시 먼저 읽으세요**
> 버전: v5.0 | 2026.02.25 | 팀: 11개 | 에이전트: 25개

---

## 📐 전체 구조

```
GUIDE.md       ← ★★★ 모든 대화 최우선 (CEO 가이드)
AGENTS.md      ← ★★  시스템 헌법 (이 파일)
PRIME.md       ← ★   CTO 철학 & 4중 프로토콜
CHANGELOG.md   ← 📜  시스템 진화 이력
│
MEMORY/
  MEMORY.md       ← 프로젝트 컨텍스트 (세션 간 유지)
  DECISION_LOG.md ← 의사결정 기록 (왜 이렇게 됐는지)
│
TEAM_G_DESIGN/    🏗️  ARCHITECT · PRD_MASTER
TEAM_H_SECURITY/  🔐  SEC_ARCHITECT · PENTESTER · COMPLIANCE
TEAM_A_PM/        🧭  POET · VIRAL
TEAM_B_FRONTEND/  🎨  FE_LOGIC · FE_VISUAL · PERF_HACKER
TEAM_C_BACKEND/   ⚙️  BE_SYSTEM · DB_MASTER · DATA_OPS · FIN_OPS
TEAM_D_QA/        🔍  SRE_MASTER · SHERLOCK · FIN_OPS(인프라)
TEAM_E_MGMT/      🗂️  팀 관리 & 운영
TEAM_F_SKILLS/    🧰  ALCHEMIST
TEAM_I_REVIEW/    🔬  CODE_REVIEWER · DEBT_HUNTER · REFACTOR_LEAD
TEAM_J_DATA/      📊  PIPELINE_ENGINEER · BI_ANALYST · AB_SCIENTIST
TEAM_K_DEVEX/     ⚡  DOC_WRITER · AUTOMATION_ENGINEER · ONBOARDING_MASTER ★NEW
│
SHARED/
  CONVENTIONS.md  STACK.md  TEAM_STATUS.md  SKILL_REGISTRY.md
```

---

## 🤖 팀 전체 구성표

| 팀 | 이름 | 핵심 역할 | 에이전트 | 터미널 | 작업 시점 |
|---|---|---|---|---|---|
| G | 설계 & PRD | 모든 것의 출발점 | ARCHITECT · PRD_MASTER | T-7 | **제일 먼저** |
| H | 보안 | 설계+배포 전 필수 게이트 | SEC_ARCHITECT · PENTESTER · COMPLIANCE | T-8 | 설계 후 / 배포 전 |
| A | PM & 기획 | 티켓 · SEO · 카피 | POET · VIRAL | T-1 | 설계 후 |
| B | 프론트엔드 | UI · 상태 · 성능 | FE_LOGIC · FE_VISUAL · PERF_HACKER | T-2 | 개발 |
| C | 백엔드 | API · DB · 비용 · 분석 | BE_SYSTEM · DB_MASTER · DATA_OPS · FIN_OPS | T-3 | 개발 |
| D | QA & 배포 | 테스트 · 배포 · 인프라 | SRE_MASTER · SHERLOCK · FIN_OPS | T-4 | 개발 후 |
| E | 팀 관리 | 전체 조율 · 현황 | — | T-5 | 상시 |
| F | 스킬 & AI | LLM · RAG · 프롬프트 | ALCHEMIST | T-6 | 상시 |
| I | 코드 리뷰 | PR리뷰 · 기술부채 · 리팩토링 | CODE_REVIEWER · DEBT_HUNTER · REFACTOR_LEAD | T-9 | 개발 중/후 |
| J | 데이터 & BI | KPI · 파이프라인 · A/B | PIPELINE · BI_ANALYST · AB_SCIENTIST | T-10 | 런치 후 |
| K | DX & 자동화 | 문서 · CI/CD · 온보딩 | DOC_WRITER · AUTOMATION · ONBOARDING | T-11 | 상시 ★NEW |

---

## 🔗 전체 흐름도 (v5.0)

```
CEO 요청
   │
   ▼
🧭 GUIDE  ← 모든 대화 최우선
   │
   ▼
👑 PRIME (4중 프로토콜: UX + 상용화 + 보안 + 품질)
   │
   ├─ 🏗️ T-7 설계      ← 시작점 (PRD + 아키텍처)
   │      ↓
   ├─ 🔐 T-8 보안검토   ← 위협 모델링
   │      ↓
   ├─ ⚡ T-11 DX 설정   ← CI/CD + 문서화 초기 설정
   │      ↓
   ├─ 🧭 T-1 기획/티켓  ← 스프린트 계획
   │      ↓
   ├─ 🎨 T-2 프론트  ┐  ← 병렬 개발
   ├─ ⚙️ T-3 백엔드  ┘
   │      ↓
   ├─ 🔬 T-9 코드리뷰  ← PR 머지 전 필수
   │      ↓
   ├─ 🔐 T-8 보안게이트 ← 배포 전 필수
   │      ↓
   ├─ 🔍 T-4 배포       ← 테스트 → 스테이징 → 프로덕션
   │      ↓
   ├─ 📊 T-10 데이터분석 ← KPI 모니터링 (런치 후)
   │
   ├─ 🗂️ T-5 팀 관리    ← 상시
   ├─ 🧰 T-6 스킬/AI    ← 상시
   └─ ⚡ T-11 DX/문서   ← 상시
```

---

## 📋 공통 규칙

### 파일 읽기 순서
```
1. GUIDE.md              ← 최우선
2. AGENTS.md             ← 이 파일
3. PRIME.md              ← 4중 프로토콜
4. MEMORY/MEMORY.md      ← 프로젝트 컨텍스트
5. 자신의 AGENT.md
6. SHARED/CONVENTIONS.md
7. 작업 수행
8. 작업 후 MEMORY.md 업데이트
```

### 절대 원칙
```
🚫 TEAM_G 설계 없이 개발 시작 금지
🚫 TEAM_I 코드 리뷰 없이 PR 머지 금지
🚫 TEAM_H 보안 승인 없이 프로덕션 배포 금지
🚫 console.log 단독 에러 처리 금지
🚫 any 타입 사용 금지
🚫 캐싱 없는 중복 API 호출 금지
✅ 작업 완료 시 MEMORY.md + TEAM_STATUS.md 업데이트 필수
✅ 중요 결정 시 DECISION_LOG.md 기록 필수
```

### 팀 간 파일 프로토콜
| 유형 | 경로 |
|---|---|
| PRD | `TEAM_G_DESIGN/prd/PRD-[이름]-v1.md` |
| 아키텍처 | `TEAM_G_DESIGN/architecture/ARCH-[이름]-v1.md` |
| 보안 취약점 | `TEAM_H_SECURITY/reports/VULN-NNN-TEAM_X.md` |
| 티켓 | `TEAM_A_PM/tickets/TICKET-NNN-TEAM_X.md` |
| 코드 리뷰 | `TEAM_I_REVIEW/reviews/REVIEW-NNN-TEAM_X.md` |
| 기술 부채 | `TEAM_I_REVIEW/debt/DEBT-REGISTER.md` |
| 버그 | `TEAM_D_QA/bugs/BUG-NNN-TEAM_X.md` |
| 데이터 리포트 | `TEAM_J_DATA/reports/DATA-REPORT-YYYYMMDD.md` |
| 스킬 | `TEAM_F_SKILLS/registry/SKILL-[이름].md` |
| 의사결정 | `MEMORY/DECISION_LOG.md` |
| 프로젝트 기억 | `MEMORY/MEMORY.md` |

### 명령어 전체 목록
| 명령어 | 담당 | 동작 |
|---|---|---|
| `/guide [요청]` | GUIDE | 분석 + 팀 배정 + 지시문 생성 |
| `/design [아이디어]` | T-7 | PRD + 아키텍처 설계 |
| `/security [대상]` | T-8 | OWASP 보안 점검 |
| `/review [대상]` | T-9 | 코드 리뷰 + 기술부채 등록 |
| `/data [질문]` | T-10 | 데이터 분석 + 대시보드 |
| `/docs [대상]` | T-11 | 문서 자동 생성 |
| `/sprint [목표]` | T-1 | 스프린트 계획 수립 |
| `/build [목표]` | 전팀 | Production-ready 코드 |
| `/audit` | T-8+T-9 | 보안+성능+비용+품질 전체 진단 |
| `/scale` | T-3+T-4 | 대규모 트래픽 리팩토링 |
| `/skill [이름]` | T-6 | 스킬 조회·개발 |
| `/status` | T-5 | 전체 팀 현황 대시보드 |

---

## 🚀 터미널 시작 명령어

```bash
# 형식: GUIDE.md → PRIME.md → TEAM AGENT.md

claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_G_DESIGN/AGENT.md)"   # T-7  설계
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_H_SECURITY/AGENT.md)" # T-8  보안
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_A_PM/AGENT.md)"       # T-1  기획
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_B_FRONTEND/AGENT.md)" # T-2  프론트
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_C_BACKEND/AGENT.md)"  # T-3  백엔드
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_D_QA/AGENT.md)"       # T-4  QA/배포
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_E_MGMT/AGENT.md)"     # T-5  관리
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_F_SKILLS/AGENT.md)"   # T-6  AI
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_I_REVIEW/AGENT.md)"   # T-9  리뷰
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_J_DATA/AGENT.md)"     # T-10 데이터
claude --system-prompt "$(cat GUIDE.md) $(cat PRIME.md) $(cat TEAM_K_DEVEX/AGENT.md)"    # T-11 DX
```

---

*버전: v5.0 | 2026.02.25 | 팀: 11개 | 에이전트: 25개*
