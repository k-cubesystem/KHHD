# 해화당 AI - 데이터베이스 마이그레이션

## 마이그레이션 파일 구조

마이그레이션 파일들은 기능별로 정리되어 있으며, 숫자 순서대로 실행됩니다.

### 실행 순서

```
00_initial_schema.sql        # 기본 스키마 (프로필, 가족, 사주, 결제)
01_admin_system.sql          # 관리자 시스템 및 RLS 정책
02_wallet_system.sql         # 월렛 시스템 (부적 잔액, 트랜잭션)
03_subscription_system.sql   # 구독 시스템
04_membership_tiers.sql      # 멤버십 3단계 시스템 (싱글/패밀리/비즈니스)
05_ai_prompts_data.sql       # AI 프롬프트 초기 데이터
06_daily_fortune.sql         # 데일리 운세 시스템
99_initial_data.sql          # 초기 데이터 및 관리자 설정
```

## 주요 테이블

### 사용자 관련
- `profiles` - 사용자 프로필
- `family_members` - 가족/지인 정보
- `wallets` - 부적 잔액

### 결제/구독
- `payments` - 결제 내역
- `subscriptions` - 구독 정보
- `membership_plans` - 멤버십 플랜 (3단계)
- `wallet_transactions` - 부적 사용/충전 이력

### 사주/운세
- `saju_records` - 사주 분석 기록
- `daily_fortune_records` - 일일 운세 기록
- `daily_usage_logs` - 일일 사용량 추적

### 설정
- `feature_costs` - 기능별 가격 설정
- `ai_prompts` - AI 프롬프트 템플릿

## 멤버십 등급

### 싱글 멤버십 (9,900원/월)
- 일일 부적 10개
- 인연 3명
- 저장공간 10MB

### 패밀리 멤버십 (29,900원/월)
- 일일 부적 30개
- 인연 10명
- 저장공간 50MB
- 가족 궁합 분석

### 비즈니스 멤버십 (99,000원/월)
- 일일 부적 100개
- 인연 50명
- 저장공간 999MB
- API 액세스
- 우선 지원

## 보안 정책 (RLS)

모든 테이블에는 Row Level Security(RLS)가 적용되어 있습니다:
- 사용자는 자신의 데이터만 조회/수정 가능
- 관리자는 모든 데이터 접근 가능
- 관리자 체크는 `is_admin()` 함수로 처리

## 헬퍼 함수

- `is_admin()` - 관리자 권한 체크
- `get_user_tier()` - 사용자 등급 조회
- `check_daily_talisman_limit()` - 일일 부적 한도 체크
- `increment_daily_talisman_usage()` - 일일 사용량 증가
- `check_relationship_limit()` - 인연 한도 체크
- `cleanup_old_usage_logs()` - 오래된 로그 정리
- `cleanup_old_fortune_records()` - 오래된 운세 정리

## 마이그레이션 실행

### Supabase CLI 사용
```bash
# 로컬에서 테스트
supabase db reset

# 프로덕션 적용
supabase db push
```

### SQL Editor 사용
Supabase Dashboard의 SQL Editor에서 파일을 순서대로 실행하세요.

## 주의사항

1. `99_initial_data.sql`에서 관리자 이메일을 실제 이메일로 변경하세요.
2. 기존 데이터가 있는 경우 백업 후 마이그레이션을 진행하세요.
3. 프로덕션 적용 전 반드시 로컬/스테이징에서 테스트하세요.

## 아카이브

이전 마이그레이션 파일들은 `_archive/` 폴더에 보관되어 있습니다.
