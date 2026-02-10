# Dynamic Imports 최적화 권장사항

## 개요
무거운 컴포넌트를 동적 import로 변경하여 초기 번들 크기를 줄이고 페이지 로딩 성능을 개선할 수 있습니다.

## 권장 적용 대상

### 1. Recharts 컴포넌트 (High Priority)
Recharts는 비교적 큰 라이브러리이므로 동적 import 적용 시 가장 큰 효과를 볼 수 있습니다.

**적용 대상 파일:**
- `components/saju/five-elements-chart.tsx`
- `components/fortune/fortune-timeline.tsx`
- `components/saju/daeun-chart.tsx`

**적용 방법:**
```typescript
// Before
import { LineChart, Line, XAxis, YAxis } from 'recharts'

// After
import dynamic from 'next/dynamic'

const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  {
    loading: () => <div className="animate-pulse">차트 로딩 중...</div>,
    ssr: false,
  }
)

const Line = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false }
)

// 또는 전체 차트 컴포넌트를 분리하여 동적 import
const FiveElementsChartInner = dynamic(
  () => import('./five-elements-chart-inner'),
  {
    loading: () => <div>차트 로딩 중...</div>,
    ssr: false,
  }
)
```

### 2. AI Studio 페이지 (High Priority)
AI 이미지 분석 페이지는 사용자가 직접 방문할 때만 필요하므로 동적 import에 적합합니다.

**적용 대상 파일:**
- `app/protected/studio/face/page.tsx`
- `app/protected/studio/palm/page.tsx`
- `app/protected/studio/fengshui/page.tsx`

**적용 방법:**
```typescript
// page.tsx에서
import dynamic from 'next/dynamic'

const FaceStudioClient = dynamic(
  () => import('./face-studio-client'),
  {
    loading: () => <div>로딩 중...</div>,
    ssr: false, // 클라이언트 전용 컴포넌트
  }
)

export default function FacePage() {
  return <FaceStudioClient />
}
```

### 3. Framer Motion 애니메이션 (Medium Priority)
Framer Motion은 애니메이션 라이브러리로, 초기 렌더링에 필수적이지 않은 경우 동적 import를 고려할 수 있습니다.

**적용 고려 대상:**
- `components/fortune/fortune-energy-gauge.tsx`
- `components/history/category-tabs.tsx`
- `components/saju/premium-manse-card.tsx`

**주의사항:**
- 초기 뷰포트에 보이는 애니메이션은 동적 import 시 깜빡임이 발생할 수 있으므로 신중히 판단
- 모달이나 탭 내부의 애니메이션은 동적 import에 적합

**적용 방법:**
```typescript
// Before
import { motion } from 'framer-motion'

// After (컴포넌트 레벨에서)
import dynamic from 'next/dynamic'

const AnimatedCard = dynamic(
  () => import('./animated-card'),
  {
    loading: () => <div>로딩 중...</div>,
  }
)
```

### 4. 이미지 처리 라이브러리 (Low Priority)
html2canvas 등의 이미지 처리 라이브러리는 이미 사용 시점에 동적으로 불러오는 경우가 많습니다.

## 적용 우선순위

1. **즉시 적용 권장:**
   - Recharts 컴포넌트 (3개 파일)
   - AI Studio 페이지 (3개 파일)

2. **테스트 후 적용:**
   - Framer Motion 애니메이션 (UX 영향 검토 필요)

3. **선택적 적용:**
   - 기타 heavy 컴포넌트

## 예상 효과

- **초기 번들 크기 감소:** 약 100-200KB 감소 예상
- **First Contentful Paint (FCP) 개선:** 0.2-0.5초 개선 예상
- **Time to Interactive (TTI) 개선:** 0.3-0.7초 개선 예상

## 적용 시 주의사항

1. **SSR vs CSR:**
   - 클라이언트 전용 기능은 `ssr: false` 설정
   - 서버에서 렌더링이 필요한 경우 loading 컴포넌트 제공

2. **Loading State:**
   - 사용자 경험을 위해 적절한 로딩 상태 제공
   - Skeleton UI 또는 스피너 활용

3. **성능 측정:**
   - 적용 전후 Lighthouse 점수 비교
   - 번들 분석기로 실제 크기 감소 확인

## 번들 분석 실행

```bash
npm run analyze
```

실행 후 `.next/analyze/` 폴더에서 번들 크기를 시각적으로 확인할 수 있습니다.

## 참고 자료

- [Next.js Dynamic Import 문서](https://nextjs.org/docs/advanced-features/dynamic-import)
- [React Code Splitting 가이드](https://react.dev/reference/react/lazy)
