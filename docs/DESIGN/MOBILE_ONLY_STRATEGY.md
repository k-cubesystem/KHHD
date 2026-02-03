# Mobile-Only Development Strategy

## 1. Core Principle
**"One Codebase, One View."**
We are shifting from a Responsive Web Design (Web + Mobile) to a **Mobile-Only** strategy. The web version will mirror the mobile app experience exactly, centered on the screen with a mobile aspect ratio (Max Width: 480px).

## 2. Implementation Rules

### 2.1. Layout Constraints
- **Global Container**: All content must be wrapped in a container with `max-width: 480px`.
- **Desktop View**: The mobile container is centered horizontally. The background outside the container should be dark/neutral (or a blurred version of the app content).
- **Height**: `min-height: 100vh`.

### 2.2. Component Styling
- **Fixed Elements**: Valid fixed elements (Headers, Bottom Nav, Modals) must logicially be constrained to the mobile width.
  - *Bad*: `fixed left-0 right-0 w-full` (This stretches across the monitor).
  - *Good*: `fixed left-1/2 -translate-x-1/2 w-full max-w-[480px]`.
- **Typography**: Optimize for small screens. Minimum font size 12px-14px. Headers should ideally be 20px-28px.
- **Touch Targets**: Minimum 44px height for interactive elements.

### 2.3. Removed Features
- **Desktop Navigation**: The distinct "Desktop Header" with horizontal links is deprecated. Use the Mobile Header (Logo + Hamburger/User) and Mobile Bottom Nav everywhere.
- **Sidebars**: Remove desktop sidebars.

## 3. Migration Steps
1.  **Root Layout**: Apply the global centering wrapper in `app/layout.tsx`.
2.  **Global CSS**: Ensure `body` background distinguishes the mobile viewport from the "desk" background.
3.  **Header/Footer**: Update `SiteHeader` and `MobileBottomNav` to respect the `max-width` constraint using `left-1/2 -translate-x-1/2`.
4.  **Pages**: Audit pages that might use `grid-cols-lg-12` and simplify to single column stacks.

## 4. Design Guidelines (Haehwadang)
- theme: Dark Luxury.
- background: `#0A0A0A` (inside container), `#000000` (outside container).
