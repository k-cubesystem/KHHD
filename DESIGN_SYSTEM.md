# 청담해화당 Dark Luxury Design System

## 디자인 철학

**Mysterious × Premium × Traditional × Modern**

어둡고 신비로운 배경에 금빛과 주홍색 액센트를 더한 고급스러운 동양적 럭셔리 디자인

---

## 색상 팔레트

### Primary Colors (주요 색상)

```typescript
background: "#0A0A0A"     // Deep Charcoal - 메인 배경
surface: "#181611"        // Card/Panel 배경 (약간 밝은 검정)
```

### Gold Accents (금색 계열)

```typescript
primary: "#ECB613"        // 밝은 금색 (강조, CTA 버튼)
primary-dim: "#C5A059"    // 차분한 금색 (테두리, 보조 텍스트)
primary-dark: "#B8860B"   // 어두운 금색 (호버 상태)
```

### Seal Red (주홍색)

```typescript
seal: "#9A2A2A"          // 도장 색상 (경고, 삭제 버튼)
```

### Text Colors (텍스트)

```typescript
ink-light: "#E5E5E5"      // 밝은 텍스트 (다크모드 본문)
ink-DEFAULT: "#1A1A1A"    // 어두운 텍스트 (라이트모드 - 미사용)
ink-faint: "rgba(255, 255, 255, 0.4)" // 희미한 텍스트 (placeholder)
```

---

## Typography (타이포그래피)

### Font Families

```css
/* 명조체 (제목, 고급스러운 텍스트) */
font-serif: "Noto Serif KR", serif

/* 고딕체 (본문, UI 요소) */
font-sans: "Noto Sans KR", sans-serif
```

### 사용 가이드

- **제목/헤딩**: `font-serif` + `font-semibold` 또는 `font-bold`
- **본문/설명**: `font-sans` + `font-normal`
- **버튼**: `font-serif` + `font-medium` (강조)
- **Label/Caption**: `font-sans` + `font-medium` (가독성)

---

## Component Styles

### Button

```typescript
default: 금색 배경 (#ECB613) + 검정 텍스트
  - Hover: 어두운 금색 (#B8860B)
  - Shadow: 금색 글로우 (shadow-primary/20)
  - Animation: Scale + Gold shimmer overlay

destructive: 주홍색 배경 (#9A2A2A) + 흰색 텍스트

outline: 투명 배경 + 금색 테두리 (primary-dim/30)
  - Hover: 금색 배경 10% 투명도

secondary: Surface 배경 + 금색 테두리
  - Hover: Surface 80% 투명도

ghost: 투명 배경
  - Hover: Surface 배경
```

### Card

```typescript
배경: bg-surface (#181611)
테두리: border-primary-dim/20 (금색 20% 투명도)
그림자: shadow-primary/10 (금색 글로우)
Backdrop: backdrop-blur-sm (유리 효과)

Hover:
  - depth="low": shadow-md + shadow-primary/5
  - depth="medium": shadow-lg + shadow-primary/10
  - depth="high": shadow-xl + shadow-primary/20
```

### Input / Textarea

```typescript
배경: bg-surface (#181611)
테두리: border-primary-dim/30 (금색 30% 투명도)
텍스트: text-ink-light (#E5E5E5)
Placeholder: placeholder:text-ink-faint (40% 투명도)

Focus:
  - Ring: ring-primary (금색 2px 링)
  - Border: border-primary
  - 배경: bg-surface/80 (약간 밝아짐)

Hover: shadow-md + shadow-primary/5
```

### Select

```typescript
Trigger:
  - 배경: bg-surface
  - 테두리: border-primary-dim/30
  - 높이: h-10 (default), h-9 (sm)

Content (Dropdown):
  - 배경: bg-surface
  - 테두리: border-primary-dim/30
  - 그림자: shadow-lg + shadow-primary/10
  - Backdrop: backdrop-blur-md

Item:
  - Hover: bg-primary-dim/10 (금색 10% 투명도)
  - Focus: text-primary (금색 텍스트)
```

### Dialog / Modal

```typescript
Overlay:
  - bg-black/80 (검정 80% 투명도)
  - backdrop-blur-sm (블러 효과)

Content:
  - 배경: bg-surface
  - 테두리: border-primary-dim/30
  - 그림자: shadow-xl + shadow-primary/10
  - Backdrop: backdrop-blur-md

Title: font-serif + text-lg + text-ink-light
Description: font-sans + text-sm + text-ink-faint
```

### Badge

```typescript
default: 금색 배경 + 검정 텍스트
secondary: Surface 배경 + 금색 테두리
destructive: 주홍색 배경 + 흰색 텍스트
outline: 투명 배경 + 금색 테두리
```

---

## Special Effects (특수 효과)

### Gold Glow (금빛 글로우)

```css
.gold-glow {
  text-shadow: 0 0 20px rgba(236, 182, 19, 0.5),
               0 0 40px rgba(236, 182, 19, 0.3);
}
```

**사용처**: 중요한 제목, 강조 텍스트

### Gold Border Glow

```css
.gold-border-glow {
  box-shadow: 0 0 15px rgba(236, 182, 19, 0.3),
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
  box-shadow: 0 4px 20px rgba(197, 160, 89, 0.15),
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
whileFocus: { scale: 1.01 }
```

### Fade In Animation

```css
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Usage Examples

### Hero Section (세로쓰기)

```tsx
<div className="writing-vertical-rl">
  <h1 className="font-serif text-5xl gold-glow">
    청담해화당
  </h1>
</div>
```

### Premium Button

```tsx
<Button className="gold-border-glow">
  운명 확인하기
</Button>
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
      <DialogDescription>
        원하시는 부적 개수를 선택해주세요.
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

---

## Design Tokens Summary

| Token | Value | Usage |
|-------|-------|-------|
| `bg-background` | #0A0A0A | Page background |
| `bg-surface` | #181611 | Card/Panel background |
| `bg-primary` | #ECB613 | CTA buttons |
| `bg-primary-dim` | #C5A059 | Secondary elements |
| `bg-seal` | #9A2A2A | Destructive actions |
| `text-ink-light` | #E5E5E5 | Primary text (dark mode) |
| `text-ink-faint` | rgba(255,255,255,0.4) | Placeholder text |
| `border-primary-dim/30` | #C5A059 (30% opacity) | Standard borders |
| `shadow-primary/10` | #ECB613 (10% opacity) | Card shadows |

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

**디자인 시스템 작성일**: 2026-01-29
**작성자**: Claude Code (Sonnet 4.5)
**프로젝트**: 청담해화당 (Cheongdam Haehwadang)
