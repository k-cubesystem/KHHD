# Task: Enforce Mobile-Only Design Across PC/Mobile

## 1. Objective
Complete the transition to a **Mobile-Only** application. The PC version must mirror the mobile experience exactly (max-width 480px, centered).
There should be **NO** separate desktop layout (e.g., no multi-column grids, no desktop header, no sidebars).

## 2. Global Layout Rules
- **Container**: All pages are wrapped in `max-w-[480px] mx-auto` (Handled in `app/layout.tsx`).
- **Fixed Elements**: Any `fixed` element (Header, BottomNav, Modals, Toasts) MUST utilize `left-1/2 -translate-x-1/2 max-w-[480px] w-full` to stay within the mobile viewport on large screens.
  - *Audit*: Check `SiteHeader`, `MobileBottomNav`, `Dialog`, `Drawer`, `Toast`.

## 3. Specific File Instructions

### 3.1. `app/protected/family/page.tsx`
- **Current State**: Uses `lg:grid-cols-12`, `lg:sticky`, `lg:col-span-*`.
- **Action**:
  - Remove all `lg:` prefixes that create multi-column layouts.
  - Convert to a vertical stack (`flex-col`).
  - Remove `lg:sticky`.
  - Ensure the "Registration Form" and "Member List" stack vertically with appropriate spacing (`gap-6`).

### 3.2. `components/mobile-bottom-nav.tsx`
- **Current State**: Ensure `lg:hidden` is REMOVED. It must be visible on Desktop.
- **Action**: Verify `navItems` match the latest approved list:
  1. 사주풀이 (Cloud)
  2. 인연관리 (Users) - *Note: User might have reverted this, ensure it is "인연관리".*
  3. 풍수지리 (Compass)
  4. 관상/손금 (ScanFace)
  5. 궁합 (Heart)

### 3.3. `components/site-header.tsx`
- **Current State**: Mobile styling applied.
- **Action**: Verify absolute positioning uses `left-1/2 -translate-x-1/2` to stay centered on desktop.

### 3.4. General Page Audit
- Scan other pages (`/analysis`, `/membership`, `/profile`) for `grid-cols-lg-*` or hidden mobile elements and remove desktop-specific logic.

## 4. CSS / Tailwind
- **Remove**: `lg:hidden`, `md:hidden` (unless used for very specific micro-adjustments).
- **Enforce**: Single column flow.

## 5. Execution
1.  Read `app/protected/family/page.tsx` and refactor to `flex-col`.
2.  Read `components/mobile-bottom-nav.tsx` and verify visibility and items.
3.  Scan `app/protected/analysis/page.tsx` and ensure it fits the mobile storytelling format.
