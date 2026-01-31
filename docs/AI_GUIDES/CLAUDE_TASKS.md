---
status: pending
priority: highest
assignee: Claude
title: "2026 병오년 리뉴얼 및 브랜드 스토리 페이지 구현"
description: >
  `docs/PLANNING/2026_RENEWAL_PLAN.md` 기획안을 바탕으로 
  메인 대시보드와 해화당 소개(스토리) 페이지를 전면 리뉴얼해야 합니다.
  2026년 병오년(붉은 말의 해) 컨셉을 시각적으로 강렬하게 전달하고, 
  해화당만의 천지인(天地人) 철학을 감성적인 스토리텔링으로 풀어내야 합니다.
  (기존 관리자 페이지 작업보다 이 작업을 최우선으로 진행해주세요.)

requirements:
  - "**Main Dashboard Renewal (`/protected/page.tsx`)**":
    - **Hero Section**: 붉은 말(Red Horse)과 태양의 이미지를 형상화한 강렬한 비주얼 및 애니메이션 구현.
    - **Copy**: "적토마의 질주, 당신의 운명에 불을 밝히다" 등 기획안의 카피 적용.
    - **New Widgets**: '2026년 운세 바로가기', '오늘의 지혜(Daily Wisdom)' 카드 추가.
    - **Layout**: 기존 그리드를 재배치하여 '천지인 통합 분석'을 강조.

  - "**Brand Story Page (`/protected/services/page.tsx`)**":
    - **Storytelling Flow**: [공감(Pain) -> 탄생(Origin) -> 천지인(Solution) -> 약속(Trust)]의 4단계 스크롤텔링 구현.
    - **Visuals**: 각 챕터별로 몰입감 있는 배경 및 타이포그래피 애니메이션 (Framer Motion 적극 활용).
    - **Content**: 기획안에 명시된 텍스트와 철학(解化堂)을 충실히 반영.

  - "**Technical Constraints**":
    - `framer-motion`을 사용하여 고급스러운 스크롤 인터랙션 구현.
    - 모바일에서도 완벽하게 반응하는 레이아웃.
    - 기존 `design_system` (Midnight in Cheongdam) 엄수.

context: >
  사용자는 기획된 내용이 실제 화면으로 어떻게 구현되는지 빠르게 확인하고 수정하길 원합니다.
  비주얼적인 완성도(Wow-factor)가 매우 중요합니다.

files_to_modify:
  - app/protected/page.tsx (메인 대시보드)
  - app/protected/services/page.tsx (소개 페이지)
  - components/dashboard/**/* (대시보드 신규 위젯)
  - components/services/**/* (소개 페이지 전용 컴포넌트)

references:
  - docs/PLANNING/2026_RENEWAL_PLAN.md (상세 기획안)
---
