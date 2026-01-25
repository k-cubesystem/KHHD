# 🤖 Claude Collaboration Tasks (Phase 25: Membership Overhaul)

> **목적**: Gemini가 기획한 새로운 멤버십 체계(3단계 등급, 일일 제한 등)를 구현하고 관리자 기능을 강화합니다.

## ✅ Task 1: 멤버십 스키마 및 등급 개편 (Schema & Plans)
- **목표**: 기존 단일 멤버십을 3단계 등급제(Single, Family, Business)로 확장하고, 일일 사용량을 제어합니다.
- **DB 변경 사항 (`membership_plans` 테이블 컬럼 추가)**:
  - `tier`: TEXT CHECK (tier IN ('SINGLE', 'FAMILY', 'BUSINESS'))
  - `daily_talisman_limit`: INTEGER (일일 부적 사용/생성 한도)
  - `relationship_limit`: INTEGER (인연 관리 등록 가능 인원)
  - `storage_limit`: INTEGER (분석 결과 저장 개수)
- **기본 데이터 (Seed Data)**:
  1. **Single (싱글)**: 월 9,900원 / 일일 부적 10개 / 인연 3명 / 저장 10개
  2. **Family (패밀리)**: 월 29,900원 / 일일 부적 30개 / 인연 10명 / 저장 50개 / +가족 궁합 시각화
  3. **Business (비즈니스)**: 월 99,000원 / 일일 부적 100개 / 인연 50명 / 저장 무제한 / +API 접근(예정)
- **공통 혜택**: 카카오톡 매일 운세 알림 (모든 등급 포함).

## ✅ Task 2: 멤버십 구독 페이지 리뉴얼 (Subscription UI)
- **목표**: 3가지 티어를 비교하고 선택할 수 있는 가격표(Pricing Table) UI 구현.
- **주요 기능**:
  - **Tier Comparison**: 3개 카드를 나란히 배치하여 혜택 비교 (추천: Family 등급 강조).
  - **Visual Hierarchy**: 등급별 색상 테마 적용 (Single: Silver, Family: Gold, Business: Black/Platinum).
  - **Upgrade/Downgrade**: 기존 구독자의 플랜 변경 처리 (차액 결제 또는 즉시 변경 로직 확인).
  - **Artifact**: `app/protected/membership/page.tsx`

## ✅ Task 3: 관리자 멤버십 관리 기능 (Admin Membership Control)
- **목표**: 관리자가 코드를 수정하지 않고도 플랜의 스펙을 즉시 조정할 수 있어야 함.
- **위치**: `/admin/membership/plans` (신규 페이지)
- **주요 기능**:
  - **Plan Editor**: 각 플랜의 가격, 일일 부적 한도, 인연 한도, 저장 한도 수정 Form.
  - **Live Update**: 수정 즉시 DB 반영 및 유저 혜택 적용.
  - **Artifact**: `app/admin/membership/plans/page.tsx`

## ✅ Task 4: 등급별 제한 로직 적용 (Enforcement)
- **목표**: 유저의 등급에 따라 실제 서비스 이용을 제한.
- **적용 지점**:
  - **인연 추가 시**: `relationship_limit` 체크 (초과 시 업그레이드 유도 모달).
  - **부적 사용 시**: `daily_talisman_limit` 체크 (매일 자정 리셋 로직 필요 - 별도 테이블 `daily_usage_logs` 등 고려).
  - **결과 저장 시**: `storage_limit` 체크.

## 📝 고급 기능 제안 (Advanced Features)
- **Family Tree Visualization**: Family 등급 이상 전용, 가계도 시각화.
- **Calendar Sync**: Business 등급 전용, 구글/애플 캘린더에 길일(Lucky Day) 자동 동기화.
- **PDF Export**: 분석 결과 PDF 다운로드 기능 (기존 포함 여부 확인, Business는 브랜드 로고 제거 등).

---

### 작업 순서
1. **DB Migration**: `membership_plans` 테이블 수정 및 데이터 초기화.
2. **Admin UI**: 관리자 설정 페이지 먼저 구현 (데이터 확인 용이).
3. **User UI**: 구독 페이지 리뉴얼.
4. **Backend**: 제한 로직 미들웨어 또는 서비스 함수 구현.
