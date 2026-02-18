# Supabase Migrations

총 56개 파일 · 8개 카테고리

> **새 마이그레이션 추가 시**: `YYYYMMDD_설명.sql` 형식으로 해당 카테고리 폴더에 추가

---

## 📁 디렉토리 구조

```
migrations/
├── core/       초기 스키마 · 시스템 설정          (5개)
├── auth/       인증 · RLS · 프로필               (17개)
├── payment/    지갑 · 구독 · 복채                (9개)
├── ai/         AI 프롬프트 · Gemini · 신당        (8개)
├── fortune/    운세 · 미션 · 저널                (5개)
├── analysis/   분석 기록 · 세션 · 공유            (5개)
├── family/     가족 구성원 · 운명 대상            (3개)
└── admin/      관리자 대시보드                   (4개)
```

---

## core/ — 초기 스키마 · 시스템 설정

| 파일                                  | 설명                                                  |
| ------------------------------------- | ----------------------------------------------------- |
| `00_initial_schema.sql`               | 핵심 테이블 구조 (profiles, family_members, 기초 RLS) |
| `99_initial_data.sql`                 | 초기 관리자 계정 및 시드 데이터                       |
| `20260203_init_feature_flags.sql`     | 기능 제어 플래그 · system_settings 초기화             |
| `20260220_create_system_settings.sql` | 관리자용 시스템 설정 테이블                           |
| `DEPLOY_ALL_PHASES.sql`               | Phase 1-3 통합 배포 스크립트                          |

---

## auth/ — 인증 · RLS · 프로필

| 파일                                        | 설명                                       |
| ------------------------------------------- | ------------------------------------------ |
| `01_admin_system.sql`                       | 관리자 권한 체크 함수 `is_admin()`         |
| `20260129_fix_recursion.sql`                | is_admin() RLS 무한 재귀 최초 수정         |
| `20260131_set_admin_pdkshno1.sql`           | pdkshno1@gmail.com 어드민 권한 부여        |
| `20260204_add_profile_columns.sql`          | 프로필에 생년월일·성별·달력 유형 컬럼 추가 |
| `20260204_fix_profile_update_policy.sql`    | 프로필 업데이트 RLS 무한 루프 수정         |
| `20260204_reset_profile_policies.sql`       | 프로필 RLS 정책 전체 초기화                |
| `20260207_enhance_profile_context.sql`      | 프로필에 관심사·활동 상태 컬럼 추가        |
| `20260211_profiles_address_fields.sql`      | 집/직장 주소 필드 추가 (풍수 분석용)       |
| `20260211_fix_rls_recursion.sql`            | 관리자 정책 RLS 재귀 수정                  |
| `20260214_fix_missing_profiles_rls.sql`     | 신규 유저 프로필 미생성 문제 해결 함수     |
| `20260215_refine_tester_role.sql`           | tester 권한 조정 (관리자급 제거)           |
| `20260215_fix_handle_new_user.sql`          | 신규 유저 트리거 개선 (가입 보너스 포함)   |
| `20260215_profiles_insert_rls.sql`          | 프로필 INSERT RLS 정책 추가                |
| `20260215_fix_profiles_rls_and_upsert.sql`  | 프로필 INSERT/UPDATE RLS 정책 재정의       |
| `20260217_fix_user_signup_and_profiles.sql` | 신규 유저 profiles 미생성 종합 해결        |
| `20260218_add_profiles_updated_at.sql`      | profiles updated_at 컬럼 및 트리거         |
| `20260218_fix_updated_at_trigger.sql`       | profiles updated_at 트리거 완전 재설정     |

---

## payment/ — 지갑 · 구독 · 복채

| 파일                                   | 설명                                                 |
| -------------------------------------- | ---------------------------------------------------- |
| `02_wallet_system.sql`                 | 통합 복채 지갑 시스템 (wallets, wallet_transactions) |
| `03_subscription_system.sql`           | 구독 관리 테이블 및 결제 정보                        |
| `04_membership_tiers.sql`              | SINGLE/FAMILY/BUSINESS 멤버십 등급                   |
| `20260214_ensure_membership_plans.sql` | 멤버십 플랜 데이터 보장 (프로덕션 재삽입)            |
| `20260214_bokchae_charge_plans.sql`    | 복채 충전 상품 업데이트 (부적→복채 전환)             |
| `20260214_bokchae_system.sql`          | 복채 시스템 전체 (출석·룰렛·복채 이력)               |
| `20260214_update_labels_manyang.sql`   | 룰렛/상품 라벨 만냥 단위 업데이트                    |
| `20260215_fix_roulette_constraint.sql` | 룰렛 리워드 타입 제약 수정 (bokchae, miss)           |
| `20260219_tester_daily_unique.sql`     | 테스터 일일 자동충전 중복 방지 unique index          |

---

## ai/ — AI 프롬프트 · Gemini · 신당

| 파일                                   | 설명                                |
| -------------------------------------- | ----------------------------------- |
| `05_ai_prompts_data.sql`               | 신당 채팅 초기 프롬프트 데이터      |
| `20260204_add_cheonjiin_prompt.sql`    | 천지인(天地人) 원명 분석 프롬프트   |
| `20260212_compatibility_prompt.sql`    | 궁합 분석 AI 프롬프트               |
| `20260212_phase2_ai_chat_free.sql`     | AI 채팅 일일 사용 추적 테이블       |
| `20260213_trend_year2026_prompts.sql`  | 애정운·2026년 신년운세 프롬프트     |
| `20260213_image_analysis_prompts.sql`  | 관상/손금/풍수 이미지 분석 프롬프트 |
| `20260217_gemini_rate_and_usage.sql`   | Gemini API 토큰 버킷 & 사용률 추적  |
| `20260218_shaman_question_credits.sql` | 신당 질문권 구매 이력 테이블        |

---

## fortune/ — 운세 · 미션 · 저널

| 파일                                     | 설명                                       |
| ---------------------------------------- | ------------------------------------------ |
| `06_daily_fortune.sql`                   | 데일리 운세 기록 테이블                    |
| `20260205_create_family_summary_rpc.sql` | 가족별 분석 요약 RPC 함수                  |
| `20260206_family_missions_rpc.sql`       | 가족 미션 진행도 계산 RPC                  |
| `20260207_fortune_journal.sql`           | 월운/년운 추적 운세 저널 (fortune_journal) |
| `20260211_phase1_events.sql`             | 일일 출석 체크 · 시간별 트래픽 추적        |

---

## analysis/ — 분석 기록 · 세션 · 공유

| 파일                                          | 설명                                         |
| --------------------------------------------- | -------------------------------------------- |
| `20260204_analysis_history.sql`               | 분석 기록 통합 테이블 (사주/관상/풍수)       |
| `20260204_add_saju_records_insert_policy.sql` | saju_records INSERT RLS 정책                 |
| `20260205_migrate_and_drop_saju_records.sql`  | saju_records → analysis_history 마이그레이션 |
| `20260206_create_analysis_sessions.sql`       | 멀티모달 분석 세션 테이블                    |
| `20260217_share_analysis_rpc.sql`             | 분석 결과 공유 RPC (share_token 기반)        |

---

## family/ — 가족 구성원 · 운명 대상

| 파일                                         | 설명                                  |
| -------------------------------------------- | ------------------------------------- |
| `20260204_create_destiny_targets_view.sql`   | 본인+가족 통합 운명 객체 뷰           |
| `20260204_destiny_storage_buckets.sql`       | 관상/풍수 이미지 Storage 버킷 설정    |
| `20260218_fix_family_members_updated_at.sql` | family_members updated_at 트리거 추가 |

---

## admin/ — 관리자 대시보드

| 파일                                  | 설명                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| `20260213_phase3_admin_dashboard.sql` | 활동 로그 · 유입 경로 추적 테이블                      |
| `20260214_fix_traffic_hourly.sql`     | traffic_hourly 자동 집계 및 백필 함수                  |
| `20260217_fix_admin_dashboard.sql`    | 관리자 대시보드 Gemini RPC + 트래픽 자동 적재          |
| `20260217_cleanup_and_fixes.sql`      | share_token 컬럼 추가 · 중복 트리거 제거 · 인덱스 정리 |

---

## 보안 정책 (RLS)

모든 테이블에 Row Level Security 적용:

- 사용자는 자신의 데이터만 조회/수정 가능
- 관리자 권한은 `is_admin()` 함수로 체크
- tester 역할은 특수 권한 (일일 자동충전, 분석 무제한)

## Supabase CLI 사용

```bash
supabase db reset   # 로컬 초기화
supabase db push    # 프로덕션 적용
```
