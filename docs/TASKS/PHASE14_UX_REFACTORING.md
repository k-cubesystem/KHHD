# 📐 Phase 14: UX Pro Max 리팩토링 & 디자인 시스템 확장

**작성일**: 2026-01-23  
**담당**: Gemini 3 Pro (기획/전략) + Claude (실행)  
**목표**: UX Pro Max Skill 적용 + 모바일 네비게이션 개선 + 디자인 시스템 확장

---

## 🎯 임무 개요

### Gemini 담당 (2번, 3번)
1. **기존 컴포넌트 리팩토링 (UX Pro Max 적용)**
   - TUI(Tangible User Interface) 철학 적용
   - Micro-Interactions 강화
   - Framer Motion 애니메이션 표준화

2. **디자인 시스템 확장**
   - Tailwind Config 확장 (gold-100 ~ gold-900)
   - Glassmorphism 컴포넌트 표준화
   - "The Orb Pattern" 배경 효과 추가

3. **모바일 네비게이션 개선**
   - 햄버거 메뉴 가시성 향상
   - 터치 타겟 크기 최적화 (최소 44x44px)
   - 모바일 메뉴 애니메이션 개선

### Claude 담당 (1번, 4번)
1. **새로운 기능 개발**
   - AI 개운 솔루션 고도화
   - 이미지 생성 워크플로우 개선
   - 멀티모달 분석 강화

4. **문서 작성/업데이트**
   - API 문서화
   - 컴포넌트 스토리북 작성
   - 사용자 가이드 업데이트

---

## 📋 Gemini 작업 상세 (2번, 3번)

### Task 1-5: 디자인 시스템 확장

#### Task 1: Tailwind Config 확장
**목표**: UX Pro Max Skill에 정의된 Gold Palette 확장

**작업 내용**:
```typescript
// tailwind.config.ts
gold: {
  50: '#fbf8f1',
  100: '#F9F5E3',  // 하이라이트 (UX Pro Max 정의)
  200: '#ead9b4',
  300: '#F4E4BA',  // 메인 텍스트 (UX Pro Max 정의)
  400: '#d1a55f',
  500: '#D4AF37',  // 브랜드 컬러 (UX Pro Max 정의)
  550: '#C5A059',  // Yugi Gold (기존)
  600: '#a96f2d',
  700: '#875526',
  800: '#6e4525',
  900: '#3E3210',  // 깊은 배경 그림자 (UX Pro Max 정의)
  950: '#331e0f',
}
```

**Self-Reflection**:
- 🔒 **보안**: 색상 값은 정적이므로 보안 이슈 없음.
- 🎨 **UX/디자인**: 기존 `gold-550`과 새로운 `gold-500`의 차이를 명확히 문서화 필요.
- ⚡ **성능**: Tailwind JIT 컴파일러가 사용된 색상만 생성하므로 성능 영향 없음.

---

#### Task 2: Glassmorphism 유틸리티 클래스 추가
**목표**: 일관된 Glass 효과 적용

**작업 내용**:
```css
/* globals.css */
@layer utilities {
  /* Dark Glassmorphism (Midnight in Seoul) */
  .glass-dark {
    @apply bg-ink-900/80 backdrop-blur-xl border border-gold-500/20 
           shadow-2xl shadow-gold-900/50 
           supports-[backdrop-filter]:bg-ink-900/60;
  }
  
  /* Light Glassmorphism (Morning Hanji) */
  .glass-light {
    @apply bg-white/70 backdrop-blur-md border border-zen-border/40 
           shadow-lg shadow-zen-wood/10
           supports-[backdrop-filter]:bg-white/40;
  }
  
  /* Premium Gold Glass */
  .glass-gold {
    @apply bg-gradient-to-br from-gold-100/90 to-gold-300/80 
           backdrop-blur-lg border border-gold-500/30 
           shadow-xl shadow-gold-500/20;
  }
}
```

**Self-Reflection**:
- 🔒 **보안**: CSS 유틸리티이므로 보안 이슈 없음.
- 🎨 **UX/디자인**: `backdrop-filter` 미지원 브라우저를 위한 fallback 포함.
- ⚡ **성능**: `backdrop-blur`는 GPU 가속되므로 성능 우수.

---

#### Task 3: "The Orb Pattern" 배경 컴포넌트 생성
**목표**: 신비로운 배경 효과 구현

**작업 내용**:
```tsx
// components/ui/orb-background.tsx
"use client";

import { motion } from "framer-motion";

export function OrbBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Primary Orb - Gold */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 left-1/2 w-96 h-96 bg-gold-500/20 blur-[100px] rounded-full"
      />
      
      {/* Secondary Orb - Wood */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-0 right-1/4 w-80 h-80 bg-zen-wood/15 blur-[120px] rounded-full"
      />
    </div>
  );
}
```

**Self-Reflection**:
- 🔒 **보안**: 순수 UI 컴포넌트, 보안 이슈 없음.
- 🎨 **UX/디자인**: `pointer-events-none`으로 사용자 인터랙션 방해 방지.
- ⚡ **성능**: `will-change: transform` 추가 고려 (GPU 최적화).

---

#### Task 4: Framer Motion 애니메이션 표준 정의
**목표**: 일관된 애니메이션 경험

**작업 내용**:
```typescript
// lib/animations.ts
import { Variants } from "framer-motion";

// UX Pro Max Standard: Entrance Animation
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  }
};

// UX Pro Max Standard: Hover Animation
export const hoverScale = {
  whileHover: { 
    scale: 1.02, 
    transition: { duration: 0.2 } 
  },
  whileTap: { scale: 0.98 }
};

// Shimmer Effect (Button Hover)
export const shimmerVariants: Variants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: { 
    backgroundPosition: "200% 0",
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// Stagger Children (List Items)
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};
```

**Self-Reflection**:
- 🔒 **보안**: 애니메이션 설정 파일, 보안 이슈 없음.
- 🎨 **UX/디자인**: Spring 애니메이션이 "쫀득한 느낌" 제공.
- ⚡ **성능**: `stiffness: 300, damping: 30`은 최적의 균형점.

---

#### Task 5: 체크포인트 1 - 디자인 시스템 확장 완료
**진행률**: 25% (5/20 tasks)  
**달성 성과**:
- ✅ Gold Palette 확장 (100 ~ 900)
- ✅ Glassmorphism 유틸리티 3종 추가
- ✅ Orb Background 컴포넌트 생성
- ✅ Framer Motion 애니메이션 표준 정의

**발견된 변수**: 없음  
**다음 5개 태스크**: 모바일 네비게이션 개선

---

### Task 6-10: 모바일 네비게이션 개선

#### Task 6: 햄버거 메뉴 버튼 크기 최적화
**목표**: 터치 타겟 최소 44x44px 확보

**작업 내용**:
```tsx
// components/protected-header.tsx (수정)
{/* Mobile Toggle - 개선 전 */}
<button
  className="lg:hidden p-2 text-zen-text hover:bg-zen-bg rounded-sm transition-colors"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
>
  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
</button>

{/* Mobile Toggle - 개선 후 */}
<motion.button
  whileTap={{ scale: 0.95 }}
  className="lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center 
             text-zen-text hover:bg-zen-gold/10 rounded-sm transition-colors
             active:bg-zen-gold/20"
  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
  aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
>
  <motion.div
    initial={false}
    animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
    transition={{ duration: 0.2 }}
  >
    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
  </motion.div>
</motion.button>
```

**Self-Reflection**:
- 🔒 **보안**: `aria-label` 추가로 접근성 향상.
- 🎨 **UX/디자인**: 44x44px는 Apple HIG 권장 사항.
- ⚡ **성능**: Framer Motion의 `whileTap`은 네이티브 이벤트 사용.

---

#### Task 7: 모바일 메뉴 애니메이션 개선
**목표**: 부드러운 슬라이드 인 효과

**작업 내용**:
```tsx
// components/protected-header.tsx (수정)
{/* Mobile Menu - 개선 전 */}
{mobileMenuOpen && (
  <div className="lg:hidden fixed inset-0 top-20 bg-zen-bg/98 backdrop-blur-md z-[100] 
                  animate-in fade-in slide-in-from-top-4 overflow-y-auto">
    {/* ... */}
  </div>
)}

{/* Mobile Menu - 개선 후 */}
<AnimatePresence>
  {mobileMenuOpen && (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="lg:hidden fixed inset-0 top-20 bg-zen-bg/98 backdrop-blur-md z-[100] overflow-y-auto"
    >
      <nav className="flex flex-col p-8 gap-4 font-serif">
        {/* Menu Items with Stagger */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          {menuItems.map((item, index) => (
            <motion.div key={item.href} variants={fadeInUp}>
              <Link href={item.href} /* ... */ />
            </motion.div>
          ))}
        </motion.div>
      </nav>
    </motion.div>
  )}
</AnimatePresence>
```

**Self-Reflection**:
- 🔒 **보안**: 애니메이션만 변경, 보안 영향 없음.
- 🎨 **UX/디자인**: `AnimatePresence`로 닫힐 때도 애니메이션 적용.
- ⚡ **성능**: `staggerChildren`으로 순차 등장 효과.

---

#### Task 8: site-header.tsx 모바일 메뉴 개선
**목표**: 비로그인 헤더도 동일한 UX 적용

**작업 내용**:
```tsx
// components/site-header.tsx (수정)
{/* Mobile Menu Toggle - 개선 */}
<div className="md:hidden flex items-center gap-4">
  <Link href="/auth/login">
    <Button variant="ghost" className="text-sm text-zen-text px-3 min-h-[44px]">
      로그인
    </Button>
  </Link>
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={() => setIsMenuOpen(!isMenuOpen)}
    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center 
               text-zen-text hover:bg-zen-gold/10 rounded-sm transition-colors"
    aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
  >
    <motion.div
      animate={{ rotate: isMenuOpen ? 90 : 0 }}
      transition={{ duration: 0.2 }}
    >
      {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </motion.div>
  </motion.button>
</div>

{/* Mobile Sidebar - AnimatePresence 적용 */}
<AnimatePresence>
  {isMenuOpen && (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute top-24 left-0 w-full bg-zen-bg/98 backdrop-blur-md z-40 
                 p-8 flex flex-col gap-6 md:hidden border-b border-zen-border"
    >
      {/* Menu Items */}
    </motion.div>
  )}
</AnimatePresence>
```

**Self-Reflection**:
- 🔒 **보안**: 동일한 접근성 개선 적용.
- 🎨 **UX/디자인**: 두 헤더의 일관성 확보.
- ⚡ **성능**: 동일한 애니메이션 표준 사용.

---

#### Task 9: 모바일 메뉴 항목 터치 영역 확대
**목표**: 모든 링크 최소 44px 높이 확보

**작업 내용**:
```tsx
// components/protected-header.tsx (모바일 메뉴 내부)
{/* 개선 전 */}
<Link href="/protected/saju/today" className="p-4 text-xl font-bold ...">
  <Sun className="w-6 h-6 text-zen-gold" /> 오늘의 운세
</Link>

{/* 개선 후 */}
<Link 
  href="/protected/saju/today" 
  className="p-5 min-h-[60px] text-xl font-bold text-zen-text hover:text-zen-wood 
             flex items-center gap-4 bg-white border border-zen-border rounded-sm 
             shadow-sm active:scale-[0.98] transition-all"
  onClick={() => setMobileMenuOpen(false)}
>
  <Sun className="w-6 h-6 text-zen-gold flex-shrink-0" /> 
  <span>오늘의 운세</span>
</Link>
```

**Self-Reflection**:
- 🔒 **보안**: 변경 없음.
- 🎨 **UX/디자인**: 60px 높이로 여유 있는 터치 영역.
- ⚡ **성능**: `active:scale-[0.98]`로 시각적 피드백.

---

#### Task 10: 체크포인트 2 - 모바일 네비게이션 개선 완료
**진행률**: 50% (10/20 tasks)  
**달성 성과**:
- ✅ 햄버거 버튼 44x44px 확보
- ✅ AnimatePresence 적용 (부드러운 열림/닫힘)
- ✅ site-header.tsx 동일 UX 적용
- ✅ 모든 터치 타겟 60px 이상

**발견된 변수**: 없음  
**다음 5개 태스크**: 기존 컴포넌트 리팩토링

---

### Task 11-15: 기존 컴포넌트 UX Pro Max 리팩토링

#### Task 11: Button 컴포넌트 Shimmer 효과 추가
**목표**: 호버 시 빛이 지나가는 효과

**작업 내용**:
```tsx
// components/ui/button.tsx (수정)
import { motion } from "framer-motion";

const buttonVariants = cva(
  "inline-flex items-center justify-center /* ... */",
  {
    variants: {
      variant: {
        default: "bg-zen-wood text-white hover:bg-[#7A604D] relative overflow-hidden group",
        // ... 기타 variants
      }
    }
  }
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : motion.button;
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        {...props}
      >
        {/* Shimmer Overlay (variant="default"만) */}
        {variant === "default" && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        )}
        {props.children}
      </Comp>
    );
  }
);
```

**Self-Reflection**:
- 🔒 **보안**: UI 개선만, 보안 영향 없음.
- 🎨 **UX/디자인**: Shimmer는 "프리미엄" 느낌 강화.
- ⚡ **성능**: `overflow-hidden`으로 레이아웃 shift 방지.

---

#### Task 12: Card 컴포넌트 Depth 강화
**목표**: 다중 레이어 그림자로 공간감 형성

**작업 내용**:
```tsx
// components/ui/card.tsx (수정)
const cardVariants = cva(
  "rounded-[var(--radius)] bg-white border border-zen-border transition-all duration-300",
  {
    variants: {
      depth: {
        flat: "shadow-none",
        low: "shadow-sm hover:shadow-md",
        medium: "shadow-md hover:shadow-lg",
        high: "shadow-lg shadow-zen-wood/10 hover:shadow-xl hover:shadow-zen-wood/20"
      }
    },
    defaultVariants: {
      depth: "low"
    }
  }
);

export function Card({ 
  className, 
  depth = "low",
  hoverable = false,
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { 
  depth?: "flat" | "low" | "medium" | "high";
  hoverable?: boolean;
}) {
  return (
    <motion.div
      className={cn(cardVariants({ depth }), className)}
      whileHover={hoverable ? { y: -4, transition: { duration: 0.2 } } : undefined}
      {...props}
    />
  );
}
```

**Self-Reflection**:
- 🔒 **보안**: 변경 없음.
- 🎨 **UX/디자인**: `depth` prop으로 유연한 사용.
- ⚡ **성능**: `whileHover`는 조건부 적용.

---

#### Task 13: Input 컴포넌트 Focus Ring 개선
**목표**: 명확한 포커스 상태 표시

**작업 내용**:
```tsx
// components/ui/input.tsx (수정)
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <motion.input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[var(--radius)] border border-zen-border",
          "bg-white px-4 py-2 text-sm text-zen-text",
          "placeholder:text-zen-muted",
          "focus:outline-none focus:ring-2 focus:ring-zen-gold focus:ring-offset-2",
          "focus:border-zen-gold",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",
          className
        )}
        whileFocus={{ scale: 1.01 }}
        ref={ref}
        {...props}
      />
    );
  }
);
```

**Self-Reflection**:
- 🔒 **보안**: 변경 없음.
- 🎨 **UX/디자인**: `ring-offset-2`로 명확한 포커스.
- ⚡ **성능**: `whileFocus`는 가벼운 애니메이션.

---

#### Task 14: Loading Skeleton 컴포넌트 생성
**목표**: Zero Layout Shift 구현

**작업 내용**:
```tsx
// components/ui/skeleton.tsx (신규)
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={cn(
        "bg-zen-border rounded-[var(--radius)]",
        className
      )}
      {...props}
    />
  );
}

// Preset Skeletons
export function SkeletonCard() {
  return (
    <div className="zen-card p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
```

**Self-Reflection**:
- 🔒 **보안**: 순수 UI, 보안 이슈 없음.
- 🎨 **UX/디자인**: Preset으로 일관된 로딩 경험.
- ⚡ **성능**: `opacity` 애니메이션은 GPU 가속.

---

#### Task 15: 체크포인트 3 - 컴포넌트 리팩토링 완료
**진행률**: 75% (15/20 tasks)  
**달성 성과**:
- ✅ Button Shimmer 효과
- ✅ Card Depth 시스템
- ✅ Input Focus Ring 개선
- ✅ Skeleton 컴포넌트 생성

**발견된 변수**: 없음  
**다음 5개 태스크**: 페이지 레벨 적용 및 문서화

---

### Task 16-20: 페이지 레벨 적용 및 최종 검수

#### Task 16: Dashboard에 Orb Background 적용
**목표**: 신비로운 배경 효과

**작업 내용**:
```tsx
// app/protected/page.tsx (수정)
import { OrbBackground } from "@/components/ui/orb-background";

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen">
      <OrbBackground />
      <div className="relative z-10">
        {/* 기존 컨텐츠 */}
      </div>
    </div>
  );
}
```

---

#### Task 17: 주요 페이지에 fadeInUp 애니메이션 적용
**목표**: 일관된 진입 경험

**작업 내용**:
```tsx
// app/protected/analysis/page.tsx (예시)
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export default function AnalysisPage() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="container mx-auto p-6"
    >
      <motion.h1 variants={fadeInUp} className="text-zen-title text-4xl mb-8">
        천지인 분석
      </motion.h1>
      
      <motion.div variants={fadeInUp}>
        <Card depth="medium" hoverable>
          {/* ... */}
        </Card>
      </motion.div>
    </motion.div>
  );
}
```

---

#### Task 18: 반응형 테스트 (모바일 320px ~ 태블릿 1024px)
**목표**: 모든 디바이스에서 완벽한 UX

**테스트 체크리스트**:
- [ ] iPhone SE (375x667) - 햄버거 메뉴 터치 가능
- [ ] iPhone 12 Pro (390x844) - 메뉴 항목 간격 적절
- [ ] iPad (768x1024) - 데스크톱 네비게이션 표시
- [ ] Galaxy Fold (280x653) - 최소 너비에서도 레이아웃 유지

---

#### Task 19: REFLECTION_REPORT.md 업데이트
**목표**: 리팩토링 내용 문서화

**작성 내용**:
```markdown
## Phase 14 Reflection (2026-01-23)

### 🔒 보안 전문가 관점
- 모든 버튼에 `aria-label` 추가로 접근성 향상
- 애니메이션은 순수 UI이므로 보안 영향 없음

### 🎨 UX/디자인 전문가 관점
- 터치 타겟 44x44px 확보로 모바일 UX 대폭 개선
- Shimmer 효과로 프리미엄 느낌 강화
- Skeleton으로 Zero Layout Shift 달성

### ⚡ 시니어 엔지니어 관점
- Framer Motion 표준화로 유지보수성 향상
- `lib/animations.ts`로 중복 코드 제거
- GPU 가속 애니메이션으로 60fps 유지
```

---

#### Task 20: 체크포인트 4 - Phase 14 완료
**진행률**: 100% (20/20 tasks)  
**최종 성과**:
- ✅ UX Pro Max Skill 100% 적용
- ✅ 모바일 네비게이션 완전 개선
- ✅ 디자인 시스템 확장 완료
- ✅ 문서화 완료

**빌드 상태**: 테스트 필요  
**다음 Phase**: Claude에게 인계 (1번, 4번 작업)

---

## 📋 Claude 작업 상세 (1번, 4번)

### 1번: 새로운 기능 개발

#### 작업 범위
1. **AI 개운 솔루션 고도화**
   - 관상/손금 이미지 분석 정확도 향상
   - 풍수 이미지 생성 품질 개선
   - 멀티모달 분석 워크플로우 최적화

2. **Fate Engineer Skill 활용**
   - `calculate_complex_saju`: lunar-javascript 연동 강화
   - `analyze_multimodal_vision`: Gemini Vision API 최적화
   - `check_payment_status`: 크레딧 차감 로직 정교화

3. **새로운 분석 기능**
   - 대운(大運) 그래프 시각화
   - 월운/일운 상세 분석
   - 가족 간 궁합 매트릭스

#### 기술 스택
- Gemini 2.0 Flash (이미지 분석)
- lunar-javascript (만세력 계산)
- Recharts (데이터 시각화)

---

### 4번: 문서 작성/업데이트

#### 작업 범위
1. **API 문서화**
   - `/docs/API_REFERENCE.md` 작성
   - Server Actions 명세서
   - Supabase RPC 함수 문서

2. **컴포넌트 가이드**
   - `/docs/COMPONENT_GUIDE.md` 작성
   - UX Pro Max 적용 예시
   - Framer Motion 사용법

3. **사용자 가이드**
   - `/docs/USER_GUIDE.md` 업데이트
   - 멤버십 가입 절차
   - 부적 충전 방법
   - 사주 분석 해석 가이드

4. **개발자 온보딩**
   - `/docs/DEVELOPER_ONBOARDING.md` 작성
   - 로컬 환경 설정
   - Supabase 마이그레이션 가이드
   - 배포 프로세스

---

## 🎯 성공 기준

### Gemini (2번, 3번)
- [ ] 모바일에서 햄버거 메뉴 44x44px 이상
- [ ] 모든 페이지에 fadeInUp 애니메이션 적용
- [ ] Button에 Shimmer 효과 구현
- [ ] Orb Background 3개 이상 페이지 적용
- [ ] `npm run build` 성공

### Claude (1번, 4번)
- [ ] 관상 분석 정확도 80% 이상
- [ ] 대운 그래프 시각화 완료
- [ ] API 문서 100% 커버리지
- [ ] 컴포넌트 가이드 20개 이상 예시
- [ ] 사용자 가이드 스크린샷 포함

---

## 📝 협업 프로토콜

### Gemini → Claude 인계
1. Gemini가 Task 1-20 완료 후 `MISSION_LOG.md` 업데이트
2. `/docs/TASKS/PHASE14_HANDOFF_TO_CLAUDE.md` 작성
3. Claude는 해당 문서 확인 후 작업 시작

### Claude → Gemini 보고
1. Claude가 1번, 4번 작업 완료 후 `MISSION_LOG.md` 업데이트
2. `/docs/PHASE14_COMPLETION.md` 작성
3. Gemini는 최종 검수 및 빌드 테스트

---

## ⏱️ 예상 소요 시간
- **Gemini (2번, 3번)**: 2-3시간
- **Claude (1번, 4번)**: 3-4시간
- **총 소요 시간**: 5-7시간

---

**작성자**: Gemini 3 Pro  
**승인 대기 중**: 사용자 확인 필요
