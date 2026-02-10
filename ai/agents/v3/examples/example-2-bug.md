# 🐛 예시 2: "사주 분석 무한 로딩" 버그 수정

## 증상
사주 분석 페이지에서 로딩 스피너가 무한 반복되어 결과가 표시되지 않음

## 심각도
High (주요 기능 장애)

## 예상 시간
30분

---

## 에이전트 실행 로그

### 1️⃣ CLAUDE - 5분

**입력**:
```
"사주 분석 페이지에서 로딩이 무한 반복됩니다"
```

**판단**:
```
[심각도] High (주요 기능 장애)
[필요 에이전트] SHERLOCK (디버깅), FE_LOGIC (수정)
[우선순위] Critical (즉시 처리)
```

---

### 2️⃣ SHERLOCK - 15분

**디버깅 과정**:

```typescript
// 1. 재현
- 로그인 → 사주 분석 페이지 접속
- 프로필 선택 → 분석 버튼 클릭
- 증상: 로딩 스피너 무한 반복

// 2. Network 탭 확인
✅ API 호출: 정상 (200 OK, 응답 시간 450ms)
✅ 응답 데이터: 정상

// 3. React DevTools
⚠️ 문제 발견: AnalysisDashboard 컴포넌트 무한 리렌더링

// 4. 코드 검토
// components/analysis/AnalysisDashboard.tsx
useEffect(() => {
  setProcessedData(processAnalysisData(data));
}, [data]); // ❌ 문제: data는 객체이므로 참조 변경마다 재실행

// 5. 근본 원인
- useEffect 의존성 배열에 객체 직접 추가
- 매 렌더링마다 새로운 객체 참조 생성
- useEffect 재실행 → setState → 리렌더링 → 무한 루프
```

**버그 리포트**:
```markdown
## 버그 리포트

**재현 방법**:
1. 사주 분석 페이지 접속
2. 프로필 선택 후 분석 요청

**에러 위치**:
`components/analysis/AnalysisDashboard.tsx:45`

**근본 원인**:
useEffect 의존성 배열에 객체를 직접 추가하여
참조 변경으로 무한 리렌더링 발생

**해결 방안**:
의존성 배열을 primitive 값으로 변경 (data.id)
또는 useMemo로 data 메모이제이션
```

---

### 3️⃣ FE_LOGIC - 10분

**수정 코드**:

```typescript
// components/analysis/AnalysisDashboard.tsx

// ❌ Before
useEffect(() => {
  setProcessedData(processAnalysisData(data));
}, [data]); // 객체 참조 변경으로 매번 재실행

// ✅ After (방법 1: primitive 의존성)
useEffect(() => {
  setProcessedData(processAnalysisData(data));
}, [data.id]); // ID만 의존성으로 체크

// ✅ After (방법 2: useMemo 사용)
const processedData = useMemo(() => {
  return processAnalysisData(data);
}, [data.id]);

// setState 제거, 직접 사용
// <Dashboard data={processedData} />
```

**커밋**:
```bash
git add components/analysis/AnalysisDashboard.tsx
git commit -m "fix: Prevent infinite re-rendering in AnalysisDashboard

- Changed useEffect dependency from object to primitive value
- Added useMemo for expensive data processing
- Fixes #123"
```

---

### 4️⃣ SHERLOCK - 5분

**회귀 테스트**:

```typescript
// 1. 수정 사항 검증
✅ 로딩 정상 종료
✅ 분석 결과 정상 표시
✅ 페이지 리렌더링 1회만 발생

// 2. 관련 기능 테스트
✅ 프로필 전환 시 정상 작동
✅ 새로고침 후 정상 작동
✅ 다른 분석 페이지 영향 없음

// 3. 성능 확인
Before: 무한 리렌더링 (메모리 누수)
After: 1회 렌더링 (정상)
```

---

### 5️⃣ BOOSTER - 5분

**핫픽스 배포**:

```bash
# PR 생성
gh pr create --title "fix: Infinite loading in saju analysis" \
             --body "Fixes #123" \
             --base main

# 리뷰 및 머지
# Vercel 자동 배포 (2분)

# 배포 후 검증
✅ Production 정상 작동 확인
```

---

## 결과

### 소요 시간
총 30분 (예상대로)

### 근본 원인
React useEffect 의존성 배열 오용

### 해결책
Primitive 값을 의존성으로 사용 또는 useMemo 적용

### 재발 방지
- ESLint 규칙 추가: `react-hooks/exhaustive-deps`
- 코드 리뷰 체크리스트에 "useEffect 의존성" 항목 추가
- 개발자 가이드에 useEffect 베스트 프랙티스 문서화

---

## 교훈

1. **useEffect 의존성**:
   - 객체/배열은 직접 의존성으로 사용하지 말 것
   - Primitive 값 (id, count 등)만 사용
   - 또는 useMemo/useCallback로 메모이제이션

2. **디버깅 순서**:
   - Network 탭 (API 문제?)
   - React DevTools (리렌더링 문제?)
   - 코드 검토 (로직 문제?)

3. **빠른 수정의 중요성**:
   - Critical 버그는 30분 내 수정 목표
   - 핫픽스 배포 프로세스 정립
