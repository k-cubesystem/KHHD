# 검토 — OPUS 20260711 작업 (Fable, 2026-07-11)

> 대상: `WORKLOG-OPUS-20260711.md` 및 커밋 `affa55f`(S1a)·`9f94fe6`(S1b)·`ed3bde3`(S3)·`cdf0619`(D)·`c8ff2fc`.
> 검토 방식: WORKLOG 주장을 라이브 DB(`plzvanxcxjkaazcfrtls`)·코드·마이그레이션과 직접 대조.

## 종합 판정

**S1a·Track D는 정확하고 안전하게 완료됨.** anon 재앙(비로그인 무한충전·타인 PII열람)은 실제로 닫혔고(advisor ERROR 0 재확인), 신위 데이터·배정로직·테스트는 깔끔하다. 판단(anon 지금/authenticated 배포후 분리, search_path=public 근거, is_admin 예외 유지, shrines UNIQUE로 maybeSingle 안전)은 모두 옳다.

**그러나 S1b에 커버리지 구멍이 있다.** S1b는 자가발행을 막으려 만들었는데, wallets/bok_points/inventory/ai_chat_usage만 조이고 **동일 부류의 유저 쓰기 가능 가치 테이블 3개를 놓쳤다.** 이건 S1b 적용 **전에** 반드시 메워야 한다(아직 미적용이라 라이브 회귀는 아님).

---

## 🔴 P0/High — S1b 적용 전 반드시 반영

### R1. `subscriptions` 자가발행 → **무료 유료멤버십** (mint급)

- 라이브 정책 `subscriptions_insert_own`(INSERT, `WITH CHECK auth.uid()=user_id`) + `subscriptions_update_own`(UPDATE) 존재.
- 공격: `POST /rest/v1/subscriptions {user_id: 본인, status:'ACTIVE', tier:'BUSINESS'}` → **결제 없이 최상위 멤버십 자가발급**.
- 정당한 쓰기 경로 전수 확인: 전부 admin/웹훅/크론(`app/api/webhooks/toss`, `app/admin/users/actions`, `cron/billing`)·service_role. **유저 클라이언트 정당 insert 없음** → 정책 제거해도 앱 무영향.
- **지시**: S1b에 추가 — `DROP POLICY subscriptions_insert_own; DROP POLICY subscriptions_update_own;` (subscriptions_select_own 유지). 쓰기는 전부 admin.

### R2. `user_theme_packs` 자가발행 → **무료 유료 테마팩**

- 정책 `user_theme_packs_own`(ALL). 유저가 직접 insert → 유료 테마 무료 획득. **오퍼스가 새로 만든 `purchaseThemePack`(admin)마저 우회.**
- 정당 쓰기: `purchaseThemePack`(admin, 신규) 뿐. `activateThemePack`은 읽기+shrines.update만.
- **지시**: `inventory_own`과 동일 처리 — `DROP POLICY user_theme_packs_own; CREATE POLICY user_theme_packs_select_own FOR SELECT ...`.

### R3. 통화 설계 — 프리미엄 구매가 **매출 누수**로 구현됨 (shippable 아님)

- 신위(₩6,900~/6만 복전)·테마를 PRD는 "복전(유료)"으로 규정했으나 `purchaseDeity`/`purchaseThemePack`은 **복(bok_points=무료·적립형) 차감**으로 구현.
- 결과: 유저가 무료 복을 모아 **프리미엄 신위를 공짜로** 획득. 시드 가격 튜닝 문제가 아니라 **수익모델 결함**.
- **지시**: 사용자 통화 결정 확정 전까지 tier≥2 구매는 **미노출/비활성** 처리. 결정 후 (b)복채(wallets) 또는 (c)복전 신규통화로 스위치. WORKLOG Track D (a)/(b)/(c) 참조.

---

## 🟡 Medium

### R4. `daily_usage_logs` 자가리셋 → 일일 한도 우회

- 정책 `daily_usage_logs_all_own`(ALL). `incrementDailyUsage`가 **유저 클라이언트로** upsert/update.
- 공격: 유저가 자기 `talismans_used`를 0으로 UPDATE → SINGLE 10만/일 등 **일일 소비 한도 리셋**.
- **지시**: 월렛 플로우와 동일 패턴 — ① `incrementDailyUsage`(membership.ts)를 admin 클라이언트로 전환 → ② 정책을 SELECT 본인만으로 축소. (①없이 ②만 하면 정상 사용 시 upsert 실패.)

### R5. 복 차감 원자성 없음 (TOCTOU + 음수 가능)

- `deduct_bok_points` RPC **부재 확인**. `purchaseDeity`/`purchaseThemePack`/`purchaseToInventory`는 `getBokPointsBalance()` 후 `addBokPoints(-price)` — 비원자적. `add_bok_points`는 `balance=balance+p_amount`로 **잔액<0 가드 없음** → 동시요청 시 음수/이중차감.
- **지시**: `deduct_bok_points(uuid,integer)` RPC 신설(`deduct_wallet_balance` 미러 — `WHERE balance>=p_amount RETURNING`, -2=부족). 세 구매 액션을 이 RPC(admin)로 교체.

### R6. 거래로그 위조 가능 (`wallet_transactions`·`bok_transactions` insert_own 잔존)

- S1b가 잔액 테이블은 조였으나 로그 테이블 insert_own은 유지 → 유저가 가짜 거래내역 삽입 가능(잔액은 불변이라 mint 아님). 내역 UI·트래픽/매출 분석 오염 소지.
- **지시(선택)**: 로그 쓰기도 service_role 전용화 검토(정당 insert가 이미 서버경유인지 확인 후). 우선순위 낮음.

---

## 🟢 Low / 관찰

- **R7.** `roulette/attendance/daily-check`의 `db = admin ?? supabase` 폴백: service_role 키 부재(오설정) 시 유저클라로 조용히 폴백 → S1b 적용 후 재화쓰기 실패. 프로덕션엔 키 있어 무해하나, 돈 쓰기는 `admin` null이면 **하드 실패**시키는 게 안전.
- **R8.** `autoSeatGuardian` shrine insert 경쟁(동시 좌정 2회 → UNIQUE 위반). shrines도 `upsert(onConflict:user_id)`로.
- **R9.** admin 액션이 유저클라로 타인 행 수정: `admin/subscriptions/actions.ts:157 updateSubscriptionStatus`가 `createClient`로 `.eq('id', ...)` → RLS에 막혀 사실상 이미 깨짐(grantTalismans와 동종, 오퍼스가 그건 고쳤으나 이건 잔존). admin으로 교체 권장.
- **R10.** 엣지함수(`supabase/functions/payment`, `ai-analysis`)가 wallets/subscriptions 씀 — 배포·활성(isEdgeEnabled) 여부 및 service_role 사용 여부 확인 후 S1b 영향 판단.

---

## 다음 라운드 지시 (요약)

1. **[선행]** S1b 마이그레이션 파일에 R1·R2 추가(subscriptions·user_theme_packs 쓰기정책 제거). R4는 코드(admin 전환)+정책 세트로.
2. **[선행]** R5 `deduct_bok_points` RPC + 구매 3액션 교체. R3 통화 결정 전까지 프리미엄 구매 비활성.
3. 그 후에야 "S1b 적용 순서(코드배포→회귀→마이그)"를 밟아 **authenticated 자가발행 전체(재화+멤버십+테마+한도) 차단** 완료.
4. R7~R10은 정리 커밋으로.

> 핵심 한 줄: **오퍼스의 anon 차단은 진짜 유효하나, "로그인 유저 자가발행" 차단은 재화 4테이블에 그쳐 멤버십·테마·한도 3개 벡터가 남아 있다. S1b를 적용하기 전에 이 3개를 같은 방식으로 메워야 P0가 실제로 끝난다.**

---

## ✅ 적용 완료 (Fable, 커밋 `75170cc` + 후속)

| 항목                        | 조치                                                                                                                                 | 상태                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| R1 subscriptions            | S1b 파일에 insert/update_own 제거 추가                                                                                               | ✅ 파일(배포 후 적용) |
| R2 user_theme_packs         | S1b 파일에 ALL→SELECT본인 추가                                                                                                       | ✅ 파일(배포 후 적용) |
| R3 프리미엄 통화 누수       | `PREMIUM_CURRENCY_READY=false` 가드 — 유료 신위/테마 구매 차단                                                                       | ✅ 코드               |
| R4 daily_usage_logs         | `incrementDailyUsage`→admin(코드) + S1b 파일 정책(배포 후)                                                                           | ✅ 코드+파일          |
| R5 복 차감 원자화           | `deduct_bok_points` RPC **라이브 적용**(anon/authed 실행불가·-2 검증) + purchaseDeity/purchaseThemePack/**purchaseToInventory** 교체 | ✅ 완료               |
| R9 updateSubscriptionStatus | 유저클라→admin                                                                                                                       | ✅ 코드               |

**검증**: tsc 0 / 도메인테스트 35 pass / deduct_bok_points 권한·동작 SQL 확인.

### 남은 것 (의도적 보류)

- **R6**(거래로그 위조): 낮음 — 잔액 불변이라 mint 아님. 로그 쓰기 service_role화는 정당 insert 경로 전수 확인 후 별도.
- **R7**(admin?? 폴백 하드실패): 프로덕션 키 상존이라 무해, 방어적 개선은 후속.
- **R8**(좌정 경쟁): shrines UNIQUE + 결정론 배정으로 결과 자가치유 → 실질 무해, 스킵.
- **R10**(엣지함수): `isEdgeEnabled` 기본 off 추정. 배포·활성 여부 확인은 사용자 환경 필요 → 미확인 항목으로 남김.

### ⚠️ 사용자 결정 대기 (여전히)

- **통화**: R3 가드로 유료 구매를 막아둠 → 복채(wallets)/복전(신규) 확정 시 `PREMIUM_CURRENCY_READY=true` + 차감 통화 결정.
- **S1b 적용 순서**: 코드 배포 → 프로덕션 재화기능 회귀확인 → S1b(R1·R2·R4 포함) 마이그레이션 적용. 지금 라이브엔 authenticated 자가발행(재화+멤버십+테마+한도) **아직 열려 있음**.
