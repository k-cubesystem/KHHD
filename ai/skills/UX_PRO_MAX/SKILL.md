---
name: UX Pro Max (TUI Edition)
description: 최고급 사용자 경험과 TUI(Tangible User Interface) 스타일을 적용하기 위한 디자인 가이드라인 및 구현 전략.
---

# UX Pro Max: TUI & Design System

이 스킬은 해화당(Haehwadang) 웹 애플리케이션을 **"단순한 앱"에서 "살아있는 예술 작품"**으로 승격시키기 위한 디자인/구현 지침입니다.

## 1. Design Philosophy: "Tangible Nobility"

### 🌌 TUI (Tangible/Tactile User Interface)
화면 속의 요소가 실제 물체처럼 느껴지도록 만듭니다.
- **Weight (무게감)**: 중요한 요소는 묵직하게(느린 애니메이션), 가벼운 요소는 경쾌하게.
- **Material (물성)**: Glass(유리)와 Gold(금)의 질감을 `backdrop-filter`와 `gradient`로 표현.
- **Depth (깊이감)**: 단순한 `z-index`가 아닌, 다중 레이어 블러와 그림자로 공간감 형성.

### 💎 UX Pro Max Requirements
- **Zero Layout Shift**: 로딩 중에도 레이아웃이 튀지 않아야 함 (Skeleton 활용).
- **Micro-Interactions**:
  - 버튼 호버 시 단순 색상 변경 `X` -> 빛이 지나가는 효과 `O`
  - 카드 클릭 시 약간의 축소(`scale-95`) 후 반동 효과
- **Sound Design (Optional)**: 클릭/성공 시 미세한 햅틱/사운드 피드백 고려.

## 2. Implementation Rules (for Claude)

### A. Component Structure
모든 UI 컴포넌트는 다음 구조를 따라야 합니다:
1.  **Container**: 레이아웃을 잡고 배경 흐림(`backdrop-blur`) 처리.
2.  **Highlight**: 테두리나 배경에 미세한 그라데이션 발광(`ring`, `shadow`).
3.  **Content**: 텍스트와 아이콘은 명확한 대비를 가짐.
4.  **Interaction Layer**: 호버/클릭 이벤트를 감지하는 투명 레이어.

### B. Animation Standards (`framer-motion`)
- **Entrance**: `initial={{ opacity: 0, y: 20 }}` -> `animate={{ opacity: 1, y: 0 }}`
- **Transition**: `type: "spring", stiffness: 300, damping: 30` (쫀득한 느낌)
- **Hover**: `whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}`

### C. Color Palette extensions (`tailwind.config.ts`)
기존 골드 컬러를 확장하여 사용:
- `gold-100` (#F9F5E3): 하이라이트
- `gold-300` (#F4E4BA): 메인 텍스트
- `gold-500` (#D4AF37): 브랜드 컬러 (버튼, 강조)
- `gold-900` (#3E3210): 깊은 배경 그림자

## 3. Recommended Libraries
이미 프로젝트에 설치되어 있습니다:
- `framer-motion`: 애니메이션 엔진
- `lucide-react`: 아이콘
- `clsx`, `tailwind-merge`: 스타일 유틸리티

## 4. Example: "The Orb Pattern"
신비로운 느낌을 주기 위해 배경에 은은하게 움직이는 '빛의 구슬(Orb)'을 배치하세요.
```tsx
<motion.div
  animate={{
    scale: [1, 1.2, 1],
    opacity: [0.3, 0.5, 0.3],
  }}
  transition={{
    duration: 8,
    repeat: Infinity,
    ease: "easeInOut"
  }}
  className="absolute top-0 left-1/2 w-96 h-96 bg-gold-500/20 blur-[100px] rounded-full"
/>
```

## 5. Usage
이 스킬을 참조하여 `PaymentWidget`, `Dashboard`, `AnalysisForm` 등의 주요 컴포넌트를 리팩토링하십시오.
