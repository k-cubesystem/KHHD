# Task: Saju Hub & Storytelling Page Restructure

## 1. Vision: "The Destiny Library" (운명의 도서관)
The `/protected/analysis` page should not look like a simple menu list. It should feel like entering a private library where the user's destiny is recorded in different books.
Each section must be a **Story Card** that provokes curiosity and offers a specific value proposition using "Wadiz-style" copywriting (Emotional -> Rational -> Action).

## 2. Directory Structure Changes
- **Rename/Move**:
  - `app/protected/analysis/page.tsx` -> `app/protected/analysis/cheonjiin/page.tsx`
  - `analysis-client-page.tsx` -> `cheonjiin/analysis-client-page.tsx`
- **Create**:
  - `app/protected/analysis/page.tsx` (New Hub Page)
  - `app/protected/analysis/today/page.tsx`
  - `app/protected/analysis/wealth/page.tsx`
  - `app/protected/analysis/new-year/page.tsx`
  - `components/analysis/input-modal.tsx` (Unified Profile Input)
  - `components/analysis/story-card.tsx` (New UI Component)

## 3. UI/UX Design: Vertical Story Stream
The page will be a single column scrolling layout (mobile-optimized).

### **Header Section: The Greeting**
- **Text**: "안녕하세요, [Name]님.\n오늘은 어떤 해답을 찾고 계신가요?"
- **Sub**: "당신을 위한 4권의 운명서가 준비되어 있습니다."
- **Visual**: Minimalist typographic intro with a subtle fade-in.

### **Card 1: 천지인(天地人) 원명 분석 (The Blueprint)**
- **Concept**: *Self-Discovery*
- **Visual**: Ancient Star Map / Blueprint texture.
- **Copy (Story)**: "나를 아는 것이 모든 전략의 시작입니다. 당신이 타고난 그릇의 크기와 모양, 그리고 채워야 할 기운을 확인하세요."
- **Tagline**: "내 운명의 설계도 확인하기"
- **Action**: Go to `/cheonjiin`

### **Card 2: 오늘의 운세 (Daily Compass)**
- **Concept**: *Tactical Guidance*
- **Visual**: Dawn Concept / Sun Dial.
- **Copy (Story)**: "매일 아침, 하루의 기상을 미리 확인하세요. 때로는 멈추는 것이 나아가는 것보다 빠를 때가 있습니다."
- **Tagline**: "오늘의 기상도 보기"
- **Action**: Go to `/today`

### **Card 3: 재물운 심층 분석 (The Wealth Flow)**
- **Concept**: *Prosperity*
- **Visual**: Gold Texture / Flowing Water.
- **Copy (Story)**: "재물은 쫓는 것이 아니라, 길목을 지키는 것입니다. 당신의 인생에서 재물이 모이는 시기와 방향을 알려드립니다."
- **Tagline**: "내 재물운의 흐름 읽기"
- **Action**: Go to `/wealth`

### **Card 4: 2026 병오년 미리보기 (Future Insight)**
- **Concept**: *Preparation*
- **Visual**: Red Horse (Dynamic Energy).
- **Copy (Story)**: "곧 다가올 붉은 말의 해. 뜨거운 열기를 당신의 동력으로 바꿀 준비가 되셨나요? 2026년의 기회를 선점하세요."
- **Tagline**: "2026년 신년운세 미리보기"
- **Action**: Go to `/new-year`

## 4. Interaction Logic (The Interceptor)
When a card is clicked:
1.  **Check Context**: checks if `GlobalState.selectedMember` exists.
2.  **If NO Member Selected/Exist**:
    - Trigger `InputModal`.
    - "누구의 운명을 분석할까요?"
    - Options: [Register Me], [Select Saved Family].
3.  **If Member Selected**:
    - Navigate to the specific detail page.

## 5. Implementation for Claude
- **Component**: Create `StoryCard` component that accepts `title`, `story`, `tagline`, `image/icon`, `onClick`.
- **Animation**: Use `framer-motion` for cards to slide up with a staggering effect.
- **Data Fetching**: The Hub page must fetch the user's saved family list specifically to determine the "Initial State" (e.g., does the user have ANY data?).

