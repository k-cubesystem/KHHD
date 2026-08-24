# ARCH-counsel-sokpuri: 「속풀이」 개편 시스템 설계

버전: v1.1 | 작성: TEAM_G (ARCHITECT) | 날짜: 2026-08-22 (v1.1 — F6를 광고 리워드 시스템으로 교체, §6-1 신설)
기준 코드: `dy-journey-design` 워크트리 @ `549c51c` (프로덕션 라인). ⚠️ main(18fd16f)은 구세대 — 구현 세션은 반드시 `git rev-parse --show-toplevel`과 브랜치 확인 후 착수.

---

## 1. 현행 아키텍처 (실측 요약)

```
하단내비 「고민상담」 → /protected/ai-shaman (RSC)
  ├─ 멤버십∥일일권 게이트 (page.tsx:47-63) → 미보유 시 <MembershipGate feature="counsel">
  ├─ loadSeatedDeity() — 主神 코드/이름 선주입 (page.tsx:17-43, self 전용)
  └─ <ShamanChatInterface> (1,084줄 클라이언트)
       ├─ 마운트: 질문권 상태 ∥ 세션 로드 → 선문안 getChatOpening() (AI 0원·결정론)
       └─ handleSend → sendShamanChatMessage() (app/actions/ai/shaman-chat.ts:365)
            가드→레이트리밋(20/60s)→잔량 확인→★차감(AI 호출 전)→
            컨텍스트 조립(마스터 프롬프트+SHAMAN_CHAT 지침+신위 페르소나+기억/요약)→
            gemini-3-flash-preview 비스트리밍 sendMessage→logUsage→
            [[감정]] 파싱→인연 +2→suggestedQuestions 생성(→클라가 폐기)
```

- 프롬프트 4계층: ①DB `ai_prompts.haehwajigi_master` ②코드 `SHAMAN_CHAT` 지침(`lib/saju-engine/context-builder.ts:573-622`) ③신위 페르소나(`buildShrineContext`, shaman-chat.ts:63-134) ④무명식 폴백(:36-50). **DB `shaman_chat` 키는 죽은 프롬프트**(로드 경로 없음).
- 과금: 입장(멤버십 or `CHAT_DAY_PASS` 1만냥/24h) + 10문/일 무료(전 등급 동일) + 질문권(1만냥=20회). 문답당 복채 차감 없음. admin만 무제한.
- 저장: `chat_sessions`/`chat_messages`(RLS owner) + 요약(`summary`) + `user_ai_memory`(6문답마다 추출, 최대 30) + 등급별 보존(90/180/365일, 무료 30일, 기억함 +90×2).
- 계측: `gemini_api_logs`(`shaman_chat`)만 존재. GA4·Sentry는 챗 경로 0.

## 2. 설계 원칙

1. **기존 자산 재사용 우선** — 칩 데이터·신탁·선문안·질문권 RPC 전부 이미 존재. 신규 인프라 최소화.
2. **결정론 구간은 결정론 유지** — 선문안·일진·칩(선문안분)은 AI 호출 금지 (진입 원가 0 원칙 보존).
3. **비용은 상품으로 전환** — PRO 토큰은 심층 문답 SKU에서만 소모.
4. **프롬프트는 DB, 로직은 코드** — 무배포 튜닝 경로(ai_prompts) 일원화.

## 3. P0 변경 명세 (파일:라인 단위)

### F2. 후속질문 칩 복원
- `components/ai/chat/greeting-intro.tsx:15-25` — `quickReplies: string[]` prop 추가, 마지막 라인 스태거 후 칩 렌더. 탭 → `onQuickReply(text)` → `handleSend`.
- `components/ai/shaman-chat-interface.tsx:758-759` — 폐기 주석 제거, `result.suggestedQuestions` 상태 보관 → 마지막 assistant 버블 하단 칩 3개 렌더(새 메시지 전송 시 소거).
- 칩 스타일: `hanji-card` 계열 + `border-white/10`, 도장 필 없음(주 CTA와 구분). 라벨 「이어 여쭙기」.
- 서버 개선(소): `buildSuggestedQuestions`(shaman-chat.ts:607-617)를 답변 내용 기반으로 개선하는 것은 P1 프롬프트 구조화(§5)와 통합 — P0는 현행 소스(사주/관상/손금 기록) 그대로 노출만.

### F3. PC 480px 수복
- `components/ai/shaman-chat-interface.tsx:784-796` 루트: `style={{top:'56px',bottom:'60px',left:0,right:0}}` → 클래스 `fixed left-1/2 -translate-x-1/2 w-full max-w-[480px]` (+`top/bottom` 유지). `:798` 앰비언트 레이어 동일 적용.
- 검증: BottomNav(`bottom-nav.tsx:42`)·MobileHeader(`mobile-header.tsx:30,55`)와 동일 패턴이므로 시각 정렬 보장. 버블 `max-w-[72%/76%]`는 부모 축소로 자동 정상화.
- **전역 containing-block 방식(프레임 div에 transform 부여)은 채택 금지** — BottomNav/MobileHeader의 `left-1/2 -translate-x-1/2`가 이중 보정되어 틀어짐.
- 정리(무해): `app/protected/layout.tsx:18`의 무의미한 `max-w-4xl` 제거.

### F4. 계측
- `lib/analytics/ga4.ts` — `GA.chat*` 10종 추가, `FUNNEL_BY_ACTION`(:35-40)에 `chat_open→chat_first_question→chat_limit_hit→(voucher|ticket)_purchase` 등록.
- Sentry: `sendShamanChatMessage` catch(:623)·`saveChatMessages`·`getChatOpening` 실패에 `Sentry.captureException` + 사용자 카피는 화이트리스트(§7).
- 이벤트 파라미터 공통: `{ target: 'self'|'family', deity_code, turn, remaining_free, remaining_paid }`.

### F5. 신뢰 수리
- 차감 순서: 현행 「차감(비치명)→AI」 유지하되 **AI 실패 catch에서 보상 환급** — free였으면 `record_ai_chat_turn` 감산 RPC(신규 `refund_ai_chat_turn`) / purchased였으면 `add_shaman_credits(+1)`. 환급 실패 시 Sentry critical.
- 응답 페이로드에 `remaining: {free, purchased}` 포함 → 클라 낙관 감소치 덮어쓰기(`:741-756` 재동기화).
- `handleRecharge`(:637) 라우트 `/protected/membership` → `/protected/store?tab=bokchae` 통일.

## 4. F7 스트리밍 설계 (P1)

서버 액션은 스트림 반환 불가 → **라우트 핸들러 신설**.

```
POST /api/chat/stream  (Node runtime, auth 쿠키)
 req: { message, history, sessionId, familyMemberId, turnCount }
 res: text/event-stream
   event: meta   {emotion, deityCode}          ← 첫 청크에서 [[감정]] 파싱 즉시
   event: token  {t: "..."}                    ← chat.sendMessageStream() 청크
   event: done   {full, suggested[3], remaining{free,purchased}, bond{leveledUp,...}}
   event: error  {code}                        ← 카피는 클라 화이트리스트 매핑
```

- 내부는 기존 `sendShamanChatMessage`의 조립부를 `lib/domain/chat/pipeline.ts`로 추출해 액션·라우트가 공유 (SRP, 중복 금지).
- 차감·환급·logUsage·인연 적립은 라우트에서 동일 수행. `logUsage`는 done 시점 1회.
- 클라: fetch+ReadableStream 파서. 실패·미지원 시 기존 서버 액션 폴백 유지(플래그 `chat_stream_enabled`, system_settings).
- 가드 재사용: `guardAiInput`·rate limit 동일 적용. CSRF: 동일 오리진+세션 쿠키 검증.

## 5. 프롬프트 계층 정비 (P1)

| 조치 | 내용 |
|---|---|
| 죽은 키 정리 | `ai_prompts.shaman_chat`(구 「해화당 도사」)을 **실로드 경로로 편입**: `SHAMAN_CHAT` 지침(context-builder.ts:573-622)의 튜닝 가능 본문을 이 키로 이관, 코드는 폴백만 보유. 미이관 시 삭제. (무배포 A/B의 전제) |
| 길이 규칙 보정 | 규칙 200~400자 vs 실측 544자 → 「기본 3~5문장(±350자), 심층 예고 1줄, 후속질문 1개로 종결」로 재규정 |
| 칩 구조화 출력 | 본문 뒤 구분자 방식: 마지막 줄 `⟪이어 여쭙기⟫ q1 | q2 | q3` → 서버 파서가 분리해 `suggested[]`로 반환, 본문에서 제거. (기존 「JSON 출력 금지」 원칙 유지) |
| 안전 프로토콜 | 위기 키워드(자해·자살 등) 감지 지침: 점술적 단정 금지 + 공감 + 1393/129 안내 문구 고정 출력. `guardAiInput`과 별개로 프롬프트 층에도 명시 |
| 심층 문답 신설 | `ai_prompts.shaman_chat_deep` (신규): PRO 전용, 명식 전체+대운/세운/월운 정밀, 800~1,200자, 완충 삼단 화법, 개운 처방 2개, 연도 특정 의무. `talisman_cost=5` 메타 기록 |

## 6. 데이터·과금 변경

| 변경 | 스키마/경로 | 비고 |
|---|---|---|
| 광고 리워드 질문권 (F6, v1.1) | 신규 `ad_reward_ledger` + service_role RPC 지급·멱등 — 상세 §6-1 | 게이트(page.tsx:47)에 3안 노출: 멤버십 / 일일권 / **광고 보고 향 올리기** |
| 신탁 브리지 (F9) | `deity_oracles.follow_questions jsonb` — 신탁 생성 프롬프트에 후속 질문 3개 동시 생성(추가 호출 0). 진입 `?oracle=<id>` → `getChatOpening`이 신탁 인용형 인사 조립(결정론) | 열람률 100% 자산 활용 |
| 심층 문답 (F10) | 차감 = 질문권 5회 일괄(`consume_shaman_credit` ×5 원자화 RPC `consume_shaman_credits(n)`), 부족 시 free 잔여 사용 불가(유료 전용) | `gemini_api_logs.action_type='shaman_chat_deep'` 분리 |
| 모델 라우팅 | `lib/config/ai-models.ts:64` 맵에 `'shaman-chat-deep': resolveModel('pro')` 추가. 일반 경로는 `MODEL_FLASH` 유지 | PRO=`gemini-3.1-pro-preview` |
| 멤버십 차등 (F15, 보류) | `membership_plans.features` jsonb에 `chat_daily_limit`/`deep_monthly` 추가 — `lib/domain/chat/constants.ts:9-17`의 단일 한도 원칙 폐기가 전제 (CEO 승인 게이트) | 승인 전 구현 금지 |

### 6-1. F6 광고 리워드 시스템 (v1.1)

**스키마** (RLS: 본인 SELECT only, 쓰기 전부 service_role — wallets 자가발행 사고 교훈 준수):

```sql
create table ad_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  provider text not null check (provider in ('coupang_visit','gam_rewarded')),
  reward_kind text not null default 'chat_questions',
  qty int not null,                 -- 지급 질문권 수 (A안 2 / B안 5)
  remaining int not null,           -- 소진 잔량
  proof jsonb not null,             -- 완료 증빙: nonce·subid·슬롯 이벤트 타임스탬프
  proof_key text generated always as (proof->>'nonce') stored,
  granted_at timestamptz default now(),
  expires_at timestamptz not null   -- granted_at + 48h
);
create unique index on ad_reward_ledger(proof_key);  -- 멱등(중복 지급 차단)
```

**RPC** (전부 service_role definer):
- `grant_ad_reward(p_user, p_provider, p_proof)` — ①`proof_key` 유니크로 멱등 ②일한도 검사(`count(*) where granted_at::date=today` ≥ 설정값 → 거절) ③전역 브레이커 검사(§8) ④지급. 교환비·일한도는 `system_settings`(`chat_ad_exchange`, `chat_ad_daily_sets`)에서 로드 — 무배포 조정.
- 소진: 기존 `consume_shaman_credit`를 우선순위 확장 — **①일일 무료 ②광고권(만료 임박 순) ③구매권**. 광고권은 `deep=false` 경로에서만 유효.

**입장 게이트 변경** (`app/protected/ai-shaman/page.tsx:47-63`): 멤버십 ∥ 일일권 ∥ **광고권 잔량>0** 3자 OR. `MembershipGate`에 3번째 CTA 「광고 보고 향 올리기」 추가.

**프론트 플로우** (`components/ai/chat/ad-incense-sheet.tsx` 신규):
```
[광고 보고 향 올리기] → 시트: 향불 3개(미점화)
  A안 쿠팡: 새 탭 리다이렉트(subid=nonce) → 복귀 감지(visibilitychange+최소 체류 15s) → grant 요청(qty 2)
  B안 GAM:  GPT RewardedSlot 정의 → rewardedSlotReady→표시→rewardedSlotGranted 3회 반복
            (각 회차: nonce+타임스탬프 서명 payload 축적, 향불 1개씩 점화)
            3/3 완료 → grant 요청(qty 5) → 「다섯 문답이 올려졌습니다」
  이탈(rewardedSlotClosed 미완주) → ad_reward_abandon 계측, 지급 없음
```

**검증 한계와 대응(정직 설계)**: 웹 리워드는 앱 SSV 대비 완료 증빙이 약함(GAM 웹은 `rewardedSlotGranted`가 클라 이벤트, 쿠팡 방문은 클릭 기준). → 서버는 nonce 발급 시각 대비 **최소 소요 시간**(영상 3편 ≥ 45s, 방문 ≥ 15s) 미달 지급 거절 + 일한도 + 브레이커로 **위조 이득 자체를 상한 캡**. 이상 패턴(동일 IP 다계정 등)은 `rate_limit_entries` 재사용.

**계측**: `ad_reward_start / ad_reward_step{n} / ad_reward_grant / ad_reward_abandon` (+`provider`), 퍼널 `chat_limit_hit→ad_reward_start→grant→chat_message_sent`.

**정책 가드**: 보상 결합은 리워드 전용 포맷만. 애드핏·AdSense 일반 배너와 보상 연결 금지(계정 정지 사유) — 코드 리뷰 체크리스트에 명시.

## 7. 신뢰성·보안

- **에러 카피 화이트리스트**: `lib/domain/chat/errors.ts` — SDK 원문(`e.message`) 직노출 금지(:625 수정). 코드→카피 매핑, 미지 코드는 "신당의 기운이 잠시 흐렸습니다. 다시 여쭈어 주십시오." + Sentry.
- **콜드스타트 병렬화 (F11)**: `getChatOpening`(:727-829) 내부 직렬 8왕복 → ①세션·메시지 ②(기억∥프로필∥가족명∥신당·신위∥정성) 2단 `Promise.all`로 3왕복. 인터페이스 `loadSession`(:551-581)도 세션 로드와 opening 준비 병렬화.
- **엣지 스플릿브레인 제거**: 전송이 로컬 강제(:379-383)인 동안 세션 액션들(`getOrCreateChatSession` 등)의 `isEdgeEnabled('ai-chat')` 분기도 로컬로 통일 — 읽기/쓰기 경로 불일치 해소. 엣지 함수는 패리티 확보 전까지 플래그 회수.
- **가족 신위 시딩 (F16)**: `loadSeatedDeity`(page.tsx:17-43)의 self 한정을 가족 대상 조회로 확장, `handleFamilyChange`(:600)에서 재시딩.
- RLS·rate limit·guardAiInput·AI 고지(ServiceDisclaimer)는 현행 유지. trial·환급 RPC는 전부 service_role 전용(자가발행 차단 — wallets 사고 교훈 준수).

## 8. 비용 가드

- 히스토리 윈도우 8턴 + 세션 요약 주입(현행) 유지. 심층 문답만 전체 명식 컨텍스트.
- `saju_context_cache` 재사용(현행). 스트리밍 전환 후에도 `maxOutputTokens` 상한 설정(일반 700 / 심층 2,048).
- **전역 예산 서킷브레이커 (F6 연동)**: `system_settings.ai_daily_budget_usd`(초기 $30). 헬스체크 크론이 `gemini_api_logs` 당일 합산 재계산 → 80% 도달 시 Sentry 경고, 100% 도달 시 `chat_ad_reward_enabled=false` 자동 전환(광고 지급·광고권 신규 사용 중단, **유료 경로는 계속**) + 익일 00시 KST 자동 복구. `grant_ad_reward`도 지급 시점에 동일 검사(크론 지연 대비 이중화).
- 광고권 문답은 경량 모드: `maxOutputTokens 500`·히스토리 6턴 (일반 700·8턴, 심층 2,048) — 원가 ₩14→약 ₩8~10.

## 9. 기술 부채 & 후속

- `getShamanChatStarters`·`RANDOM_STARTERS`(shaman-chat.ts:136-152, :629) — 미사용 확정 시 삭제.
- `ai_chat_usage.total_talisman_used`·`getAIChatUsageStatus`(@deprecated) 정리.
- `02_wallet_system.sql`의 유령 `SHAMAN_CHAT` 1부적 항목 — 문서(docs/DATABASE.md:279)와 함께 정리 (⚠️ 해당 SQL 재적용 금지 원칙 준수).
- 하드코딩 `top:56px/bottom:60px` → 레이아웃 CSS 변수화(P2).

## 10. 테스트 전략

- 유닛: 칩 파서(구분자·누락·과다), 환급 경로(free/purchased/ad×성공/실패), 광고 지급(멱등 중복·일한도 초과·최소 소요시간 미달·브레이커 발동·만료 소진 순서), `toGeminiHistory` 회귀(08-16 전면 장애 재발 방지 스냅샷 유지).
- e2e(Playwright): 진입→선문안→칩 탭→응답→잔량 감소 해피패스, 데스크톱 1280px 스크린샷(480px 정렬), 한도 소진→충전 CTA 라우트.
- 프롬프트 QA: 실대화 20건 육안 게이트(칩 품질·길이 규칙·후속질문 존재율 ≥90%).
