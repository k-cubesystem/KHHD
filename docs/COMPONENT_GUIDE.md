# Component Guide

해화당(Haehwadang) 컴포넌트 가이드입니다.

## 디자인 시스템

### 컬러 팔레트

```typescript
// tailwind.config.ts
colors: {
  zen: {
    bg: "#FAFAF6",       // 배경
    text: "#2C2825",     // 본문
    wood: "#6B5344",     // 액센트
    muted: "#9B8B7A",    // 보조 텍스트
    gold: "#D4AF37",     // 강조
    border: "#E8E4DC",   // 테두리
    surface: "#F5F3EE",  // 카드 배경
  },
  gold: {
    100: "#F9F5E3",
    300: "#F4E4BA",
    500: "#D4AF37",      // 브랜드 컬러
    550: "#C5A059",
    900: "#3E3210",
  }
}
```

### 타이포그래피

```css
/* 제목: Noto Serif KR */
.font-serif {
  font-family: 'Noto Serif KR', serif;
}

/* 본문: Pretendard */
.font-sans {
  font-family: 'Pretendard', sans-serif;
}
```

---

## UI 컴포넌트

### 1. Button

기본 버튼 컴포넌트입니다.

```tsx
import { Button } from "@/components/ui/button";

// 기본 (Primary)
<Button>시작하기</Button>

// 아웃라인
<Button variant="outline">취소</Button>

// 고스트
<Button variant="ghost">더보기</Button>

// 링크
<Button variant="link">자세히 알아보기</Button>

// 크기
<Button size="sm">작은 버튼</Button>
<Button size="lg">큰 버튼</Button>

// 비활성화
<Button disabled>처리 중...</Button>

// 로딩 상태
<Button disabled>
  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  분석 중...
</Button>
```

---

### 2. Card

카드 컴포넌트입니다.

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

// 기본 카드
<Card className="zen-card">
  <CardHeader>
    <CardTitle>오늘의 운세</CardTitle>
    <CardDescription>2026년 1월 23일</CardDescription>
  </CardHeader>
  <CardContent>
    <p>좋은 하루가 될 것입니다...</p>
  </CardContent>
  <CardFooter>
    <Button>자세히 보기</Button>
  </CardFooter>
</Card>

// Glass 효과
<Card className="zen-card glass-zen">
  ...
</Card>
```

**CSS 클래스**:
- `.zen-card`: 기본 Zen 스타일
- `.glass-zen`: Glassmorphism 효과

---

### 3. Input

입력 필드 컴포넌트입니다.

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="name">이름</Label>
  <Input
    id="name"
    placeholder="홍길동"
    className="h-12"
  />
</div>

// 비활성화
<Input disabled placeholder="입력 불가" />

// 에러 상태
<Input className="border-red-500 focus:ring-red-500" />
```

---

### 4. Select

선택 드롭다운 컴포넌트입니다.

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="성별 선택" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="male">남성</SelectItem>
    <SelectItem value="female">여성</SelectItem>
  </SelectContent>
</Select>
```

---

### 5. Dialog (모달)

모달 다이얼로그 컴포넌트입니다.

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>분석 완료</DialogTitle>
      <DialogDescription>
        사주 분석이 완료되었습니다.
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* 내용 */}
    </div>
    <DialogFooter>
      <Button onClick={() => setOpen(false)}>확인</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 6. Tabs

탭 컴포넌트입니다.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

<Tabs defaultValue="saju">
  <TabsList className="w-full">
    <TabsTrigger value="saju" className="flex-1">사주</TabsTrigger>
    <TabsTrigger value="face" className="flex-1">관상</TabsTrigger>
    <TabsTrigger value="palm" className="flex-1">손금</TabsTrigger>
  </TabsList>

  <TabsContent value="saju">
    <p>사주 분석 내용...</p>
  </TabsContent>
  <TabsContent value="face">
    <p>관상 분석 내용...</p>
  </TabsContent>
  <TabsContent value="palm">
    <p>손금 분석 내용...</p>
  </TabsContent>
</Tabs>
```

---

### 7. Avatar

아바타 컴포넌트입니다.

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

<Avatar>
  <AvatarImage src="/profile.jpg" alt="프로필" />
  <AvatarFallback>홍길</AvatarFallback>
</Avatar>

// 크기 조절
<Avatar className="w-16 h-16">
  ...
</Avatar>
```

---

### 8. Badge

뱃지 컴포넌트입니다.

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>새로운</Badge>
<Badge variant="secondary">보류</Badge>
<Badge variant="outline">기본</Badge>
<Badge variant="destructive">경고</Badge>
```

---

### 9. Checkbox

체크박스 컴포넌트입니다.

```tsx
import { Checkbox } from "@/components/ui/checkbox";

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <label htmlFor="terms" className="text-sm">
    이용약관에 동의합니다
  </label>
</div>
```

---

### 10. Switch

스위치 컴포넌트입니다.

```tsx
import { Switch } from "@/components/ui/switch";

<div className="flex items-center space-x-2">
  <Switch id="notifications" />
  <Label htmlFor="notifications">알림 받기</Label>
</div>
```

---

## 커스텀 컴포넌트

### 11. DaeunChart (대운 그래프)

대운 흐름을 시각화하는 차트입니다.

```tsx
import { DaeunChart, type DaeunData } from "@/components/saju/daeun-chart";

const data: DaeunData[] = [
  { age: 0, ganji: "甲子", score: 75, element: "木" },
  { age: 10, ganji: "乙丑", score: 82, element: "木" },
  // ...
];

<DaeunChart
  data={data}
  currentAge={35}
  showArea={true}
/>
```

**Props**:
- `data`: 대운 데이터 배열
- `currentAge`: 현재 나이 (해당 대운 강조)
- `showArea`: 영역 차트 표시 여부
- `className`: 추가 CSS 클래스

---

### 12. MembershipCard

멤버십 카드 컴포넌트입니다.

```tsx
import { MembershipCard } from "@/components/membership/membership-card";

<MembershipCard
  plan={{
    id: "1",
    name: "해화 멤버십",
    price: 9900,
    interval: "MONTH",
    talismans_per_period: 10,
    features: {
      daily_fortune: true,
      pdf_archive: true,
    },
  }}
  onSubscribe={() => handleSubscribe()}
/>
```

---

### 13. SubscriptionBadge

구독 상태 뱃지입니다.

```tsx
import { SubscriptionBadge } from "@/components/membership/subscription-badge";

<SubscriptionBadge />  // 구독 중이면 뱃지 표시
```

---

### 14. TalismanBalance

부적 잔액 표시 컴포넌트입니다.

```tsx
import { TalismanBalance } from "@/components/talisman-balance";

<TalismanBalance />
```

---

### 15. AnalysisForm

사주 분석 폼 컴포넌트입니다.

```tsx
import { AnalysisForm } from "@/components/analysis/analysis-form";

<AnalysisForm
  familyMembers={members}
  onComplete={() => router.push("/protected/analysis/success")}
/>
```

---

### 16. CompatibilityForm

궁합 분석 폼입니다.

```tsx
import { CompatibilityForm } from "@/components/saju/compatibility-form";

<CompatibilityForm
  member1={selectedMember1}
  member2={selectedMember2}
/>
```

---

### 17. FloatingActionMenu

플로팅 액션 버튼 메뉴입니다.

```tsx
import { FloatingActionMenu } from "@/components/floating-action-menu";

<FloatingActionMenu />
```

---

### 18. PaymentWidget

Toss Payments 결제 위젯입니다.

```tsx
import { PaymentWidget } from "@/components/payment/payment-widget";

<PaymentWidget
  amount={9900}
  orderId={orderId}
  orderName="부적 10개"
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

---

### 19. NotificationSettings

알림 설정 컴포넌트입니다.

```tsx
import { NotificationSettings } from "@/components/notification-settings";

<NotificationSettings />
```

---

### 20. PWAInstallPrompt

PWA 설치 프롬프트입니다.

```tsx
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

<PWAInstallPrompt />
```

---

## 애니메이션

### Framer Motion 표준

```tsx
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

// 순차 등장 애니메이션
<motion.div
  variants={staggerContainer}
  initial="initial"
  animate="animate"
>
  <motion.h1 variants={fadeInUp}>제목</motion.h1>
  <motion.p variants={fadeInUp}>내용</motion.p>
</motion.div>

// 호버 효과
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  클릭
</motion.button>
```

**lib/animations.ts**:
```typescript
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

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};
```

---

## 유틸리티 클래스

### Zen 스타일

```css
/* 카드 */
.zen-card {
  @apply bg-white border border-zen-border rounded-[var(--radius)] shadow-sm;
}

/* Glass 효과 */
.glass-zen {
  @apply bg-white/70 backdrop-blur-md border border-zen-border/40;
}

/* 제목 */
.text-zen-title {
  @apply font-serif font-bold text-zen-text;
}
```

### 반응형 그리드

```tsx
// 2열 그리드 (모바일 1열)
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  ...
</div>

// 3열 그리드
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  ...
</div>
```

---

## 아이콘

Lucide React를 사용합니다.

```tsx
import {
  Sun, Moon, Star, Heart,
  User, Settings, CreditCard,
  ArrowLeft, ArrowRight, Check, X
} from "lucide-react";

<Sun className="w-6 h-6 text-zen-gold" />
```

---

## 모범 사례

### 1. 컴포넌트 구조

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  className?: string;
}

export function MyComponent({ title, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className={cn("zen-card p-6", className)}
    >
      <h2 className="text-zen-title text-xl mb-4">{title}</h2>
      {/* 내용 */}
    </motion.div>
  );
}
```

### 2. 로딩 상태

```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-4 border-zen-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
```

### 3. 에러 상태

```tsx
if (error) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-red-800">
      <p className="font-medium">오류가 발생했습니다</p>
      <p className="text-sm mt-1">{error.message}</p>
    </div>
  );
}
```

### 4. 빈 상태

```tsx
if (items.length === 0) {
  return (
    <div className="text-center py-12">
      <Inbox className="w-12 h-12 text-zen-muted mx-auto mb-4" />
      <p className="text-zen-muted">아직 데이터가 없습니다</p>
    </div>
  );
}
```

---

## 최종 업데이트

- **버전**: 1.0.0
- **날짜**: 2026-01-23
