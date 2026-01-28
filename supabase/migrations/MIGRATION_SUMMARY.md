# 해화당 AI - Database Migration 정리 작업 완료 보고

## 작업 개요
날짜: 2026-01-29
작업: Supabase migrations 폴더 SQL 파일 정리 및 재구성

## 문제점
- 총 29개의 SQL 마이그레이션 파일이 복잡하게 얽혀있음
- 중복된 테이블 생성/수정 파일 다수 (payments 테이블만 3번 생성)
- 디버그/테스트용 일회성 파일들 혼재
- 날짜 형식 불일치 (20240121, 20260122 등)
- 파일명이 기능을 명확히 표현하지 못함

## 해결 방안
기능별로 8개의 명확한 마이그레이션 파일로 재구성

### 새로운 파일 구조

#### 00_initial_schema.sql (7.5KB)
**목적**: 핵심 데이터베이스 스키마 정의
**포함 테이블**:
- `profiles` - 사용자 프로필 (full_name, email, avatar_url, role, credits)
- `family_members` - 가족/지인 정보 (이름, 생년월일, 관상/손금 이미지)
- `saju_records` - 사주 분석 기록
- `payments` - 결제 내역 (payment_key, order_id, amount, status)

**주요 기능**:
- RLS (Row Level Security) 정책 설정
- Storage Bucket 설정 (아바타 이미지)
- 트리거 함수 (updated_at 자동 갱신, 신규 유저 자동 프로필 생성)

#### 01_admin_system.sql (2.5KB)
**목적**: 관리자 권한 시스템
**포함 내용**:
- `is_admin()` 함수 - 관리자 체크 (RLS 재귀 방지를 위한 SECURITY DEFINER)
- `ai_prompts` 테이블 - AI 프롬프트 템플릿 (관리자 전용)
- 관리자 RLS 정책 (profiles, payments 전체 조회 권한)

#### 02_wallet_system.sql (5.6KB)
**목적**: 통합 부적(크레딧) 관리 시스템
**포함 테이블**:
- `wallets` - 사용자별 부적 잔액 (balance, is_subscribed, subscription_end_date)
- `wallet_transactions` - 부적 사용/충전 이력 (CHARGE, USE, BONUS, REFUND, SUBSCRIPTION)
- `feature_costs` - 기능별 동적 가격 설정

**초기 기능 가격**:
- 사주 정밀 분석: 1부적
- 궁합 분석: 2부적
- AI 관상/손금: 각 2부적
- AI 풍수: 3부적
- 개운 이미지 생성: 5부적
- AI 신당 채팅: 1부적

**주요 로직**:
- 신규 가입 시 1부적 보너스 자동 지급
- 기존 payments 데이터를 wallets로 마이그레이션

#### 03_subscription_system.sql (2.2KB)
**목적**: 구독 관리 시스템
**포함 테이블**:
- `subscriptions` - 구독 정보 (plan_id, status, billing_key, next_billing_date)
- 상태: ACTIVE, INACTIVE, CANCELED, EXPIRED

#### 04_membership_tiers.sql (10.1KB)
**목적**: 3단계 멤버십 시스템
**포함 테이블**:
- `membership_plans` - 멤버십 플랜 정의
- `daily_usage_logs` - 일일 사용량 추적

**멤버십 등급**:

| 등급 | 가격 | 일일 부적 | 인연 한도 | 저장공간 | 특징 |
|------|------|----------|-----------|----------|------|
| 싱글 | 9,900원 | 10개 | 3명 | 10MB | 기본 기능 |
| 패밀리 | 29,900원 | 30개 | 10명 | 50MB | 가족 궁합 분석 |
| 비즈니스 | 99,000원 | 100개 | 50명 | 999MB | API 액세스, 우선 지원 |

**헬퍼 함수**:
- `get_user_tier()` - 사용자 등급 조회
- `check_daily_talisman_limit()` - 일일 부적 한도 체크
- `increment_daily_talisman_usage()` - 일일 사용량 증가
- `check_relationship_limit()` - 인연 한도 체크
- `cleanup_old_usage_logs()` - 30일 지난 로그 자동 정리

**통계 뷰**:
- `tier_stats` - 등급별 구독자 수, 월 매출 통계

#### 05_ai_prompts_data.sql (1.7KB)
**목적**: AI 프롬프트 초기 데이터
**포함 내용**:
- `shaman_chat` 프롬프트 - AI 신당 채팅용 시스템 프롬프트
- 30년 경력 역술인 페르소나
- 천지인(天地人) 통합 분석 컨셉

#### 06_daily_fortune.sql (2.7KB)
**목적**: 데일리 운세 시스템
**포함 테이블**:
- `daily_fortune_records` - 일일 운세 기록 (lucky_color, lucky_number, lucky_direction)

**헬퍼 함수**:
- `get_today_fortune()` - 오늘의 운세 조회
- `cleanup_old_fortune_records()` - 30일 지난 운세 자동 정리

#### 99_initial_data.sql (1.6KB)
**목적**: 초기 데이터 및 설정
**포함 내용**:
- 관리자 권한 부여 (pdkshno1@gmail.com)
- auth.users → profiles.email 동기화
- 기존 payments 데이터를 wallets로 마이그레이션
- Schema reload 알림

#### README.md (3.1KB)
**목적**: 마이그레이션 가이드 문서
**포함 내용**:
- 실행 순서 안내
- 주요 테이블 설명
- 보안 정책(RLS) 설명
- 헬퍼 함수 목록
- 마이그레이션 실행 방법

## 기술적 개선사항

### 1. Idempotent (멱등성) 보장
```sql
CREATE TABLE IF NOT EXISTS public.wallets (...);
INSERT ... ON CONFLICT (name) DO UPDATE SET ...;
DROP POLICY IF EXISTS "policy_name" ON table_name;
```
→ 여러 번 실행해도 안전

### 2. RLS 재귀 방지
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- 중요: RLS를 우회하여 재귀 방지
SET search_path = public
AS $$ ... $$;
```

### 3. 자동 트리거 활용
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ ... $$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```
→ updated_at 자동 갱신

### 4. 데이터 무결성
```sql
-- Foreign Key Constraints
user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE

-- Check Constraints
CHECK (balance >= 0)
CHECK (status IN ('ACTIVE', 'INACTIVE', 'CANCELED', 'EXPIRED'))

-- Unique Constraints
CONSTRAINT unique_user_date UNIQUE (user_id, usage_date)
```

### 5. 인덱스 최적화
```sql
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX idx_daily_usage_user_date ON public.daily_usage_logs(user_id, usage_date);
```

## 데이터 마이그레이션 전략

### 기존 데이터 보존
1. 29개 파일 → `_archive/` 폴더로 이동 (백업)
2. 새 파일은 기존 데이터와 호환되도록 설계
3. `99_initial_data.sql`에서 기존 payments 데이터를 wallets로 자동 이관

### 실행 순서
```bash
# Supabase CLI 사용
supabase db reset  # 로컬 테스트

# 또는 Supabase Dashboard SQL Editor에서
# 00 → 01 → 02 → 03 → 04 → 05 → 06 → 99 순서로 실행
```

## 보안 고려사항

### Row Level Security (RLS)
- 모든 테이블에 RLS 활성화
- 사용자는 자신의 데이터만 접근
- 관리자는 `is_admin()` 함수로 전체 접근

### Storage 정책
- 아바타 이미지: 공개 읽기, 본인만 업로드/수정/삭제
- 폴더 구조: `avatars/{user_id}/`

### SQL Injection 방지
- 모든 함수에 `SECURITY DEFINER` 사용
- `search_path` 명시적 설정

## 성능 최적화

### 인덱스 전략
- Primary Key: 모든 테이블에 uuid 또는 복합 키
- Foreign Key 인덱스: user_id, member_id 등
- 검색용 인덱스: status, created_at DESC

### 자동 정리 함수
```sql
cleanup_old_usage_logs()  -- 30일 지난 일일 사용량 로그 삭제
cleanup_old_fortune_records()  -- 30일 지난 운세 기록 삭제
```
→ 데이터베이스 용량 관리

## 테스트 체크리스트

- [ ] 00_initial_schema.sql 실행 확인
- [ ] 신규 유저 가입 시 profile + wallet 자동 생성 확인
- [ ] 01_admin_system.sql 실행 후 is_admin() 함수 동작 확인
- [ ] 02_wallet_system.sql 실행 후 feature_costs 데이터 확인
- [ ] 03_subscription_system.sql 실행 후 subscriptions 테이블 생성 확인
- [ ] 04_membership_tiers.sql 실행 후 3개 플랜 데이터 확인
- [ ] 05_ai_prompts_data.sql 실행 후 shaman_chat 프롬프트 확인
- [ ] 06_daily_fortune.sql 실행 후 테이블 생성 확인
- [ ] 99_initial_data.sql 실행 후 관리자 권한 확인
- [ ] RLS 정책 동작 확인 (일반 유저는 자신의 데이터만 조회)
- [ ] 관리자 계정으로 전체 데이터 조회 확인

## 주의사항

1. **관리자 이메일 변경 필수**
   - `99_initial_data.sql` 파일에서 `pdkshno1@gmail.com`을 실제 관리자 이메일로 변경

2. **기존 데이터 백업**
   - 프로덕션 적용 전 반드시 데이터베이스 백업

3. **로컬 테스트**
   - Supabase Local Development로 먼저 테스트 후 프로덕션 적용

4. **단계적 적용**
   - 한 번에 모든 마이그레이션을 실행하지 말고, 하나씩 실행하며 검증

## 다음 단계 제안

1. **Edge Functions 연동**
   - 일일 운세 자동 생성 Cron Job
   - 월렛 트랜잭션 후 잔액 자동 업데이트

2. **Webhook 설정**
   - Toss Payments 결제 완료 시 wallets 자동 충전
   - 구독 갱신 시 talismans_per_period 자동 지급

3. **Analytics 테이블**
   - 기능별 사용 통계
   - 멤버십별 전환율 분석

4. **백업 자동화**
   - pg_dump 스케줄링
   - S3 백업 저장

## 파일 통계

| 구분 | Before | After |
|------|--------|-------|
| 파일 수 | 29개 | 8개 + README |
| 총 용량 | ~45KB | ~36KB (정리됨) |
| 중복 제거 | - | 21개 파일 통합 |

## 결론

복잡하게 얽혀있던 29개의 마이그레이션 파일을 기능별로 명확하게 8개로 재구성했습니다. 각 파일은 하나의 명확한 책임을 가지며, idempotent하게 설계되어 안전하게 여러 번 실행할 수 있습니다. RLS 정책과 헬퍼 함수를 통해 보안과 편의성을 모두 확보했습니다.

---

**작업자**: Claude Code (Sonnet 4.5)
**작업 날짜**: 2026-01-29
**프로젝트**: 해화당 AI - Database Schema Refactoring
