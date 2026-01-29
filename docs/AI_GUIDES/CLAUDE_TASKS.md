# Mission: 구조 검증 및 레이아웃 최적화 (Phase 27)

## 1. 개요
Project Cleanup(Phase 26) 이후 시스템 안정성을 검증하고, Protected 영역의 레이아웃을 사용자 경험(UX) 중심의 'Midnight in Cheongdam' 스타일로 최종 조율합니다.

## 2. 작업 목표 (Tasks)

### Task 1: 구조 정리 검증 (Post-Cleanup Verification)
**목표**: 삭제된 폴더(`billing`, `destiny`, `coaching`, `relationships`)로 인한 부작용 확인 및 해결.

1.  **빌드 테스트**:
    - `npm run build`를 실행하여 죽은 링크(Dead Links)나 타입 에러가 없는지 확인하십시오.
    - 특히 `components/dashboard`, `components/site-header` 등 네비게이션이 포함된 컴포넌트를 중점적으로 점검하십시오.

2.  **경로 검증**:
    - 기존 `/protected/relationships` → `/protected/family` 리다이렉트 또는 링크 수정 확인.
    - 기존 `/protected/coaching` → `/protected/ai-shaman` 연결 확인.
    - 기존 `/protected/destiny` 관련 기능이 `/protected/saju` 및 `/protected/fengshui` 등에서 정상 작동하는지 확인.

### Task 2: Protected Layout 정교화 (Refine Layout) (구 Task 3)
**목표**: 사주 분석 및 몰입형 경험을 위해 불필요한 사이드바를 제거하고 헤더 UX를 개선합니다.

1.  **레이아웃 (`app/protected/layout.tsx`)**:
    - **No Sidebar**: Protected 영역에서 사이드바가 완전히 제거되었는지 확인하십시오.
    - **Full Width**: 메인 콘텐츠(`main`)가 화면 너비를 충분히 활용하도록 설정하십시오. (불필요한 `max-w` 제한 해제, 데스크탑 기준 `container` 또는 `max-w-screen-2xl` 적용).

2.  **헤더 UX (`components/site-header.tsx`)**:
    - 우측 상단 액션 버튼 영역을 다음 규칙에 맞춰 점검/수정하십시오.
    - **비로그인 시**:
        - "무료 체험" 또는 "Free Start" 버튼이 있다면 제거하십시오.
        - **"로그인"** 텍스트 버튼(Link to `/auth/login`)만 간결하게 표시하십시오.
    - **로그인 시**:
        - **사용자 프로필 이미지(Avatar)** 표시.
        - **드롭다운 메뉴** 구성:
            1.  `내 정보 수정` -> `/protected/profile`
            2.  `내 사주 보기` -> `/protected/saju/detail`
            3.  `인연 관리` -> `/protected/family`
            4.  `멤버십 결제` -> `/protected/membership`
            5.  `로그아웃` (Separator로 구분, 붉은색 텍스트)

## 3. 실행 계획
- 위 내용을 확인하고, 코드가 이미 구현되어 있다면 **검증(Verify)**만 수행하십시오.
- 수정이 필요한 부분이 발견되면 즉시 반영(Implement)하십시오.
- 작업 완료 후 `docs/REPORTS/MISSION_LOG.md`에 결과를 업데이트하십시오.

---

## ✅ Phase 27 완료 (2026-01-29)

### Task 1: 구조 정리 검증 ✅
- ✅ 빌드 테스트 성공 (13.1s, 54 pages)
- ✅ 경로 검증 및 수정:
  - `site-footer.tsx`: `/protected/destiny/face` → `/protected/saju/face`
  - `profile/manse/page.tsx`: `/protected/relationships` → `/protected/family`
- ✅ 모든 네비게이션 컴포넌트 정상 작동 확인

### Task 2: Protected Layout 정교화 ✅
- ✅ Sidebar 완전 제거 확인
- ✅ Full Width 적용 확인
- ✅ Header UX 요구사항 완벽 충족:
  - 비로그인: "로그인" 텍스트 버튼만 표시
  - 로그인: Avatar + 5개 메뉴 항목 (프로필/사주/인연/멤버십/로그아웃)

**결과**: 모든 작업 완료. 빌드 성공. MISSION_LOG 업데이트 완료.
