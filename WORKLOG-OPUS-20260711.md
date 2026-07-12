# WORKLOG — OPUS 종일 작업 (2026-07-11)

> 실행자: Opus 4.8 | 브랜치: `claude/determined-yonath` | 지시서: `WORKORDER-OPUS-20260711.md`
> 검토자: Fable(페이블). 각 Track 완료마다 커밋 + 이 로그 append.
> 절대 금지: 프로덕션 배포 / DNS·도메인 / 실결제 / 데이터 삭제 / `.env` 편집 / main 조작.

---

## 진행 요약 (라이브 갱신)

| Track                                                | 상태                   | 게이트                    |
| ---------------------------------------------------- | ---------------------- | ------------------------- |
| S1a — DB 권한(anon 차단, ERROR 0)                    | ✅ 완료 (커밋)         | get_advisors ERROR 0 ✓    |
| S1b — 재화 무결성(authenticated 차단 + RLS 쓰기정책) | ✅ **배포+적용 완료**  | 라이브 검증 ✓ (subs 연기) |
| S2 — 앱 보안                                         | 🔵 점검클린·일부남음   | 시크릿·PII 통과           |
| S3 — 인프라/헤더/rate limit                          | 🔵 헤더완료·나머지대기 | 배포후 검증               |
| A — 이미지 에셋                                      | 🚫 차단(입력부재)      | 사용자 입력 필요          |
| D — 신위 시스템                                      | 🔵 데이터·로직·서버    | 타입0·테스트24 ✓          |
| F — 분석 고도화                                      | ⬜                     | —                         |
| C — 신과의 대화                                      | ⬜                     | —                         |

---

## Track S — 보안 하드닝

### 실측 진단 (2026-07-11, get_advisors security)

112건: ERROR 5 (RLS 미적용 3 + SECURITY DEFINER 뷰 2), WARN 105 (search_path 34, anon-exec definer 33, authed-exec definer 33, always-true INSERT 4, 유출비번 1), INFO 2.

**실제로 뚫려 있던 것(확인):**

1. **비로그인(anon) 상태에서 재화 발행/개인정보 열람 RPC 직접 호출 가능** — `add_wallet_balance`, `add_bok_points`, `grant_shrine_item`, `get_family_with_analysis_summary`, `get_today_fortune` 등 33개 SECURITY DEFINER 함수가 `anon` 롤에 EXECUTE 부여(+PUBLIC).
2. **인증 사용자가 PostgREST로 재화 테이블 직접 UPDATE 가능** — `wallets_update_own` 정책이 `USING (auth.uid()=user_id)`만 있고 `WITH CHECK` 없음 → `UPDATE wallets SET balance=99999999 WHERE user_id=auth.uid()` 성공. `bok_points_update_own`, `inventory_own`(ALL), `ai_chat_usage_all_own`도 동일한 자가발행/할당량조작 구멍.
3. `kg_nodes/kg_edges/kg_rules` RLS 미적용 → anon REST read/write 노출.
4. `user_profiles`, `v_destiny_targets` 뷰가 SECURITY DEFINER → 호출자 RLS 우회(전체 사용자 PII 노출 소지).

### ⚠️ 핵심 제약 — 라이브 DB 즉시 반영

`mcp__supabase__apply_migration`은 프로덕션 DB(`plzvanxcxjkaazcfrtls`)에 **즉시** 반영된다. 배포는 사용자 승인 필요(코드는 아직 미배포). 따라서 **현재 프로덕션 코드를 깨뜨리지 않는 변경만 지금 적용**하고, 코드 배포가 선행돼야 하는 변경은 파일로만 준비한다.

- **S1a(지금 적용 안전)**: `anon`/`PUBLIC` EXECUTE 회수 — 프로덕션은 이 함수들을 anon으로 호출하지 않음(전부 authenticated/service_role). "비로그인 무한충전/PII열람" P0가 닫힘. + kg RLS, 뷰 security_invoker, search_path 고정, 개인정보 함수 `auth.uid()` 교차접근 가드.
- **S1b(코드 배포 후 적용 — 사용자 승인 필요)**: `authenticated` EXECUTE 회수(MINT 함수) + 재화/할당량 테이블 쓰기정책 service_role 전용화. 지금 적용하면 프로덕션 보상/충전 플로우(인증 클라이언트 직접 쓰기)가 즉시 장애. 코드를 admin(service_role) 클라이언트로 전환하는 커밋과 세트.

### ✅ S1a 완료 (마이그레이션 `20260711_security_s1a_hardening.sql`, 라이브 적용됨)

적용 내역:

1. `kg_nodes/kg_edges/kg_rules` RLS 활성 + 읽기전용 정책(anon/authenticated SELECT, 쓰기 service_role) — 앱은 SELECT만(확인).
2. `user_profiles`, `v_destiny_targets` → `security_invoker=true`. base 테이블(profiles/family_members/bok_points) own-row RLS 존재 확인.
3. 개인정보/할당량 함수 6종에 `auth.uid()` 교차접근 가드 추가(`get_family_with_analysis_summary`, `get_family_with_missions`, `get_today_fortune`, `increment_ai_chat_usage`, `record_ai_chat_turn`, `increment_daily_attendance`). service_role(auth.uid()=NULL) skip → 기존 서버경로 유지.
4. SECURITY DEFINER + 트리거 함수 **34종 search_path=public 고정**(anon/authed public CREATE 권한 없음 확인 → 하이재킹 불가).
5. **anon/PUBLIC EXECUTE 회수** — SECURITY DEFINER 함수 전체(제외 3종: `get_shared_analysis_record`·`increment_shrine_visitor`·`is_admin`). authenticated/service_role 유지.
6. Auth **유출 비밀번호 차단(HIBP) 활성화** (Management API, `password_hibp_enabled=true`).

**검증(SQL+advisor):**

- `get_advisors(security)` **ERROR 0** ✓ (기존 5 → 0)
- anon EXECUTE 가능 definer 함수: 33 → **3**(의도적 공개분만) ✓
- search_path 미고정 definer/트리거 함수: 34 → **0** ✓
- kg RLS 활성 ✓ / 뷰 security_invoker ✓
- `add_wallet_balance`/`add_bok_points`/`get_family_*`: anon=**false**, authenticated=true, service_role=true ✓ → **비로그인 무한충전·타인PII열람 경로 차단됨**

**남은 advisor 항목(계획대로):** authenticated-exec WARN 33(S1b, 배포 후), always-true INSERT 4(S1b/S2), anon-exec 3(의도적), INFO 2(rate_limit_entries·saju_context_cache = service 전용 테이블, 무해).

### ✅ S1b 코드 완료 (마이그레이션 파일 대기 — 배포 후 적용)

**문제 재확인:** 인증 사용자가 ①MINT RPC 직접호출 또는 ②재화 테이블 직접 UPDATE(자기 row)로 복채/복포인트/아이템/AI할당량을 **자가발행** 가능. RLS `wallets_update_own` 등이 `WITH CHECK` 없이 `auth.uid()=user_id`만 검사 → 잔액 임의변경 성공.

**코드 변경(커밋됨, 배포 시 안전 — admin 클라이언트는 RLS 우회라 마이그레이션 적용 여부와 무관하게 동작):**
재화 쓰기를 전부 `service_role`(admin) 클라이언트 경유로 전환. 인증·비즈니스검증은 유저 클라이언트 유지.

- `wallet.ts`: `addTalismans`(add_wallet_balance)·`deductTalisman`(deduct_wallet_balance) RPC+폴백 → admin
- `bok-points.ts`: `addBokPoints`(add_bok_points) → admin
- `inventory.ts`: `purchaseToInventory`(grant_shrine_item) → admin
- `scene.ts`: 스타터킷 인벤토리 insert → admin
- `roulette.ts`·`attendance.ts`·`daily-check.ts`: 룰렛/출석 복채 지급 → admin(`db=admin ?? supabase`)
- `products.ts`: 테스트충전 → admin (+null 가드)
- `admin/subscriptions/actions.ts`: `grantTalismans`(타인 지갑 대상 — 기존엔 RLS에 막혀 사실상 깨져 있던 것) → admin 교체
- `gemini-rate-limiter.ts`: `acquire_gemini_token`(공유 토큰버킷) → admin
- 이미 admin이던 곳(shaman-chat 질문권차감, wallet confirmPayment/보너스, open-event, profile 지갑생성)은 변경 없음.

**마이그레이션 파일(`20260711_security_s1b_wallet_integrity.sql`) — ⚠️ 적용 안 함:**

- MINT/자산 함수 6종 `authenticated` EXECUTE 회수(add_wallet_balance/deduct_wallet_balance/add_bok_points/add_talisman/grant_shrine_item/acquire_gemini_token)
- `wallets`·`bok_points`: 자가 UPDATE/INSERT 정책 제거(SELECT 본인만 유지)
- `user_shrine_inventory`·`ai_chat_usage`: ALL→SELECT 본인만(쓰기는 SECURITY DEFINER RPC/service_role)

**검증:** 타입 `tsc --noEmit` EXIT 0 ✓ / 유닛테스트 51 pass(실패16=e2e Playwright 수집오류, 무관) ✓ / 재화 4테이블 직접쓰기 경로 전수 admin 전환 확인(grep) ✓.

**⚠️ 사용자 액션 필요:** ①코드 배포 → ②프로덕션 재화기능 회귀확인(출석/룰렛/충전/구매/신당아이템) → ③S1b 마이그레이션 적용. 순서 엄수(뒤바뀌면 장애).

### 🔵 S3 (부분) — 보안 헤더 보강

기존 `next.config.ts`에 CSP·X-Frame-Options(DENY)·nosniff·Referrer-Policy·Permissions-Policy 이미 존재. 빠진 것 보강:

- **HSTS 추가**: `Strict-Transport-Security: max-age=31536000; includeSubDomains` (preload은 되돌리기 어려워 제외).
- CSP 강화: `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'none'` 추가.
- 추가만(기존 로드 영향 없음). 결제 폼 고려해 `form-action`은 미추가.
- ⚠️ **로컬 검증 불가**: 워크트리에 Supabase env 없어 dev 서버가 미들웨어에서 500(헤더 적용 전 단계). 기존 동작 헤더와 동일 문법이라 안전. **프로덕션 배포 후 securityheaders.com로 검증 필요.**

**S3 남은 것**: rate limit 확장(AI·결제·로그인·가입), 업로드 매직바이트 검증 → 미착수(워크오더 권장순서상 A/D/F/C 이후).

---

## Track A — 이미지 에셋 🚫 실행 차단 (사용자 입력 필요)

파이프라인(`scripts/shrine-assets/`)은 존재하나 **실행 불가**:

1. **style-refs 부재**: `assets-src/shrine/style-refs/ref1~3.png`(「설빛 온기」 시안)는 사용자 첨부분 — 없음.
2. **GEMINI_API_KEY 부재**: 워크트리에 `.env.local` 없음(규칙상 편집·읽기 금지). generate.mjs 실행 불가.
3. **모델 ID 미검증**: `generate.mjs` 기본 `gemini-3.1-flash-image` — Gemini 이미지 모델 실사용 가능 여부를 문서/API로 확인 필요(앱 텍스트 모델 PRO=gemini-3.1-pro-preview/FLASH=gemini-3-flash-preview와 별개). 실행 환경 없이 확정 불가.

→ **사용자 액션**: ①style-refs 3장 첨부 ②GEMINI_API_KEY 있는 환경에서 `node scripts/shrine-assets/generate.mjs base` 실행 ③산출물 `public/shrine/deities/{code}/`에 배치 시 코드변경 0(DB `shrine_deities.sprite_url` 채우면 됨). 게이트(수호신6 base+표정)는 이 입력 이후 가능.

---

## Track D — 신위 시스템 🔵 (데이터·로직·서버 완료 / UI·인연적립 남음)

### ✅ 완료·검증

1. **마이그레이션 `20260711_shrine_deities.sql` (라이브 적용됨)**:
   - `shrine_deities`(17신위 카탈로그, 공개읽기 RLS), `user_shrine_deities`(보유, 본인SELECT), `user_deity_bonds`(인연4단계, 본인SELECT), `shrines.main_deity_id`, `profiles.focus_areas`(새 프로젝트 누락분 재추가).
   - **처음부터 RLS 제대로**(S1 학습): 카탈로그=anon/authed SELECT·service_role쓰기, 유저테이블=본인SELECT·service_role쓰기.
   - 17신위 시드(코드/등급/오행/domains/concern_key/aura{accent,particle,sound}/가격). 검증: 17개·수호신6·RLS전부활성·advisor **ERROR 0 유지**.
2. **결정론 배정 순수함수 `lib/domain/shrine/deities.ts`** (AI 0): focus_areas 키워드 → 용신 오행 → 기본(삼신). 동점은 order로 확정. `assignGuardian()`.
3. **단위테스트 `__tests__/deities.test.ts` 24개 전부 통과** (고민매칭/용신매칭/기본값/우선순위/결정론/시드정합성). = Track D 핵심 게이트 통과.
4. **서버 액션 `app/actions/shrine/deities.ts`** (타입0):
   - `listDeities` 카탈로그+보유+좌정 / `autoSeatGuardian` 무료 좌정(멱등, admin 지급+主神) / `seatDeity` 소유검증 후 좌정 / `purchaseDeity` **서버 가격검증**+잔액검증+중복방지+admin지급+GA4 / `purchaseThemePack` (기존 미구현분 구현).
   - 모든 지급/좌정 쓰기 = service_role(admin), 인증·소유·가격은 서버 검증. (S1 원칙 적용)

### 🔲 남은 것 (env 부재로 로컬 e2e 불가 → 미착수)

- UI: 좌정 의식 화면, 제단 신위 렌더(스탠딩+표정, 에셋은 Track A 대기), 강신 15초 시퀀스(EffectsCanvas/Web Audio 재사용). → **에셋(Track A)·env 선행 필요**.
- 인연(緣) 적립 로직(대화·출석 시 bond_points 증가→레벨업 해금). 서버 RPC/액션 추가 필요.
- 무료 좌정 e2e(Playbook, 로컬 `npm run dev`) — **워크트리 Supabase env 부재로 실행 불가**(dev 서버 500). 로직·타입은 검증 완료.

### ⚠️ 사용자 확인 필요 — 통화 결정

신위/테마 구매를 현재 **기존 상점 관례대로 `price_bok`=복(bok_points, 무료 통화) 차감**으로 구현. 그러나 PRD는 "6만 복전"(복전=유료 통화)이라 표기 — CLAUDE.md도 "복전(유료)/복(무료) 2통화". **복전 별도 유료통화 도입 여부** 결정 필요:

- (a) 현행 유지: 복(bok_points)로 구매 → 시드 가격(60000 등) 재조정 필요(복 잔액 스케일).
- (b) 복전=복채(wallets/만냥)로 차감 → `purchaseDeity` 1곳 통화 스위치 + 가격 재조정.
- (c) 복전 신규 테이블 도입(2통화 UI, HANDOFF의 미래 항목) → 별도 스프린트.
- 실 ₩ 결제(Toss)는 별도 confirmPayment 경로 — 미연동(승인 후).

---

## Track S2 — 앱 보안 🔵 (시크릿·PII 점검 통과 / AI·업로드 남음)

### ✅ 점검 통과 (코드 변경 불필요)

- **시크릿(S2-3)**: `.env`·`.env.local` gitignore 확인(내용 미열람) ✓ / 추적중 `.env` 없음 ✓ / `NEXT_PUBLIC_*SERVICE_ROLE` 오용 없음 ✓ / `createAdminClient`·`SUPABASE_SERVICE_ROLE_KEY`를 import하는 `'use client'` 파일 **없음**(서버 전용 유지) ✓ / 추적 파일에 하드코딩 JWT(`eyJ…`) 없음 ✓.
- **PII(S2-2)**: 공개 신당 OG(`app/api/og/shrine/[userId]/route.tsx`)·공개 씬(`getPublicSceneData`)은 shrine.name/description(사용자 작성 공개콘텐츠)·아이템 이모지·방문/기원 수만 노출. **생년월일·본명·전화·이메일 등 프로필 PII select 없음** ✓.
- **가격 서버검증(S2-1)**: 신규 신위/테마 구매(`purchaseDeity`/`purchaseThemePack`)는 가격을 서버 DB에서만 조회(클라값 무시) — Track D에서 반영 완료.

### 🔲 남은 것 (미착수 — 위험/범위 사유)

- **AI 프롬프트 인젝션 방어**(입력 길이 제한 + 시스템 프롬프트 격리): shaman-chat/신탁 입력 경로. Track C(대화)와 함께 하는 게 적절.
- **업로드 매직바이트 검증**(관상 이미지): 삽입 지점이 `app/actions/ai/image.ts` — HANDOFF가 "분석 P0 버그 보류(사용자 승인 후)"로 지정한 파일. env 없이 블라인드 수정 위험 → **Track F와 함께 사용자 승인 후** 진행 권장.
- **analysis_history/user_energy_profile/user_ai_memory RLS 전수**: S1a 점검 시 `auth.uid()=user_id` 정책 확인됨(양호). 추가 감사 여지.

---

## 📋 Fable 인계 요약 (오퍼스 → 페이블 검토용)

### 오늘 완료 (커밋됨, 브랜치 `claude/determined-yonath`)

| #   | 커밋               | 핵심                                                              | 검증                              |
| --- | ------------------ | ----------------------------------------------------------------- | --------------------------------- |
| 1   | `security(S1a)`    | anon 재화발행·PII열람 차단, kg RLS, 뷰 invoker, search_path, HIBP | **라이브 적용** / advisor ERROR 0 |
| 2   | `security(S1b)`    | 재화 쓰기 service_role 전용화(코드) + 정책조임 마이그(미적용)     | tsc0 / 유닛51 / grep전수          |
| 3   | `security(S3)`     | HSTS + CSP 강화                                                   | 배포후 검증필요                   |
| 4   | `feat(shrine-3.0)` | 신위 17 시드+테이블(RLS), 배정 순수함수, 서버액션                 | **라이브 적용** / tsc0 / 테스트24 |

### 🚨 사용자(승인) 없이는 못 넘어가는 게이트

1. **S1b 적용 순서**: 코드 배포 → 프로덕션 재화기능 회귀확인 → S1b 마이그레이션 적용. (지금 라이브엔 authenticated 자가발행 구멍이 **아직 열려 있음** — anon만 닫힘.)
2. **Track A 이미지**: style-refs 3장 + GEMINI_API_KEY 환경 필요. 그 전까지 신위는 이모지 폴백.
3. **통화(복전 vs 복)**: 신위/테마 결제 통화 확정 필요(WORKLOG Track D 참조).

### 다음 우선순위 제안 (env·승인 확보 후)

- **[높음]** S1b 배포+적용(자가발행 완전 차단) → 실질 P0 마무리.
- **[높음]** Track D UI(무료 좌정 화면·제단 렌더·강신 15초) + 인연 적립 로직 — 에셋(A) 후.
- **[중]** Track F 분석 P0(파서↔스키마 일치, saveAnalysisHistory) + 업로드 매직바이트 — 승인 후.
- **[중]** Track C 대화(SSE 스트리밍·감정→표정) — 신위 렌더 후.
- **[낮음]** S3 rate limit 확장, S2 AI 인젝션 방어.

### 로컬 환경 한계 (반복)

워크트리에 `.env.local` 없음 → dev 서버 500(middleware Supabase 미초기화). 그래서 **모든 UI/e2e 검증 불가**. 타입체크·유닛테스트·DB(MCP)·advisor로만 검증함. UI 트랙(D-UI, C)은 env 있는 환경에서 이어가야 함.

---

## 🔵 Fable 이어작업 (2026-07-12, 승인 없이 코드-완결 가능분)

검토(REVIEW-20260711) 개선에 더해, 하드스톱(배포/에셋/통화결정) 외 **코드로 완결·검증 가능한** 것을 추가 진행. 전부 tsc0 + 유닛테스트. 유닛테스트 총 **126 pass**(세션시작 51 → 126).

| 커밋                    | 내용                                                                                                                                                                | 검증          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `feat(shrine-3.0) 인연` | Track D 인연(緣) 4단계: bond 도메인로직+테스트19, `award_deity_bond` RPC(service_role, 라이브), `awardDeityBond`/`getDeityBonds` 액션                               | tsc0·테스트54 |
| `security(S2)`          | AI 입력가드 `guardAiInput`(길이2000컷+인젝션플래그)+테스트16, shaman-chat·shrine-chat 새메시지·히스토리 적용                                                        | tsc0·테스트16 |
| `security(S3)`          | AI 채팅 rate limit(분당20/유저) shaman·shrine 양쪽                                                                                                                  | tsc0          |
| `fix(Track F)`          | 관상 파서 숫자·등급 양쪽 허용 — **분석 데이터 전량폐기 P0 버그 수정**(프롬프트=숫자, 파서=등급 불일치). `parseFeatureTag` 순수함수+테스트16. 손금은 정합이라 무변경 | tsc0·테스트16 |

**여전히 하드스톱(진행 불가 사유 명확):**

- Track A 이미지: style-refs(사용자 첨부) + GEMINI_API_KEY(워크트리 부재) 필요.
- Track C SSE 스트리밍 / Track D UI(강신·제단렌더): env 부재로 e2e 검증 불가 → 대량 블라인드 코드는 위험, 미착수.
- Track F 잔여(saveAnalysisHistory 축적, 죽은 파이프라인 정리): 관상결과 저장은 image.ts 흐름 e2e 확인이 필요해 보류(파서 P0만 선반영).
- 통화(복채 vs 복전): 정확한 값/모델은 제품결정 → `PREMIUM_CURRENCY_READY=false`로 안전잠금 유지.
- S1b 적용/프로덕션 배포: 사용자 배포권한 필요.

---

## 🚀 배포 + S1b 적용 완료 (2026-07-12, 사용자 배포 승인)

사용자가 ①로컬 env pull ②배포 승인 → 순서대로 실행:

1. **배포**: `vercel deploy --prod --yes` → 빌드 성공(2분), `k-haehwadang.com` 별칭 완료. 배포 전 로컬 dev 부팅 스모크 **HTTP 200**(에러 0) 확인 후 진행.
2. **배포 전 안전점검**에서 놓쳤던 벡터 발견·수정: `payment/subscription.ts createSubscription`이 subscriptions 를 유저클라로 씀 → admin 전환. **subscriptions(R1)는 빌링 상태머신 다수가 유저클라 쓰기라 정책제거 연기**(별도 후속).
3. **S1b 마이그레이션 적용**(subscriptions 제외): 라이브 검증 —
   - wallets·bok_points 쓰기정책 **0**, inventory·ai_chat_usage·user_theme_packs·daily_usage_logs **SELECT 전용**
   - `add_wallet_balance` authenticated=**false**/service_role=**true**
   - **프로덕션 200 유지**(마이그 후 헬시)
4. **S3 헤더 프로덕션 검증**: `k-haehwadang.com` 응답에 **HSTS + CSP(base-uri/object-src/frame-ancestors)** 라이브 확인.

**결과: 로그인 유저 자가발행(복채·복포인트·아이템·AI할당량·유료테마·일일한도) 전부 차단.** 실질 보안 P0 종료. (subscriptions 자가발급만 후속 남음)

**남은 보안 후속(코드 배포 후 별도):**

- subscriptions 빌링 쓰기 전부 admin 전환 → `subscriptions_insert_own/update_own` 제거(R1 완결).

---

### 사용자 승인/확인 필요 목록 (누적)

- [ ] **S1b 마이그레이션 적용 순서**: ①코드(admin 클라이언트 전환) 배포 → ②S1b 마이그레이션 적용. 순서 뒤바뀌면 장애.
- [x] ~~Auth 유출비밀번호 차단(HaveIBeenPwned) 활성화~~ — **완료** (`password_hibp_enabled=true`).
- [ ] (S3) DNS 레지스트라 잠금/DNSSEC, SPF/DKIM/DMARC, Cloudflare WAF, 관리자 2FA — 콘솔 전용, 미실행.
