# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.0] - 2026-02-11

### Added - PHASE 4: 세부 페이지 구현

#### 신규 페이지 (3개)

- **주간 운세** (`/protected/fortune/weekly`): 7일 타임라인 형태, 요일별 운세 카드
  - 오늘 강조 표시
  - 길/중/흉 키워드 배지
  - 주간 평균 점수 게이지
  - 일별 트렌드 아이콘 (상승/유지/하락)
- **월간 운세** (`/protected/fortune/monthly`): 준비 중 페이지 (기본 틀)
- **친구 초대** (`/protected/referral`): 초대 시스템
  - 초대 코드 자동 생성
  - 링크 복사 기능
  - 초대 통계 (초대 인원, 획득 부적)
  - 초대 방법 가이드

#### UI/UX 개선

- 모든 세부 페이지에 "돌아가기" 버튼 추가
- 일관된 헤더 디자인
- 반응형 레이아웃

### Technical Details

- Next.js 14 App Router 활용
- Server Components for SEO
- Client Components for 인터랙션

---

## [1.4.0] - 2026-02-11

### Added - PHASE 3: 관리자 대시보드 고도화

#### 실시간 모니터링 시스템

- **Recent Activity Live**: Supabase Realtime으로 실시간 활동 로그 스트리밍
  - 가입, 결제, 분석, 업그레이드 등 모든 사용자 활동 추적
  - 자동 아이콘 및 색상 매핑
  - 상대 시간 표시 (예: "3분 전")
- **시간대별 트래픽 차트**: Recharts로 24시간 트래픽 시각화
  - 방문수, 신규가입, 매출 동시 표시
  - 1분마다 자동 갱신

#### 데이터베이스

- `activity_logs` 테이블: 사용자 활동 로그 (자동 트리거)
- `utm_tracking` 테이블: UTM 파라미터 추적 및 전환율 분석
- `funnel_events` 테이블: 단계별 이탈률 분석
- `traffic_hourly` 테이블: 시간대별 트래픽 집계

#### RPC 함수 (4종)

- `get_recent_activities()`: 최근 활동 조회
- `get_utm_performance()`: UTM 성과 분석
- `get_funnel_analysis()`: Funnel 이탈률 계산
- `get_hourly_traffic()`: 시간대별 트래픽 조회

#### 자동 로깅 트리거

- 신규 가입 시 자동 로그 (`trigger_log_signup`)
- 결제 완료 시 자동 로그 (`trigger_log_payment`)

#### 관리자 빠른 액션 (Server Actions)

- `sendGlobalNotification()`: 전체 사용자 공지 발송
- `issueCouponToAll()`: 전체 사용자 쿠폰 발급
- `createEvent()`: 이벤트 배너 생성

### Technical Details

- **성능**: RPC 함수로 복잡한 집계 최적화
- **보안**: 관리자 권한 체크 (checkAdminPermission)
- **실시간성**: Supabase Realtime 채널 구독

---

## [1.3.0] - 2026-02-11

### Changed - PHASE 2: AI 채팅 무료화

#### AI 채팅 접근성 개선

- **무료 사용자 AI 채팅 이용 가능**: 기존 PRO 전용에서 무료 사용자도 1일 1회 (3턴) 사용 가능으로 변경
- **차등 혜택 시스템**: 무료/PRO 회원 간 명확한 차별화
  - 무료: 1일 1회, 부적 100장/세션, 응답 3초 지연
  - PRO: 무제한, 부적 50장/세션 (50% 할인), 즉시 응답
- **업그레이드 유도 UI**: 프리미엄 혜택 비교 배너 및 CTA 버튼 추가

#### 데이터베이스

- `ai_chat_usage` 테이블: 일일 사용 횟수 추적
- RPC 함수: `increment_ai_chat_usage`, `record_ai_chat_turn`
- 자동 삭제 트리거: 30일 이상 된 기록 정리

#### Server Actions

- `getAIChatUsageStatus()`: 사용 현황 조회
- `sendShamanChatMessage()`: 무료/PRO 차등 로직 추가
  - 일일 사용 횟수 체크
  - 부적 차감 차등 적용
  - 응답 지연 추가 (무료 사용자)
  - 에러 타입 구분 (upgradeRequired, insufficientTalisman)

#### UI/UX 개선

- 무료/PRO 배지 동적 표시
- 업그레이드 배너 (무료 사용자 대상)
- 사용 횟수 실시간 표시
- 개선된 에러 메시지 (액션 버튼 포함)
- Toast 알림에 업그레이드/충전 링크 추가

### Technical Details

- **보안**: 서버 사이드 사용 횟수 검증
- **성능**: RPC 함수로 DB 연산 최적화
- **UX**: 3초 응답 지연으로 PRO 가치 강조

---

## [1.2.0] - 2026-02-11

### Added - PHASE 1: 메인 페이지 리뉴얼

#### 이벤트 시스템

- **이벤트 배너 시스템**: 관리자가 설정 가능한 동적 배너 3종 (신규 가입 혜택, 친구 초대, 이달의 할인)
- **일일 출석 체크**: 매일 출석하고 부적을 받는 시스템
  - 기본 보상: 50장/일
  - 연속 보너스: 3일 (+100장), 7일 (+500장), 30일 (+2000장)
  - 7일 보상 캘린더 UI
  - 연속 일수 추적
- **행운의 룰렛**: 1일 1회 무료 룰렛 이벤트
  - 확률 기반 보상 시스템 (서버 사이드 계산)
  - 부적 50장(40%), 100장(30%), 300장(20%), 1000장(9%), 프리미엄 30일(1%)
  - 회전 애니메이션 및 결과 표시
- **온보딩 투어**: 신규 사용자를 위한 인터랙티브 가이드
  - 4단계 튜토리얼 (부적 지갑, 일일 출석, 운세 게이지, AI 신당)
  - 스포트라이트 효과로 주요 기능 강조
  - 진행률 표시 및 건너뛰기 기능
  - 완료 상태 저장

#### 데이터베이스

- `daily_attendance` 테이블: 일일 출석 기록 추적
- `roulette_history` 테이블: 룰렛 사용 기록
- `event_banners` 테이블: 이벤트 배너 관리 (관리자 전용)
- `add_talisman` RPC 함수: 부적 지급 자동화
- `profiles` 테이블에 `onboarding_completed`, `onboarding_step` 컬럼 추가

#### 컴포넌트

- `EventBanners`: 우선순위 기반 이벤트 배너 표시
- `DailyCheckIn`: 일일 출석 체크 카드 (보상 캘린더 포함)
- `LuckyRoulette`: 행운의 룰렛 카드 (회전 애니메이션)
- `OnboardingTour`: 커스텀 온보딩 투어 시스템
- `OnboardingTourWrapper`: 온보딩 상태 관리 래퍼

#### Server Actions

- `checkDailyAttendance()`: 출석 상태 확인
- `recordDailyAttendance()`: 출석 기록 및 보상 지급
- `checkRouletteAvailability()`: 룰렛 사용 가능 여부 확인
- `spinRoulette()`: 룰렛 회전 및 보상 지급
- `getRouletteRewards()`: 룰렛 보상 목록 조회

### Changed

- **메인 페이지 레이아웃**: Hero 배너 아래 이벤트 섹션 추가
- **사용자 경험**: 게임화 요소 추가로 참여도 향상
- **부적 획득 방식**: 수동 충전 외에 일일 이벤트로 획득 가능

### Technical Details

- **보안**: 서버 사이드 확률 계산으로 클라이언트 조작 방지
- **성능**: RLS 정책으로 데이터 접근 제어
- **UX**: Framer Motion 애니메이션으로 부드러운 전환 효과
- **접근성**: 온보딩 투어로 신규 사용자 진입 장벽 낮춤

---

## [1.1.0] - 2026-02-08

### Added - Phase 1: 구조 고도화

- `PROJECT_RULES.md` 생성 (클린 코드 규칙, 레이어 분리 원칙)
- `Database.md` 생성 (ERD, 14개 테이블 명세, RPC 함수, 인덱스 최적화안)
- lib/ Clean Architecture 재배치

### Changed - 이전 작업 (2026-02-07)

- 운세 흐름 메인 페이지 리뉴얼 완료
- 레벨 시스템 제거 → 대운(大運) 개념으로 전환

---

## [1.0.0] - 2026-01-XX

### Added

- 초기 프로젝트 설정
- 기본 사주 분석 시스템
- 사용자 인증 및 프로필 관리
- 부적 지갑 시스템

---

**Legend**:

- 🎉 Major feature
- ✨ Minor feature
- 🐛 Bug fix
- 🔧 Configuration
- 📝 Documentation
- 🎨 UI/UX improvement
- ⚡ Performance
- 🔒 Security
