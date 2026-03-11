# PRIME 4중 프로토콜 v6.0

> 해화당 멀티에이전트 Claude Code 시스템 — CTO 설계 문서

---

## 1. ZERO-LATENCY (제로 레이턴시)

| 패턴              | 구현 규칙                                        |
| ----------------- | ------------------------------------------------ |
| Optimistic UI     | 서버 응답 전 즉시 UI 업데이트 → 실패 시 rollback |
| Upload First      | 파일 선택 즉시 업로드 시작, 완료 대기 없이 진행  |
| Background Submit | 폼 제출은 `startTransition` + 백그라운드 처리    |
| Presigned URL     | Supabase Storage 직접 업로드 (서버 경유 금지)    |
| Client Compress   | 이미지 업로드 전 클라이언트에서 리사이즈/압축    |

**해화당 적용:**

- 사주 분석 요청 시 스켈레톤 UI 즉시 노출
- 복채 차감 optimistic 처리 후 서버 검증
- Gemini 스트리밍 응답 → `ReadableStream` 청크 단위 렌더링

---

## 2. COMMERCIALIZATION (상용화)

**Observability 스택:** Sentry (에러) + GA4 (행동) + Supabase (비즈니스 지표)

```
모든 이벤트 = 비즈니스 액션 가능 데이터
예) paywall_shown → conversion_rate 추적 가능
예) saju_analysis_complete → feature_usage 추적 가능
```

**비용 효율:**

- Gemini PRO: saju/cheonjiin/image/compatibility (고가치 분석만)
- Gemini FLASH: 나머지 8개 기능 (비용 절감)
- `lib/utils/analysis-cache.ts` 캐시 우선 조회 필수
- 동일 파라미터 재분석 시 캐시 반환 (Gemini 호출 금지)

**복채 시스템 규칙:**

- 차감 전 잔액 검증 필수 (`insufficient-bokchae-modal` 트리거)
- 일일 한도: SINGLE 10만 / FAMILY 30만 / BUSINESS 100만
- 모든 복채 거래는 `bokchae_transactions` 테이블에 기록

---

## 3. SECURITY BY DESIGN

**개발 플로우:**

```
설계 → 보안 검토 → 개발 → 코드 리뷰 → 보안 게이트 → 배포
```

**OWASP Top 10 체크리스트 (PR 머지 전 확인):**

- [ ] SQL Injection: Supabase SDK 파라미터 바인딩만 사용
- [ ] XSS: `dangerouslySetInnerHTML` 사용 금지
- [ ] IDOR: 모든 DB 쿼리에 `auth.uid()` RLS 적용 확인
- [ ] 환경변수: 클라이언트 번들에 서버 시크릿 노출 금지
- [ ] 웹훅: `timingSafeEqual` 서명 검증 필수 (`api/webhooks/toss/route.ts` 참고)

**Supabase 필수 규칙:**

- 모든 테이블 RLS 활성화 (비활성 배포 금지)
- 관리자 기능: middleware + layout 이중 체크
- Edge Functions: `_shared/auth.ts` 통해 토큰 검증

**환경변수 네이밍:**

- 서버 전용: `GOOGLE_GENERATIVE_AI_API_KEY`, `TOSS_SECRET_KEY`
- 클라이언트 노출 가능: `NEXT_PUBLIC_` 접두사만

---

## 4. CODE QUALITY

**원칙:**

| 원칙         | 설명                                                      |
| ------------ | --------------------------------------------------------- |
| SRP          | 파일 1개 = 책임 1개. 200줄 초과 시 분리 검토              |
| DRY          | 3회 이상 반복 코드 → `lib/utils/` 또는 custom hook 추출   |
| TypeSafe     | `tsconfig.json` strict mode. `any` 사용 금지              |
| Test80%      | Playwright E2E + 유닛 테스트 커버리지 80% 목표            |
| DebtTracking | `// TODO(debt):` 태그로 기술부채 등록, 스프린트 단위 추적 |

**Gemini AI 호출 패턴 (표준):**

```typescript
// 모델은 lib/config/ai-models.ts 상수만 사용
import { AI_MODELS } from '@/lib/config/ai-models'
// 캐시 조회 → 미스 시 Gemini 호출 → 캐시 저장
const cached = await getAnalysisCache(cacheKey)
if (cached) return cached
const result = await generateWithGemini(AI_MODELS.PRO, prompt)
await setAnalysisCache(cacheKey, result)
```

**Supabase Edge Function 호출 패턴 (표준):**

```typescript
// lib/supabase/invoke-edge.ts 헬퍼 사용
import { invokeEdgeSafe } from '@/lib/supabase/invoke-edge'
const { data, error } = await invokeEdgeSafe('function-name', payload)
```

---

## 절대 금지 규칙

```
console.log 단독 에러 처리 금지  →  Sentry.captureException() 사용
any 타입 사용 금지               →  unknown + 타입 가드 사용
RLS 없는 테이블 배포 금지        →  마이그레이션 PR에서 검증
하드코딩 API 키 금지             →  환경변수 필수
Gemini 모델명 하드코딩 금지      →  lib/config/ai-models.ts 상수 사용
복채 차감 검증 생략 금지         →  잔액 확인 후 차감
```

---

_최종 수정: 2026-03-11 | 담당: CTO | 적용 범위: 전체 에이전트_
