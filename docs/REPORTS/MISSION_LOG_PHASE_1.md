
## ✅ Phase 1: Admin Feature Control System (2026-02-03) - COMPLETED
**담당**: Gemini
**기반 문서**: `docs/PLANNING/PHASED_IMPLEMENTATION_PLAN.md`

### Task 1: Feature Flag Infrastructure
- [x] **DB Schema**: `system_settings` 테이블에 JSON 형태의 feature config 저장 구조 도입.
- [x] **Migration**: `20260203_init_feature_flags.sql` 작성 및 초기 플래그(사주, 관상, 궁합 등) 설정.
- [x] **Utilities**:
  - Server: `lib/feature-flags.ts` (DB 직접 조회)
  - Client: `hooks/use-feature-flag.ts` (실시간 조회)

### Task 2: Service Control Dashboard
- [x] **Admin Page**: `/admin/service-control` 페이지 신설.
  - 기능별 활성/비활성(On/Off) 토글 스위치 구현.
  - "전체 점검 모드" 지원.
- [x] **Navigation**: Admin Layout 상단 탭에 '서비스 키/스위치' 메뉴 추가 (Power 아이콘).

### Task 3: Client-Side Guard
- [x] **FeatureGuard Component**: `components/feature-guard.tsx`
  - 기능이 꺼져있으면 UI를 흐리게 처리(Blur)하고 클릭 차단(Lock Icon).
  - Toast 메시지로 안내.
- [x] **Implementation**: 모바일 대시보드(`MobileView`)의 주요 버튼 6종에 Guard 적용 완료.
