# ARCH-superintelligence-v1 — 해화당 초지능 시스템 설계

> 작성: 2026-07-04 (Fable) | 구현 담당: Opus | 상태: **Sprint 1 구현 완료** / Sprint 2·3 대기
> 근거: 코드베이스 전수 분석 (AI 비용 구조 / 디자인 시스템 / 앱 전환 준비도, 3개 병렬 에이전트)

## Sprint 1 구현 현황 (2026-07-04, Opus)

**완료 — Part 1 AI 메모리 + 비용 최적화:**

- DB 마이그레이션 3건 적용 (`plzvanxcxjkaazcfrtls`): `saju_context_cache`, `user_ai_memory`, `chat_sessions.summary`/`summarized_message_count`, `increment_saju_cache_hit` RPC
- `lib/saju-engine/context-cache.ts` — 사주 컨텍스트 person·날짜 단위 캐시 (7개 AI 기능 전부 적용, `buildMasterPromptForAction` 경유)
- `lib/ai/memory.ts` — `recallMemories`(주입) + `extractAndSaveMemories`(FLASH 추출, 중복제거, 상한 30)
- `lib/ai/summarizer.ts` — `maybeSummarizeSession` 증분 요약 (윈도우 밖 메시지만 접기)
- `app/actions/ai/shaman-chat.ts` — 슬라이딩 윈도우(8) + 기억·요약 주입 + `after()` 백그라운드 파이프라인 (클라이언트 무변경)
- `app/actions/shrine/shrine-chat.ts` — 슬라이딩 윈도우(8) + 소유자 기억 top-3 주입
- 검증: 전체 타입 에러 0, Next 빌드 통과

**캐시 키 설계 개선(구현 시):** 컨텍스트 텍스트에 '현재 날짜/대운 태그'가 포함되어 순수 영구 캐시 불가 → person-hash당 1행 유지 + `context_date`로 일 1회 갱신 (정확성 보장 + 무한 증가 방지).

---

## 목차

1. [Part 1 — AI 메모리 + 비용 최적화](#part-1) ← **최우선**
2. [Part 2 — 디자인 시스템 v2](#part-2)
3. [Part 3 — 앱 전환 준비](#part-3) (준비만, 구현 아님)

---

<a name="part-1"></a>

## Part 1 — AI 메모리 + 비용 최적화 (P0)

### 1.1 현재 문제 (측정 결과)

| 문제                                                            | 위치                                                                         | 비용 영향                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------- |
| 사주 컨텍스트를 **매 턴 재계산 + 재전송** (1,500~2,500 토큰)    | `lib/saju-engine/context-builder.ts:94`, `app/actions/ai/shaman-chat.ts:358` | 입력 토큰의 50~70%                |
| 대화 이력 **전체를 무제한 전송** (LIMIT 없음)                   | `app/actions/ai/shaman-chat.ts:493` `loadChatSessionMessages()`              | 턴 수에 비례해 선형 증가          |
| **세션 간 기억 없음** — 지난 상담 내용이 다음 대화에 반영 안 됨 | 구조 부재                                                                    | UX 결함 + 재분석 유도 = 추가 비용 |
| 사주 계산(`getSajuData`+`buildSajuContext`) CPU를 매 턴 소모    | `lib/domain/saju/context-builder.ts:98`                                      | 레이턴시 +300~800ms               |

**현재 무당 채팅 1턴 입력: 평균 2,750~4,500 토큰.** 사주는 결정론적 데이터(생년월일시가 같으면 영원히 동일)인데 매번 다시 계산해 다시 보낸다.

### 1.2 목표 아키텍처

```
[턴 입력 프롬프트 구조 — 개선 후]
┌────────────────────────────────────────────┐
│ 마스터 프롬프트 (ai_prompts, 고정)           │ ← Gemini 명시적 캐싱 (75% 할인)
│ 사주 컨텍스트 (saju_context_cache, 영구캐시) │ ← Gemini 명시적 캐싱
├────────────────────────────────────────────┤
│ 장기 기억 top-5 (user_ai_memory)            │ ~150 tokens
│ 이전 대화 요약 (chat_sessions.summary)      │ ~150 tokens
│ 최근 8개 메시지 (슬라이딩 윈도우)            │ ~400 tokens
│ 새 사용자 메시지                             │ ~100 tokens
└────────────────────────────────────────────┘
```

### 1.3 DB 설계 (신규 마이그레이션 1개)

`supabase/migrations/20260704_ai_memory_system.sql`:

```sql
-- 1. 사주 컨텍스트 영구 캐시 (사주는 결정론적 → TTL 불필요)
CREATE TABLE saju_context_cache (
  cache_key      TEXT PRIMARY KEY,   -- sha256(birth_date|birth_time|calendar_type|gender)
  context_text   TEXT NOT NULL,      -- buildSajuContext() 출력 전문
  engine_version TEXT NOT NULL DEFAULT 'v1',  -- 사주 엔진 로직 변경 시 bump → 자연 무효화
  hit_count      INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);
-- RLS: 개인정보 없는 파생 데이터지만 service_role 전용으로 잠금

-- 2. 유저별 AI 장기 기억
CREATE TABLE user_ai_memory (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE, -- NULL = 본인
  memory_type      TEXT NOT NULL CHECK (memory_type IN
                     ('profile_fact',        -- "이직 준비 중", "자녀 수험생"
                      'concern',             -- 반복 상담 주제
                      'consultation_summary' -- 과거 상담 핵심 결론
                     )),
  content          TEXT NOT NULL CHECK (length(content) <= 300),
  importance       INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  source_session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  last_referenced_at TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_user_ai_memory_recall
  ON user_ai_memory(user_id, family_member_id, importance DESC, last_referenced_at DESC);
-- RLS: 본인만 SELECT/DELETE (INSERT/UPDATE는 service_role — 서버 요약 파이프라인 전용)

-- 3. 세션 요약 컬럼
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS summarized_turn_count INTEGER DEFAULT 0;
```

### 1.4 서버 로직 설계

**신규 파일 3개:**

1. **`lib/saju-engine/context-cache.ts`** — `buildSajuContextCached(person)`
   - cache_key = sha256(정규화된 birth 필드). HIT → DB 텍스트 반환 (계산 스킵). MISS → `buildSajuContext()` 실행 후 upsert.
   - 기존 `buildSajuContext` 시그니처 유지 — 호출부는 함수명만 교체.

2. **`lib/ai/memory.ts`**
   - `recallMemories(userId, familyMemberId, limit=5)` — importance DESC 조회, `last_referenced_at` touch.
   - `extractAndSaveMemories(sessionId)` — FLASH 1회 호출로 세션에서 기억할 사실 최대 3개 JSON 추출 → 유사 기억 있으면 갱신, 없으면 삽입. 유저당 memory 상한 30개 (초과 시 importance 최저 삭제).

3. **`lib/ai/summarizer.ts`**
   - `summarizeSession(sessionId)` — 미요약 구간을 FLASH로 150토큰 요약 → `chat_sessions.summary` 갱신 (기존 요약 + 새 구간 통합).
   - **트리거 시점**: (a) 응답 반환 후 fire-and-forget (`after()` 또는 void promise — ZERO-LATENCY 원칙, 유저 대기 없음), 10턴마다. (b) 새 대화 시작으로 `ended_at` 설정될 때.

**수정 파일 2개:**

4. **`app/actions/ai/shaman-chat.ts`**
   - `loadChatSessionMessages()`: `.limit(8)` + DESC 후 reverse (슬라이딩 윈도우).
   - 프롬프트 조립: 마스터 + 사주캐시 + `recallMemories()` 결과 + `session.summary` + 최근 8메시지.
   - 턴 종료 후: 요약/기억 추출 백그라운드 실행.

5. **`app/actions/shrine/shrine-chat.ts`** — 동일 윈도우 적용 (최근 8개), 신당 프롬프트에 소유자 기억 top-3 주입.

**Gemini 명시적 캐싱 (선택 — Phase 1.5):**

- `lib/services/ai-client.ts`에 `cachedContent` 지원: 시스템 프롬프트+사주 컨텍스트를 세션 시작 시 1회 캐시 등록 (TTL 1h), 이후 턴은 캐시 참조. 캐시된 입력 토큰 75% 할인.
- 주의: 캐시 등록 자체에 최소 토큰 요건(현재 Flash 기준 1,024) 있음 — 사주 컨텍스트 포함 시 항상 충족.

### 1.5 기대 효과

| 지표                | 현재   | 개선 후                                             |
| ------------------- | ------ | --------------------------------------------------- |
| 입력 토큰/턴 (평균) | ~3,500 | ~1,100 (윈도우+캐시) → 실효 ~500 (Gemini 캐싱 병행) |
| 사주 계산 CPU       | 매 턴  | 인당 최초 1회                                       |
| 세션 간 기억        | 없음   | 장기 기억 5개 + 요약 자동 주입                      |
| **월 AI 비용**      | 기준   | **-65% ~ -85%**                                     |
| 응답 레이턴시       | 기준   | -300~800ms (사주 계산 스킵)                         |

### 1.6 수용 기준 (Opus 구현 검증용)

- [ ] 동일 유저 2번째 턴부터 `saju_context_cache` HIT (gemini_api_logs로 입력 토큰 감소 확인)
- [ ] 20턴 대화 시 입력 토큰이 턴 수와 무관하게 상한 유지 (윈도우 동작)
- [ ] 세션 A에서 "이직 고민" 상담 → 세션 B 첫 응답에 해당 맥락 반영
- [ ] 요약/기억 추출이 응답 레이턴시에 영향 없음 (fire-and-forget)
- [ ] `user_ai_memory` RLS: 타 유저 기억 접근 불가
- [ ] 마이페이지에서 본인 기억 열람/삭제 가능 (개인정보 통제권 — 간단한 목록 UI)

---

<a name="part-2"></a>

## Part 2 — 디자인 시스템 v2 (P1)

### 2.1 현재 문제 (측정 결과)

- **inline `style={{}}` 339곳 / 77개 파일**, 하드코딩 rgba 274+ (예: `rgba(201,168,76,0.06)`)
- `lib/config/design-tokens.ts` 존재하나 사용률 ~28% (179개 컴포넌트 중 ~50개)
- 모션 토큰 부재 — framer-motion 78개 파일이 duration/easing 제각각
- 그림자/글로우/z-index가 globals.css에만 존재 (Tailwind 미등록 → IDE 자동완성 불가)

**최다 위반 파일 (우선 마이그레이션 대상):**

1. `components/analysis/cheonjiin/CheonjiinDataCollectionForm.tsx` (21)
2. `components/fortune/family-fortune-status.tsx` (13)
3. `components/shrine/ShrineChatPanel.tsx` (10)
4. `app/protected/profile/manse/manse-client.tsx` (10)
5. `components/shared/SajuLoadingOverlay.tsx` (9)

### 2.2 설계

**Step 1 — Tailwind 토큰 확장** (`tailwind.config.ts`):

```typescript
extend: {
  // 반복 rgba 패턴의 1:1 시맨틱 토큰화
  backgroundColor: {
    'gold-tint-1': 'rgba(201,168,76,0.03)',  // 카드 배경
    'gold-tint-2': 'rgba(201,168,76,0.08)',  // 강조 배경
    'gold-tint-3': 'rgba(201,168,76,0.15)',  // 활성/버튼
  },
  borderColor: {
    'gold-line-1': 'rgba(201,168,76,0.12)',
    'gold-line-2': 'rgba(201,168,76,0.30)',
  },
  boxShadow: {
    'gold-glow': '0 0 20px rgba(201,168,76,0.15)',
    'dojang': '2px 2px 0 rgba(158,43,43,0.4)',
  },
  zIndex: { base:'0', raised:'10', overlay:'20', sticky:'30', nav:'40', modal:'50', toast:'60' },
  transitionDuration: { micro:'75ms', short:'200ms', medium:'300ms', long:'500ms' },
}
```

**Step 2 — 모션 토큰** (`lib/config/motion-tokens.ts` 신규):

```typescript
export const MOTION = {
  fadeInUp: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } },
  stagger: (i: number) => ({ delay: i * 0.04 }),
  duration: { micro: 0.075, short: 0.2, medium: 0.3, long: 0.5 },
  ease: { enter: 'easeOut', exit: 'easeIn', move: 'easeInOut' },
} as const
```

**Step 3 — 컴포넌트 마이그레이션** (그룹별 순차, 각 그룹 빌드+시각 검증 후 다음):

1. shrine/\* (9개 파일 — 최신 코드, 위반 밀집)
2. analysis/cheonjiin/_ + fortune/_
3. shared/\* + 나머지

규칙: `style={{background:'rgba(201,168,76,0.03)'}}` → `className="bg-gold-tint-1"`. 동적 계산이 불가피한 경우만 inline 유지 + 주석 없이 CSS 변수 사용.

**Step 4 — 재발 방지**:

- lint-staged에 정규식 체크 추가: 커밋 파일에서 `rgba\(201,168,76|rgba\(212,175,55|rgba\(158,43,43` 검출 시 경고
- DESIGN.md에 토큰 대응표 섹션 추가

**Step 5 — WCAG AA 감사**: `text-ink-light/20`, `/30` 등 opacity 0.6 미만 텍스트 → 장식용 제외하고 `/50` 이상으로 상향.

### 2.3 수용 기준

- [ ] 하드코딩 rgba(골드/레드 계열) 0건 (동적 계산 제외)
- [ ] 상위 10개 위반 파일 inline style 80% 감소
- [ ] framer-motion 신규 코드 MOTION 토큰 사용
- [ ] 시각 회귀 없음 (마이그레이션 전후 스크린샷 비교)

---

<a name="part-3"></a>

## Part 3 — 앱 전환 준비 (지금은 준비만)

### 3.1 현황 판정

**PWA 95% 완성** — manifest.json(standalone) + 커스텀 sw.js(캐시 전략 3종) + 설치 유도 배너 + safe-area 대응 완료. `localStorage` 직접 사용 0건, 쿠키 기반 auth(@supabase/ssr) — WebView 호환.

### 3.2 권장 경로: PWA 강화 → Capacitor (React Native 재작성 비추천)

| 경로                     | 기간  | 판정                               |
| ------------------------ | ----- | ---------------------------------- |
| PWA 강화 (Web Push 추가) | 1주   | ✅ 즉시 가치, Capacitor에도 재사용 |
| **Capacitor 래핑**       | 4~5주 | ✅ 권장 — 코드 95% 공유            |
| React Native 재작성      | 12주+ | ❌ 비용 대비 없음                  |

### 3.3 Capacitor 블로커 해결표 (구현 시점에 사용)

| 블로커                    | 파일                                  | 해결책                                                 | 공수  |
| ------------------------- | ------------------------------------- | ------------------------------------------------------ | ----- |
| 카카오 JS SDK (DOM 의존)  | `lib/kakao-sdk.ts` 외 12개            | 네이티브 카카오 SDK + 브리지 플러그인                  | 3~5일 |
| OAuth 리다이렉트          | `components/social-login-buttons.tsx` | 딥링크 `com.haehwadang://auth/callback` 등록           | 1~2일 |
| Toss 결제 리다이렉트      | `lib/services/tosspayments.ts` 외 8개 | 성공/실패 URL 커스텀 스킴 처리                         | 2~3일 |
| 푸시 알림 (현재 알림톡뿐) | 부재                                  | FCM(Android)+APNS(iOS) `@capacitor/push-notifications` | 2~3일 |
| 주소검색 (Daum iframe)    | `hooks/use-kakao-address.ts`          | WebView iframe 동작 확인, 불가 시 수동입력 폴백        | 1일   |

### 3.4 사전 준비 체크리스트 (개발 아님 — 계정/인프라, 사용자 액션)

- [ ] Apple Developer Program 가입 ($99/년)
- [ ] Google Play Console 등록 ($25 일회)
- [ ] 카카오 개발자 콘솔에 네이티브 앱 키(Android/iOS) 추가
- [ ] Toss Payments에 앱스킴 등록 문의
- [ ] Firebase 프로젝트 생성 (FCM용)
- [ ] 앱 아이콘 1024px 원본 + 스플래시 소스 준비

### 3.5 지금 웹에서 선행할 것 (Part 1·2와 병행 가능)

- `public/manifest.json`에 maskable 아이콘 추가 (`purpose: "any maskable"`)
- Web Push(FCM) 도입 — 알림톡 의존 탈피, 앱 전환 시 그대로 이관
- 결제/OAuth 콜백 URL을 상수화 (`lib/config/urls.ts`) — 스킴 교체 지점 단일화

---

## 구현 순서 요약 (Opus 지시서)

```
Sprint 1 (P0): Part 1 — AI 메모리 시스템
  1. 마이그레이션 20260704_ai_memory_system.sql (MCP apply_migration, project: plzvanxcxjkaazcfrtls)
  2. context-cache.ts → shaman-chat.ts 캐시 적용 (즉시 비용 절감)
  3. 슬라이딩 윈도우 (loadChatSessionMessages limit 8)
  4. summarizer.ts + memory.ts + 백그라운드 파이프라인
  5. (선택) Gemini cachedContent

Sprint 2 (P1): Part 2 — 디자인 시스템 v2
  1. Tailwind 토큰 + motion-tokens.ts
  2. shrine/* 마이그레이션 → 검증 → 나머지 그룹
  3. lint-staged 가드 + DESIGN.md 갱신

Sprint 3 (P2): Part 3 선행 작업 (Web Push, URL 상수화, maskable 아이콘)
```

**공통 제약 (CLAUDE.md 준수):** any 금지, console.log 단독 금지(logger), Sentry+GA4 이벤트, ZERO-LATENCY(백그라운드 처리), RLS 필수.
