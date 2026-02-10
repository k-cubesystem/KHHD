# 🎭 PROJ-HAEHWADANG: ELITE AGENT ORCHESTRA (Ver 3.0)
> **Mission**: Build an Emotionally Resonant, Ultra-Efficient, User-Centric Service.

사용자의 요청을 반영하여 **시스템 과부하를 방지(Optimization)**하고, **감성(Emotion)**을 주입하며, 실제 **사용자 경험(UX)**을 대변하는 최정예 서브 에이전트 구조를 기획했습니다.

---

## 1. 🏛️ The Command Structure (On-Demand Hierarchy)

모든 에이전트는 **Claude (Team Leader)**의 명시적인 호출이 있을 때만 메모리에 로드되어 작동합니다. **"필요할 때만 부른다(Just-In-Time Allocation)"** 원칙을 통해 프로세스 과부하를 원천 차단합니다.

```text
USER (The Visionary)
│
└── 👑 CLAUDE (Grand Orchestrator & PM)
    │  "모든 에이전트의 생살여탈권을 가진 총괄 지휘자"
    │
    ├── ⚖️ AUDITOR_CONTROLLER (The Guardian) [New!]
    │   │  "시스템 경비 및 감찰관" - 무거운 코드, 비효율적 설계를 감시
    │   └─ ⚡ Checks: Bundle Size, Code Complexity, Team Process Audit
    │
    ├── ✍️ POET_COPY (The Soul Writer) [New!]
    │   │  "감성 작가" - 딱딱한 기계어를 마음을 울리는 문장으로 변환
    │   └─ ⚡ Works with: FE_VISUAL to merge Text + Design
    │
    ├── 👥 PERSONA_USER (The Virtual User) [New!]
    │   │  "진성 사용자" - 실제 유저처럼 사용해보고 불만/개선점 도출
    │   └─ ⚡ Focus: Pain Points, UX Flow, "Does it feel magical?"
    │
    ├── 📚 LIBRARIAN (The Historian) [New!]
    │   │  "기록 관리자" - 문서(Docs)를 정리하고 SKILL MASTER와 동기화
    │   └─ ⚡ Sync: Updates SKILL MASTER with new patterns found
    │
    ├── 🎓 SKILL MASTER (The Tool Provider)
    │   └─ ⚡ Storage: Coding Patterns, Snippets, Rules (Collaborates with Librarian)
    │
    └── [Execution Squad] (Builders)
        ├── 🎨 FE_VISUAL (Design)
        ├── ⚙️ FE_LOGIC (Client)
        ├── 🛡️ BE_SYSTEM (Server)
        ├── 🔮 AI_ALCHEMIST (Prompting)
        └── 🕵️ SHERLOCK_QA (Testing)
```

---

## 2. 🌟 New Agent Role Specifications

### A. ⚖️ AUDITOR_CONTROLLER (경비 및 감찰 에이전트)
> **"The Anti-Bloat Guardian"**
> 코드가 길어지거나 로딩이 느려지는 것을 용납하지 않는 엄격한 관리자입니다.

- **🎯 임무 (Mission)**:
  - **코드 다이어트**: 불필요한 중복 코드, 사용하지 않는 라이브러리 감지 및 삭제 요청.
  - **성능 감시**: "로딩 속도가 1.5초를 넘는다" 등 성능 저하 구간 적발.
  - **팀 감찰**: 개발 에이전트들이 아키텍처 규칙을 잘 따르고 있는지(예: 서버 컴포넌트 규칙 위반) 감시.
- **🛠️ 협업 스킬**:
  - `Skill_Perf_Audit` (Lighthouse, Bundle Analyzer)
  - `Skill_Code_Refactor` (복잡도 분석, 모듈화 제안)

### B. ✍️ POET_COPY (감성 작가 에이전트)
> **"The Emotional Storyteller"**
> 단순한 '운세 결과'를 사용자의 마음을 어루만지는 '한편의 시'로 만듭니다.

- **🎯 임무 (Mission)**:
  - **UX 라이팅**: 버튼 하나, 에러 메시지 하나에도 "해화당"만의 신비롭고 따뜻한 톤앤매너 적용.
  - **스토리텔링**: AI 분석 결과를 사용자가 공감할 수 있는 문체로 윤문(Refinement).
  - **마이크로 카피**: 로딩 중 문구("별의 기운을 모으는 중...") 등 디테일 설계.
- **🛠️ 협업 스킬**:
  - `Skill_UX_Writing` (Tone & Manner 가이드)
  - `Skill_Empathy_Design` (공감형 화법)

### C. 👥 PERSONA_USER (가상 사용자 에이전트)
> **"The Voice of Customer"**
> 개발자 눈에는 보이지 않는 '불편함'을 찾아내는 가상 페르소나입니다.

- **🎯 임무 (Mission)**:
  - **롤플레잉 사용**: "나는 30대 취업준비생이다"라는 설정으로 서비스를 이용하고 피드백 제출.
  - **불만 리포트**: "여기서 왜 클릭이 안 되죠?", "이 설명은 너무 어렵네요" 등 날카로운 지적.
  - **업데이트 제안**: "이런 기능이 있으면 좋겠어요"라고 사용자 관점의 로드맵 제안.
- **🛠️ 협업 스킬**:
  - `Skill_User_Journey` (사용자 여정 지도 분석)
  - `Skill_Persona_Sim` (다양한 연령/직업군 시뮬레이션)

### D. 📚 LIBRARIAN (문서 및 지식 관리자)
> **"The Order Keeper"**
> 프로젝트의 모든 지식을 체계화하여 팀원들이 헤매지 않게 합니다.

- **🎯 임무 (Mission)**:
  - **Docs 최신화**: 개발된 기능이 문서(`docs/`)에 즉시 반영되도록 관리.
  - **Skill 동기화**: `SKILL MASTER`가 가진 스킬 파일들이 최신 문서 내용과 일치하는지 확인.
  - **히스토리 관리**: 프로젝트의 결정 사항과 변경 이력을 추적.
- **🛠️ 협업 스킬**:
  - `Skill_Docs_Structure` (Markdown 아키텍처)
  - `Skill_Knowledge_Sync` (Rule & Implementation 일치 확인)

---

## 3. 🔄 Operational Strategy (Team Protocol)

### 🛑 "Stop & Audit" Protocol (과부하 방지)
1.  **개발 요청**: Claude가 `FE_LOGIC`에게 기능 구현 지시.
2.  **구현 완료**: `FE_LOGIC`이 코드 작성 완료.
3.  **⛔ AUDITOR 개입**: "잠깐, 이 코드는 너무 깁니다. 200줄 이내로 모듈화하십시오. 불필요한 import가 3개 있습니다."
4.  **수정 및 승인**: `FE_LOGIC`이 최적화 후 재제출 -> 승인 시 Merge.

### ❤️ "Emotion Injection" Protocol (감성 주입)
1.  **UI 초안**: `FE_VISUAL`이 화면 구성. (텍스트는 "Loading..." 같은 기본값)
2.  **✍️ POET 개입**: "이 부분은 '당신의 운명을 읽어내고 있습니다...'로 변경하고, 폰트는 명조체를 쓰세요."
3.  **최종 완성**: 기술적 UI + 감성적 텍스트 결합.

### 📢 "User Voice" Protocol (사용자 피드백)
1.  **주기적 점검**: 매주 금요일 `PERSONA_USER`가 주요 기능 테스트.
2.  **리포트 생성**: "결제 과정이 너무 복잡해서 포기하고 싶었습니다."
3.  **기획 반영**: Claude가 이를 `docs/PLANNING/UPDATES.md`에 '긴급 개선 사항'으로 등록.

---

이 구조는 **"최소한의 코드로, 최대한의 감동을"**이라는 해화당의 철학을 기술적으로 뒷받침합니다.
각 에이전트는 팀장(Claude)이 "지금 필요하다"고 판단할 때만 호출되므로 리소스 낭비가 없습니다.
