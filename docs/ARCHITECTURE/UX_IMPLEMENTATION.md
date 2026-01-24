# UX 구현 가이드: Modern Oriental Zen

> **최종 업데이트**: 2026-01-24
> **스타일**: Modern Oriental Zen (청담해화당 브랜딩)
> **구현 상태**: Phase 1~16 완료

---

## 1. 디자인 철학: "Modern Oriental Zen"

### 🎨 컨셉
"화려하되 경박하지 않게 (Luxurious but not tacky)"

### 핵심 원칙
- **미니멀리즘**: 불필요한 요소 제거, 여백의 미
- **동양적 고급스러움**: 한지 텍스처, 먹물색, 금박 포인트
- **반응형 인터랙션**: 사용자 행동에 즉각 반응하는 부드러운 애니메이션

---

## 2. 구현 완료 항목 ✅

### A. Design System (Tailwind Config)
**파일**: `tailwind.config.ts`

```typescript
// Zen Color Palette
colors: {
  zen: {
    bg: '#FAFAF9',        // Warm Off-White
    text: '#1C1917',      // Charcoal
    muted: '#78716C',     // Stone Gray
    border: '#E7E5E4',    // Light Border
    gold: '#D4AF37',      // Brand Gold
    wood: '#059669',      // Emerald (용신 강조용)
  }
}

// Glassmorphism 유틸리티
.glass-zen: backdrop-blur-md + white/80 bg
.glass-dark: backdrop-blur-md + black/50 bg
.glass-gold: backdrop-blur-md + gold/20 bg
```

### B. 애니메이션 표준 (Framer Motion)
**파일**: `lib/animations.ts`

```typescript
// 기본 Entrance
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

// Spring Transition
export const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30
}
```

### C. 배경 효과 컴포넌트
**파일**: `components/ui/orb-background.tsx`

```typescript
// 3가지 Variant
<OrbBackground variant="default" />  // 메인 페이지
<OrbBackground variant="subtle" />   // Dashboard
<OrbBackground variant="gold" />     // 프리미엄 페이지
```

**특징**:
- GPU 가속 애니메이션 (transform, opacity만 사용)
- Blur 효과로 신비로운 분위기 연출
- 성능 최적화 (will-change 속성)

### D. 프리미엄 컴포넌트 세트

#### 1. PremiumManseCard
**파일**: `components/saju/premium-manse-card.tsx`
- 오행별 배경 애니메이션 (Fire: 불타오름, Water: 물결)
- 클릭하여 확장 가능한 UI (Expandable)
- 일주(日柱) Sparkles 애니메이션

#### 2. FiveElementsChart
**파일**: `components/saju/five-elements-chart.tsx`
- Recharts 기반 Radar Chart
- 천간/지지 분리 오행 계산
- 용신(用神) 자동 추천

#### 3. DaewoonTimeline
**파일**: `components/saju/daewoon-timeline.tsx`
- 가로 스크롤 타임라인
- 현재 대운 강조 표시 (Gold Ring)
- 오행별 색상 바

#### 4. DigitalTalisman
**파일**: `components/saju/digital-talisman.tsx`
- 한지 텍스처 SVG 필터
- Shimmer 효과 (금빛 빛남)
- Canvas Confetti 도장 애니메이션

---

## 3. 모바일 최적화 ✅

### A. 터치 타겟 사이즈
- 모든 버튼: 최소 44x44px
- 햄버거 메뉴: 48x48px

### B. 모바일 네비게이션
**파일**: `components/layout/protected-header.tsx`, `site-header.tsx`

```typescript
// AnimatePresence로 부드러운 전환
<AnimatePresence>
  {isMobileMenuOpen && (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
    >
      {/* 메뉴 항목 순차 등장 (stagger) */}
    </motion.div>
  )}
</AnimatePresence>
```

---

## 4. 감성 온보딩 ✅

### A. 시간대별 인사
**파일**: `lib/constants/messages.ts`

```typescript
// 새벽/아침/낮/저녁/밤에 따른 감성 멘트
export const getGreetingByTime = () => {
  const hour = new Date().getHours();
  if (hour < 6) return "고요한 새벽, 당신의 운명을 탐구하세요";
  // ...
}
```

**적용 위치**:
- 로그인 페이지 (`DailyQuote` 컴포넌트)
- 랜딩 페이지 Hero 섹션

### B. 타이핑 로더
**파일**: `components/ui/typing-loader.tsx`
- 분석 대기 중 타이핑 효과
- 감성적 대기 메시지

---

## 5. 성능 최적화

### A. 애니메이션 최적화
- `transform`, `opacity`만 사용 (GPU 가속)
- `will-change` 속성으로 렌더링 힌트 제공
- 불필요한 리렌더링 방지 (`useMemo`, `useCallback`)

### B. 이미지 최적화
- Next.js Image 컴포넌트 사용
- Lazy loading 자동 적용
- WebP 포맷 자동 변환

---

## 6. 구현 규칙 (개발자용)

### A. 컴포넌트 구조
```tsx
<Card className="border-zen-border shadow-xl overflow-hidden bg-white relative">
  {/* 상단 장식 라인 */}
  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-zen-gold to-transparent" />

  <CardHeader className="border-b border-zen-border bg-zen-bg/30">
    {/* 헤더 내용 */}
  </CardHeader>

  <CardContent className="p-6">
    {/* 메인 콘텐츠 */}
  </CardContent>
</Card>
```

### B. 애니메이션 적용
```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: idx * 0.1 }} // Stagger
>
  {content}
</motion.div>
```

### C. 색상 사용
- **텍스트**: `text-zen-text` (기본), `text-zen-muted` (보조)
- **배경**: `bg-white` (카드), `bg-zen-bg/30` (헤더)
- **테두리**: `border-zen-border`
- **강조**: `text-zen-gold`, `bg-zen-gold`, `ring-zen-gold`

---

## 7. 타이포그래피

### A. 폰트 계층
```css
/* Titles (강조, 브랜드) */
font-family: 'Noto Serif KR', serif;

/* Body (본문, 가독성) */
font-family: 'Inter', sans-serif;
```

### B. 크기 체계
- Hero: `text-5xl` ~ `text-7xl` + `font-serif`
- Heading: `text-2xl` ~ `text-4xl` + `font-serif`
- Body: `text-base` + `font-sans`
- Caption: `text-xs` ~ `text-sm` + `text-zen-muted`

---

## 8. 접근성 (Accessibility)

### A. 색상 대비
- 모든 텍스트는 WCAG AA 기준 충족 (4.5:1 이상)
- zen-text (#1C1917) vs white 배경: 12.63:1 ✅

### B. 키보드 접근성
- 모든 인터랙티브 요소에 `focus:ring` 스타일 적용
- Tab 순서 논리적 배치

### C. 스크린 리더
- 의미 있는 요소에 `aria-label` 추가
- 장식 요소는 `aria-hidden="true"`

---

## 9. 향후 개선 사항 (Roadmap)

### Phase 18 (예정)
- [ ] 다크모드 토글 기능 (시간대별 자동 전환)
- [ ] 사용자 커스터마이징 (테마 색상 변경)
- [ ] 햅틱 피드백 (모바일)
- [ ] 소리 효과 (결제 완료, 부적 발급)

### 고도화 아이디어
- [ ] 3D 만세력 카드 (Three.js)
- [ ] 대운 흐름 파티클 애니메이션
- [ ] AR 부적 (카메라로 공간에 배치)

---

## 10. 참고 문서

- **컴포넌트 가이드**: `/docs/DEVELOPER/COMPONENT_GUIDE.md`
- **API 레퍼런스**: `/docs/DEVELOPER/API_REFERENCE.md`
- **디자인 시스템**: `/docs/ARCHITECTURE/DESIGN.md`
- **UI 컨셉**: `/docs/ARCHITECTURE/UI_CONCEPT.md`

---

**작성자**: Claude (UI/UX 전문가)
**검수자**: Gemini (총괄 아키텍트)
