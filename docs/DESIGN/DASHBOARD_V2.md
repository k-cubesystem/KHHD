# Dashboard V2 Design Structure (Midnight in Cheongdam)

## 1. Hierarchy & Content Strategy

### A. Main Features (The Core Experience)
1. **천지인(天地人) 사주풀이 (Heaven-Earth-Man Analysis)**
   - **Concept**: 메인 사주풀이 비법.
   - **Composition**: 사주(Heaven) + 풍수(Earth) + 관상/손금(Man).
   - **UI**: Large Featured Card (Dominant Visual).
   
2. **인연관리 (Relationship Management)**
   - **Concept**: 사람 관리 비법서.
   - **Function**: Manage Family, Friends, Boss relationships/data.
   - **UI**: Large Featured Card (Secondary Dominant).

### B. Sub Features (Daily Utility)
1. **해화당 AI (AI Shaman)**
   - **Concept**: 간편 조회 (Quick Chat).
   - **UI**: Compact Card / floating action.
   
2. **오늘의 운세 (Daily Fortune)**
   - **Concept**: 카카오톡 알림 (Notification focus).
   - **UI**: Compact Card / Banner style.

### C. Individual Features (The Toolkit)
- Grid Layout of specific functions:
  - 사주풀이 (Basic)
  - 관상 (Face)
  - 손금 (Palm)
  - 풍수 (Feng Shui)
  - 궁합 (Compatibility)
  - 재물운 (Wealth)

### D. Marketing / Banner
- **Purpose**: "기획 멘트" Slot.
- **Content**: Seasonal events, Premium upgrades, Philosophic quotes.

---

## 2. Layout Strategy

### Mobile View (`mobile-view.tsx`)
- **Header**: Compact, Logo + User Greeting.
- **Banner**: Slim Slider (Aspect Ratio 21:9).
- **Core Section**: Vertical Stack of 2 Large Cards (Cheonjiin, Relationship).
- **Sub Section**: Horizontal Split (AI, Daily).
- **Grid Section**: 3-column grid for Individual Features.
- **Bottom Nav**: Home | Relationship | Cheonjiin | Profile (As requested + Optimized).

### Desktop View (`desktop-view.tsx`)
- **Issue**: Previous Hero was too large.
- **New Layout**: Three-column Dashboard Grid (Bento Grid Style).
  - **Left Col**: Navigation & User Profile Summary.
  - **Center Col (Wide)**: 
    - Top: Slim Marketing Banner.
    - Mid: Cheonjiin & Relationship (Side-by-side or Split).
    - Bottom: Individual Features Grid.
  - **Right Col (Narrow)**:
    - Today's Fortune (Widget style).
    - AI Shaman (Quick Access).
    - Notifications.
- **Aesthetic**: Dark, text-focused, high information density, gold accents. No full-screen background images.
