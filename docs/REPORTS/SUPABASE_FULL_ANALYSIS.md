# Supabase 폴더 전체 분석 보고서

> 분석일: 2026-02-17 | 분석자: DB_MASTER + LIBRARIAN + AUDITOR + SHERLOCK

---

## 1. 파일 현황 요약

| 위치                                             | 파일 수 | 상태                             |
| ------------------------------------------------ | ------- | -------------------------------- |
| `supabase/migrations/` (active)                  | 50개    | 현재 적용 대상                   |
| `supabase/migrations/_archive/`                  | 29개    | 삭제 안전 (모두 active에 통합됨) |
| `supabase/migrations/_backup/`                   | 2개     | 삭제 안전                        |
| `supabase/` 루트 유틸 SQL                        | 6개     | 수동 실행용 (체크/관리 쿼리)     |
| `supabase/migrations/DEPLOY_ALL_PHASES.sql`      | 1개     | 비표준 파일, 삭제 가능           |
| `supabase/migrations/create_system_settings.sql` | 1개     | 날짜 prefix 없어 정렬 불일치     |

---

## 2. Active 마이그레이션 타임라인

```
00_initial_schema.sql          → profiles, wallets, payments 기본 스키마
01_admin_system.sql            → is_admin() 함수, role 시스템
02_wallet_system.sql           → wallet_transactions, feature_costs
03_subscription_system.sql     → subscriptions, membership_plans
04_membership_tiers.sql        → 멤버십 등급 데이터
05_ai_prompts_data.sql         → ai_prompts 초기 데이터
06_daily_fortune.sql           → daily_fortune 테이블
99_initial_data.sql            → 초기 시드 데이터

20260129_fix_recursion.sql     → RLS 무한루프 수정
20260131_set_admin.sql         → 관리자 계정 설정
20260203_init_feature_flags.sql → feature_flags 테이블
20260204_analysis_history.sql  → analysis_history 테이블 ⚠ share_token 컬럼 없음
20260204_add_profile_columns.sql → profiles 컬럼 추가
20260204_*                     → RLS, 트리거 수정 다수
20260205_migrate_and_drop_saju_records.sql → saju_records 마이그레이션
20260205_create_family_summary_rpc.sql
20260206_*                     → analysis_sessions, family_missions_rpc
20260207_*                     → enhance_profile, fortune_journal
20260211_phase1_events.sql     → event_banners 테이블
20260211_profiles_address_fields.sql
20260211_fix_rls_recursion.sql
20260212_phase2_ai_chat_free.sql → ai_chat_sessions 테이블
20260212_compatibility_prompt.sql
20260213_phase3_admin_dashboard.sql → activity_logs, utm_tracking, funnel_events, traffic_hourly ⚠ 트리거 중복
20260213_*                     → 프롬프트 데이터
20260214_fix_traffic_hourly.sql → traffic_hourly 트리거 (위 파일과 중복 가능)
20260214_bokchae_system.sql    → 복채 시스템 (wallets 개편)
20260214_*                     → RLS 수정, 멤버십 플랜
20260215_*                     → 프로필 RLS, roulette 제약조건
20260217_gemini_rate_and_usage.sql → Gemini 사용량 RPC
20260217_fix_admin_dashboard.sql   → gemini_token_bucket, gemini_api_logs, traffic 트리거
20260217_share_analysis_rpc.sql    → share_token RPC ⚠ 컬럼 없음
20260217_fix_user_signup_and_profiles.sql → handle_new_user 강화
create_system_settings.sql     → ⚠ 날짜 prefix 없음 (정렬 마지막)
```

---

## 3. 테이블 목록 (21개)

| 테이블                | 파일                   | 설명                 |
| --------------------- | ---------------------- | -------------------- |
| `profiles`            | 00_initial_schema      | 사용자 프로필 (핵심) |
| `wallets`             | 00 / 02                | 복채 지갑            |
| `wallet_transactions` | 02                     | 복채 거래 내역       |
| `payments`            | 00                     | 결제 내역            |
| `subscriptions`       | 03                     | 구독                 |
| `membership_plans`    | 03/04                  | 멤버십 등급          |
| `feature_costs`       | 02                     | 기능별 복채 비용     |
| `ai_prompts`          | 00 / 05                | AI 프롬프트          |
| `daily_fortune`       | 06                     | 오늘의 운세          |
| `feature_flags`       | 20260203               | 기능 플래그          |
| `analysis_history`    | 20260204               | 분석 기록            |
| `analysis_sessions`   | 20260206               | 분석 세션            |
| `fortune_journal`     | 20260207               | 운세 저널            |
| `event_banners`       | 20260211               | 이벤트 배너          |
| `ai_chat_sessions`    | 20260212               | AI 채팅 세션         |
| `activity_logs`       | 20260213               | 활동 로그            |
| `utm_tracking`        | 20260213               | UTM 추적             |
| `funnel_events`       | 20260213               | 퍼널 이벤트          |
| `traffic_hourly`      | 20260213               | 시간대별 트래픽      |
| `gemini_token_bucket` | 20260217               | Gemini 토큰 버킷     |
| `gemini_api_logs`     | 20260217               | Gemini API 로그      |
| `system_settings`     | create_system_settings | 시스템 설정          |
| `notification_logs`   | create_system_settings | 알림 로그            |
| `roulette_config`     | 20260214_bokchae       | 룰렛 설정            |

---

## 4. 발견된 문제점

### 🔴 긴급 (기능 오류)

#### 4-1. `analysis_history.share_token` 컬럼 누락

- **파일**: `20260217_share_analysis_rpc.sql`이 `WHERE share_token = token_input` 사용
- **원인**: `20260204_analysis_history.sql`에 `share_token` 컬럼이 없음
- **영향**: 공유 URL 기능 전체 불작동 (RPC 함수 오류)
- **수정**: `ALTER TABLE analysis_history ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE`

#### 4-2. `trigger_log_signup` 중복 기록

- **파일**: `20260213_phase3_admin_dashboard.sql` (profiles INSERT → activity_logs 기록)
- **충돌**: `20260217_fix_user_signup_and_profiles.sql`의 `handle_new_user`도 activity_logs 기록
- **영향**: 가입 1회에 signup 이벤트 2건 기록 → 트래픽 차트 신규가입 수 2배 표시
- **수정**: `DROP TRIGGER trigger_log_signup ON profiles`

### 🟡 주의 (잠재적 이슈)

#### 4-3. `ai_prompts.talisman_cost` 컬럼 보장 필요

- **원인**: 컬럼 추가 SQL이 `_archive`에 있어 적용 여부 불명확
- **수정**: `ADD COLUMN IF NOT EXISTS talisman_cost INTEGER DEFAULT 1`

#### 4-4. `create_system_settings.sql` 날짜 prefix 없음

- **현재**: migrations 폴더에 날짜 없이 존재 → Supabase CLI 정렬 이슈
- **수정**: `20260220_create_system_settings.sql`로 rename 권고

#### 4-5. traffic_hourly 트리거 함수 중복 정의

- `20260213_phase3_admin_dashboard.sql`: RPC `get_hourly_traffic` 정의 (traffic_hourly 조회)
- `20260214_fix_traffic_hourly.sql`: `update_traffic_signup/payment/visit` 트리거 정의
- `20260217_fix_admin_dashboard.sql`: 유사 트리거 재정의
- **현재 상태**: `CREATE OR REPLACE`라 기능상 덮어쓰기됨 (동작은 함)
- **권고**: 불필요한 중복 주석 정리

### 🟢 안전 (현재 OK)

#### 4-6. profiles USING(true) RLS

- **조사**: archive 파일의 emergency 정책 (`20260124_emergency_admin_fix.sql`) 이 적용됐을 가능성
- **현황**: active 마이그레이션 (`20260214_fix_missing_profiles_rls.sql`, `20260215_fix_profiles_rls_and_upsert.sql`)에서 RLS 재설정
- **결론**: 최신 파일 기준 정상적인 RLS 적용됨 (auth.uid() = id)

#### 4-7. \_archive 파일

- 29개 모두 active 마이그레이션에 통합되어 있음
- 삭제해도 DB 운영에 영향 없음

---

## 5. RPC 함수 목록 (48개)

| 카테고리 | 함수명                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth     | `handle_new_user`, `is_admin`                                                                                                                          |
| Profile  | `update_updated_at_column`, `emergency_create_missing_profiles`                                                                                        |
| Wallet   | `process_daily_checkin`, `spin_roulette`, `get_wallet_balance`                                                                                         |
| Analysis | `get_analysis_stats`, `get_recent_analysis`, `get_shared_analysis_record`                                                                              |
| Family   | `get_family_summary`, `get_family_missions_progress`                                                                                                   |
| Admin    | `get_recent_activities`, `get_utm_performance`, `get_funnel_analysis`, `get_hourly_traffic`                                                            |
| Gemini   | `acquire_gemini_token`, `release_gemini_token`, `log_gemini_usage`, `get_gemini_daily_stats`, `get_gemini_hourly_stats`, `get_gemini_model_comparison` |
| Traffic  | `backfill_traffic_hourly`, `upsert_traffic_hourly`                                                                                                     |
| Fortune  | `calculate_monthly_fortune`, `calculate_yearly_fortune`, `calculate_family_fortune`                                                                    |
| ...      | (및 기타)                                                                                                                                              |

---

## 6. 트리거 목록 (23개)

| 트리거명                             | 테이블           | 이벤트        | 함수                       |
| ------------------------------------ | ---------------- | ------------- | -------------------------- |
| `on_auth_user_created`               | auth.users       | INSERT        | `handle_new_user`          |
| `trigger_log_signup` ⚠               | profiles         | INSERT        | `log_user_signup` (중복)   |
| `trigger_log_payment`                | payments         | INSERT/UPDATE | `log_payment_completed`    |
| `trigger_traffic_signup`             | profiles         | INSERT        | `update_traffic_signup`    |
| `trigger_traffic_payment`            | payments         | INSERT/UPDATE | `update_traffic_payment`   |
| `trigger_traffic_visit`              | activity_logs    | INSERT        | `update_traffic_visit`     |
| `update_analysis_history_updated_at` | analysis_history | UPDATE        | `update_updated_at_column` |
| `update_profiles_updated_at`         | profiles         | UPDATE        | `update_updated_at_column` |
| ...                                  |                  |               |                            |

---

## 7. 수정 SQL

→ `supabase/migrations/20260217_cleanup_and_fixes.sql` 참조

---

## 8. 권고사항

1. **즉시 수정**: `analysis_history.share_token` 추가 + `trigger_log_signup` 중복 제거
2. **단기**: `create_system_settings.sql` → `20260220_create_system_settings.sql` rename
3. **중기**: `_archive/`, `_backup/` 폴더 삭제 (코드 이력은 git에 있음)
4. **모니터링**: Supabase Dashboard → Logs에서 트리거 오류 확인
