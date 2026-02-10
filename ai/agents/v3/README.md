# 🤖 Haehwadang Agent System V3.1

## 개요
해화당 프로젝트의 전문 에이전트 팀 시스템입니다.
각 도메인별 전문 에이전트가 협업하여 최고 품질의 결과물을 생산합니다.

## 🎯 에이전트 로스터 (14명)

| 에이전트 | 별칭 | 역할 | 전문 분야 |
|---------|------|------|-----------|
| **CLAUDE** | Project Lead | 오케스트레이터 | 프로젝트 총괄, 의사결정 |
| **FE_VISUAL** | Visual Director | 비주얼 디렉터 | UI/UX, Tailwind, Framer Motion |
| **FE_LOGIC** | Client Architect | 클라이언트 아키텍트 | React, Zustand, 상태관리 |
| **BE_SYSTEM** | System Core | 시스템 코어 | Next.js, Auth, Security |
| **DB_MASTER** | Data Keeper | 데이터 키퍼 | Supabase, SQL, RLS |
| **BOOSTER** | Pipeline Master | 파이프라인 마스터 | CI/CD, Vercel, 빌드 최적화 |
| **VIRAL** | Growth Hacker | 그로스 해커 | SEO, 마케팅, Analytics |
| **CONNECTOR** | API Specialist | API 스페셜리스트 | 외부 API 연동, 성능 최적화 |
| **AUDITOR** | Guardian | 가디언 | 코드 감시, 리팩토링 |
| **POET** | Emotional Writer | 감성 작가 | UX 카피라이팅, 브랜드 보이스 |
| **PERSONA** | User Voice | 사용자 보이스 | UX 피드백, 접근성 |
| **ALCHEMIST** | Prompt Wizard | 프롬프트 위저드 | AI 튜닝, System Prompt |
| **SHERLOCK** | Quality Lead | 품질 리드 | QA, 디버깅, E2E 테스트 |
| **LIBRARIAN** | Historian | 히스토리언 | 문서화, 지식 관리 |

## 📚 디렉토리 구조

```
ai/agents/v3/
├── README.md                    # 이 파일 (시스템 가이드)
├── index.md                     # 에이전트 로스터 (요약)
├── agents/                      # 각 에이전트별 상세 정의
│   ├── claude.md
│   ├── fe-visual.md
│   ├── fe-logic.md
│   ├── be-system.md
│   ├── db-master.md
│   ├── booster.md
│   ├── viral.md
│   ├── connector.md
│   ├── auditor.md
│   ├── poet.md
│   ├── persona.md
│   ├── alchemist.md
│   ├── sherlock.md
│   └── librarian.md
├── prompts/                     # 에이전트별 프롬프트 템플릿
│   ├── fe-visual.txt
│   ├── fe-logic.txt
│   ├── be-system.txt
│   ├── db-master.txt
│   ├── booster.txt
│   ├── viral.txt
│   ├── connector.txt
│   ├── auditor.txt
│   ├── poet.txt
│   ├── persona.txt
│   ├── alchemist.txt
│   ├── sherlock.txt
│   └── librarian.txt
├── workflows/                   # 일반적인 작업 워크플로우
│   ├── new-feature.md
│   ├── bug-fix.md
│   ├── optimization.md
│   ├── refactoring.md
│   └── deployment.md
└── examples/                    # 실제 사용 예시
    ├── example-1-feature.md
    ├── example-2-bug.md
    └── example-3-optimization.md
```

## 🚀 사용 방법

### 1단계: 작업 시작
```bash
# CLAUDE 에이전트에게 요청
"[기능명] 기능을 개발해주세요"
```

### 2단계: 에이전트 자동 선택
CLAUDE가 작업에 필요한 에이전트를 자동으로 선택하고 오케스트레이션합니다.

### 3단계: 워크플로우 실행
선택된 에이전트들이 순차적 또는 병렬로 작업을 수행합니다.

### 4단계: 결과물 검토
각 에이전트의 산출물을 검토하고 피드백합니다.

## 📋 워크플로우 가이드

| 워크플로우 | 주요 에이전트 | 예상 시간 | 문서 |
|-----------|--------------|----------|------|
| **새 기능 개발** | CLAUDE → DB_MASTER → CONNECTOR → BE_SYSTEM → FE_LOGIC → FE_VISUAL → POET → SHERLOCK | 2-4시간 | [new-feature.md](workflows/new-feature.md) |
| **버그 수정** | SHERLOCK → AUDITOR → BE_SYSTEM/FE_LOGIC → SHERLOCK | 30분-1시간 | [bug-fix.md](workflows/bug-fix.md) |
| **성능 최적화** | AUDITOR → BOOSTER → BE_SYSTEM → SHERLOCK | 1-2시간 | [optimization.md](workflows/optimization.md) |
| **리팩토링** | AUDITOR → FE_LOGIC/BE_SYSTEM → SHERLOCK → LIBRARIAN | 2-3시간 | [refactoring.md](workflows/refactoring.md) |
| **배포** | BOOSTER → VIRAL → SHERLOCK → CLAUDE | 30분 | [deployment.md](workflows/deployment.md) |

## 💡 실제 사용 예시

### 예시 1: AI 타로 카드 분석 기능
```bash
# 입력
"AI 타로 카드 분석 기능을 추가해주세요"

# CLAUDE의 에이전트 팀 구성
[CLAUDE] → [DB_MASTER] → [ALCHEMIST] → [CONNECTOR] → [BE_SYSTEM] →
[FE_LOGIC] → [FE_VISUAL] → [POET] → [SHERLOCK] → [LIBRARIAN] → [BOOSTER]

# 결과
✅ 타로 카드 선택 UI
✅ AI 운세 분석 API
✅ 결과 저장 및 이력
✅ 반응형 디자인
✅ 문서화 완료
```

더 많은 예시: [examples/](examples/) 디렉토리 참고

## 🛠 에이전트 호출 방법

각 에이전트는 `prompts/` 디렉토리의 템플릿을 사용하여 호출할 수 있습니다.

```typescript
// 예시: FE_VISUAL 에이전트 호출
const prompt = loadPrompt('fe-visual', {
  task: 'Create a hero section for the landing page',
  context: 'Main landing page targeting users aged 20-40',
  instructions: 'Use midnight theme with gold accents',
  outputFormat: 'React component with Tailwind CSS'
});

// Claude에게 프롬프트 전달
await claude.sendMessage(prompt);
```

## 📊 에이전트 협업 매트릭스

| 에이전트 | 자주 협업하는 에이전트 | 협업 방식 |
|---------|-------------------|----------|
| **CLAUDE** | 모든 에이전트 | 오케스트레이션 |
| **FE_VISUAL** | FE_LOGIC, POET | UI/로직 분리 |
| **FE_LOGIC** | BE_SYSTEM, CONNECTOR | API 연동 |
| **BE_SYSTEM** | DB_MASTER, CONNECTOR | 데이터 처리 |
| **DB_MASTER** | BE_SYSTEM, AUDITOR | 스키마 최적화 |
| **BOOSTER** | AUDITOR, VIRAL | 빌드 최적화 |
| **VIRAL** | POET, BOOSTER | SEO & 성능 |
| **CONNECTOR** | ALCHEMIST, BE_SYSTEM | AI API 연동 |
| **AUDITOR** | 모든 개발 에이전트 | 코드 리뷰 |
| **POET** | FE_VISUAL, PERSONA | UX 카피 |
| **PERSONA** | FE_VISUAL, POET | 사용자 테스트 |
| **ALCHEMIST** | CONNECTOR, SHERLOCK | AI 품질 보증 |
| **SHERLOCK** | 모든 개발 에이전트 | QA 테스트 |
| **LIBRARIAN** | CLAUDE, AUDITOR | 문서 동기화 |

## 🎯 에이전트 선택 가이드

### 프론트엔드 작업
- **UI 디자인**: FE_VISUAL
- **상태 관리**: FE_LOGIC
- **애니메이션**: FE_VISUAL
- **폼 처리**: FE_LOGIC
- **사용자 피드백**: PERSONA → POET

### 백엔드 작업
- **API 개발**: BE_SYSTEM
- **외부 API 연동**: CONNECTOR
- **인증/권한**: BE_SYSTEM
- **데이터 처리**: DB_MASTER

### 데이터베이스 작업
- **스키마 설계**: DB_MASTER
- **쿼리 최적화**: DB_MASTER
- **RLS 정책**: DB_MASTER
- **마이그레이션**: DB_MASTER

### AI 관련 작업
- **프롬프트 튜닝**: ALCHEMIST
- **JSON Schema**: ALCHEMIST
- **Hallucination 체크**: ALCHEMIST
- **AI API 연동**: CONNECTOR

### 품질 관리
- **버그 수정**: SHERLOCK
- **코드 리뷰**: AUDITOR
- **성능 최적화**: AUDITOR + BOOSTER
- **리팩토링**: AUDITOR

### 배포 및 운영
- **CI/CD**: BOOSTER
- **SEO**: VIRAL
- **Analytics**: VIRAL
- **문서화**: LIBRARIAN

## 🔧 커스터마이징

### 새 에이전트 추가
1. `agents/` 디렉토리에 새 에이전트 문서 생성
2. `prompts/` 디렉토리에 프롬프트 템플릿 추가
3. `index.md`에 에이전트 추가
4. 워크플로우에 통합

### 프롬프트 수정
- `prompts/` 디렉토리의 템플릿 파일 수정
- 에이전트의 톤앤매너, 출력 형식 조정 가능

### 워크플로우 추가
- `workflows/` 디렉토리에 새 워크플로우 문서 추가
- 에이전트 호출 순서와 역할 명시

## 📈 성능 메트릭

| 메트릭 | 목표 | 현재 |
|-------|------|------|
| **기능 개발 속도** | 2-4시간 | ✅ 달성 |
| **버그 수정 속도** | 30분 | ✅ 달성 |
| **코드 품질 (A급)** | 90% | 85% (개선 중) |
| **문서화 동기율** | 100% | ✅ 달성 |
| **배포 성공률** | 99% | ✅ 달성 |

## 🎓 학습 자료

- [에이전트 상세 문서](agents/)
- [워크플로우 예시](workflows/)
- [실제 사용 케이스](examples/)
- [PROJECT_RULES.md](../../../PROJECT_RULES.md) - 클린 코드 규칙
- [Database.md](../../../Database.md) - 데이터베이스 명세

## 🤝 기여 가이드

### 에이전트 개선 제안
1. 기존 에이전트의 역할/책임 확장
2. 새로운 프로토콜 추가
3. 프롬프트 템플릿 최적화

### 워크플로우 개선
1. 병목 지점 식별
2. 에이전트 협업 최적화
3. 새로운 워크플로우 패턴 제안

### PR 프로세스
1. `agents/` 또는 `workflows/` 수정
2. 실제 사용 예시 추가
3. CLAUDE 에이전트의 검토 후 머지

## 📞 문의

에이전트 시스템 관련 문의:
- 새 에이전트 추가 요청
- 워크플로우 최적화 제안
- 프롬프트 템플릿 개선

→ GitHub Issues 또는 CLAUDE 에이전트에게 직접 요청

---

**Last Updated**: 2026-02-11
**Version**: 3.1.0
**Status**: Production Ready ✅
