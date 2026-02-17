# 해화당 프로젝트 코딩 규칙 (PROJECT_RULES)

> 모든 기여자는 이 문서의 규칙을 준수해야 합니다.

---

## 1. 파일 구조 원칙

### 레이어 분리

```
lib/domain/       → 순수 비즈니스 로직 (DB, 외부 API 의존 없음)
lib/services/     → 외부 서비스 연동 (Supabase, Gemini, TossPayments)
app/actions/      → Server Actions (얇은 오케스트레이션 레이어)
components/       → UI 컴포넌트 (비즈니스 로직 최소화)
hooks/            → 클라이언트 상태 관리
types/            → 공유 타입 정의
```

### 규칙

- **domain/** 내 코드는 외부 의존성(DB, API)을 직접 호출하지 않는다
- **Server Action**은 domain + services를 조합하는 얇은 레이어로 유지한다
- 컴포넌트에서 DB를 직접 호출하지 않는다 (반드시 actions 또는 hooks 경유)

---

### Server Action 도메인 그룹

새로운 Server Action 파일을 추가할 때 아래 도메인 분류를 참고:

| 도메인        | 파일                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **사주/분석** | analysis-actions, analysis-engine, analysis-history, analysis-session-actions, ai-saju, saju-actions                     |
| **운세**      | fortune-actions, daily-fortune, family-missions                                                                          |
| **결제/지갑** | wallet-actions, payment-actions, subscription-actions, membership-limits, products                                       |
| **가족**      | family-actions, family-analysis-actions                                                                                  |
| **스튜디오**  | studio-actions, ai-image                                                                                                 |
| **공통**      | dashboard-actions, destiny-targets, compatibility-actions, invite-actions, notification, wealth-analysis, ai-shaman-chat |

---

## 2. Server Action 규칙

### 반환 타입 통일

```typescript
type ActionResult<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
    }
```

### 패턴

- `'use server'` 선언 필수
- 인증 확인을 최상단에서 수행
- DB 에러는 사용자 친화적 메시지로 변환
- RPC 함수 호출 시 fallback 패턴 적용:
  ```typescript
  try {
    await supabase.rpc('function_name', params)
  } catch {
    /* manual query fallback */
  }
  ```

---

## 3. 네이밍 컨벤션

| 대상            | 규칙             | 예시                        |
| --------------- | ---------------- | --------------------------- |
| 파일명          | kebab-case       | `wallet-actions.ts`         |
| 컴포넌트        | PascalCase       | `FortuneEnergyGauge`        |
| 함수            | camelCase        | `calculateMonthlyFortune`   |
| 상수            | UPPER_SNAKE_CASE | `FORTUNE_MISSIONS`          |
| 타입/인터페이스 | PascalCase       | `SajuPillar`                |
| DB 테이블       | snake_case       | `fortune_journal`           |
| DB RPC 함수     | snake_case       | `calculate_monthly_fortune` |

---

## 4. 데이터베이스 규칙

- 모든 테이블에 **RLS(Row Level Security)** 정책 필수
- 사용자 데이터 접근은 `auth.uid() = user_id` 검증
- 집계 쿼리는 **RPC 함수**로 최적화
- UPSERT 패턴으로 중복 방지 (`onConflict` 활용)
- 마이그레이션 파일명: `YYYYMMDD_description.sql`

---

## 5. 보안 규칙

- 결제 금액은 **서버사이드에서만** 검증 (클라이언트 값 신뢰하지 않음)
- 환경변수(`.env.local`)는 절대 커밋하지 않음
- Admin 권한은 `is_admin()` SECURITY DEFINER 함수로 검증
- 사용자 입력은 Server Action 진입점에서 유효성 검사

---

## 6. 컴포넌트 규칙

- Props 타입을 명시적으로 정의 (`interface ComponentProps {}`)
- UI 로직과 비즈니스 로직 분리
- 공통 UI는 `components/ui/` (Shadcn/ui)
- 도메인 컴포넌트는 `components/{domain}/`
- 애니메이션은 Framer Motion 사용, `lib/animations.ts`에 공통 설정

---

## 7. 스타일링 규칙

- Tailwind CSS 유틸리티 우선
- 디자인 토큰은 `DESIGN_SYSTEM.md` 참조
- 테마: 다크 럭셔리 (금색 + 차콜)
- 반응형: mobile-first 접근

---

## 8. Git 규칙

- 커밋 메시지: `type: 한글 설명` (feat, fix, refactor, docs, style, chore)
- 브랜치: `feature/기능명`, `fix/버그명`
- PR 전 `npm run build` 통과 필수
