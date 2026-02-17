# 해화당 아키텍처

> 최종 업데이트: 2026-02-17

---

## 1. 기술 스택

| 레이어         | 기술                                                            |
| -------------- | --------------------------------------------------------------- |
| **Frontend**   | Next.js 16 (App Router), Tailwind CSS, Shadcn UI, Framer Motion |
| **Backend**    | Next.js Server Actions, Supabase Edge Functions                 |
| **Database**   | Supabase (PostgreSQL + RLS)                                     |
| **Auth**       | Supabase Auth (Kakao, Google OAuth)                             |
| **AI**         | Google Gemini 2.0 Flash (텍스트 + 멀티모달)                     |
| **Payments**   | Toss Payments SDK (단건 + 빌링키 정기결제)                      |
| **Deployment** | Vercel (Auto CD)                                                |
| **Monitoring** | @vercel/speed-insights                                          |

---

## 2. 데이터 흐름

```
사용자 입력 (텍스트/이미지)
    ↓
Next.js Server Action (app/actions/)
    ↓
Gemini Rate Limiter (lib/services/gemini-rate-limiter.ts)
    ↓
Gemini API (lib/services/gemini.ts)
    ↓
결과 → analysis_history 저장 (Supabase)
    ↓
클라이언트 렌더링 (app/protected/)
```

---

## 3. 폴더 구조

```
haehwadang/
├── app/
│   ├── actions/          # Server Actions (AI, 결제, 사용자 관리)
│   ├── admin/            # 관리자 페이지 (/admin)
│   ├── api/              # API Routes (웹훅, cron)
│   ├── auth/             # 인증 흐름
│   └── protected/        # 인증 필요 사용자 페이지
├── components/
│   ├── admin/            # 관리자 UI 컴포넌트
│   ├── analysis/         # 분석 관련 컴포넌트
│   ├── ui/               # Shadcn 기본 UI
│   └── ...               # 기능별 컴포넌트
├── lib/
│   ├── domain/           # 도메인 로직 (사주, 궁합, 대운)
│   ├── services/         # 외부 서비스 (Gemini, TossPayments)
│   ├── supabase/         # Supabase 클라이언트
│   └── utils/            # 유틸리티
└── supabase/
    └── migrations/       # DB 마이그레이션 (50개+)
```

---

## 4. 관리자 시스템

### 권한 모델 (RBAC)

| 역할        | 코드     | 설명                               |
| ----------- | -------- | ---------------------------------- |
| 슈퍼 관리자 | `admin`  | 모든 데이터 C/R/U/D, 설정 변경     |
| 테스터      | `tester` | 일반 기능 + 무제한 복채, 결제 우회 |
| 일반 사용자 | `user`   | 본인 데이터만 접근 (기본값)        |

`profiles.role` 컬럼으로 구분. `is_admin()` RLS 함수로 정책 적용.

### 관리자 페이지 구조 (`/admin`)

- `/admin/dashboard` — 통계, 트래픽 차트, 최근 결제
- `/admin/users` — 사용자 관리
- `/admin/payments` — 결제 내역
- `/admin/prompts` — AI 프롬프트 편집
- `/admin/roulette` — 룰렛 확률 설정
- `/admin/gemini-usage` — Gemini API 사용량

---

## 5. 데이터베이스 주요 테이블

| 테이블                | 설명                                        |
| --------------------- | ------------------------------------------- |
| `profiles`            | 사용자 프로필 (role, birth_date, gender 등) |
| `wallets`             | 복채 잔액                                   |
| `wallet_transactions` | 복채 거래 내역                              |
| `payments`            | TossPayments 결제 내역                      |
| `analysis_history`    | AI 분석 결과 아카이브                       |
| `ai_prompts`          | 관리자가 편집 가능한 AI 프롬프트            |
| `activity_logs`       | 사용자 활동 로그 (트래픽 차트 원데이터)     |
| `traffic_hourly`      | 시간대별 트래픽 집계                        |
| `gemini_api_logs`     | Gemini API 호출 로그                        |
| `roulette_config`     | 룰렛 당첨 확률 설정                         |

→ 전체 스키마: `docs/DATABASE.md` 참조

---

## 6. 인증 흐름

```
app/auth/sign-up → Supabase Auth → handle_new_user 트리거
    → profiles 생성 + wallets 생성 + 가입 보너스 1복채
    → activity_logs에 signup 이벤트 기록
```

---

## 7. 결제 흐름

```
사용자 결제 요청 (복채 충전 or 멤버십)
    → TossPayments SDK (클라이언트)
    → /api/webhooks/toss (서버 검증)
    → payments 테이블 INSERT
    → wallets.balance 업데이트
    → wallet_transactions 기록
```
