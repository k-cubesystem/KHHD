# Cheongdam Haehwadang Design System
## "Midnight in Cheongdam" (Dark Premium Saju Sanctuary)

> **Role**: Senior UI/UX Engineer specialized in "Dark Premium Korean Aesthetics".
> **Objective**: Implement UI components strictly following the visual identity derived from the "Stitch Design System".

---

## 1. Core Visual Identity (THE LAW)
* **Theme**: "Midnight in Cheongdam". Dark, mysterious, luxurious, yet organic.
* **Background**: ALWAYS use `#0A0A0A` (Deep Black) or `#181611` (Ink Black). **NEVER use pure white.**
* **Texture**: ALL pages must have a `.hanji-overlay` (opacity 0.1~0.2) to simulate Korean paper texture on dark mode.
* **Colors**:
    * **Primary Text**: `#E5E5E5` (Off-white)
    * **Accent (Gold)**: `#ECB613` (Bright Gold for highlights) or `#C5A059` (Muted Gold for borders/text).
    * **Special**: `#9A2A2A` (Seal Red) for primary CTA buttons (Seal/Dojang style).

## 2. Typography Rules
* **Headings**: `font-serif` (Noto Serif KR). Use generic terms "Fate", "Destiny" in English with `tracking-widest`.
* **Body**: `font-sans` (Noto Sans KR). High readability, light font weight (300/400).
* **Vertical Text**: Use `.writing-vertical-rl` for artistic emphasis (e.g., "운명의 결을 읽다").

## 3. Component Styles
### Buttons
* **Seal Style**: Square or slightly rounded (`rounded-sm`), Red or Gold background, `dojang-shadow`.
* **Ghost Style**: Transparent with thin Gold border (`border-primary-dim`).

### Cards
* **Background**: `#221D10` or `#1F1D1B`.
* **Border**: Thin 1px solid `rgba(197, 160, 89, 0.2)`.
* **Shadow**: None or very subtle glow.

### Input Fields
* **Background**: Transparent (`bg-transparent`).
* **Border**: Bottom border only (`border-b border-primary/30`).
* **Shape**: No rounded boxes for inputs (Traditional scroll feel).

## 4. Implementation Tech Stack
* **Framework**: Next.js 14+ (App Router)
* **Styling**: Tailwind CSS (with custom `tailwind.config.ts`)
* **Animation**: Framer Motion (subtle fade-in, `animate-pulse` on gold elements)
* **Icons**: Lucide React or Material Symbols
