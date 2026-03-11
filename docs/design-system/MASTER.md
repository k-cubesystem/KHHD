# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Haehwadang (혜화당)
**Concept:** Midnight in Seoul (Modern Oriental Luxury)
**Keywords:** Dark, Gold, Ink, Mystical, Premium, Serene

---

## 1. Color Palette (The Five Elements & Ink)

### Primary Colors

| Token                  | Hex       | Tailwind Class  | Description                                        |
| ---------------------- | --------- | --------------- | -------------------------------------------------- |
| `--color-bg-primary`   | `#0f0f10` | `bg-ink-950`    | **Deep Ink Black**: 먹물의 깊은 검정. 메인 배경.   |
| `--color-bg-secondary` | `#1c1c1e` | `bg-ink-900`    | **Wet Stone**: 젖은 벼루색. 카드/섹션 배경.        |
| `--color-accent`       | `#C5A059` | `text-gold-500` | **Yugi Gold**: 유기 그릇의 은은한 금색. 강조/버튼. |

### Secondary Colors

| Token                | Hex       | Tailwind Class   | Description                                     |
| -------------------- | --------- | ---------------- | ----------------------------------------------- |
| `--color-text-main`  | `#fafaf9` | `text-stone-50`  | **Hanji White**: 표백되지 않은 한지 흰색. 본문. |
| `--color-text-muted` | `#a8a29e` | `text-stone-400` | **Ash Grey**: 재(Ash) 색상. 보조 텍스트.        |
| `--color-danger`     | `#9f1239` | `text-rose-800`  | **Seal Red**: 인주(도장) 색상. 에러/강조.       |

### Gradients

- **Golden Glow:** `linear-gradient(135deg, #C5A059 0%, #E5C585 50%, #C5A059 100%)`

---

## 2. Typography

### Font Families

- **Heading:** `Noto Serif KR`, serif (임시: 없으면 기본 Serif 사용)
  - _Usage:_ 페이지 제목, 섹션 헤더, 중요한 슬로건.
  - _Weight:_ 400(Regular), 700(Bold).
- **Body:** `Pretendard`, `Inter`, sans-serif
  - _Usage:_ 본문, UI 요소, 버튼 텍스트, 설명글.
  - _Weight:_ 300(Light), 400(Regular), 500(Medium).

### Scale

- **H1:** 2.5rem (40px) / Leading 1.2 / Tracking -0.02em
- **H2:** 2.0rem (32px) / Leading 1.3 / Tracking -0.01em
- **H3:** 1.5rem (24px) / Leading 1.4
- **Body:** 1rem (16px) / Leading 1.6

---

## 3. UI Components & Effects

### Glassmorphism (Hanji Style)

```css
.glass-panel {
  background: rgba(28, 28, 30, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(197, 160, 89, 0.1); /* Gold 10% */
  box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2);
}
```

### Buttons

- **Primary (Gold):**
  - Background: `bg-gold-500` (Gradient)
  - Text: `text-ink-950` (Black)
  - Border: None
  - Hover: Brightness 110%, Scale 1.02
- **Secondary (Outline):**
  - Background: Transparent
  - Border: `1px solid #C5A059`
  - Text: `#C5A059`

### Cards

- **Shape:** Rounded corners (12px).
- **Border:** Very subtle gold border (`border-gold-500/20`).
- **Interaction:** Hover시 금빛 그림자(`shadow-gold`) 살짝 발생.

---

## 4. Layout & Spacing

- **Container:** Max width 1200px (Centered).
- **Mobile Friendly:**
  - 터치 타겟 최소 44px 확보.
  - 하단 고정 CTA 버튼 사용 지양 (콘텐츠 가리지 않도록).

## 5. Anti-Patterns (Do NOT Use)

- ❌ **Pure Black (#000000):** 눈이 피로하므로 `#121212`나 `#0f0f10` 사용.
- ❌ **Neon Colors:** 사이버펑크 느낌의 형광색 절대 금지.
- ❌ **Sharp Shadows:** 그림자는 항상 넓고 부드럽게 퍼져야 함.
- ❌ **System Fonts:** 굴림, 돋움 등 기본 폰트 노출 금지.

---

## 6. Pre-Delivery Checklist

- [ ] 버튼 클릭 시 Ripple/Scale 효과가 있는가?
- [ ] 다크 모드에서 텍스트 가독성(명도비 4.5:1)이 확보되었는가?
- [ ] 금색(#C5A059)이 너무 과하게 사용되지 않았는가? (포인트로만 사용)
