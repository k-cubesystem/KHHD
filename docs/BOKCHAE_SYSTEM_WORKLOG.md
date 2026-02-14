# 복채 시스템 구현 작업 내역서
**최초 작성**: 2026-02-14
**최종 업데이트**: 2026-02-14 (복채 충전 상품 시스템 추가)
**작업자**: Claude Code (claude-sonnet-4-5-20250929)
**공유**: Gemini AI 협업용

---

## [추가] 복채 충전 상품 시스템 (2026-02-14 2차 작업)

### 충전 상품 3종
| 상품명 | 복채 | 실제 가격 | 할인율 | 뱃지 |
|--------|------|-----------|--------|------|
| 소복 씨앗 | 5만냥 | 50,000원 | 0% | - |
| 행운 꾸러미 | 10만냥 | 99,000원 | 1% | 가장 인기 |
| 대복 창고 | 30만냥 | 290,000원 | 3% | 최대 할인 |

### 서버 검증 가격 맵 (payment-actions.ts)
```typescript
const BOKCHAE_PRICE_MAP = { 5: 50000, 10: 99000, 30: 290000 }
```

### 수정 파일
| 파일 | 변경 |
|------|------|
| `supabase/migrations/20260214_bokchae_charge_plans.sql` | price_plans DB 업데이트 |
| `app/actions/payment-actions.ts` | BOKCHAE_PRICE_MAP, 복채 충전 로직 |
| `components/membership/talisman-purchase-section.tsx` | 전면 리디자인 (복채 UI) |
| `app/protected/analysis/success/page.tsx` | 결제 성공 텍스트 |
| `app/actions/products.ts` | addTestCredits wallets 직접 연동 |

### TossPayments orderId 형식
`BOKCHAE_{timestamp}_{userId 앞 6자리}`

### 어드민 테스트 충전
- wallets 테이블 직접 업데이트 + wallet_transactions 로그
- payments 테이블에도 test_charge 상태로 기록

---

## 개요
기존 "부적(talisman)" 시스템을 "복채(bokchae)" 시스템으로 전환.
**기본 단위**: 1 복채 = 10,000원 (1만냥)

---

## 핵심 설계 원칙
- DB 컬럼명은 유지 (하위 호환성), 표시 텍스트만 변경
- 복채 단위: 숫자 값 = 만냥 단위 (예: balance=10 → 10만냥)
- 일일 지급 모델 (월 한도 → 일일 한도로 전환)

---

## 1. 복채 지급 정책

### 멤버십 일일 복채 수당
| 등급 | 일일 지급 | 만냥 환산 |
|------|-----------|-----------|
| SINGLE | 10 복채 | 10만냥/일 |
| FAMILY | 30 복채 | 30만냥/일 |
| BUSINESS | 100 복채 | 100만냥/일 |

### 서비스별 복채 소모
| 서비스 | 소모량 | 만냥 환산 |
|--------|--------|-----------|
| 재물운, 부동산, 테마운세 등 | 1 복채 | 1만냥 |
| 관상, 손금, 풍수 | 2 복채 | 2만냥 |
| 천지인 종합사주분석 | 5 복채 | 5만냥 |
| 고민상담 채팅 (10문) | 1 복채 | 1만냥 |

---

## 2. 출석 체크 시스템

### 정책
- 매일 출석체크: +1 복채 (1만냥)
- 주 7일 모두 출석: 마지막 날 +3 복채 보너스
- 주간 총합: 7 × 1 + 3 = **10 복채 (10만냥)**

### 구현 파일
- `supabase/migrations/20260214_bokchae_system.sql` - attendance_logs 테이블
- `app/actions/attendance-actions.ts` - 서버 액션
- `components/attendance/attendance-check.tsx` - UI 컴포넌트

### DB 스키마 (attendance_logs)
```sql
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  checked_date DATE NOT NULL,
  week_start DATE NOT NULL,     -- 이번 주 월요일
  bokchae_awarded INT DEFAULT 1,
  is_weekly_bonus BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, checked_date)
);
```

---

## 3. 행운의 룰렛 시스템

### 상품 구성 (기본값)
| 상품 | 복채 | 확률 가중치 | 실제 확률 |
|------|------|-------------|-----------|
| 1만냥 | 1 | 40 | 40% |
| 3만냥 | 3 | 30 | 30% |
| 5만냥 | 5 | 15 | 15% |
| 10만냥 | 10 | 10 | 10% |
| 꽝 | 0 | 5 | 5% |

### 관리자 설정 기능
- 어드민 페이지에서 확률 실시간 조정 가능
- 합계가 100이 아니어도 비율로 자동 정규화
- 상품 추가/삭제/수정 가능

### 구현 파일
- `supabase/migrations/20260214_bokchae_system.sql` - roulette_config 테이블
- `app/actions/roulette-actions.ts` - 업데이트 (DB 연동 확률)
- `components/events/lucky-roulette.tsx` - UI 업데이트
- `app/admin/roulette/page.tsx` - 어드민 관리 페이지
- `app/admin/roulette/roulette-config-client.tsx` - 어드민 클라이언트

### DB 스키마 (roulette_config)
```sql
CREATE TABLE roulette_config (
  id UUID PRIMARY KEY,
  reward_type TEXT CHECK (reward_type IN ('bokchae', 'miss')),
  reward_value INT DEFAULT 0,
  label TEXT NOT NULL,
  probability NUMERIC(5,2) DEFAULT 10.00,
  color TEXT DEFAULT '#8b5cf6',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);
```

---

## 4. 변경된 파일 목록

### 신규 생성 파일
| 파일 | 설명 |
|------|------|
| `supabase/migrations/20260214_bokchae_system.sql` | DB 마이그레이션 |
| `app/actions/attendance-actions.ts` | 출석체크 서버 액션 |
| `components/attendance/attendance-check.tsx` | 출석체크 UI 컴포넌트 |
| `app/admin/roulette/page.tsx` | 룰렛 관리 어드민 페이지 |
| `app/admin/roulette/roulette-config-client.tsx` | 룰렛 관리 클라이언트 |

### 수정된 파일
| 파일 | 변경 내용 |
|------|-----------|
| `app/actions/wallet-actions.ts` | 부적→복채 텍스트 |
| `app/actions/roulette-actions.ts` | DB 연동 확률, 새 상품, admin API |
| `app/actions/membership-limits.ts` | 부적→복채 메시지 |
| `components/talisman-balance.tsx` | 복채 표시 (N만냥) |
| `components/events/lucky-roulette.tsx` | 새 상품, 개선된 UI |
| `components/membership/membership-tabs.tsx` | 복채 용어 |
| `components/analysis/AnalysisDashboard.tsx` | 출석체크 컴포넌트 통합 |
| `app/protected/analysis/page.tsx` | 출석 데이터 로드 |
| `app/protected/analysis/analysis-hub-client.tsx` | 출석 props 전달 |
| `app/admin/layout.tsx` | 룰렛/기능관리 메뉴 추가 |
| `app/admin/features/page.tsx` | 복채 용어 |
| `app/admin/membership/plans/plan-management-client.tsx` | 복채 용어 |

---

## 5. 배포 전 필요 작업

### DB 마이그레이션 실행
```sql
-- Supabase 대시보드 또는 CLI에서 실행
-- supabase/migrations/20260214_bokchae_system.sql
```

### 주의사항
1. `roulette_history` 테이블의 `reward_type` 컬럼: 기존값 `"talisman"` → 코드에서 `"bokchae"` 처리 (하위 호환)
2. `daily_attendance` 테이블 (기존)과 `attendance_logs` (신규)가 공존 - 신규 시스템 사용
3. `add_talisman` RPC 함수 → `add_bokchae` 신규 RPC 추가 (기존 유지)

---

## 6. 아키텍처 다이어그램

```
User Action
    ↓
[출석 체크]  →  attendance_logs  →  wallets (balance+1)
[룰렛 돌리기] →  roulette_history →  wallets (balance+N)
[서비스 사용] →  wallet_transactions →  wallets (balance-N)
[멤버십 일일] →  (scheduled/login) →  wallets (balance+10/30/100)
    ↓
[복채 잔액] = wallets.balance (N만냥)
```

---

## 7. 어드민 메뉴 구조 (업데이트)
```
/admin
├── 대시보드
├── 회원 관리
├── 결제 내역
├── 스토어/복채 관리        ← 기존 (부적→복채 표시 업데이트)
├── 룰렛 확률 관리 ★ 신규
├── 기능별 복채 소모량       ★ 신규 메뉴 노출
├── 알림 및 자동화
├── AI 프롬프트 관리
└── 서비스 키/스위치
```

---

## Gemini 협업 노트
- 이 문서는 작업 현황을 공유하기 위한 것입니다
- 향후 Gemini가 추가할 기능: AI 분석 비용 자동 차감 강화, 복채 지급 스케줄러
- 공통 규칙: 1 복채 단위 = 1만냥, 표시 시 "N만냥" 형식 사용
- DB 컬럼명은 기존 유지 (`balance`, `daily_talisman_limit` 등)
