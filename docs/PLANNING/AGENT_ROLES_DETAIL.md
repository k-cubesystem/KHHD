# 🕵️ AGENT ROLE SPECIFICATION & ALLOCATION
> **Focus**: Debugging, Prompt Engineering, and Testing Strategy

사용자의 요청에 따라 **디버깅(Debugging)**, **프롬프트 설계(Prompt Engineering)**, **테스트(Testing)** 기능을 명확히 분배하고 강화한 **Ver 2.0 팀 구조**입니다.

---

## 1. 🗺️ Enhanced Team Topology (구조도)

```text
USER (Result Consumer)
│
└── 👑 CLAUDE (Project Manager & Orchestrator)
    │
    ├── 📚 SKILL MASTER (Resource Provider)
    │
    ├── [Development Squad]
    │   ├── 🎨 FE_VISUAL (UI/UX)
    │   ├── ⚙️ FE_LOGIC (Client Logic)
    │   └── 🛡️ BE_SYSTEM (Server/DB)
    │
    ├── [AI & Logic Squad]
    │   └── 🔮 AI_ALCHEMIST (Prompt Engineer & AI Tuner) ✨ NEW!
    │       └─ Focus: LLM Prompting, Context Optimization, JSON Schema Design
    │
    └── [Quality & Stability Squad]
        └── 🕵️ SHERLOCK_QA (Debugger & Tester) ⚡ RENAMED!
            └─ Focus: Error Tracing, Test Automation, Performance Auditing
```

---

## 2. 🧩 Detailed Role Breakdown (상세 기능 명세)

### A. 🔮 AI_ALCHEMIST (프롬프트 설계 전담)
> **"The Prompt Wizard"**
> 기존 백엔드에서 분리되어, 해화당 프로젝트의 핵심인 **AI 운세 분석**을 전담합니다.

- **🎯 주요 임무 (Mission)**:
  - **프롬프트 엔지니어링**: 운세/사주/관상 분석용 시스템 프롬프트(System Prompt) 설계 및 최적화.
  - **JSON 스키마 설계**: AI 응답을 정형 데이터(Structured Data)로 받기 위한 스키마 정의.
  - **Context 관리**: AI에게 주입할 사용자 정보(생년월일 등)와 지식 베이스(도학 이론) 최적화.
- **🛠️ 사용 스킬 (Skills)**:
  - `Skill_Prompt_Design`: Few-shot prompting, Chain-of-Thought 기법.
  - `Skill_LLM_Tuning`: Temperature, Top-P 파라미터 튜닝.
- **✅ 테스트 책임**:
  - AI 응답의 일관성 테스트 (Prompt Regression Test).
  - 환각(Hallucination) 방지 테스트.

---

### B. 🕵️ SHERLOCK_QA (디버깅 & 테스트 전담)
> **"The Bug Hunter"**
> 단순 TC 수행을 넘어, **에러의 원인을 역추적(Root Cause Analysis)**하고 시스템 안정성을 검증합니다.

- **🎯 주요 임무 (Mission)**:
  - **심층 디버깅 (Deep Debugging)**: 로그 분석, 스택 트레이스 추적, 동시성 이슈(Concurrency) 해결.
  - **테스트 자동화**: E2E(Playwright), 통합 테스트(Integration), 유닛 테스트 시나리오 작성.
  - **성능 부하 테스트**: 트래픽 급증 시 시스템 거동 확인.
- **🛠️ 사용 스킬 (Skills)**:
  - `Skill_Debug_Protocol`: 로그 기반 역추적 기법, 브라우저 DevTools 활용법.
  - `Skill_Test_Automation`: Playwright 스크립트 작성, CI/CD 파이프라인.
- **✅ 테스트 책임**:
  - **전체 시스템의 E2E 테스트**.
  - 배포 전 최종 품질 승인(Gatekeeper).

---

### C. 🛡️ BE_SYSTEM (서버 & DB 시스템)
> **"The Infrastructure Architect"**

- **🎯 주요 임무 (Mission)**:
  - API 설계 및 구현 (Next.js Server Actions).
  - 데이터베이스 스키마 및 보안 정책(RLS) 관리.
  - 인증(Auth) 및 결제 시스템 연동.
- **🛠️ 사용 스킬 (Skills)**:
  - `Skill_DB_Optimize`: 인덱싱, 정규화, 쿼리 최적화.
  - `Skill_Security_Ops`: JWT 핸들링, SQL Injection 방지.
- **✅ 테스트 책임**:
  - API 엔드포인트 테스트.
  - DB 무결성 테스트.

---

### D. 🎨 FE_VISUAL & ⚙️ FE_LOGIC (프론트엔드 듀오)

- **FE_VISUAL**: 화면에 보이는 모든 것(CSS, Animation)을 담당. **"Visual Regression Test"** 책임.
- **FE_LOGIC**: 화면 뒤의 로직(State, Hook)을 담당. **"Component Unit Test"** 책임.

---

## 3. ⚖️ Role Distribution Analysis (배분 확인)

사용자께서 우려하신 부분에 대한 검증 결과입니다.

| 기능 영역 | 담당 에이전트 | 설명 | 평가 |
| :--- | :--- | :--- | :--- |
| **디버깅 (Debugging)** | **🕵️ SHERLOCK_QA** | 개발자가 놓친 **엣지 케이스**와 **복합 에러**를 전문적으로 추적합니다. 개발 에이전트(FE/BE)는 본인 코드의 1차 디버깅을 하지만, 해결되지 않는 난해한 버그는 SHERLOCK에게 이관됩니다. | ⭐ **강화됨** |
| **프롬프트 설계** | **🔮 AI_ALCHEMIST** | 일반 백엔드 개발과 분리하여, **AI 응답 품질**만을 집중 관리하는 전문가를 두었습니다. 이는 AI 서비스인 해화당에 필수적입니다. | ⭐ **최적화됨** |
| **테스트 (Testing)** | **🕵️ SHERLOCK_QA** <br>(Total) <br> + **Development Squad** (Unit) | **테스트 주도 개발(TDD)** 가능. 개발 에이전트는 단위 테스트를 작성하고, SHERLOCK은 이를 통합하여 검증합니다. | ⭐ **균형 잡힘** |

---

## 4. 🔄 Workflow Example: "운세 프롬프트가 이상하게 작동할 때"

1.  **감지**: 사용자가 "운세 결과가 너무 짧아요"라고 리포트.
2.  **할당 (Claude)**: **🔮 AI_ALCHEMIST**에게 문제 분석 요청.
3.  **분석 (AI_ALCHEMIST)**: "프롬프트의 `max_token` 설정이 너무 낮거나, 시스템 프롬프트의 지시가 명확하지 않음." -> **프롬프트 수정**.
4.  **검증 요청**: "수정했으니 **🕵️ SHERLOCK_QA**, 테스트 부탁해."
5.  **검증 (SHERLOCK_QA)**: 자동화 스크립트로 100회 요청 보내 응답 길이 분포 확인 -> **PASS**.
6.  **배포**: 반영 완료.

이 구조는 각 에이전트가 자신의 **전문 분야(Specialty)**에 집중하면서도, **SKILL MASTER**를 통해 공통된 기술 표준을 준수하도록 보장합니다.
