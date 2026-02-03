# 해화당(海花堂) 마스터 플랜: 50단계 고도화 로드맵

## 개요
본 문서는 해화당 서비스를 '운명 관리 통합 플랫폼'으로 진화시키기 위한 장기 실행 계획서입니다. 기존 서비스의 안정성을 100% 보장하면서, 점진적으로 구조를 혁신합니다.

*   **원칙**: 기존 코드 파괴 금지 (Deprecate -> Migrate -> Remove 전략)
*   **구조**: 총 50 Phase (각 Phase 당 약 10개 세부 Task)

---

## [전체 로드맵 개요: Phase 1 ~ 50]

### Part 1: 데이터 및 시스템 기반 통합 (Phase 1 ~ 10)
*   **Phase 1**: 프로젝트 구조 재정비 및 관리자 제어 권한(Feature Flag) 확보
*   **Phase 2**: DB 스키마 추상화 시작 (`destiny_targets` 설계) 및 데이터 미러링
*   **Phase 3**: 통합 인연 관리(Relationship) UI 프로토타입 연결
*   **Phase 4**: 사주-관상-풍수 로직의 모듈화 및 API 통합 컨트롤러 구축
*   **Phase 5**: 결제 및 재화(부적) 로직 중앙화 (Legacy 청산 1차)

### Part 2: 기능 고도화 및 연결 (Phase 11 ~ 20)
*   **Phase 6**: 통합 사용자 대시보드 (Mobile First) 전면 개편
*   **Phase 7**: AI 분석 엔진 고도화 (사주+관상 교차 분석 로직 적용)
*   **Phase 8**: 알림(Notification) 및 리텐션 시스템(Scheduler) 구축
*   **Phase 9**: 콘텐츠 CMS 구축 (운세 데이터 관리자 직접 수정)
*   **Phase 10**: 검색 및 아카이빙 시스템 (지난 운세 모아보기)

### (이하 Part 3~5는 Phase 10 완료 후 구체화)

---

## [상세 작업 리스트: Phase 1 - 관리자 제어권 확보 및 구조 정비]
**목표**: 앱을 끄지 않고도 기능을 제어할 수 있는 '신호등'을 만들고, 개발 환경을 정리합니다.

1.  **[Admin/DB]** `system_config` (또는 `feature_flags`) 테이블 생성 SQL 작성 및 실행.
    *   컬럼: `key`, `value` (JSONB), `is_active`, `description`.
2.  **[Backend]** 서버 사이드 `FeatureManager` 유틸리티 클래스 구현.
    *   기능: DB 캐싱(1분), 키 기반 활성 여부 체크 (`isEnabled('saju_today')`).
3.  **[Frontend]** 클라이언트 사이드 `useFeatureFlag` 훅 개발.
    *   기능: React Context를 통해 앱 실행 시 설정값 로드.
4.  **[Admin/Page]** 관리자 페이지 내 '서비스 제어(Service Control)' 탭 UI 구현.
    *   기능: 주요 기능 On/Off 토글 스위치 배치.
5.  **[Refactor]** 메인 대시보드 버튼들에 `FeatureGuard` 컴포넌트 래핑.
    *   목표: 점검 중인 기능은 '준비 중' 모달이나 숨김 처리.
6.  **[Admin/Pricing]** `feature_costs` 테이블을 `system_config`와 연동되는 어드민 UI로 연결.
    *   목표: 사주 분석 비용을 관리자가 실시간 변경 가능하게 함.
7.  **[Docs]** 기획 문서와 실제 코드 간의 갭(Gap) 분석 리포트 작성 (`docs/GAP_ANALYSIS.md`).
8.  **[CI/CD]** 배포 파이프라인(GitHub Actions)에 DB 마이그레이션 자동 검증 단계 추가.
9.  **[Cleanup]** 프로젝트 내 미사용 컴포넌트 (`legacy/` 폴더 이동) 1차 정리.
10. **[Test]** Phase 1 변경 사항(관리자 제어)이 실제 운영 환경(Production)에서 동작하는지 비공개 테스트.

---

## [상세 작업 리스트: Phase 2 - 데이터 차원 이동 (Data Migration Prep)]
**목표**: `users` 테이블에 갇힌 데이터를 `destiny_targets`라는 더 넓은 그릇으로 옮길 준비를 합니다.

1.  **[DB/Design]** `destiny_targets` 테이블 상세 ERD 설계 및 확정.
    *   기존 `family_members` 컬럼 + 관상/풍수 메타데이터 컬럼 포함.
2.  **[DB/View]** 기존 `family_members` 테이블을 참조하는 SQL View (`v_destiny_targets`) 생성.
    *   목표: 기존 코드를 깨지 않고, 새 코드에서 조회할 가상 테이블 마련.
3.  **[Backend]** `DestinyTargetService` (Server Action) 신설.
    *   기능: `get_member` 등의 기존 함수들을 래핑하여 통합 객체 반환.
4.  **[Frontend]** 인연 선택 컴포넌트 (`TargetSelector`) 공통 모듈 개발.
    *   기능: 바텀 시트 형태로 나/가족/친구 목록을 보여주고 선택 시 ID 반환.
5.  **[Storage]** 관상 및 풍수 이미지 저장을 위한 Supabase Storage 버킷 정책(RLS) 재수립.
    *   목표: 사용자별 폴더 격리 (`/destiny-images/{userId}/{targetId}/`).
6.  **[Migration]** 기존 `users` (본인) 데이터를 `family_members` (본인 타입)으로 동기화하는 스크립트 작성.
    *   이유: '나'도 하나의 '분석 대상'으로 취급하기 위함.
7.  **[Admin/User]** 관리자 페이지의 회원 상세 뷰에 '등록된 인연 목록' 탭 추가.
8.  **[Logic/Saju]** 사주 만세력 라이브러리(`saju-parser`)를 `DestinyTarget` 객체 기반으로 동작하도록 래퍼(Wrapper) 작성.
9.  **[Test/Data]** 더미 데이터 100명을 생성하여 통합 구조 성능 테스트.
10. **[Review]** 데이터 구조 변경에 따른 개인정보처리방침(Privacy Policy) 검토 필요 사항 정리.

---

*(Phase 3 ~ 5 내용도 이어서 구체화 후 업데이트 예정)*
