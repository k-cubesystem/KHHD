# 어드민 콘솔 고도화 v2 — 착수 계획

작성 2026-08-17 · 브랜치 `claude/determined-yonath` · 상태 **조사 완료, CEO 결정 대기**

---

## 0. 한 줄

지금 어드민은 **돈은 보는데 물건은 못 본다.** 매출·회원·결제는 화면이 있지만, 우리가 파는
«풀이»와 «상담»을 열어볼 자리가 한 곳도 없고, 돈과 가격을 바꾸는 조작이 **감사 로그에
남지 않는다.**

---

## 1. 현황 — 재서 확인한 것

화면 14개 · 6,392줄. 왼쪽 메뉴 5그룹(운영 관리 / 웹툰 / 이벤트·마케팅 / 시스템).

| 화면               | 줄수      | 상태                                                         |
| ------------------ | --------- | ------------------------------------------------------------ |
| 대시보드           | 317       | RPC 1콜 집계(총회원·오늘가입·매출 3종·활성구독·MRR·총분석)   |
| 회원 관리 / 상세   | 425 / 765 | 복채 조정·권한·구독·삭제. **감사 로그를 남기는 유일한 화면** |
| 결제 내역          | 362       | 부분취소 반영 표시(`payment-display.ts`)·취소 손실 요약      |
| 구독 관리          | 381       | 상태 변경·복채 지급·플랜 수정                                |
| 멤버십/스토어      | 736       | 플랜·상품 가격/혜택 편집                                     |
| 웹툰 회차 / 사연   | 447 / 207 | 회차 등록·본문 업로드·사연 회신                              |
| 알림 자동화 / 공지 | 263 / 162 | 설정·수동 실행·발송 로그                                     |
| 서비스 제어        | 172       | 기능 6종 on/off + **전체 시스템 점검**                       |
| 모니터링           | 305       | 매출 3종·DAU/WAU/MAU·AI 호출·에러율·응답시간·카테고리별      |
| Gemini 사용량      | 36        | 요약·일별·액션별·최근 로그·RPM·원가 대비 판가·환율           |
| 감사 로그          | 103       | 4종 라벨(복채 조정·권한·구독·삭제) 조회                      |

---

## 2. 발견한 공백 5가지 (전부 측정 근거 있음)

### 🔴 G-1. 파는 물건을 볼 수 없다 — **최우선**

`analysis_history`(67행)·`chat_sessions`(13)·`chat_messages`(58) 를 **읽는 어드민 화면이 없다.**
코드 전체에서 `analysis_history` 를 만지는 어드민 경로는 회원 삭제 시 **DELETE 한 줄**뿐이다
(`app/admin/users/actions.ts:301`).

왜 아픈가 —

- 이틀을 «풀이 품질»에 썼는데 결과물을 확인하려면 **운영자가 직접 사용자로 로그인**해야 한다.
- 고민상담이 통째로 죽었을 때 **늦게 발견**한 이유가 이것이다. 채팅 로그가 성공만 기록해서
  프로덕션에 흔적이 없었다(15차 기록). 실패를 볼 화면이 있었으면 그날 잡혔다.
- 기록 화면이 저장분의 2/3 를 안 그리던 손실도 **DB 를 직접 조회해서** 찾았다. 화면이 있었으면
  눈으로 보였다.

### 🔴 G-2. 돈·가격 조작이 감사에 안 남는다

`logAdminAction` 은 `app/admin/users/actions.ts` **한 파일 4곳**에서만 호출된다.
`admin_audit_log` 실제 행 수 **0**.

감사 없이 실행되는 변경 조작 —

| 파일                                    | 감사 없는 조작                                                | 위험               |
| --------------------------------------- | ------------------------------------------------------------- | ------------------ |
| `admin/subscriptions/actions.ts`        | `grantTalismans` · `updateSubscriptionStatus` · 플랜 수정     | **복채 지급 = 돈** |
| `admin/membership/plans/actions.ts`     | `updateProduct` · `updateMembershipPlan` · `togglePlanStatus` | **가격·혜택 문구** |
| `admin/payments/actions.ts`             | (조회 전용이나 취소 경로가 여기로 확장될 자리)                | 환불               |
| `admin/notifications/actions.ts`        | `updateNotificationSetting` · `runManualAutomation`           | **실발송**         |
| `admin/service-control/page.tsx`        | 기능 6종 on/off · **전체 시스템 점검**                        | **전 사용자 차단** |
| `admin/announcements` · `admin/webtoon` | 공지 발행 · 회차 공개                                         | 대외 노출          |

가격·혜택 문구는 표시광고법 사안이다(9차에 한 번 사고가 났다). **누가 언제 무엇을 바꿨는지**가
남지 않으면 사후 확인이 불가능하다.

### 🟠 G-3. 취소 요청이 막히면 아무도 모른다

`payment_cancel_requests` 는 어드민 SELECT 정책까지 있는데 **화면이 없다.**
상태값에 `FAILED`·`SUBSCRIPTION_UPDATE_FAILED` 가 있다 — 사람이 손대야 끝나는 상태인데
들여다볼 자리가 없어 조용히 쌓인다. (지금 0행인 것은 아직 요청이 없어서지, 안전해서가 아니다.)

### 🟠 G-4. 파는 물건 목록을 코드로만 고친다

`shrine_item_catalog`(86행)·`shrine_theme_packs`(16)·`shrine_deities`(17) 는 **판매 상품**인데
어드민이 없다. 시드로만 관리한다. 가격 하나 바꾸려면 배포가 필요하다.

### 🟡 G-5. 표만 있고 화면도 쓰기도 없는 것들

`utm_tracking`·`funnel_events`·`coupons`·`referral_codes`·`referral_uses`·`user_vouchers`·
`roulette_config`·`business_inquiries` — 전부 **0행**.
마케팅 마스터 플랜에 「표·RPC 는 이미 있는데 쓰기·화면만 없다, **새로 만들지 말 것**」이라고
기록돼 있다. 광고 집행 전 계측 4대 전제가 여기 걸려 있다.

⚠️ `feature_costs` 표는 0행인데 코드는 `lib/domain/payment/feature-costs.ts` 를 쓴다 —
**표가 죽어 있다.** 어드민에서 단가를 만지려 할 때 이 표를 되살리려는 유혹이 생기는데,
단일 출처는 코드 쪽이다(표시=실차감 규율).

---

## 3. 착수 순서 제안

### P0 — 파는 물건을 보는 화면 (G-1)

`/admin/readings` 신설.

- 목록: 카테고리·대상·복채·모델·생성시각·점수, 실패/빈 결과 필터
- 상세: **기존 렌더러 재사용** — `components/analysis/saju/saju-reading-sections.tsx` 와
  `components/history/analysis-result-view.tsx` 를 그대로 쓴다. 세 번째 렌더러를 만들지 않는다
  (그게 이번에 고친 바로 그 사고다).
- `/admin/chats`: 세션 목록 + 대화 열람 + **실패한 호출**(현재 성공만 기록되는 문제 동반 수정)

읽기 전용으로 시작한다. 개인정보가 담긴 화면이라 **열람 자체를 감사에 남긴다**(G-2 와 함께).

### P0 — 감사 로그 전면 배선 (G-2)

- `logAdminAction` 을 위 표의 12개 조작에 배선. 액션 라벨을 `app/admin/audit/page.tsx` 의
  `ACTION_LABEL` 에 추가(지금 4종 → 12종 이상).
- **서비스 제어를 서버 액션으로 이관** — 지금은 브라우저에서 `system_settings` 를 직접 upsert 한다.
  RLS `is_admin()` 이 INSERT 에도 걸려 **권한 구멍은 아니지만**(WITH CHECK 생략 시 USING 이
  대신 쓰인다 — 실측 확인), 감사도 서버 검증도 없다. 전체 차단 스위치가 여기 있다.
- 감사 라벨은 단일 출처로. 지금 `ACTION_LABEL` 이 화면 안에 박혀 있어 액션을 늘리면 즉시 뒤처진다
  (기록 카테고리 라벨이 똑같이 뒤처졌던 전례가 있다 — `category-labels.ts` 로 해소했다).

### P1 — 취소 요청 처리대 (G-3)

`/admin/payments` 안 탭으로. `FAILED`·`SUBSCRIPTION_UPDATE_FAILED` 를 기본 필터로 띄우고
재시도·수동 종결. 처리는 전부 감사에 남긴다.

### P1 — 상품 카탈로그 편집 (G-4)

신물·테마·신위. 🔴 **자산 파일명 버전업 규율**(같은 이름 덮어쓰기 = 폰 캐시가 옛 그림 재사용)과
**배포 순서 «코드 → 자산 → 시드»** 가 여기에 그대로 걸린다. 이미지 교체 UI 를 붙이려면
그 규율을 화면이 강제해야 한다.

### P2 — 계측 화면 (G-5)

Track A(마케팅) GO 이후. **표·RPC 를 새로 만들지 않는다** — 쓰기 배선과 화면만 붙인다.

---

## 4. 손대기 전에 알아야 할 함정

- 🔴 **사연 표(`webtoon_story_submissions`)만 service_role 이다.** 원문과 연락처가 함께 있는
  유일한 표라 어드민 RLS 정책을 **일부러 안 만들었다.** "어드민인데 왜 안 되지"라며 정책을
  추가하는 건 되돌리는 결정이다.
- 🔴 **마스터 무제한은 `lib/auth/privileges.ts` 단일 기준.** `role === 'admin'` 검사를 새로
  흩뿌리지 않는다.
- 🔴 **복채 증액은 `lib/services/wallet-internal.ts` 경유.** `'use server'` export 는 공개
  엔드포인트다 — 어드민 화면이라고 지갑을 직접 쓰지 않는다.
- 🔴 **혜택·가격 문구는 `lib/domain/payment/membership-benefits.ts` 에서만 만든다.**
  화면에 숫자·주기를 직접 쓰지 않는다. 금지어 회귀 테스트가 막는다(매일·무제한·평생·모두 이용·정액).
- 🔴 **`result_json` 값을 곧바로 JSX 에 넣지 않는다** — 어드민 열람 화면도 같은 규율이다.
  `lib/domain/analysis/rich-field.ts` 를 거친다.
- ⚠️ 어드민 화면은 렌더 트리가 깊다. `jest.setup.js` 의 **DOM 중첩 게이트**가 이제 실패를 낸다 —
  `<p>` 안에 목록을 넣지 않는다.

---

## 5. CEO 결정이 필요한 것

1. **P0 두 개 중 무엇이 먼저인가** — 「파는 물건을 보는 화면」(품질 확인이 빨라진다) vs
   「감사 로그 전면 배선」(사고가 나면 되돌릴 근거가 남는다).
2. **상담 대화 열람 범위** — 전문 열람인가, 실패·신고 건만인가. 개인적인 이야기가 담긴다.
3. **상품 카탈로그 편집을 어디까지** — 가격만인가, 이미지 교체까지인가(자산 규율이 무겁다).
4. **계측 화면 착수 시점** — Track A GO 와 묶을 것인가, 먼저 깔아둘 것인가.

---

## 부록 — 어드민이 아직 못 보는 표

데이터가 있는데 화면이 없는 것: `analysis_history`(67) · `chat_messages`(58) ·
`wallet_transactions`(48) · `shrine_placements`(44) · `bok_transactions`(102) ·
`bok_missions`(293) · `shrine_item_catalog`(86) · `user_shrine_inventory`(47) ·
`shrine_deities`(17) · `shrine_theme_packs`(16) · `obangki_draws`(21) ·
`shrine_chuljeon_throws`(12) · `deity_oracles`(29) · `fortune_journal`(23)

표만 있고 데이터도 화면도 없는 것: `utm_tracking` · `funnel_events` · `coupons` ·
`referral_codes` · `referral_uses` · `user_vouchers` · `roulette_config` ·
`business_inquiries` · `payment_cancel_requests` · `feature_costs`(죽은 표)
