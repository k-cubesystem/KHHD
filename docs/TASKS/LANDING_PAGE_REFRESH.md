# Task: Landing Page Storytelling Refresh

## 1. Overview
Redesign `app/page.tsx` to include a "Wadiz-style" long-scrolling storytelling experience below the existing Hero section. The goal is to build trust and emotional connection before asking for conversion.

## 2. Structure
- **Section 1: Hero Carousel** (Keep existing, but ensure it encourages scrolling).
- **Section 2: The Problem (Resonance)**
  - Theme: "Anxiety in the Age of Uncertainty".
  - Visual: Minimalist, maybe kinetic typography or subtle animation.
  - Copy: "No matter how hard you run, does the destination feel further away?"
- **Section 3: The Solution (Cheonjiin Philosophy)**
  - Theme: "Not Superstition, But Big Data of Nature".
  - Explain that Saju is weather forecasting for life.
- **Section 4: Social Proof / Authority**
  - "Secrets of Cheongdam-dong High Society".
  - Mock testimonials or "Why top leaders consult Haehwadang".
- **Section 5: Feature Showcase (Cards)**
  - Use high-quality imagery for:
    1.  **Saju Analysis**: "Decode your blueprint."
    2.  **Face Reading (AI)**: "Your face changes with your fortune."
    3.  **Feng Shui (AI)**: "Spaces that bring luck."
- **Section 6: Final CTA**
  - "Start your journey now."

## 3. Implementation Details for Claude
1.  **Modify `app/page.tsx`**:
    - Keep the existing `main` hero but allow it to scroll (remove `overflow-hidden` from the container if it prevents scrolling, or keep hero fixed and content scrolls over).
    - Add new sections below the hero.
2.  **Components**:
    - Create `components/landing/story-section.tsx` for reusable storytelling blocks.
    - Create `components/landing/feature-card.tsx` for the showcase.
3.  **Design System**:
    - Use `framer-motion` for "scroll-reveals" (fade-in up as you scroll).
    - Maintain "Dark Luxury" aesthetic (Black/Gold/Seal Red).
    - Use `Noto Serif KR` for emotional headings and `Noto Sans KR` for readable body text.

## 4. Key Copywriting (Korean)
- **Problem**: "열심히 살지 않은 날이 없는데, 왜 내 마음은 늘 불안할까요?"
- **Solution**: "운(運)은 바꿀 수 없지만, 준비할 수는 있습니다. 해화당이 그 길을 보여드립니다."
- **Authority**: "대한민국 상위 1%가 찾는 청담동의 비밀, 이제 당신의 손안에서 펼쳐집니다."

## 5. Constraint
- **Do NOT remove** the existing Hero Slider functionality or links. Just extend the page downwards.
