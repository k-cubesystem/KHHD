---
status: pending
priority: highest
assignee: Claude
title: "Phase 2: Data Integration Foundation (Destiny Targets)"
description: >
  **[긴급] 전체 기획 숙지 필수**:
  작업 시작 전, 반드시 `docs/PLANNING/MASTER_ARCHITECTURAL_BLUEPRINT.md`를 정독하여
  우리가 지향하는 '통합 운명 플랫폼'의 큰 그림을 이해해야 합니다.
  단순한 코딩이 아니라, 향후 1년 이상 사용될 **데이터 구조의 기초**를 다지는 작업입니다.

  **핵심 과제**:
  기존의 파편화된 사용자 데이터(`users`, `family_members`)를 
  통합 운명 객체인 `DestinyTarget` 개념으로 추상화하는 작업을 수행해야 합니다.
  이는 향후 '인명부' 기능과 '교차 분석'을 위한 필수 기초 공사입니다.

requirements:
  - "**Schema & View (`supabase/migrations`)**":
    - **Goal**: 기존 `family_members` 테이블을 활용하되, 이를 `destiny_targets`라는 논리적 뷰(View)로 래핑하여 조회할 수 있게 만드세요.
    - **Logic**: 
      - 본인(`users`) 데이터도 이 뷰에서 조회되어야 합니다. (UNION 활용)
      - `id`, `name`, `relation`, `birth_data` 등의 공통 필드를 정의하세요.
    - **Output**: `20260204_create_destiny_targets_view.sql`

  - "**Server Actions (`app/actions/destiny-targets.ts`)**":
    - **Function**: `getDestinyTargets()`
    - **Behavior**: 현재 로그인한 유저가 관리하는 모든 대상(본인 + 가족 + 친구)을 배열로 반환합니다.
    - **Caching**: `unstable_cache`를 사용하여 DB 부하를 최소화하세요.

  - "**UI Component (`components/destiny/target-selector.tsx`)**":
    - **Type**: Bottom Sheet (Drawer)
    - **UI**: 
      - 헤더: "누구의 운명을 보시겠습니까?"
      - 리스트: 아바타 + 이름 + 관계 아이콘
      - 추가 버튼: "새로운 인연 등록" (→ `/protected/family` 링크)
    - **Interaction**: 선택 시 `onSelect(targetId)` 콜백 트리거.

context: >
  이 작업은 기존 기능을 깨지 않는 것이 최우선입니다.
  새로운 View와 Action을 만들되, 기존 페이지들이 당장 이것을 쓰지 않아도 됩니다.
  우선 '만들어두는 것'에 집중하세요.

files_to_modify:
  - supabase/migrations/20260204_create_destiny_targets_view.sql (New)
  - app/actions/destiny-targets.ts (New)
  - components/destiny/target-selector.tsx (New)

references:
  - docs/PLANNING/MASTER_ARCHITECTURAL_BLUEPRINT.md (★필독: 마스터 설계서)
  - docs/PLANNING/PHASED_IMPLEMENTATION_PLAN.md (★필독: 단계별 실행 계획 Phase 2)
  - docs/REPORTS/MISSION_LOG.md (현재 진행 상황 파악)
  - app/actions/family-actions.ts (기존 로직 참조)
  - components/dashboard/mobile-view.tsx (UI 스타일 참조)
---
