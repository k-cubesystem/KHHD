# ⚡ 예시 3: "메인 페이지 로딩 속도" 최적화

## 현황
메인 페이지 초기 로딩 시간이 3.2초로 느림 (목표: 1초 이내)

## 목표
- **페이지 로딩**: 3.2초 → < 1초
- **Lighthouse 점수**: 72점 → 90점+

## 예상 시간
1.5시간

---

## 에이전트 실행 로그

### 1️⃣ AUDITOR - 20분

**성능 분석**:

```typescript
// Lighthouse 리포트
Performance: 72 (개선 필요)
- First Contentful Paint: 1.8s (느림)
- Largest Contentful Paint: 3.2s (느림)
- Total Blocking Time: 450ms (보통)

// 병목 지점 분석
1. 히어로 이미지: 2.1MB (PNG)
   → WebP 변환 필요

2. 번들 크기: 780KB
   - lodash 전체 임포트: 70KB
   - lucide-react 전체 임포트: 180KB
   - framer-motion: 85KB
   → Tree shaking 필요

3. API 호출: 동기 순차 실행
   - fetchUserProfile(): 400ms
   - fetchMembership(): 350ms
   - fetchFortune(): 500ms
   → 병렬 처리 필요

4. 폰트 로딩: FOUT (Flash of Unstyled Text)
   → font-display: swap 적용

[우선순위]
High: 이미지 최적화, 번들 크기 축소
Medium: API 병렬화
Low: 폰트 최적화
```

---

### 2️⃣ FE_VISUAL - 20분

**이미지 최적화**:

```tsx
// Before: 일반 img 태그
<img src="/hero.png" alt="Hero" /> // 2.1MB PNG

// After: Next.js Image 컴포넌트
<Image
  src="/hero.png"
  alt="Hero"
  width={1920}
  height={1080}
  quality={80}
  priority // LCP 이미지는 우선 로딩
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
  formats={['image/avif', 'image/webp']}
/>
// 결과: 2.1MB → 180KB (WebP, 91% 감소)

// 추가 최적화: 반응형 이미지
<Image
  src="/hero.png"
  alt="Hero"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  fill
  style={{ objectFit: 'cover' }}
/>
// 모바일: 400KB
// 태블릿: 800KB
// 데스크톱: 180KB
```

---

### 3️⃣ BOOSTER - 20분

**번들 크기 최적화**:

```typescript
// Before: 전체 라이브러리 임포트
import _ from 'lodash'; // 70KB
import * as Icons from 'lucide-react'; // 180KB

// After: 필요한 함수/컴포넌트만 임포트
import debounce from 'lodash/debounce'; // 5KB (-65KB)
import throttle from 'lodash/throttle'; // 3KB

import { Star, Moon, Sun, Heart } from 'lucide-react'; // 15KB (-165KB)

// 총 절감: 230KB (29% 감소)
```

**코드 스플리팅**:

```typescript
// Before: 모든 컴포넌트 정적 임포트
import HeavyChart from '@/components/charts/HeavyChart';

// After: 동적 임포트
const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <Skeleton className="w-full h-64" />,
  ssr: false, // 클라이언트에서만 로딩
});

// 초기 번들에서 제외: -120KB
```

**next.config.js 최적화**:

```javascript
module.exports = {
  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30일
  },

  // 번들 최적화
  experimental: {
    optimizePackageImports: ['@/components', '@/lib', 'lucide-react'],
  },

  // 압축
  compress: true,
};
```

---

### 4️⃣ BE_SYSTEM - 20분

**API 병렬화**:

```typescript
// Before: 순차 실행 (1250ms)
const profile = await fetchUserProfile(); // 400ms
const membership = await fetchMembership(); // 350ms
const fortune = await fetchFortune(); // 500ms

// After: 병렬 실행 (500ms)
const [profile, membership, fortune] = await Promise.all([
  fetchUserProfile(),   // 400ms
  fetchMembership(),    // 350ms
  fetchFortune(),       // 500ms
]); // 가장 긴 것만 대기 (500ms)

// 개선: 750ms 절감 (60% 단축)
```

**데이터 프리페칭**:

```typescript
// app/page.tsx (Server Component)
export default async function HomePage() {
  // 서버에서 미리 데이터 페칭
  const initialData = await getInitialData();

  return (
    <ClientComponent initialData={initialData} />
  );
}

// 클라이언트 하이드레이션 시 즉시 표시
```

---

### 5️⃣ DB_MASTER - 15분

**쿼리 최적화**:

```sql
-- Before: N+1 쿼리 (100회 DB 호출)
SELECT * FROM users WHERE id = 'user-1';
-- 그 다음 각 user마다 별도 쿼리로 프로필 조회

-- After: JOIN으로 한 번에 (1회 DB 호출)
SELECT
  u.*,
  jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'birth_date', p.birth_date
    )
  ) AS profiles
FROM users u
LEFT JOIN saju_profiles p ON p.user_id = u.id
WHERE u.id = 'user-1'
GROUP BY u.id;

-- 응답 시간: 450ms → 80ms (82% 개선)
```

**인덱스 추가**:

```sql
-- 자주 조회되는 컬럼에 인덱스
CREATE INDEX idx_saju_profiles_user_id_created
ON saju_profiles(user_id, created_at DESC);

-- 쿼리 성능: 200ms → 15ms (92% 개선)
```

---

### 6️⃣ FE_LOGIC - 15분

**React 성능 최적화**:

```typescript
// 1. useMemo로 비싼 계산 메모이제이션
const sortedData = useMemo(() => {
  return data.sort((a, b) => b.createdAt - a.createdAt);
}, [data]); // data 변경 시에만 재계산

// 2. React.memo로 불필요한 리렌더링 방지
const ExpensiveCard = React.memo(({ data }: Props) => {
  return <Card>{/* ... */}</Card>;
});

// 3. useCallback으로 함수 메모이제이션
const handleClick = useCallback(() => {
  analytics.track('button_click');
}, []); // 의존성 없으므로 한 번만 생성

// 리렌더링 횟수: 15회 → 3회 (80% 감소)
```

---

### 7️⃣ VIRAL - 10분

**폰트 최적화**:

```typescript
// app/layout.tsx
import { Pretendard } from 'next/font/google';

const pretendard = Pretendard({
  subsets: ['latin'],
  display: 'swap', // FOUT 방지
  preload: true,
  variable: '--font-pretendard',
});

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>{children}</body>
    </html>
  );
}
```

---

### 8️⃣ SHERLOCK - 10분

**성능 테스트**:

```typescript
// Lighthouse 재실행

// Before
Performance: 72
FCP: 1.8s
LCP: 3.2s
TBT: 450ms
Bundle: 780KB

// After
Performance: 94 ✅
FCP: 0.6s (-67%)
LCP: 0.9s (-72%)
TBT: 120ms (-73%)
Bundle: 430KB (-45%)

// 실제 사용자 환경 테스트
3G 네트워크: 5.2s → 2.1s
4G 네트워크: 3.2s → 0.9s
WiFi: 1.8s → 0.4s
```

---

### 9️⃣ BOOSTER - 5분

**배포 및 모니터링**:

```bash
# Vercel Analytics 확인
Before (7일 평균):
- TTFB: 450ms
- FCP: 1.8s
- LCP: 3.2s

After (24시간 평균):
- TTFB: 180ms (-60%)
- FCP: 0.6s (-67%)
- LCP: 0.9s (-72%)

# 성공!
```

---

## 최종 결과

### 성능 개선

| 메트릭 | Before | After | 개선 |
|--------|--------|-------|------|
| **페이지 로딩** | 3.2s | 0.9s | -72% |
| **Lighthouse** | 72 | 94 | +22점 |
| **번들 크기** | 780KB | 430KB | -45% |
| **API 응답** | 1250ms | 500ms | -60% |
| **DB 쿼리** | 450ms | 80ms | -82% |

### 최적화 기법

1. **이미지**: PNG → WebP, 반응형 크기
2. **번들**: Tree shaking, 동적 임포트
3. **API**: 병렬 호출, 서버 프리페칭
4. **DB**: JOIN, 인덱스
5. **React**: useMemo, React.memo, useCallback

### 비용 절감
- **CDN 트래픽**: 2.1MB → 180KB (91% 감소)
- **월 예상 비용**: $150 → $30 (80% 절감)

---

## 교훈

### 최적화 우선순위
1. **이미지** (가장 큰 영향)
2. **번들 크기** (초기 로딩)
3. **API 병렬화** (대기 시간 단축)
4. **DB 쿼리** (서버 응답 개선)

### 지속적 모니터링
- Lighthouse CI 도입 (매 PR마다 성능 체크)
- Vercel Analytics 모니터링
- 번들 크기 예산 설정 (500KB 제한)

### 재발 방지
- 이미지는 항상 Next.js Image 사용
- 라이브러리 전체 임포트 금지
- API는 병렬 호출 우선
- 정기 성능 감사 (월 1회)
