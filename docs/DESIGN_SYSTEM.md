# 청담해화당 Minimalist Premium Design System

> **기준 페이지**: `/protected/profile/manse` (만세력 페이지 - manse-client.tsx)
> **디자인 철학**: "Less is More" - Minimalism × Premium × Elegant
> **최종 업데이트**: 2026-02-11

## 디자인 철학

**Minimalist × Premium × Elegant**

- **얇은 폰트 > 굵은 폰트** (font-light, font-normal > font-bold)
- **적은 색상** (Gold #D4AF37, Black #0A0A0A, White + opacity)
- **얇은 아이콘** (strokeWidth={1})
- **여백을 통한 호흡**
- **그라데이션은 최소화** (페이지 타이틀에만 사용)

---

## 📐 타이포그래피 시스템 (Typography System)

### Font Families

```css
/* 명조체 (제목, 고급스러운 텍스트) */
font-serif: "Noto Serif KR", serif  /* Weights: 200, 300, 400, 500, 600, 700, 900 */

/* 고딕체 (본문, UI 요소) */
font-sans: "Noto Sans KR", sans-serif
```

### 1. 페이지 타이틀 (Page Titles)

```tsx
// 메인 타이틀 (h1) - 그라데이션 사용 가능
className =
  'text-4xl font-black bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent'

// 서브 타이틀 설명
className = 'text-muted-foreground' // 기본 14px, font-light
```

### 2. 섹션 헤더 (Section Headers)

```tsx
// 표준 섹션 헤더 (h3)
className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2"

// 아이콘 포함 예시
<h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
  <BookOpen className="w-4 h-4" strokeWidth={1} />
  사주팔자 (四柱八字)
</h3>
```

### 3. 카드 타이틀 (Card Titles)

```tsx
// 작은 카드 헤더
className = 'text-xs text-muted-foreground mb-2'

// 카드 내부 강조 텍스트
className = 'text-lg font-bold' // 또는 text-xl font-bold
```

### 4. 본문 텍스트 (Body Text)

```tsx
// 표준 본문
className = 'text-sm text-muted-foreground leading-relaxed'

// 강조 본문
className = 'text-sm font-bold'

// 설명 본문
className = 'text-xs text-muted-foreground/70'
```

### 5. 버튼 텍스트 (Button Labels)

```tsx
// 메인 버튼
className = 'text-sm font-bold' // 또는 font-medium

// 보조 버튼/링크
className = 'text-xs font-bold'
```

### 폰트 무게 사용 규칙 ⭐

**✅ 사용 권장:**

- `font-light` (300) - 본문, 설명
- `font-normal` (400) - 일반 텍스트
- `font-medium` (500) - 강조 버튼
- `font-bold` (700) - 섹션 헤더만 (uppercase와 함께)
- `font-black` (900) - 페이지 타이틀만 (gradient와 함께)

**❌ 사용 지양:**

- `font-semibold` (600) - 사용하지 않음
- 일반 텍스트에 `font-bold` - 너무 무거움

---

## 🎨 색상 시스템 (Color System)

### 주요 색상 (Primary Colors)

```css
/* Gold (Primary) */
#D4AF37 - 메인 골드
#F4E4BA - 라이트 골드 (호버)
#ECB613 - 브라이트 골드 (강조, 이전 시스템)

/* Background */
#0A0A0A - 메인 배경
#050505 - 다크 배경
rgba(26, 25, 23, 0.5) - 글래스 배경

/* Text Colors */
#FFFFFF - 화이트 (제목)
#E5E5E5 - 라이트 그레이 (본문)
rgba(255,255,255,0.6) - Muted (보조)
rgba(255,255,255,0.4) - Dimmed (비활성)
```

### 색상 사용 규칙

```tsx
// 제목 텍스트
text - ink - light // #FFFFFF에 가까움
text - primary // #D4AF37

// 본문 텍스트
text - muted - foreground // rgba(255,255,255,0.6)
text - muted - foreground / 70 // rgba(255,255,255,0.42)

// 배경
bg - white / 5 // rgba(255,255,255,0.05)
bg - white / 10 // rgba(255,255,255,0.10)
bg - surface / 30 // 표면 30% 투명도
bg - primary / 10 // 골드 10% 투명도
bg - primary / 20 // 골드 20% 투명도

// 테두리
border - white / 5 // 5% 투명도
border - white / 10 // 10% 투명도
border - primary / 20 // 골드 20% 투명도
```

---

## 🏗️ 레이아웃 시스템 (Layout System)

### 컨테이너

```tsx
// 메인 컨테이너 (중앙 정렬, 최대 너비)
className = 'max-w-4xl mx-auto px-6 py-12 space-y-10'

// 모바일 전용 (480px 제한)
className = 'w-full max-w-[480px] min-h-screen'
```

### 간격 (Spacing)

```tsx
// 섹션 간 간격
space - y - 10 // 40px - 큰 섹션
space - y - 8 // 32px - 중간 섹션
space - y - 6 // 24px - 카드 내부
space - y - 4 // 16px - 작은 요소
space - y - 3 // 12px - 밀집된 요소
space - y - 2 // 8px - 리스트 아이템

// 패딩
p - 8 // 32px - 큰 카드
p - 6 // 24px - 중간 카드
p - 4 // 16px - 작은 카드
p - 3 // 12px - 콤팩트

// 마진
mb - 6 // 24px - 섹션 헤더 하단
mb - 4 // 16px - 표준 간격
mb - 3 // 12px - 작은 간격
mb - 2 // 8px - 최소 간격
```

### 그리드 레이아웃

```tsx
// 2열 그리드
className = 'grid grid-cols-2 gap-4'

// 4열 그리드 (사주팔자)
className = 'grid grid-cols-4 gap-4'

// 5열 그리드 (오행)
className = 'grid grid-cols-5 gap-4'

// 3열 그리드 (대운)
className = 'grid grid-cols-3 gap-2'
```

---

## 🎴 카드 컴포넌트 (Card Components)

### 1. 기본 카드 (Base Card)

```tsx
<Card className="p-8 bg-white/5 border-white/10">{/* 내용 */}</Card>
```

### 2. 프리미엄 카드 (Premium Card with Blur)

```tsx
<Card className="p-8 bg-white/5 border-white/10 relative overflow-hidden">
  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
    <Sparkles className="w-4 h-4" strokeWidth={1} />
    {title}
    {!isSubscribed && (
      <span className="ml-2 px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px]">
        PREMIUM
      </span>
    )}
  </h3>

  {/* 잠금 상태 */}
  <div className={cn(!isSubscribed && 'blur-sm select-none pointer-events-none')}>{children}</div>

  {/* 프리미엄 오버레이 */}
  {!isSubscribed && (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="text-center space-y-4 p-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
          <Crown className="w-8 h-8 text-[#D4AF37]" strokeWidth={1} />
        </div>
        <h4 className="text-lg font-bold text-ink-light">프리미엄 회원 전용</h4>
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
        <Link href="/protected/membership">
          <Button className="bg-[#D4AF37] hover:bg-[#F4E4BA] text-background">
            <Crown className="w-4 h-4 mr-2" strokeWidth={1} />
            멤버십 가입하기
          </Button>
        </Link>
      </div>
    </div>
  )}
</Card>
```

### 3. 인포 카드 (Info Card)

```tsx
<div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
  <p className="text-xs text-muted-foreground mb-2">라벨</p>
  <p className="text-xl font-bold text-primary">값</p>
</div>
```

### 4. 글래스 카드 (Glass Card with Gradient)

```tsx
<div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 rounded-xl">
  <p className="text-sm font-bold mb-3 flex items-center gap-2">
    <Sparkles className="w-4 h-4 text-primary" strokeWidth={1} />
    강조 콘텐츠
  </p>
  {/* 내용 */}
</div>
```

---

## 🔘 버튼 시스템 (Button System)

### Button Component (`components/ui/button.tsx`)

**핵심 특징:**

- Framer Motion 애니메이션 (scale on hover/tap)
- Gold shimmer overlay (default variant)
- 얇은 폰트 (`font-medium`)
- 5가지 variant

### 1. Default (Primary) Button

```tsx
<Button>
  <Sparkles className="w-4 h-4" strokeWidth={1} />
  천지인 분석 시작
</Button>

// 렌더링 결과:
// - 배경: #D4AF37 (Gold)
// - 호버: #F4E4BA (Light Gold)
// - 텍스트: #0A0A0A (Black)
// - 효과: Gold shimmer overlay
// - 애니메이션: scale 1.02 on hover, 0.98 on tap
```

### 2. Outline Button

```tsx
<Button variant="outline">자세히 보기</Button>

// 렌더링 결과:
// - 배경: transparent
// - 테두리: #D4AF37
// - 텍스트: #D4AF37
// - 호버: bg-[#D4AF37]/10
```

### 3. Ghost Button

```tsx
<Button variant="ghost" size="sm">
  <ArrowRight className="w-4 h-4" strokeWidth={1} />
  더보기
</Button>

// 렌더링 결과:
// - 배경: transparent
// - 텍스트: ink-light
// - 호버: bg-surface, text-primary
```

### 4. Destructive Button

```tsx
<Button variant="destructive">삭제하기</Button>

// 렌더링 결과:
// - 배경: #9A2A2A (seal red)
// - 텍스트: white
// - 호버: bg-seal/90
```

### 5. Secondary Button

```tsx
<Button variant="secondary">취소</Button>

// 렌더링 결과:
// - 배경: surface
// - 테두리: primary-dim/30
// - 텍스트: ink-light
// - 호버: bg-surface/80
```

### 6. Link Button

```tsx
<Button variant="link">자세히 알아보기</Button>

// 렌더링 결과:
// - 배경: transparent
// - 텍스트: primary (underline on hover)
```

---

### Size Variants

```tsx
// Default (44px - Mobile touch target)
<Button size="default">버튼</Button>

// Small (36px)
<Button size="sm">작은 버튼</Button>

// Large (48px)
<Button size="lg">큰 버튼</Button>

// Icon Only (44px x 44px)
<Button size="icon">
  <Plus className="w-5 h-5" strokeWidth={1} />
</Button>
```

---

### 사용 패턴 (Usage Patterns)

#### CTA (Call to Action)

```tsx
// 메인 액션 - variant="default"
<Button className="w-full">
  <Crown className="w-4 h-4 mr-2" strokeWidth={1} />
  프리미엄 시작하기
</Button>
```

#### 보조 액션 (Secondary Actions)

```tsx
// 취소, 뒤로가기 - variant="outline" 또는 "ghost"
<Button variant="outline">취소</Button>
<Button variant="ghost">뒤로</Button>
```

#### 위험한 액션 (Destructive Actions)

```tsx
// 삭제, 탈퇴 - variant="destructive"
<Button variant="destructive">
  <Trash className="w-4 h-4 mr-2" strokeWidth={1} />
  가족 구성원 삭제
</Button>
```

#### 내비게이션 (Navigation)

```tsx
// 페이지 이동 - variant="ghost" with icon
<Button variant="ghost" size="sm">
  자세히 보기
  <ArrowRight className="w-4 h-4 ml-1" strokeWidth={1} />
</Button>
```

#### 로딩 상태 (Loading State)

```tsx
<Button disabled>
  <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1} />
  처리 중...
</Button>
```

---

### 커스텀 스타일링 (Custom Styling)

```tsx
// className으로 추가 스타일링 가능
<Button
  className="shadow-[0_4px_20px_rgba(212,175,55,0.3)]"
  variant="default"
>
  강조 버튼
</Button>

// asChild로 Link 래핑
<Button asChild>
  <Link href="/protected/membership">
    멤버십 보기
  </Link>
</Button>
```

---

### 접근성 (Accessibility)

```tsx
// 아이콘 전용 버튼은 aria-label 필수
<Button size="icon" aria-label="알림 확인">
  <Bell className="w-5 h-5" strokeWidth={1} />
</Button>

// disabled 상태 자동 처리 (opacity-50, pointer-events-none)
<Button disabled>비활성 버튼</Button>
```

---

### 특수 버튼 패턴 (Special Button Patterns)

#### 1. 용어 버튼 (Term Button)

```tsx
// 만세력 페이지 스타일
<button className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] text-xs hover:bg-[#D4AF37]/20 transition-colors">
  비견
  <Info className="w-3 h-3" strokeWidth={1} />
</button>
```

#### 2. 배지 버튼 (Badge Button)

```tsx
// 프리미엄 표시
<span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-light">
  PREMIUM
</span>
```

#### 3. 인터랙티브 카드 버튼 (Interactive Card Button)

```tsx
<button className="group cursor-pointer w-full">
  <div className="flex flex-col items-center gap-1.5">
    <span className="text-3xl font-black group-hover:scale-110 transition-transform">甲</span>
    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
      갑목
    </span>
  </div>
</button>
```

---

## 🎯 아이콘 시스템 (Icon System)

### 크기 규칙

```tsx
// 섹션 헤더 아이콘
<Icon className="w-4 h-4" strokeWidth={1} />

// 페이지 아이콘 (중간)
<Icon className="w-5 h-5" strokeWidth={1} />

// 큰 아이콘
<Icon className="w-8 h-8" strokeWidth={1} />

// 작은 아이콘
<Icon className="w-3 h-3" strokeWidth={1} />
```

### 아이콘 색상

```tsx
// Primary
text-primary       // #D4AF37
text-[#D4AF37]     // 명시적

// Muted
text-muted-foreground
text-ink-light/50

// 호버
group-hover:text-primary transition-colors
```

### ⭐ 중요 규칙: strokeWidth={1}

**모든 lucide-react 아이콘에는 `strokeWidth={1}`을 필수로 적용합니다.**
얇은 선이 프리미엄하고 미니멀한 느낌을 줍니다.

```tsx
// ✅ 올바른 사용
<BookOpen className="w-4 h-4" strokeWidth={1} />
<Sparkles className="w-5 h-5 text-primary" strokeWidth={1} />

// ❌ 잘못된 사용
<BookOpen className="w-4 h-4" />  // strokeWidth 없음 (너무 굵음)
<Sparkles className="w-5 h-5" strokeWidth={2} />  // 너무 굵음
```

---

## 📦 배지 시스템 (Badge System)

### 1. 프리미엄 배지

```tsx
<span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px]">PREMIUM</span>
```

### 2. 상태 배지

```tsx
// 강 (Strong)
<span className="px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary">
  강
</span>

// 중 (Moderate)
<span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">
  중
</span>

// 약 (Weak)
<span className="px-2 py-0.5 rounded text-[10px] bg-muted-foreground/20 text-muted-foreground">
  약
</span>
```

### 3. 카테고리 배지

```tsx
<span className="px-2 py-1 rounded bg-seal-500/20 border border-seal-500/30 text-xs font-bold text-seal-400">
  카테고리
</span>
```

### 4. 성별 배지

```tsx
// 남성
<div className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
  남명
</div>

// 여성
<div className="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-400">
  여명
</div>
```

---

## 🌟 특수 효과 (Special Effects)

### 1. 그라데이션 텍스트

```tsx
// 페이지 타이틀에만 사용
<h1 className="text-4xl font-black">
  <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
    만세력
  </span>
</h1>
```

### 2. 글로우 배경 (Subtle)

```tsx
<div className="fixed inset-0 pointer-events-none -z-10">
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[200px]" />
</div>
```

### 3. 호버 효과

```tsx
// 스케일 호버
group-hover:scale-110 transition-transform

// 색상 호버
group-hover:text-primary transition-colors
hover:bg-primary/20 transition-all

// 스케일 호버 (카드)
hover:scale-105 transition-transform
```

### 4. Select 컴포넌트

```tsx
<Select value={selectedId} onValueChange={setSelectedId}>
  <SelectTrigger className="w-64 bg-white/5 border-white/10">
    <SelectValue placeholder="선택" />
  </SelectTrigger>
  <SelectContent>
    {items.map((item) => (
      <SelectItem key={item.id} value={item.id}>
        {item.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 5. Dialog (모달)

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-sm">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-[#D4AF37]">
        <BookOpen className="w-5 h-5" strokeWidth={1} />
        {title}
      </DialogTitle>
    </DialogHeader>
    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
      {description}
    </p>
  </DialogContent>
</Dialog>
```

---

## Special Effects (특수 효과)

### Gold Glow (금빛 글로우)

```css
.gold-glow {
  text-shadow:
    0 0 20px rgba(236, 182, 19, 0.5),
    0 0 40px rgba(236, 182, 19, 0.3);
}
```

**사용처**: 중요한 제목, 강조 텍스트

### Gold Border Glow

```css
.gold-border-glow {
  box-shadow:
    0 0 15px rgba(236, 182, 19, 0.3),
    inset 0 0 10px rgba(236, 182, 19, 0.1);
}
```

**사용처**: 프리미엄 카드, 강조 박스

### Dojang Shadow (도장 그림자)

```css
.dojang-shadow {
  box-shadow: 4px 4px 0 0 rgba(154, 42, 42, 0.4);
}
```

**사용처**: Badge, 도장 이미지, 강조 아이콘

### Luxury Card Glow

```css
.luxury-card-glow {
  box-shadow:
    0 4px 20px rgba(197, 160, 89, 0.15),
    0 0 40px rgba(197, 160, 89, 0.05);
}
```

**사용처**: 멤버십 카드, 프리미엄 컨텐츠 박스

### Hanji Texture Overlay

```css
.hanji-overlay {
  background-image: url('/images/texture/cream-paper.png');
  opacity: 0.08;
  mix-blend-mode: overlay;
}
```

**사용처**: 전체 배경에 미묘한 한지 질감 추가

---

## Scrollbar Styling

```css
::-webkit-scrollbar {
  width: 8px;
  background: surface;
}

::-webkit-scrollbar-thumb {
  background: primary-dim/50;
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: primary-dim;
}
```

---

## Animation Guidelines

### Button Interactions

```typescript
whileHover: { scale: 1.02 }
whileTap: { scale: 0.98 }
transition: { type: "spring", stiffness: 400, damping: 25 }
```

### Card Hover (hoverable prop)

```typescript
whileHover: { y: -4, transition: { duration: 0.2 } }
```

### Input Focus

```typescript
whileFocus: {
  scale: 1.01
}
```

### Fade In Animation

```css
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Usage Examples

### Hero Section (세로쓰기)

```tsx
<div className="writing-vertical-rl">
  <h1 className="font-serif text-5xl gold-glow">청담해화당</h1>
</div>
```

### Premium Button

```tsx
<Button className="gold-border-glow">운명 확인하기</Button>
```

### Luxury Card

```tsx
<Card depth="high" hoverable className="luxury-card-glow">
  <CardHeader>
    <CardTitle className="gold-glow">프리미엄 멤버십</CardTitle>
    <CardDescription>월 29,900원</CardDescription>
  </CardHeader>
</Card>
```

### Modal with Dark Backdrop

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>부적 구매</DialogTitle>
      <DialogDescription>원하시는 부적 개수를 선택해주세요.</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

---

## Design Tokens Summary

| Token                   | Value                 | Usage                    |
| ----------------------- | --------------------- | ------------------------ |
| `bg-background`         | #0A0A0A               | Page background          |
| `bg-surface`            | #181611               | Card/Panel background    |
| `bg-primary`            | #ECB613               | CTA buttons              |
| `bg-primary-dim`        | #C5A059               | Secondary elements       |
| `bg-seal`               | #9A2A2A               | Destructive actions      |
| `text-ink-light`        | #E5E5E5               | Primary text (dark mode) |
| `text-ink-faint`        | rgba(255,255,255,0.4) | Placeholder text         |
| `border-primary-dim/30` | #C5A059 (30% opacity) | Standard borders         |
| `shadow-primary/10`     | #ECB613 (10% opacity) | Card shadows             |

---

## Accessibility Notes

- **Contrast Ratio**: 금색 텍스트 (#ECB613) on 검정 배경 (#0A0A0A) = 10.5:1 (AAA 등급)
- **Focus Indicators**: 모든 인터랙티브 요소에 금색 링 (ring-primary)
- **Text Hierarchy**: font-serif (제목) vs font-sans (본문)으로 명확한 구분
- **Motion**: Framer Motion의 부드러운 spring 애니메이션 사용

---

## Migration from Light Theme

기존 Zen Light Theme에서 Dark Luxury Theme으로 마이그레이션 완료:

✅ Button: `zen-wood` → `primary` (#ECB613)
✅ Card: `bg-white` → `bg-surface` (#181611)
✅ Input: `bg-white` → `bg-surface`
✅ Text: `text-gray-900` → `text-ink-light` (#E5E5E5)
✅ Border: `border-gray-200` → `border-primary-dim/30`
✅ Shadow: `shadow-gray-200` → `shadow-primary/10`

---

## Next Steps

1. ✅ 모든 UI 컴포넌트에 Dark Luxury 적용 완료
2. ✅ Landing Page에 Dark Luxury 적용 완료
3. ✅ Auth Pages (Login/Sign-up) 적용 완료
4. ⏳ Protected Pages - Dashboard/Services 확인 필요
5. ⏳ Admin Pages 확인 필요

---

## ✅ 구현 체크리스트 (Implementation Checklist)

### 새로운 페이지/컴포넌트를 만들 때 확인:

**타이포그래피:**

- [ ] `font-bold` 대신 `font-light`, `font-normal`, `font-medium` 사용
- [ ] 섹션 헤더는 `text-sm font-bold text-muted-foreground uppercase tracking-wider`
- [ ] 본문은 `text-sm text-muted-foreground leading-relaxed`
- [ ] 페이지 타이틀만 `font-black` + gradient 사용

**아이콘:**

- [ ] 모든 아이콘에 `strokeWidth={1}` 적용
- [ ] 크기는 `w-4 h-4` (섹션), `w-5 h-5` (페이지), `w-3 h-3` (작은 것)

**색상:**

- [ ] 3가지 색상만 사용: Gold (#D4AF37), Black (#0A0A0A), White (opacity)
- [ ] `text-primary` 또는 `text-[#D4AF37]` 사용
- [ ] 배경은 `bg-white/5`, `bg-white/10` 패턴
- [ ] 테두리는 `border-white/10`, `border-primary/20` 패턴

**카드:**

- [ ] 기본 카드: `p-8 bg-white/5 border-white/10`
- [ ] 프리미엄 카드: blur + 오버레이 패턴 사용
- [ ] 인포 카드: `bg-surface/30 border border-primary/20 p-4 rounded-xl`

**레이아웃:**

- [ ] 간격은 `space-y-10`, `space-y-6` 등 시스템 준수
- [ ] 패딩은 `p-8` (큰 카드), `p-4` (작은 카드)
- [ ] 그리드는 `grid grid-cols-2 gap-4` 패턴

**효과:**

- [ ] 호버는 `transition-colors` 또는 `transition-all` 추가
- [ ] 그라데이션은 페이지 타이틀에만 사용
- [ ] 배경 글로우는 `bg-[#D4AF37]/3 blur-[200px]` 패턴

---

## 📝 참고 페이지 (Reference Pages)

**최고 참고 페이지:**

- `/protected/profile/manse` - 만세력 페이지 (manse-client.tsx) ⭐

**최근 리뉴얼 페이지:**

- `/protected` - 메인 페이지 (page.tsx)

**글로벌 스타일:**

- `app/globals.css` - CSS 유틸리티 클래스
- `tailwind.config.ts` - Tailwind 설정
- `DESIGN_SYSTEM.md` - 이 문서

---

**디자인 시스템 최종 업데이트**: 2026-02-11
**작성자**: Claude Code (Sonnet 4.5)
**프로젝트**: 청담해화당 (Cheongdam Haehwadang)
**기준 페이지**: 만세력 (manse-client.tsx)
