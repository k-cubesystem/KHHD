# 🆕 새 기능 개발 워크플로우

## 개요
새로운 기능을 처음부터 끝까지 개발하고 배포하는 전체 프로세스

## 예상 시간
2-4시간 (기능 복잡도에 따라)

## 에이전트 실행 순서

### 1단계: 요구사항 분석 및 기획 (10분)
**담당**: CLAUDE (Project Lead)

**작업**:
- 기능 요구사항 파악
- 기술 스택 결정
- 필요한 에이전트 팀 구성
- 작업 우선순위 및 예상 시간 산정

**산출물**:
- 작업 계획서
- 에이전트 호출 순서
- 기술적 제약사항

---

### 2단계: 데이터 스키마 설계 (20분)
**담당**: DB_MASTER (Data Keeper)

**작업**:
- 필요한 테이블 설계 (정규화)
- RLS 정책 정의 (Deny All Default)
- 인덱스 전략 수립
- 마이그레이션 파일 생성

**산출물**:
```sql
-- supabase/migrations/20260211_new_feature.sql
CREATE TABLE feature_table (...);
ALTER TABLE feature_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ...;
CREATE INDEX idx_feature_table_user_id ...;
```

---

### 3단계: AI 프롬프트 설계 (AI 기능인 경우)
**담당**: ALCHEMIST (Prompt Wizard)

**작업**:
- System Prompt 작성
- JSON Schema 정의
- Few-shot Examples 준비
- Hallucination 방지 규칙

**산출물**:
```typescript
// lib/prompts/feature-prompt.ts
export const FEATURE_SYSTEM_PROMPT = `...`;
export const FeatureSchema = {...};
```

---

### 4단계: API 설계 (15분)
**담당**: CONNECTOR (API Specialist)

**작업**:
- API 엔드포인트 설계
- Request/Response 스키마
- 에러 핸들링 전략
- Rate Limiting 정책

**산출물**:
- API 스펙 문서
- 외부 API 연동 계획

---

### 5단계: 백엔드 구현 (30분)
**담당**: BE_SYSTEM (System Core)

**작업**:
- Server Actions 구현
- Input Validation (Zod)
- Authentication 체크
- RLS 연동
- 에러 처리

**산출물**:
```typescript
// app/actions/feature-actions.ts
'use server';

export async function createFeature(data: FormData) {
  // 1. Validation
  // 2. Auth check
  // 3. Business logic
  // 4. Return ActionResult
}
```

---

### 6단계: 프론트엔드 로직 (40분)
**담당**: FE_LOGIC (Client Architect)

**작업**:
- 커스텀 훅 설계 (use-feature.ts)
- Zustand 스토어 (feature-store.ts)
- React Query 설정
- 폼 처리 (React Hook Form + Zod)
- 타입 정의

**산출물**:
```typescript
// hooks/use-feature.ts
export function useFeature() {
  const { data, isLoading } = useQuery({...});
  return { data, isLoading };
}

// stores/feature-store.ts
export const useFeatureStore = create<FeatureStore>(...);
```

---

### 7단계: UI/UX 구현 (50분)
**담당**: FE_VISUAL (Visual Director)

**작업**:
- React 컴포넌트 구현
- Tailwind CSS 스타일링
- Framer Motion 애니메이션
- 반응형 디자인 (mobile/desktop)
- 접근성 (ARIA, 키보드 네비게이션)

**산출물**:
```tsx
// components/feature/feature-component.tsx
export function FeatureComponent() {
  return (
    <motion.div
      className="..."
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* UI */}
    </motion.div>
  );
}
```

---

### 8단계: UX 카피 작성 (15분)
**담당**: POET (Emotional Writer)

**작업**:
- 헤더/설명 문구
- 버튼 라벨
- 에러 메시지
- 성공 피드백
- 도움말 텍스트

**산출물**:
```typescript
// 예시
헤더: "운명의 카드가 당신을 기다립니다"
버튼: "내 운명 보기"
에러: "잠시 후 다시 시도해주세요"
성공: "🎉 분석이 완료되었습니다!"
```

---

### 9단계: 사용자 관점 테스트 (20분)
**담당**: PERSONA (User Voice)

**작업**:
- 다양한 페르소나로 테스트
  - 20대 여성
  - 30대 남성
  - 60대 시니어
- 사용성 문제 발견
- 접근성 체크
- 개선 제안

**산출물**:
- 사용성 피드백 리스트
- 개선 제안 사항

---

### 10단계: QA 테스트 (30분)
**담당**: SHERLOCK (Quality Lead)

**작업**:
- 기능 테스트 (정상 케이스)
- 엣지 케이스 확인
  - 빈 입력
  - 잘못된 형식
  - 네트워크 오류
  - 세션 만료
- 회귀 테스트 (기존 기능 영향)
- 버그 리포트

**산출물**:
```typescript
// tests/e2e/feature.spec.ts
test('Feature 정상 동작', async ({ page }) => {
  // ...
});
```

---

### 11단계: 코드 감사 (20분)
**담당**: AUDITOR (Guardian)

**작업**:
- 코드 복잡도 체크
- 성능 최적화 (N+1 쿼리, 메모리 누수)
- 번들 크기 확인
- 리팩토링 제안
- 베스트 프랙티스 적용

**산출물**:
- 코드 리뷰 리포트
- 리팩토링 제안 사항

---

### 12단계: AI 프롬프트 튜닝 (AI 기능인 경우, 20분)
**담당**: ALCHEMIST (Prompt Wizard)

**작업**:
- 실제 출력 샘플 분석
- 프롬프트 최적화
- JSON Schema 검증
- Hallucination 체크
- Temperature 조정

**산출물**:
- 최적화된 프롬프트
- 출력 품질 리포트

---

### 13단계: 문서화 (15분)
**담당**: LIBRARIAN (Historian)

**작업**:
- 기능 문서 작성 (docs/features/*.md)
- API 문서 업데이트
- Changelog 기록
- 코드 주석 검토

**산출물**:
```markdown
# Feature Name

## 개요
...

## 사용 방법
...

## API
...

## 예시
...
```

---

### 14단계: 빌드 최적화 및 배포 준비 (15분)
**담당**: BOOSTER (Pipeline Master)

**작업**:
- 빌드 테스트
- 번들 크기 최적화
- 환경 변수 확인
- CI/CD 실행 준비

**산출물**:
- 빌드 성공 확인
- 성능 메트릭 (Lighthouse)

---

### 15단계: SEO 최적화 (10분)
**담당**: VIRAL (Growth Hacker)

**작업**:
- Meta Tags 설정 (OG, Twitter)
- Sitemap 업데이트
- Structured Data (JSON-LD)
- Analytics 이벤트 추가

**산출물**:
```typescript
// app/feature/page.tsx
export const metadata: Metadata = {
  title: 'Feature Title',
  description: '...',
  openGraph: {...},
};
```

---

### 16단계: 최종 검토 및 배포 승인 (10분)
**담당**: CLAUDE (Project Lead)

**작업**:
- 모든 에이전트 산출물 통합 검토
- 품질 체크리스트 확인
  - [ ] 모든 테스트 통과
  - [ ] 코드 리뷰 완료
  - [ ] 문서화 완료
  - [ ] 성능 기준 충족
- 프로덕션 배포 승인

**산출물**:
- 최종 승인 문서
- 배포 명령

---

### 17단계: 프로덕션 배포 (5분)
**담당**: BOOSTER (Pipeline Master)

**작업**:
- PR 머지 → main 브랜치
- Vercel 자동 배포
- 배포 상태 모니터링
- 스모크 테스트

**산출물**:
- 배포 완료 URL
- 배포 로그

---

## 체크리스트

### 배포 전 필수 확인 사항
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 환경 변수 설정
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 승인
- [ ] 문서화 완료
- [ ] Lighthouse 점수 90+ (모든 항목)
- [ ] 번들 크기 < 500KB
- [ ] API 응답 시간 < 500ms (p95)

### 배포 후 확인 사항
- [ ] Production URL 정상 작동
- [ ] 새 기능 동작 확인
- [ ] 기존 기능 회귀 테스트
- [ ] Analytics 이벤트 수집 확인
- [ ] 에러 로그 모니터링

---

## 병렬 작업 가능 구간

### 병렬 구간 1 (2-4단계)
- DB_MASTER: 스키마 설계
- ALCHEMIST: 프롬프트 설계 (AI 기능)
- CONNECTOR: API 설계

→ 서로 독립적이므로 동시 작업 가능

### 병렬 구간 2 (8-9단계)
- POET: 카피 작성
- PERSONA: 사용자 테스트

→ UI 완성 후 동시 작업 가능

---

## 예상 소요 시간

| 단계 | 에이전트 | 시간 | 누적 |
|-----|---------|------|------|
| 1 | CLAUDE | 10분 | 10분 |
| 2 | DB_MASTER | 20분 | 30분 |
| 3 | ALCHEMIST | 15분 | 45분 (병렬) |
| 4 | CONNECTOR | 15분 | 45분 (병렬) |
| 5 | BE_SYSTEM | 30분 | 75분 |
| 6 | FE_LOGIC | 40분 | 115분 |
| 7 | FE_VISUAL | 50분 | 165분 |
| 8 | POET | 15분 | 180분 (병렬) |
| 9 | PERSONA | 20분 | 180분 (병렬) |
| 10 | SHERLOCK | 30분 | 210분 |
| 11 | AUDITOR | 20분 | 230분 |
| 12 | ALCHEMIST | 20분 | 250분 |
| 13 | LIBRARIAN | 15분 | 265분 |
| 14 | BOOSTER | 15분 | 280분 |
| 15 | VIRAL | 10분 | 290분 |
| 16 | CLAUDE | 10분 | 300분 |
| 17 | BOOSTER | 5분 | 305분 |

**총 예상 시간**: 약 2.5-3시간 (병렬 작업 포함)

---

## 성공 사례
- AI 타로 카드 분석: 2.5시간
- 가족 총운 대시보드: 3시간
- 프리미엄 만세력: 4시간
