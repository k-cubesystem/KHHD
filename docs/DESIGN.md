# 해화당 디자인 시스템

> 컨셉: **Modern Oriental Zen** — "화려하되 경박하지 않게"

---

## 1. 핵심 원칙

- **다크 럭셔리**: `#0A0A0A` 배경, 금빛 포인트
- **동양적 질감**: 한지 노이즈 텍스처, 먹물색
- **모바일 퍼스트**: 최대 너비 480px 모바일 전용

---

## 2. 컬러 팔레트

```typescript
// tailwind.config.ts
colors: {
  gold: {
    100: "#F9F5E3",
    300: "#F4E4BA",
    500: "#D4AF37",  // 브랜드 메인
    550: "#C5A059",
    900: "#3E3210",
  },
  zen: {
    bg: "#0A0A0A",           // 배경
    text: "#E8DCC8",         // 본문
    muted: "#9B8B7A",        // 보조 텍스트
    gold: "#D4AF37",         // 강조
    border: "#2A2A2A",       // 테두리
    surface: "#141414",      // 카드 배경
  }
}
```

---

## 3. 타이포그래피

| 용도      | 폰트                 | 클래스       |
| --------- | -------------------- | ------------ |
| 제목/헤딩 | Noto Serif KR (명조) | `font-serif` |
| 본문/UI   | Pretendard (고딕)    | `font-sans`  |
| 숫자/코드 | JetBrains Mono       | `font-mono`  |

---

## 4. 기본 컴포넌트 패턴

### 페이지 스켈레톤 (필수)

```tsx
<div className="min-h-screen bg-background text-ink-light font-sans relative overflow-hidden">
  <div className="hanji-overlay" /> {/* 한지 텍스처 */}
  {/* 콘텐츠 */}
</div>
```

### 카드

```tsx
<Card className="bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30">
  <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />
  {/* 내용 */}
</Card>
```

### 버튼 (주요)

```tsx
// Gold CTA
<Button className="bg-gold-500 text-black font-bold hover:bg-gold-400">
// Ghost (보조)
<Button variant="outline" className="border-gold-500/30 text-gold-400">
// Seal Red (위험/중요)
<Button className="bg-seal text-white">
```

---

## 5. 애니메이션 표준 (Framer Motion)

```typescript
// lib/animations.ts
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' },
}

export const staggerChildren = {
  animate: { transition: { staggerChildren: 0.1 } },
}
```

---

## 6. 모바일 전용 규칙

**"One Codebase, One View"** — 모바일 앱처럼 구현

- **글로벌 컨테이너**: `max-width: 480px`, 중앙 정렬
- **데스크탑**: 컨테이너 외부는 `#000000` 배경
- **고정 요소**: `fixed left-1/2 -translate-x-1/2 w-full max-w-[480px]`
- **터치 타겟**: 최소 44px 높이
- **금지**: 순수 흰 배경, 라이트 모드, 기본 Tailwind 파란색

```tsx
// ✅ 올바른 fixed 요소
<header className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] top-0">

// ❌ 금지
<header className="fixed left-0 right-0 w-full">
```

---

## 7. 아이콘

**Lucide React** 사용. 크기는 `w-4 h-4` (16px) 또는 `w-5 h-5` (20px).

금빛 아이콘: `className="text-gold-500"`

---

## 8. 대시보드 레이아웃 원칙

- **모바일**: 단일 컬럼 스택
- **카드 그리드**: `grid-cols-2` (모바일), 큰 카드는 `col-span-2`
- **섹션 구분**: 카드 내부 구분선 `border-stone-700/30`
- **헤더**: `font-serif font-black` 제목 + `text-stone-500` 부제목
