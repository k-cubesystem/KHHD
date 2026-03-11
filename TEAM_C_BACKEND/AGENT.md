# TEAM_C_BACKEND — 백엔드 팀

## 해화당 멀티에이전트 시스템 v6.0

## 팀 미션

안정적이고 확장 가능한 서버 인프라를 구축하여 사주·궁합·관상·풍수 AI 서비스의 핵심 비즈니스 로직과 데이터를 처리한다.

---

## 기술 스택 기준

- Next.js Server Actions (기본) + Supabase Edge Functions (점진적 전환)
- Supabase (PostgreSQL + RLS + Storage)
- Gemini AI (`GOOGLE_GENERATIVE_AI_API_KEY` 단일 환경변수)
- Toss Payments API
- Solapi (카카오 알림톡)

---

## 에이전트 구성

### BE_SYSTEM — API & 비즈니스 로직 담당

**역할**: Server Actions, API Routes, 비즈니스 규칙 구현

**주요 책임**

- `app/actions/` 전체 Server Actions 개발 및 유지
  - `ai/`: saju, cheonjiin, compatibility, fortune-analysis, trend, year2026, wealth, shaman-chat, image, generate-image, celebrity-compatibility
  - `payment/`: wallet, subscription, attendance, products
  - `user/`: destiny, family, history, referral, free-quota
  - `core/`: notification, business-inquiry
- Toss Payments 결제 확인/취소 API 연동 (`api/payments/`)
- 웹훅 처리 (`api/webhooks/toss/route.ts`) — timingSafeEqual 서명 검증 유지
- 복채 충전/차감 트랜잭션 처리 (일별 한도: SINGLE 10만, FAMILY 30만, BUSINESS 100만)
- Rate limiting 로직 (`lib/`) 유지

**산출물 경로**

- `app/actions/` — Server Actions
- `app/api/` — API Route Handlers
- `lib/services/` — 외부 서비스 클라이언트

---

### DB_MASTER — Supabase & 마이그레이션 담당

**역할**: DB 스키마 설계, RLS 정책, 마이그레이션 관리

**주요 책임**

- Supabase 테이블 설계 및 스키마 변경 관리
- RLS(Row Level Security) 정책 작성 및 검증
- 마이그레이션 파일 관리 (`supabase/migrations/`)
- 인덱스 최적화 (현재 23개 인덱스 유지 및 추가)
- 주요 테이블 관리:
  - `notification_preferences`, `chat_sessions`, `chat_messages`
  - `business_inquiries`, `referral_codes`, `referral_uses`
  - `analysis_history`, `attendance_records`
- Supabase CLI 미연결 환경 → SQL Editor 직접 실행 가이드 유지
- DB 백업 정책 및 복구 절차 문서화

**산출물 경로**

- `supabase/migrations/` — 마이그레이션 SQL 파일
- `docs/db/` — ERD, 스키마 문서, RLS 정책 명세

---

### DATA_OPS — 데이터 파이프라인 담당

**역할**: 분석 캐싱, AI 결과 저장, 데이터 수집 파이프라인 구축

**주요 책임**

- Gemini API 응답 캐싱 시스템 (`lib/utils/analysis-cache.ts`)
  - saju, cheonjiin, fortune 캐시 적용 유지 및 확장
- `analysis_history` 테이블 데이터 품질 관리
- 사용자 행동 데이터 수집 이벤트 정의 (GA4 연동)
- Edge Function 데이터 파이프라인 (`supabase/functions/`)
- cron-fortune Edge Function 스케줄 관리
- AI 모델 응답 품질 모니터링 데이터 수집

**산출물 경로**

- `lib/utils/analysis-cache.ts` — 캐싱 로직
- `supabase/functions/` — Edge Functions
- `docs/data/` — 파이프라인 설계 문서

---

### FIN_OPS — 비용 최적화 담당

**역할**: Gemini API 비용, Supabase 사용량, Vercel 비용 모니터링 및 최적화

**주요 책임**

- Gemini API 호출 비용 추적 (PRO vs FLASH 모델 선택 최적화)
  - PRO (`gemini-3.1-pro-preview`): saju, cheonjiin, image, compatibility
  - FLASH (`gemini-3-flash-preview`): 나머지 8개 기능
- `lib/config/ai-models.ts` 모델 선택 전략 유지
- Supabase 스토리지 및 DB 사용량 최적화
- Rate limiter 설정 검토 (PRO 가격 기반 제한)
- 월별 인프라 비용 리포트 작성
- 비용 임계값 알림 설정 권고

**산출물 경로**

- `docs/finops/` — 비용 분석 리포트
- `lib/config/ai-models.ts` — 모델 설정 (검토 권한)

---

## 품질 체크리스트

### BE_SYSTEM

- [ ] 모든 Server Action에 Zod 또는 수동 입력값 검증 존재
- [ ] 결제 금액 서버 사이드 재검증 (클라이언트 금액 신뢰 금지)
- [ ] Promise.all 병렬화 적용 가능한 독립 쿼리에 적용
- [ ] 웹훅 엔드포인트 서명 검증 우회 불가 확인

### DB_MASTER

- [ ] 신규 테이블에 RLS 정책 필수 적용
- [ ] 마이그레이션 파일명 `YYYYMMDD_description.sql` 형식 준수
- [ ] 외래키 참조 무결성 확인
- [ ] N+1 쿼리 없음 (join 또는 별도 쿼리로 처리)

### DATA_OPS

- [ ] 캐시 키 충돌 없음 (사용자 ID + 입력값 해시 기반)
- [ ] 캐시 만료 정책 명시 (TTL 설정)
- [ ] Edge Function 타임아웃(10초) 내 처리 가능 여부 확인

### FIN_OPS

- [ ] PRO 모델 호출이 FLASH로 대체 가능한 기능에 오남용 없음
- [ ] 월별 Gemini API 예상 비용 계산 및 기록
- [ ] 캐시 히트율 목표(>60%) 달성 확인
