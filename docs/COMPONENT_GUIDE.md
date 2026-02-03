# Component Guide

해화당 프로젝트의 모든 컴포넌트 사용 가이드 및 UX Pro Max 패턴 적용 예시

**작성일**: 2026-02-03
**디자인 시스템**: Midnight in Cheongdam (Dark Luxury)

---

## 목차

- [디자인 원칙](#디자인-원칙)
- [UI 기본 컴포넌트](#ui-기본-컴포넌트)
- [분석 컴포넌트](#분석-컴포넌트)
- [대시보드 컴포넌트](#대시보드-컴포넌트)
- [애니메이션 패턴](#애니메이션-패턴)
- [레이아웃 패턴](#레이아웃-패턴)

---

## 디자인 원칙

### Midnight in Cheongdam 테마

모든 컴포넌트는 다음 디자인 시스템을 따릅니다:

```tsx
// 필수 래퍼 구조
<div className="min-h-screen bg-background text-ink-light font-sans relative">
  {/* 노이즈 텍스처 오버레이 */}
  <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
    <div className="w-full h-full" style={{ backgroundImage: 'url(...)' }} />
  </div>

  {/* 컨텐츠 */}
  <div className="relative z-10">
    {/* 내용 */}
  </div>
</div>
```

### 색상 팔레트

```typescript
// Tailwind 클래스
text-ink-light      // #FFFFFF - 본문 텍스트
text-primary        // #E2D5B5 - 샴페인 골드 (강조)
text-primary-dim    // #C8B273 - 뮤트 골드
text-seal           // #8E2828 - 도장 레드
bg-background       // #0A0A0A - 딥 블랙
bg-surface          // #1A1917 - 다크 그레이
```

---

## UI 기본 컴포넌트

### 1. Button

**파일**: `components/ui/button.tsx`

#### 기본 사용법

```tsx
import { Button } from "@/components/ui/button";

// Primary 버튼
<Button variant="default">
  시작하기
</Button>

// Ghost 버튼 (테두리만)
<Button variant="ghost">
  취소
</Button>

// 위험 버튼
<Button variant="destructive">
  삭제
</Button>
```

#### UX Pro Max 패턴

```tsx
// 애니메이션 + 아이콘
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
  <Button className="bg-gradient-to-r from-primary to-primary-dim hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
    <span>천기 누설 시작하기</span>
  </Button>
</motion.div>
```

#### Before / After

**Before** (기본):
```tsx
<button>클릭</button>
```

**After** (UX Pro Max):
```tsx
<motion.div whileHover={{ scale: 1.02 }}>
  <Button className="relative overflow-hidden group">
    <span className="relative z-10">클릭</span>
    {/* Shimmer 효과 */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
  </Button>
</motion.div>
```

---

### 2. Card

**파일**: `components/ui/card.tsx`

#### 기본 사용법

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
  </CardHeader>
  <CardContent>
    <p>내용</p>
  </CardContent>
</Card>
```

#### UX Pro Max 패턴

```tsx
// Glass Morphism + Depth
<Card className="bg-surface/50 backdrop-blur-md border border-primary/20 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
  {/* 노이즈 텍스처 */}
  <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none">
    <div className="w-full h-full noise-texture" />
  </div>

  <CardHeader className="relative z-10">
    <CardTitle className="font-serif text-2xl text-ink-light">
      천지인 분석
    </CardTitle>
  </CardHeader>

  <CardContent className="relative z-10">
    <p className="text-ink-light/70 font-light leading-relaxed">
      하늘, 땅, 사람의 운명을 꿰뚫는 통합 분석
    </p>
  </CardContent>
</Card>
```

---

### 3. Dialog (Modal)

**파일**: `components/ui/dialog.tsx`

#### 기본 사용법

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
    </DialogHeader>
    <div>내용</div>
  </DialogContent>
</Dialog>
```

#### UX Pro Max 패턴

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl bg-surface/95 backdrop-blur-xl border border-primary/30">
    <DialogHeader>
      <DialogTitle className="text-2xl font-serif text-center text-ink-light">
        프로필 선택
      </DialogTitle>
      <DialogDescription className="text-center text-ink-light/60 pt-2">
        운세를 확인할 분을 선택해주세요
      </DialogDescription>
    </DialogHeader>

    {/* 그리드 레이아웃 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
      {members.map((member) => (
        <motion.button
          key={member.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border-2 border-primary/20 hover:border-primary/50 transition-all"
        >
          {/* 카드 내용 */}
        </motion.button>
      ))}
    </div>
  </DialogContent>
</Dialog>
```

---

### 4. Input

**파일**: `components/ui/input.tsx`

#### UX Pro Max 패턴

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="name" className="text-sm font-bold text-primary tracking-wider uppercase">
    이름
  </Label>
  <Input
    id="name"
    placeholder="홍길동"
    className="bg-surface/50 border-primary/20 focus:border-primary/50 h-12 text-ink-light placeholder:text-ink-light/40 rounded-lg backdrop-blur-sm"
  />
</div>
```

---

### 5. Badge

**파일**: `components/ui/badge.tsx`

#### 사용 예시

```tsx
import { Badge } from "@/components/ui/badge";

// 상태 표시
<Badge variant="default">프리미엄</Badge>
<Badge variant="secondary">무료</Badge>
<Badge variant="destructive">만료</Badge>

// 커스텀 스타일
<Badge className="bg-primary/20 text-primary border border-primary/30">
  VIP
</Badge>
```

---

### 6. Select (드롭다운)

**파일**: `components/ui/select.tsx`

#### UX Pro Max 패턴

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select>
  <SelectTrigger className="bg-surface/50 border-primary/20 h-12 text-ink-light">
    <SelectValue placeholder="관계 선택" />
  </SelectTrigger>
  <SelectContent className="bg-surface border-primary/30 text-ink-light">
    <SelectItem value="본인">본인</SelectItem>
    <SelectItem value="배우자">배우자</SelectItem>
    <SelectItem value="부모">부모</SelectItem>
    <SelectItem value="자녀">자녀</SelectItem>
  </SelectContent>
</Select>
```

---

### 7. Skeleton (로딩)

**파일**: `components/ui/skeleton.tsx`

#### UX Pro Max 패턴

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// 카드 스켈레톤
<Card className="p-6">
  <Skeleton className="h-6 w-32 mb-4 bg-primary/10" />
  <Skeleton className="h-4 w-full mb-2 bg-primary/10" />
  <Skeleton className="h-4 w-3/4 bg-primary/10" />
</Card>

// 애니메이션 추가
<Skeleton className="h-12 w-full bg-gradient-to-r from-surface/50 via-primary/10 to-surface/50 animate-shimmer" />
```

---

## 분석 컴포넌트

### 8. AnalysisForm

**파일**: `components/analysis/analysis-form.tsx`

천지인 분석 폼 컴포넌트

#### 사용법

```tsx
import { AnalysisForm } from "@/components/analysis/analysis-form";

<AnalysisForm members={familyMembers} initialMemberId={targetId} />
```

#### 주요 기능
- 3단계 프로그레스 바
- 구성원 선택 → 이미지 업로드 → 최종 확인
- 크레딧 잔액 실시간 표시
- Framer Motion 애니메이션

---

### 9. SajuProfileSelector

**파일**: `components/analysis/saju-profile-selector.tsx`

프로필 선택 모달 (인터셉터 패턴)

#### 사용법

```tsx
import { SajuProfileSelector } from "@/components/analysis/saju-profile-selector";

const [isOpen, setIsOpen] = useState(false);
const [targetRoute, setTargetRoute] = useState("");

<SajuProfileSelector
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  targetRoute={targetRoute}
/>
```

#### 특징
- 구성원 없을 때: "사주 등록" 안내
- 구성원 있을 때: 프로필 그리드 표시
- 선택 시 `targetId` 파라미터와 함께 이동

---

### 10. DailyFortuneView

**파일**: `components/analysis/daily-fortune-view.tsx`

일일 운세 표시 컴포넌트

#### 사용법

```tsx
import { DailyFortuneView } from "@/components/analysis/daily-fortune-view";

<DailyFortuneView userId={userId} userName={userName} />
```

---

## 대시보드 컴포넌트

### 11. Hero2026

**파일**: `components/dashboard/hero-2026.tsx`

2026년 병오년 히어로 배너

#### 사용법

```tsx
import { Hero2026 } from "@/components/dashboard/hero-2026";

<Hero2026 isGuest={false} masterName="홍길동" />
```

#### 디자인 요소
- 다크 그라디언트 배경
- 노이즈 텍스처
- 샴페인 골드 + 도장 레드 악센트
- 반응형 레이아웃

---

### 12. CreditBalance

**파일**: `components/dashboard/credit-balance.tsx`

부적 잔액 표시 위젯

#### UX Pro Max 패턴

```tsx
import { CreditBalance } from "@/components/dashboard/credit-balance";

<CreditBalance
  balance={creditBalance}
  showButton={true}
  onRecharge={() => router.push('/protected/membership')}
/>
```

---

### 13. EnergyChart

**파일**: `components/dashboard/energy-chart.tsx`

오행 에너지 차트 (레이더 차트)

#### 사용법

```tsx
import { EnergyChart } from "@/components/dashboard/energy-chart";

<EnergyChart
  elements={{
    wood: 20,
    fire: 35,
    earth: 15,
    metal: 10,
    water: 20
  }}
/>
```

---

### 14. SkyEarthHumanStatus

**파일**: `components/dashboard/sky-earth-human-status.tsx`

천지인 3단 상태 표시

#### 특징
- 하늘(天), 땅(地), 사람(人) 3단 진행 상태
- 애니메이션 프로그레스 바
- 완료 상태별 색상 변경

---

## 애니메이션 패턴

### 15. Page 진입 애니메이션

```tsx
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

<motion.div
  variants={staggerContainer}
  initial="initial"
  animate="animate"
  className="space-y-8"
>
  <motion.h1 variants={fadeInUp} className="text-4xl font-serif">
    제목
  </motion.h1>

  <motion.p variants={fadeInUp} className="text-ink-light/70">
    설명
  </motion.p>

  <motion.div variants={fadeInUp}>
    <Card>카드 내용</Card>
  </motion.div>
</motion.div>
```

---

### 16. Hover 애니메이션

```tsx
// Scale on Hover
<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
  <Card>내용</Card>
</motion.div>

// Glow on Hover
<div className="group">
  <Card className="hover:shadow-xl hover:shadow-primary/20 transition-all duration-300">
    내용
  </Card>
</div>

// Border Glow
<Card className="border border-primary/20 hover:border-primary/50 transition-colors">
  내용
</Card>
```

---

### 17. Loading Spinner

```tsx
import { Loader2 } from "lucide-react";

// 기본
<Loader2 className="w-6 h-6 animate-spin text-primary" />

// 풀 페이지 로딩
<div className="flex flex-col items-center justify-center min-h-[60vh]">
  <div className="relative">
    <div className="w-20 h-20 rounded-full border-t-2 border-primary animate-spin" />
    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
  </div>
  <p className="mt-6 text-ink-light/60 font-serif">천기를 계산하는 중...</p>
</div>
```

---

### 18. Staggered List Animation

```tsx
<motion.div
  variants={staggerContainer}
  initial="initial"
  animate="animate"
>
  {items.map((item, index) => (
    <motion.div
      key={item.id}
      variants={fadeInUp}
      custom={index}
      className="mb-4"
    >
      <Card>{item.name}</Card>
    </motion.div>
  ))}
</motion.div>
```

---

## 레이아웃 패턴

### 19. 2열 그리드 (반응형)

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <Card>카드 1</Card>
  <Card>카드 2</Card>
  <Card>카드 3</Card>
  <Card>카드 4</Card>
</div>
```

---

### 20. 센터 정렬 컨테이너

```tsx
<div className="flex flex-col gap-8 w-full max-w-5xl mx-auto py-12 px-6 pb-32">
  <div className="text-center space-y-4">
    <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink-light">
      제목
    </h1>
    <p className="text-ink-light/70 max-w-2xl mx-auto">
      설명
    </p>
  </div>

  {/* 컨텐츠 */}
</div>
```

---

### 21. Fixed Background Pattern

```tsx
<div className="relative min-h-screen">
  {/* 고정 배경 */}
  <div className="fixed inset-0 -z-10">
    <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a0a] via-[#0a0a0a] to-[#1a1410]" />
    <div className="absolute inset-0 opacity-10 noise-texture" />
  </div>

  {/* 스크롤 가능한 컨텐츠 */}
  <div className="relative">
    {/* 페이지 내용 */}
  </div>
</div>
```

---

### 22. Badge Grid

```tsx
<div className="flex flex-wrap gap-2">
  <Badge>태그 1</Badge>
  <Badge>태그 2</Badge>
  <Badge>태그 3</Badge>
</div>
```

---

### 23. Icon + Text Row

```tsx
import { Calendar, User, MapPin } from "lucide-react";

<div className="flex items-center gap-4 text-sm text-ink-light/60">
  <span className="flex items-center gap-1">
    <User className="w-4 h-4" />
    본인
  </span>
  <span className="flex items-center gap-1">
    <Calendar className="w-4 h-4" />
    1990-01-01
  </span>
  <span className="flex items-center gap-1">
    <MapPin className="w-4 h-4" />
    서울
  </span>
</div>
```

---

### 24. Glassmorphism Card

```tsx
<Card className="bg-surface/30 backdrop-blur-xl border border-primary/20 shadow-2xl">
  <CardContent className="p-8">
    <div className="relative z-10">
      {/* 내용 */}
    </div>
  </CardContent>
</Card>
```

---

### 25. Progress Steps

```tsx
<div className="flex items-center justify-between mb-12">
  {[1, 2, 3].map((step) => (
    <div key={step} className="flex flex-col items-center gap-2">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2",
        currentStep >= step
          ? "bg-primary text-background border-primary"
          : "bg-surface text-ink-light/40 border-primary/20"
      )}>
        {currentStep > step ? <Check className="w-5 h-5" /> : step}
      </div>
      <span className="text-xs text-ink-light/60">
        {step === 1 ? "선택" : step === 2 ? "입력" : "완료"}
      </span>
    </div>
  ))}
</div>
```

---

## 타이포그래피 패턴

### 26. 페이지 제목

```tsx
<h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-ink-light italic leading-tight">
  천지인(天地人) <br />
  <span className="text-primary-dim">심층 분석실</span>
</h1>
```

---

### 27. 섹션 제목

```tsx
<h2 className="text-2xl md:text-3xl font-serif font-bold text-ink-light mb-6">
  오늘의 운세
</h2>
```

---

### 28. 본문 텍스트

```tsx
<p className="text-base md:text-lg text-ink-light/70 font-light leading-relaxed">
  매일 아침 당신만을 위한 맞춤 운세를 확인하세요.
</p>
```

---

### 29. 작은 라벨

```tsx
<span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">
  Premium Feature
</span>
```

---

### 30. 버티컬 텍스트 (강조)

```tsx
<span className="writing-vertical-rl text-primary font-serif text-xl">
  運命
</span>
```

---

## 특수 컴포넌트

### 31. SimpleTyping (타이핑 애니메이션)

**파일**: `components/ui/simple-typing.tsx`

```tsx
import { SimpleTyping } from "@/components/ui/simple-typing";

<SimpleTyping
  text="하늘, 땅, 사람의 운명을 꿰뚫는 분석"
  speed={50}
  className="text-ink-light font-light"
/>
```

---

### 32. OrbBackground (배경 효과)

**파일**: `components/ui/orb-background.tsx`

```tsx
import { OrbBackground } from "@/components/ui/orb-background";

<div className="relative">
  <OrbBackground />
  <div className="relative z-10">
    {/* 컨텐츠 */}
  </div>
</div>
```

---

### 33. Marquee (흐르는 텍스트)

**파일**: `components/ui/marquee.tsx`

```tsx
import { Marquee } from "@/components/ui/marquee";

<Marquee speed={40}>
  <span className="text-ink-light/40 font-serif mx-8">
    正統 命理學 기반 AI 분석
  </span>
</Marquee>
```

---

## 모범 사례 요약

### ✅ DO

1. **항상 Framer Motion 사용** - 페이지 진입, 호버, 탭 애니메이션
2. **Glass Morphism 적용** - `backdrop-blur` + 반투명 배경
3. **Noise Texture 오버레이** - 깊이감과 프리미엄 느낌
4. **명확한 시각적 계층** - 큰 제목(serif) + 작은 본문(sans)
5. **Touch-Friendly** - 최소 44px 터치 타겟
6. **로딩 상태 표시** - Skeleton 또는 Spinner
7. **에러 처리** - Toast 알림 + 명확한 메시지

### ❌ DON'T

1. **라이트 모드 사용 금지** - 다크 테마만 사용
2. **Pure White 배경 금지** - 항상 `bg-surface` 또는 `bg-background`
3. **기본 Tailwind Blue 금지** - 샴페인 골드/도장 레드만 사용
4. **애니메이션 없는 페이지 금지** - 최소한 fadeIn은 적용
5. **평면적 디자인 금지** - 깊이감(shadow, blur) 필수

---

## 디버깅 팁

### 스타일이 적용되지 않을 때

1. **Tailwind 클래스 확인**
   ```bash
   npm run dev
   ```
   개발 서버에서 실시간 확인

2. **커스텀 클래스 확인**
   `app/globals.css`에 정의된 클래스 확인

3. **z-index 충돌**
   `relative z-10` 또는 `relative z-20` 추가

### 애니메이션이 작동하지 않을 때

1. **Framer Motion import 확인**
   ```tsx
   import { motion } from "framer-motion";
   ```

2. **variants 정의 확인**
   ```tsx
   import { fadeInUp, staggerContainer } from "@/lib/animations";
   ```

---

## 변경 이력

- **2026-02-03**: 초기 문서 작성 (Claude)
- 30개 이상 컴포넌트 예시 포함
- UX Pro Max 패턴 적용

---

**작성자**: Claude Sonnet 4.5
**Gemini 검토**: 대기 중
