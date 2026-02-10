# 🤖 PROJECT ORCHESTRA: Claude Sub-Agent Architecture
> **Mission**: Build the Ultimate Agentic Web Development Team

## 1. 🏛️ Core Philosophy: The Skill-Injection Network
이 시스템은 단순히 역할을 나누는 것을 넘어, 필요한 순간에 **최적의 "스킬(Skill)"**을 주입받아 능력을 극대화하는 **동적 할당 시스템(Dynamic Skill Allocation)**입니다.

- **Central Brain (Claude)**: 전체 프로젝트의 **CTO(Chief Technology Officer)**이자 오케스트레이터입니다.
- **Sub-Agents**: 각 분야의 전문가(Specialist)로, 특정 스킬셋 없이는 제한된 기능만 수행합니다.
- **Skill Master**: 모든 스킬(가이드, 템플릿, 규칙)을 보유한 도서관장입니다. 요청에 따라 에이전트에게 지식을 즉시 전송합니다.

---

## 2. 🌳 The Command Tree Structure

```text
USER (CEO & Visionary)
│
└── 👑 CLAUDE (CTO & Main Orchestrator)
    │
    ├── 📚 SKILL MASTER (Knowledge Repository Manager)
    │   │  ⚡ Skill: Pattern Detection, Knowledge Retrieval, Context Injection
    │   │  📦 Maintains: UI Components, API Designs, SQL Optimization, SEO Guides
    │   └── 🔄 [Injection Protocol] (Injects skills to other agents on demand)
    │
    ├── 🎨 FE_VISUAL (Frontend Visual Director)
    │   │  ⚡ Skill Request: "Need Animation Patterns", "Need Color Theory"
    │   │
    │   ├── 🖌️ UI Artist (Sub: CSS/Tailwind)
    │   │   └─ Focus: Layout, Typography, Responsive Design
    │   │
    │   └── ✨ Motion Choreographer (Sub: Framer Motion)
    │       └─ Focus: Interactions, Transitions, Micro-animations
    │
    ├── ⚙️ FE_LOGIC (Frontend Systems Engineer)
    │   │  ⚡ Skill Request: "Need State Management", "Need Data Fetching"
    │   │
    │   ├── 🧱 Component Architect (Sub: React/Props)
    │   │   └─ Focus: Reusable Components, Props Design, Types
    │   │
    │   └── 🧠 State Manager (Sub: React Query/Zustand)
    │       └─ Focus: Caching, Global State, Performance
    │
    ├── 🛡️ BE_CORE (Backend Systems Architect)
    │   │  ⚡ Skill Request: "Need Auth Flow", "Need DB Schema"
    │   │
    │   ├── 🔌 API Specialist (Sub: Next.js API Routes/Server Actions)
    │   │   └─ Focus: Request Validation, Response Format, Error Handling
    │   │
    │   └── 🗄️ Database Engineer (Sub: Supabase/PostgreSQL)
    │       └─ Focus: Schema Design, RLS Policies, Migrations, SQL
    │
    └── 🧪 QA_OPS (Quality & Operations Lead)
        │  ⚡ Skill Request: "Need E2E Test Strategy", "Need Deployment Check"
        │
        ├── 🕵️ Bug Hunter (Sub: Testing)
        │   └─ Focus: Unit Tests, Integration Tests, Edge Case Analysis
        │
        └── 🚀 Release Manager (Sub: DevOps)
            └─ Focus: Environment Variables, Build Pipelines, CI/CD
```

---

## 3. 🎫 The Skill Request & Allocation Protocol (SRAP)

### 🔄 Workflow Mechanism
모든 서브 에이전트는 작업을 시작하기 전, 반드시 **Skill Master**에게 '작업 권한'과 '지식'을 요청해야 합니다.

**Step 1: Task Assignment (Claude → Sub-Agent)**
> **Claude**: "FE_VISUAL Agent, 이번 '멤버십 페이지'의 진입 애니메이션을 구현하라."

**Step 2: Skill Request (Sub-Agent → Skill Master)**
> **FE_VISUAL**: "Skill Master, '진입 애니메이션' 구현을 위해 [Framer Motion Guide V2]와 [Performance Optimization Rule] 스킬을 요청한다."

**Step 3: Skill Injection (Skill Master → Sub-Agent)**
> **Skill Master**: "요청 승인. [Skill #FM-204: Stagger Children], [Skill #PERF-101: GPU Acceleration] 패키지를 로드합니다."
> *(System Note: 해당 가이드라인 문서와 예제 코드가 에이전트의 Context에 주입됩니다.)*

**Step 4: Execution (Sub-Agent Works)**
> **FE_VISUAL**: (주입된 스킬을 바탕으로 최적화된 코드를 작성) "구현 완료."

---

## 4. 🧬 Detailed Agent Roles & Skills

### A. 🎨 FE_VISUAL (The Artist)
- **Primary Goal**: 사용자 경험의 '첫인상'과 '감성'을 책임집니다.
- **Required Skills**:
  - `Skill_Tailwind_Master`: Tailwind CSS 유틸리티, 커스텀 설정, 반응형 디자인.
  - `Skill_Motion_Magic`: Framer Motion, CSS Animations, Layout Shifts 방지.
  - `Skill_A11y`: 웹 접근성(ARIA), 스크린 리더 호환성.

### B. ⚙️ FE_LOGIC (The Engineer)
- **Primary Goal**: 흔들리지 않는 견고한 클라이언트 로직을 구축합니다.
- **Required Skills**:
  - `Skill_React_Hooks`: Custom Hooks 설계, 라이프사이클 관리.
  - `Skill_State_Sync`: Server State vs Client State 분리 전략.
  - `Skill_Type_Safety`: TypeScript 고급 타입, 제네릭 설계.

### C. 🛡️ BE_CORE (The Architect)
- **Primary Goal**: 데이터의 무결성과 시스템의 보안을 수호합니다.
- **Required Skills**:
  - `Skill_Supabase_Secure`: RLS(Row Level Security) 정책 작성, Auth 관리.
  - `Skill_API_Design`: RESTful 원칙, Error Handling 표준.
  - `Skill_SQL_Guru`: 복잡한 쿼리 최적화, 인덱싱 전략.

### D. 🧪 QA_OPS (The Guardian)
- **Primary Goal**: 배포 전 결함을 0으로 만듭니다.
- **Required Skills**:
  - `Skill_Playwright`: E2E 테스트 시나리오 작성.
  - `Skill_Jest_Test`: 유닛 테스트 커버리지 관리.
  - `Skill_Env_Guard`: 환경 변수 누수 방지, 보안 감사.

---

## 5. 🚀 Implementation Strategy (How to Apply)

이 구조를 실제 프로젝트에 적용하기 위해 다음 단계를 제안합니다.

1.  **Skill Document Library 구축**:
    - `docs/SKILLS/frontend/motion_guide.md`
    - `docs/SKILLS/backend/rls_patterns.md`
    - 각 파일에 'Best Practice'를 코드로 명시.

2.  **Agent Prompt System 설정**:
    - 각 에이전트를 호출할 때 사용할 "System Prompt Template" 작성.
    - 예: "당신은 FE_VISUAL 에이전트입니다. 작업을 시작하기 전 필요한 스킬을 명시하십시오."

3.  **Claude Custom Instructions 업데이트**:
    - Claude가 이 트리 구조를 이해하고, 사용자의 요청을 적절한 에이전트에게 라우팅하도록 설정.

---

> **"A team is not a group of people who work together. A team is a group of people who trust each other."**
> 이 아키텍처는 신뢰 가능한 '스킬'을 기반으로 각 에이전트가 최고의 퍼포먼스를 내도록 설계되었습니다.
