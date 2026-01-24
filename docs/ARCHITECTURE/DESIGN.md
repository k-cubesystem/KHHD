# 🎨 Modern Oriental Zen Design System

## 1. Concept Concept
The design philosophy aims to evoke a sense of **Calm, Tradition, and Modern Sophistication**. It mimics the texture of **Hanji (Korean traditional paper)** and uses natural, earthy tones with sharp edges to convey a "Zen" aesthetic.

## 2. Color Palette

### Primary Colors (Zen Theme - Light Default)
The default theme is a warm, light mode inspired by traditional materials.

| Token | Hex | Tailwind Class | Description |
| :--- | :--- | :--- | :--- |
| **Background** | `#F9F8F5` | `bg-zen-bg` | Warm Off-White (Hanji base) |
| **Foreground** | `#1C1B1A` | `text-zen-text` | Sharp Charcoal (Ink) |
| **Primary** | `#8B6E58` | `bg-zen-wood` | Sandalwood (Buttons, Active) |
| **Accent** | `#C5B358` | `text-zen-gold` | Antique Gold (Highlights) |
| **Muted** | `#595450` | `text-zen-muted` | Deep Warm Grey (Secondary) |
| **Border** | `#E5E3DF` | `border-zen-border` | Pale Grey (Dividers) |

### Secondary Colors (Midnight Theme - Legacy Dark)
Maintained for dark mode support or specific sections.

| Token | Hex | Description |
| :--- | :--- | :--- |
| **Ink 950** | `#0F0F10` | Deep Black Background |
| **Gold 500** | `#C5A059` | Yugi Gold Accent |

---

## 3. Typography

### Hierarchy
We use a distinct pairing of Serif and Sans Serif fonts to separate content types.

- **Titles & Headings (`font-serif`)**: `Noto Serif KR`
  - Usage: `h1`, `h2`, `h3`, Card Titles, Saju Terms (e.g., "갑자(甲子)").
  - Feeling: Authority, Tradition, Elegance.

- **Body Text & UI (`font-sans`)**: `Noto Sans KR` / `Inter`
  - Usage: Paragraphs, Inputs, Button Labels, Metadata.
  - Feeling: Readability, Modernity, Cleanliness.

### Rules
- **Line Height**: Relaxed (`leading-relaxed`) for report reading.
- **Letter Spacing**: Slightly tighter (`tracking-tight`) for large Serif titles.

---

## 4. UI Components

### Cards (`zen-card`)
- **Background**: Pure White (`bg-white`).
- **Border**: Sharp, thin border (`border-zen-border`).
- **Shadow**: Minimal (`shadow-sm`), increasing on hover (`hover:shadow-md`).
- **Radius**: Sharp edges (`rounded-sm` or `0.25rem`).

### Buttons
- **Primary**: `bg-zen-wood` text-white, sharp corners.
- **Secondary**: `bg-white` border-zen-border text-zen-text.
- **Ghost**: Transparent background, text-zen-muted hover:text-zen-wood.

### Texture (`bg-hanji`)
- A subtle SVG noise texture overlay applied to the main background `bg-zen-bg` to simulate paper grain.
- `opacity: 0.03`.

---

## 5. Layout Guidelines

- **Container**: Max-width `7xl` (1280px) for dashboards.
- **Spacing**: Generous whitespace (`gap-8`, `py-12`) to maintain the "Zen" calm.
- **Grid**: 12-column grid system for responsive layouts.

此 Design System is implemented in `tailwind.config.ts` (extended theme) and `globals.css` (CSS variables).
