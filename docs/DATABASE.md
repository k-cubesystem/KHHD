# 해화당 데이터베이스 스키마 문서

> 최종 업데이트: 2026-02-08

---

## ERD (Entity Relationship Diagram)

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  auth.users  │────→│    profiles       │────→│    wallets       │
│              │     │  (1:1)            │     │  (1:1)           │
└──────┬───────┘     └────────┬──────────┘     └────────┬────────┘
       │                      │                         │
       │                      │ 1:N                     │ 1:N
       │                      ▼                         ▼
       │             ┌──────────────────┐     ┌─────────────────────┐
       │             │  family_members   │     │ wallet_transactions  │
       │             └────────┬──────────┘     └─────────────────────┘
       │                      │
       │          ┌───────────┼───────────┬──────────────┐
       │          │ 1:N       │ 1:N       │ 1:N          │ 1:N
       │          ▼           ▼           ▼              ▼
       │  ┌──────────────┐ ┌────────────────┐ ┌──────────────────┐
       │  │ saju_records  │ │fortune_journal │ │analysis_sessions │
       │  └──────────────┘ └────────────────┘ └──────────────────┘
       │
       │ 1:N                    1:N                  1:1
       ├──────→ payments        ├──→ subscriptions ──→ membership_plans
       ├──────→ daily_usage_logs│
       ├──────→ daily_fortune_records
       └──────→ analysis_history

독립 테이블:
  ┌──────────────┐  ┌──────────────┐
  │ feature_costs │  │  ai_prompts   │
  └──────────────┘  └──────────────┘
```

---

## 테이블 명세

### 1. profiles (사용자 프로필)

| 컬럼          | 타입        | 제약조건                              | 설명          |
| ------------- | ----------- | ------------------------------------- | ------------- |
| id            | uuid        | PK, FK→auth.users                     | 사용자 ID     |
| full_name     | text        |                                       | 이름          |
| email         | text        |                                       | 이메일        |
| avatar_url    | text        |                                       | 프로필 이미지 |
| role          | text        | CHECK('user','admin'), DEFAULT 'user' | 역할          |
| credits       | integer     | DEFAULT 0                             | 레거시 크레딧 |
| is_subscribed | boolean     | DEFAULT false                         | 구독 상태     |
| created_at    | timestamptz | DEFAULT now()                         | 생성일        |
| updated_at    | timestamptz | DEFAULT now()                         | 수정일        |

**RLS**: SELECT/UPDATE → `auth.uid() = id`, Admin → `is_admin()`
**트리거**: `update_updated_at_column()`

---

### 2. family_members (가족/지인)

| 컬럼           | 타입        | 제약조건               | 설명                   |
| -------------- | ----------- | ---------------------- | ---------------------- |
| id             | uuid        | PK                     | 멤버 ID                |
| user_id        | uuid        | FK→profiles, NOT NULL  | 소유자                 |
| name           | text        | NOT NULL               | 이름                   |
| relationship   | text        |                        | 관계 (부모, 배우자 등) |
| birth_date     | date        | NOT NULL               | 생년월일               |
| birth_time     | time        |                        | 태어난 시간            |
| calendar_type  | text        | CHECK('solar','lunar') | 양력/음력              |
| gender         | text        | CHECK('male','female') | 성별                   |
| home_address   | text        |                        | 주소                   |
| face_image_url | text        |                        | 관상 이미지            |
| hand_image_url | text        |                        | 손금 이미지            |
| created_at     | timestamptz | DEFAULT now()          |                        |
| updated_at     | timestamptz | DEFAULT now()          |                        |

**RLS**: ALL → `auth.uid() = user_id`

---

### 3. wallets (부적 잔액)

| 컬럼                  | 타입        | 제약조건                        | 설명        |
| --------------------- | ----------- | ------------------------------- | ----------- |
| user_id               | uuid        | PK, FK→profiles                 | 사용자      |
| balance               | integer     | NOT NULL, CHECK(>=0), DEFAULT 0 | 부적 잔액   |
| is_subscribed         | boolean     | DEFAULT false                   | 구독 여부   |
| subscription_end_date | timestamptz |                                 | 구독 만료일 |
| created_at            | timestamptz |                                 |             |
| updated_at            | timestamptz |                                 |             |

---

### 4. wallet_transactions (부적 거래 내역)

| 컬럼        | 타입        | 제약조건                                              | 설명           |
| ----------- | ----------- | ----------------------------------------------------- | -------------- |
| id          | uuid        | PK                                                    |                |
| user_id     | uuid        | FK→wallets, NOT NULL                                  |                |
| amount      | integer     | NOT NULL                                              | 수량 (+/-)     |
| type        | text        | CHECK('CHARGE','USE','BONUS','REFUND','SUBSCRIPTION') | 거래 유형      |
| feature_key | text        |                                                       | 사용된 기능 키 |
| description | text        |                                                       | 설명           |
| metadata    | jsonb       |                                                       | 추가 데이터    |
| created_at  | timestamptz |                                                       |                |

**인덱스**: user_id, type, created_at DESC

---

### 5. payments (결제 내역)

| 컬럼              | 타입        | 제약조건                                            | 설명           |
| ----------------- | ----------- | --------------------------------------------------- | -------------- |
| id                | uuid        | PK                                                  |                |
| user_id           | uuid        | FK→auth.users, NOT NULL                             |                |
| payment_key       | text        | NOT NULL                                            | Toss 결제키    |
| order_id          | text        | NOT NULL, UNIQUE                                    | 주문번호       |
| amount            | integer     | NOT NULL                                            | 결제 금액 (원) |
| credits_purchased | integer     | DEFAULT 1                                           | 구매 부적 수   |
| credits_remaining | integer     | DEFAULT 1                                           | 잔여 부적      |
| status            | text        | CHECK('pending','completed','failed','test_charge') |                |
| created_at        | timestamptz |                                                     |                |
| updated_at        | timestamptz |                                                     |                |

**인덱스**: user_id, status, order_id

---

### 6. membership_plans (멤버십 플랜)

| 컬럼                 | 타입    | 제약조건                            | 설명         |
| -------------------- | ------- | ----------------------------------- | ------------ |
| id                   | uuid    | PK                                  |              |
| name                 | text    | UNIQUE, NOT NULL                    | 플랜명       |
| tier                 | text    | CHECK('SINGLE','FAMILY','BUSINESS') | 등급         |
| price                | integer | NOT NULL                            | 월 가격 (원) |
| interval             | text    | CHECK('MONTH','YEAR')               | 결제 주기    |
| talismans_per_period | integer | DEFAULT 10                          | 기간당 부적  |
| daily_talisman_limit | integer | DEFAULT 10                          | 일일 한도    |
| relationship_limit   | integer | DEFAULT 3                           | 인연 한도    |
| storage_limit        | integer | DEFAULT 10                          | 저장 한도    |
| features             | jsonb   | DEFAULT '{}'                        | 기능 플래그  |
| is_active            | boolean | DEFAULT true                        | 활성 여부    |
| sort_order           | integer | DEFAULT 0                           | 정렬 순서    |

**3-Tier 데이터:**

| 등급     | 가격   | 부적/월 | 일일한도 | 인연 | 저장 |
| -------- | ------ | ------- | -------- | ---- | ---- |
| SINGLE   | 9,900  | 10      | 10       | 3    | 10   |
| FAMILY   | 29,900 | 30      | 30       | 10   | 50   |
| BUSINESS | 99,000 | 100     | 100      | 50   | 999  |

---

### 7. subscriptions (구독)

| 컬럼                 | 타입        | 제약조건                                        | 설명                |
| -------------------- | ----------- | ----------------------------------------------- | ------------------- |
| id                   | uuid        | PK                                              |                     |
| user_id              | uuid        | FK→profiles, NOT NULL                           |                     |
| plan_id              | uuid        | NOT NULL                                        | FK→membership_plans |
| status               | text        | CHECK('ACTIVE','INACTIVE','CANCELED','EXPIRED') |                     |
| billing_key          | text        |                                                 | Toss 빌링키         |
| customer_key         | text        |                                                 | 고객키              |
| start_date           | timestamptz |                                                 | 시작일              |
| end_date             | timestamptz |                                                 | 종료일              |
| next_billing_date    | timestamptz |                                                 | 다음 결제일         |
| cancel_at_period_end | boolean     | DEFAULT false                                   | 기간 종료 시 해지   |

**UNIQUE**: (user_id, status)

---

### 8. daily_usage_logs (일일 사용량)

| 컬럼           | 타입    | 제약조건              | 설명        |
| -------------- | ------- | --------------------- | ----------- |
| id             | uuid    | PK                    |             |
| user_id        | uuid    | FK→profiles, NOT NULL |             |
| usage_date     | date    | DEFAULT CURRENT_DATE  |             |
| talismans_used | integer | DEFAULT 0             | 당일 사용량 |
| features_used  | jsonb   | DEFAULT '{}'          | 기능별 사용 |

**UNIQUE**: (user_id, usage_date)

---

### 9. fortune_journal (운세 기록)

| 컬럼             | 타입    | 제약조건              | 설명        |
| ---------------- | ------- | --------------------- | ----------- |
| id               | uuid    | PK                    |             |
| user_id          | uuid    | FK→profiles, NOT NULL |             |
| family_member_id | uuid    | FK→family_members     | 대상 가족   |
| year             | integer | NOT NULL              | 년도        |
| month            | integer | NOT NULL, CHECK(1-12) | 월          |
| category         | text    | CHECK(8개 카테고리)   | 분석 유형   |
| analysis_id      | uuid    | FK→analysis_history   | 연결된 분석 |
| fortune_points   | integer | DEFAULT 100           | 운기 포인트 |

**UNIQUE**: (family_member_id, year, month, category)
**운세 계산**: 8개 미션 × 100점 = 800점 = 100%

---

### 10. analysis_sessions (분석 세션)

| 컬럼             | 타입    | 제약조건                | 설명                      |
| ---------------- | ------- | ----------------------- | ------------------------- |
| id               | uuid    | PK                      |                           |
| user_id          | uuid    | FK→auth.users, NOT NULL |                           |
| target_member_id | uuid    | FK→family_members       | NULL=게스트               |
| category         | text    | CHECK(8개 카테고리)     |                           |
| input_data       | jsonb   | DEFAULT '{}'            | 입력 (이미지URL, 목표 등) |
| result_data      | jsonb   | DEFAULT '{}'            | AI 분석 결과              |
| credits_used     | integer | DEFAULT 0               | 소모 부적                 |
| shared           | boolean | DEFAULT false           | 공유 여부                 |
| share_card_url   | text    |                         | 공유 카드 URL             |

---

### 11. daily_fortune_records (데일리 운세)

| 컬럼             | 타입    | 제약조건              | 설명        |
| ---------------- | ------- | --------------------- | ----------- |
| id               | uuid    | PK                    |             |
| user_id          | uuid    | FK→profiles, NOT NULL |             |
| target_member_id | uuid    | FK→family_members     |             |
| fortune_date     | date    | DEFAULT CURRENT_DATE  |             |
| content          | text    | NOT NULL              | 운세 내용   |
| lucky_color      | text    |                       | 행운의 색   |
| lucky_number     | integer |                       | 행운의 숫자 |
| lucky_direction  | text    |                       | 행운의 방향 |
| caution          | text    |                       | 주의사항    |

**UNIQUE**: (user_id, fortune_date)

---

### 12. saju_records (사주 기록 - 레거시)

| 컬럼                | 타입    | 제약조건                    | 설명        |
| ------------------- | ------- | --------------------------- | ----------- |
| id                  | uuid    | PK                          |             |
| member_id           | uuid    | FK→family_members, NOT NULL |             |
| luck_score          | integer |                             | 행운 점수   |
| success_probability | integer |                             | 성공 확률   |
| happiness_index     | integer |                             | 행복 지수   |
| full_report_html    | text    |                             | 리포트 HTML |
| analysis_data       | jsonb   |                             | 분석 데이터 |

---

### 13. feature_costs (기능별 가격)

| 컬럼      | 타입    | 제약조건              | 설명      |
| --------- | ------- | --------------------- | --------- |
| key       | text    | PK                    | 기능 키   |
| label     | text    | NOT NULL              | 표시명    |
| cost      | integer | DEFAULT 1, CHECK(>=0) | 부적 가격 |
| category  | text    | DEFAULT 'GENERAL'     | 카테고리  |
| is_active | boolean | DEFAULT true          | 활성 여부 |

**초기 데이터:**
| Key | 기능 | 가격 |
|-----|------|------|
| SAJU_BASIC | 사주 정밀 분석 | 1 |
| COMPATIBILITY | 궁합 분석 | 2 |
| FACE_AI | AI 관상 분석 | 2 |
| PALM_AI | AI 손금 분석 | 2 |
| FENGSHUI_AI | AI 풍수 분석 | 3 |
| IMAGE_GEN | 개운 이미지 생성 | 5 |
| SHAMAN_CHAT | AI 신당 채팅 | 1 |

---

### 14. ai_prompts (AI 프롬프트 관리)

| 컬럼        | 타입 | 제약조건 | 설명            |
| ----------- | ---- | -------- | --------------- |
| key         | text | PK       | 프롬프트 키     |
| label       | text | NOT NULL | 표시명          |
| category    | text | NOT NULL | 카테고리        |
| template    | text | NOT NULL | 프롬프트 템플릿 |
| description | text |          | 설명            |

**RLS**: Admin only (`is_admin()`)

---

## RPC 함수 목록

### 운세 시스템

| 함수                        | 파라미터               | 반환                                                              | 설명             |
| --------------------------- | ---------------------- | ----------------------------------------------------------------- | ---------------- |
| `calculate_monthly_fortune` | member_id, year, month | total_possible, current_fortune, percentage, completed_categories | 월운 계산        |
| `calculate_yearly_fortune`  | user_id, year          | month, fortune, member_count                                      | 12개월 년운 추이 |
| `calculate_family_fortune`  | user_id, year, month   | member_id, member_name, fortune, missions_completed               | 가족 총운        |

### 데일리 운세

| 함수                | 파라미터 | 반환                   | 설명             |
| ------------------- | -------- | ---------------------- | ---------------- |
| `get_today_fortune` | user_id  | id, content, lucky\_\* | 오늘의 운세 조회 |

### 멤버십 관리

| 함수                             | 파라미터        | 반환            | 설명             |
| -------------------------------- | --------------- | --------------- | ---------------- |
| `get_user_tier`                  | user_id         | tier, limits... | 사용자 등급 조회 |
| `check_daily_talisman_limit`     | user_id         | boolean         | 일일 한도 체크   |
| `increment_daily_talisman_usage` | user_id, amount | boolean         | 사용량 증가      |
| `check_relationship_limit`       | user_id         | boolean         | 인연 한도 체크   |

### 관리

| 함수                          | 파라미터 | 반환    | 설명                           |
| ----------------------------- | -------- | ------- | ------------------------------ |
| `is_admin`                    | -        | boolean | 관리자 확인 (SECURITY DEFINER) |
| `handle_new_user`             | trigger  | -       | 가입 시 profile + wallet 생성  |
| `cleanup_old_usage_logs`      | -        | void    | 30일 지난 로그 삭제            |
| `cleanup_old_fortune_records` | -        | void    | 30일 지난 운세 삭제            |

---

## 뷰 (Views)

| 뷰           | 설명                                  |
| ------------ | ------------------------------------- |
| `tier_stats` | 멤버십 등급별 구독자 수, 월 매출 통계 |

---

## 비즈니스 규칙

### 결제 흐름

```
클라이언트 (Toss SDK) → 서버 확인 (/v1/payments/confirm) → payments INSERT → wallets UPDATE
```

### 부적 가격표

| 수량 | 가격 (KRW) |
| ---- | ---------- |
| 3    | 9,900      |
| 10   | 29,900     |
| 30   | 79,000     |

### 운세 계산

- 8개 카테고리 × 100점 = 800점 (100%)
- 월운: 매달 리셋, 카테고리당 1회만 기록
- 년운: 12개월 누적
- 가족 총운: 모든 구성원 합산

### 제한사항

| 항목      | 무료 | SINGLE | FAMILY | BUSINESS |
| --------- | ---- | ------ | ------ | -------- |
| 가족 인연 | 3    | 3      | 10     | 50       |
| 일일 부적 | -    | 10     | 30     | 100      |
| 저장 한도 | -    | 10     | 50     | 999      |

---

## 인덱스 & 성능 최적화

### 기존 인덱스

- `payments`: user_id, status, order_id
- `wallet_transactions`: user_id, type, created_at DESC
- `daily_usage_logs`: (user_id, usage_date) 복합
- `fortune_journal`: (user_id, year, month) 복합, family_member_id, category
- `analysis_sessions`: user_id, target_member_id, category, created_at DESC, (target_member_id, category) 부분

### 추가 권장 인덱스

```sql
-- analysis_history 조회 최적화 (사용자별 최신순)
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_created
  ON public.analysis_history(user_id, created_at DESC);

-- subscriptions 활성 구독 빠른 조회
CREATE INDEX IF NOT EXISTS idx_subscriptions_active
  ON public.subscriptions(user_id)
  WHERE status = 'ACTIVE';

-- fortune_journal 가족 월운 집계 최적화
CREATE INDEX IF NOT EXISTS idx_fortune_journal_family_month
  ON public.fortune_journal(family_member_id, year, month, category);
```

---

## 마이그레이션 실행 순서

```
00_initial_schema.sql      → profiles, family_members, saju_records, payments
01_admin_system.sql        → is_admin(), ai_prompts
02_wallet_system.sql       → wallets, wallet_transactions, feature_costs
03_subscription_system.sql → subscriptions
04_membership_tiers.sql    → membership_plans, daily_usage_logs, RPC 함수
06_daily_fortune.sql       → daily_fortune_records
20260204_analysis_history  → analysis_history (별도 마이그레이션)
20260206_analysis_sessions → analysis_sessions
20260206_family_missions   → get_family_with_missions RPC
20260207_fortune_journal   → fortune_journal, 3개 RPC 함수
99_initial_data.sql        → 관리자 설정, 데이터 마이그레이션
```
