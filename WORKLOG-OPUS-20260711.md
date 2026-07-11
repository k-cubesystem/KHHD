# WORKLOG — OPUS 종일 작업 (2026-07-11)

> 실행자: Opus 4.8 | 브랜치: `claude/determined-yonath` | 지시서: `WORKORDER-OPUS-20260711.md`
> 검토자: Fable(페이블). 각 Track 완료마다 커밋 + 이 로그 append.
> 절대 금지: 프로덕션 배포 / DNS·도메인 / 실결제 / 데이터 삭제 / `.env` 편집 / main 조작.

---

## 진행 요약 (라이브 갱신)

| Track                                                | 상태                | 게이트                 |
| ---------------------------------------------------- | ------------------- | ---------------------- |
| S1a — DB 권한(anon 차단, ERROR 0)                    | ✅ 완료 (커밋)      | get_advisors ERROR 0 ✓ |
| S1b — 재화 무결성(authenticated 차단 + RLS 쓰기정책) | ✅ 코드완료·MIG대기 | 배포 후 적용           |
| S2 — 앱 보안                                         | ⬜                  | —                      |
| S3 — 인프라/헤더/rate limit                          | ⬜                  | —                      |
| A — 이미지 에셋                                      | ⬜                  | —                      |
| D — 신위 시스템                                      | ⬜                  | —                      |
| F — 분석 고도화                                      | ⬜                  | —                      |
| C — 신과의 대화                                      | ⬜                  | —                      |

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

### 사용자 승인/확인 필요 목록 (누적)

- [ ] **S1b 마이그레이션 적용 순서**: ①코드(admin 클라이언트 전환) 배포 → ②S1b 마이그레이션 적용. 순서 뒤바뀌면 장애.
- [ ] Auth 유출비밀번호 차단(HaveIBeenPwned) 활성화 — Management API(`SUPABASE_ACCESS_TOKEN`)로 시도 예정, 결과 기록.
- [ ] (S3) DNS 레지스트라 잠금/DNSSEC, SPF/DKIM/DMARC, Cloudflare WAF, 관리자 2FA — 콘솔 전용, 미실행.
