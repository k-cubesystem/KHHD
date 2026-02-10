# ⚡ 성능 최적화 워크플로우

## 개요
페이지 로딩 속도, API 응답 시간, 번들 크기 등을 개선하는 프로세스

## 예상 시간
1-2시간

## 최적화 목표

| 메트릭 | 현재 | 목표 |
|-------|------|------|
| **페이지 로딩** | 3초 | < 1초 |
| **API 응답** | 1초 | < 500ms |
| **번들 크기** | 800KB | < 500KB |
| **Lighthouse** | 70점 | 90점+ |

---

## 에이전트 실행 순서

### 1단계: 성능 병목 분석 (20분)
**담당**: AUDITOR

**작업**:
```typescript
// 1. Lighthouse 실행
// 2. Chrome DevTools Performance 탭
// 3. React DevTools Profiler
// 4. Network 탭 (느린 요청)
// 5. Bundle Analyzer

[분석 결과]
- 큰 이미지: 2MB
- 불필요한 라이브러리: lodash 전체 (70KB)
- N+1 쿼리: 프로필 조회 시 100회
- 불필요한 리렌더링: 5개 컴포넌트
```

---

### 2단계: 이미지 최적화 (20분)
**담당**: FE_VISUAL

**작업**:
```typescript
// Before
<img src="/hero.png" /> // 2MB

// After
<Image
  src="/hero.png"
  alt="Hero"
  width={1200}
  height={630}
  quality={80}
  priority
  placeholder="blur"
/> // 200KB (WebP)
```

---

### 3단계: 번들 크기 최적화 (20분)
**담당**: BOOSTER

**작업**:
```typescript
// Before
import _ from 'lodash'; // 70KB
import * as Icons from 'lucide-react'; // 200KB

// After
import debounce from 'lodash/debounce'; // 5KB
import { Star, Moon } from 'lucide-react'; // 10KB
```

---

### 4단계: 데이터베이스 쿼리 최적화 (30분)
**담당**: DB_MASTER

**작업**:
```sql
-- Before: N+1 쿼리
SELECT * FROM profiles; -- 100개
-- 각 profile마다 별도 쿼리

-- After: JOIN으로 한 번에
SELECT p.*, jsonb_agg(a.*) AS analyses
FROM profiles p
LEFT JOIN analyses a ON a.profile_id = p.id
GROUP BY p.id;
```

---

### 5단계: React 성능 최적화 (20분)
**담당**: FE_LOGIC

**작업**:
```typescript
// 1. useMemo로 비싼 계산 메모이제이션
const sortedData = useMemo(() => {
  return data.sort(...);
}, [data]);

// 2. React.memo로 불필요한 리렌더링 방지
export const ExpensiveComponent = React.memo(({ data }) => {
  // ...
});

// 3. 코드 스플리팅
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
});
```

---

### 6단계: 성능 테스트 (10분)
**담당**: SHERLOCK

**작업**:
- Lighthouse 재실행
- 실제 사용자 환경 테스트
- 메모리 누수 체크

---

## 성능 개선 사례

### Before
- 페이지 로딩: 3.2초
- API 응답: 1.1초
- 번들 크기: 850KB
- Lighthouse: 68점

### After
- 페이지 로딩: 0.8초 (75% 개선)
- API 응답: 0.4초 (64% 개선)
- 번들 크기: 480KB (44% 개선)
- Lighthouse: 92점

---

## 체크리스트
- [ ] 이미지 최적화 (WebP, 적절한 크기)
- [ ] 번들 크기 축소 (Tree shaking)
- [ ] N+1 쿼리 제거
- [ ] 불필요한 리렌더링 방지
- [ ] 코드 스플리팅
- [ ] CDN 활용
- [ ] API 응답 캐싱
