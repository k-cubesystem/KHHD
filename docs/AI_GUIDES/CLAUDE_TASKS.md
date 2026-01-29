# Mission: Project Cleanup & Consolidation

## 1. 개요
Gemini가 작성한 `docs/REPORTS/PAGE_AUDIT.md`를 기반으로, 중복되거나 불필요한 페이지를 정리하고 프로젝트 구조를 최적화하십시오.

## 2. 작업 목표
- **불필요한 폴더 삭제**: 분석 결과 중복으로 판명된 폴더를 과감히 정리.
- **기능 통합**: 분산된 기능(결제, 사주 등)을 핵심 폴더로 통합.
- **네비게이션 최적화**: 변경된 경로에 맞춰 메뉴 링크 수정.

## 3. 상세 작업 항목 (Tasks)

### A. 폴더 삭제 및 통합 (Priority: High)
1.  **`app/protected/billing` 삭제**
    -   삭제 전: `membership` 폴더에 결제 수단 관리 기능이 없다면 필요한 코드만 복사.
    -   실행: 폴더 전체 삭제.
2.  **`app/protected/destiny` 삭제**
    -   실행: `saju` 폴더와 기능이 겹치므로 삭제.
3.  **`app/protected/coaching` 삭제**
    -   실행: `ai-shaman`이 존재하므로 삭제.
4.  **`app/protected/relationships`, `services` 삭제**
    -   실행: 더 이상 사용하지 않는 레거시 폴더 삭제.

### B. 네비게이션 업데이트 (Priority: Medium)
1.  `components/dashboard/mobile-view.tsx` 및 `desktop-view.tsx` 확인.
2.  위에서 삭제된 경로로 연결되는 링크가 있다면 제거하거나 올바른 경로(`saju`, `membership` 등)로 수정.

### C. 결과 보고
- 작업 완료 후 제거된 파일 목록과 수정된 파일 목록을 `docs/REPORTS/MISSION_LOG.md`에 기록할 것.

## 4. 주의사항
- **백업**: 삭제 전 중요한 코드가 있는지 한 번 더 확인(Dual Check).
- **디자인**: 수정하는 모든 UI는 `Midnight in Cheongdam` 디자인 시스템을 따를 것.
