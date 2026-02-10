# 🔧 리팩토링 워크플로우

## 개요
코드 품질 개선, 유지보수성 향상을 위한 리팩토링 프로세스

## 예상 시간
2-3시간

## 리팩토링 신호

### 즉시 리팩토링 필요
- 함수 길이 > 50줄
- 파일 크기 > 300줄
- 중복 코드 3회 이상
- Cyclomatic Complexity > 10
- useEffect 의존성 배열 > 5개

---

## 에이전트 실행 순서

### 1단계: 코드 감사 (30분)
**담당**: AUDITOR

**작업**:
```typescript
[감사 리포트]
1. components/analysis/dashboard.tsx (450줄)
   → 모듈화 필요

2. hooks/use-saju.ts (120줄, 복잡도 15)
   → 함수 분리 필요

3. 중복 코드: API 에러 처리 (5곳)
   → 공통 함수 추출
```

---

### 2단계: 리팩토링 계획 (20분)
**담당**: CLAUDE

**작업**:
- 리팩토링 범위 결정
- 우선순위 설정
- 리스크 평가

---

### 3단계: 리팩토링 실행 (60-90분)
**담당**: FE_LOGIC / BE_SYSTEM

**작업**:

#### 예시 1: 큰 컴포넌트 분리
```typescript
// Before: dashboard.tsx (450줄)
export function Dashboard() {
  // 모든 로직과 UI가 한 파일에
}

// After: 모듈화
// components/dashboard/
//   ├── index.tsx (조합)
//   ├── header.tsx
//   ├── stats.tsx
//   ├── chart.tsx
//   └── actions.tsx
```

#### 예시 2: 중복 코드 제거
```typescript
// Before: 중복된 에러 처리
try {
  await api1();
} catch (error) {
  toast.error('오류 발생');
  console.error(error);
}

try {
  await api2();
} catch (error) {
  toast.error('오류 발생');
  console.error(error);
}

// After: 공통 함수
const handleApiError = (error: unknown) => {
  toast.error('오류 발생');
  console.error(error);
};

try {
  await api1();
} catch (error) {
  handleApiError(error);
}
```

---

### 4단계: 회귀 테스트 (30분)
**담당**: SHERLOCK

**작업**:
- 모든 기능 정상 작동 확인
- 엣지 케이스 테스트
- 타입 에러 확인

---

### 5단계: 문서화 (20분)
**담당**: LIBRARIAN

**작업**:
- 변경 사항 기록
- 새로운 구조 문서화
- 코드 주석 업데이트

---

## 리팩토링 원칙

### DRY (Don't Repeat Yourself)
```typescript
// ❌ 중복
const user1 = await fetchUser(id1);
const user2 = await fetchUser(id2);

// ✅ 추상화
const users = await Promise.all([id1, id2].map(fetchUser));
```

### SOLID
```typescript
// S: Single Responsibility
// ❌ 한 함수가 여러 역할
function processUser(user) {
  validateUser(user);
  saveToDb(user);
  sendEmail(user);
}

// ✅ 역할 분리
function processUser(user) {
  const validated = validateUser(user);
  const saved = saveToDb(validated);
  await notifyUser(saved);
}
```

---

## 체크리스트
- [ ] 모든 테스트 통과
- [ ] 타입 에러 없음
- [ ] 번들 크기 유지 또는 감소
- [ ] 성능 유지 또는 개선
- [ ] 문서화 완료
