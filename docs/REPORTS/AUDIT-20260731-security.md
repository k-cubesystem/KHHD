# 보안 감사 — 신당 의식 3종 · 가족 좌석 · 모아보기 · 팻말 (트랙 A3)

작성: Fable | 2026-07-31 | 대상 커밋 `4691493`(R-1) `881a7e6`(R-2) `6456877`(R-3+팻말) `c0f5045`(6차) · `f508477`(가족 좌석)
방식: 읽기 전용. 코드 정독 + 라이브 DB(`plzvanxcxjkaazcfrtls`) SELECT·pg_catalog 조회 + advisor(security·performance) + 프로덕션 응답 헤더 확인.
선행 문서: `TEAM_I_REVIEW/REVIEW-20260711-opus-security-shrine.md` · `TEAM_G_DESIGN/prd/PLAN-unified-roadmap-v2.md` §5 Track S

---

## ① 요약

**신규 발견 11건** (P0 3 · P1 3 · P2 5) / **기존 잔여 4건** (2026-07-11 검토 R6·R7·R10 + Track S-1 부분).

오늘 배포분 자체는 **DB 층이 매우 견고하다.** 신규 RPC 5종은 전부 service_role 전용이고(anon·authenticated EXECUTE 불가, advisor 신규 지적 0건), 신규 테이블 3종은 SELECT-own 정책만 부여돼 클라이언트 직접 INSERT 경로가 없다. 완주 보상 이중 지급, 과금 순서 역전, 원문 유출, 프로토타입 오염 — 설계가 명시적으로 막겠다고 선언한 것은 **전부 실제로 막혀 있다**(검증 내역은 §④).

문제는 세 곳에서 나왔다.

1. **P0 세 건 중 가장 큰 것은 오늘 코드가 아니라 오늘 코드가 기대고 있는 옛 정책이다.** `shrines_update_own` 이 컬럼 제한 없는 UPDATE 를 authenticated 에 열어 두고 있고, 씬 렌더가 소유 여부를 보지 않아 **유료 신위(39,900원)·유료 테마(19,900원)를 PATCH 한 방으로 무료 착용**할 수 있다. 2026-07-11 검토가 막은 것은 `subscriptions`·`user_theme_packs` 자가발행이었고(라이브 적용 확인) 이 뒷문은 그 목록에 없었다. 하필 오늘 배포한 `saveFamilyHallSeats` 가 이 정책에 의존해 쓰기를 하므로, **정책만 지우면 좌석 저장이 깨진다 — 코드와 짝으로 고쳐야 한다.**
2. **상한 판정이 count-then-insert 라 동시요청에 뚫린다.** 마이그레이션 주석은 "이론상 무료 1건 초과"로 적어 두었으나 실제 초과분은 1이 아니라 **동시요청 수 N** 이다. 오방기는 무료분 이후 1만냥이 붙는 유료 기능이라 그대로 과금 회피가 된다.
3. **서버 액션 4종에 멤버십 게이트가 없다.** 신당 계열 게이트는 `layout.tsx` 가 페이지 렌더에만 건다. 같은 날 배포된 `family-hall.ts` 는 읽기·쓰기 양쪽에 등급 게이트를 걸었으므로 **프로젝트 자체 기준과의 불일치**이기도 하다.

오방기 시드 역산은 **가능하다(판정 YES)** — 다만 색에 재화가 걸려 있지 않아 지금은 P1이다. 색 기반 보상을 붙이는 순간 발행 취약점으로 승격한다.

헤더·CSP 는 프로덕션 응답에서 6종 전부 확인됐다(배포 후 검증 항목 해소).

---

## ② 발견 목록

| #    | 심각도 | 제목                                                   | 오늘분?                    |
| ---- | ------ | ------------------------------------------------------ | -------------------------- |
| N-1  | **P0** | `shrines` 직접 UPDATE 로 유료 신위·테마 무료 착용      | 옛 정책 / 오늘 코드가 의존 |
| N-2  | **P0** | 오방기 무료 3회 상한이 동시요청으로 뚫림 (유료 회피)   | 오늘                       |
| N-3  | **P0** | 임의 신당에 소원 위조 INSERT → 남의 사랑방 좌석 점등   | 옛 정책 / 오늘 영향 확대   |
| N-4  | P1     | 의식 서버 액션 4종에 멤버십 게이트 없음                | 오늘                       |
| N-5  | P1     | 오방기 결과를 클라가 사전 계산 가능 + 서버 색 미검증   | 오늘                       |
| N-6  | P1     | 의식 액션 전부 rate limit 미적용                       | 오늘                       |
| N-7  | P2     | `set_shrine_vow_video` 소유자 미검증 (현재 미사용)     | 오늘                       |
| N-8  | P2     | 신규 3테이블 RLS `auth.uid()` 행별 재평가 (성능)       | 오늘                       |
| N-9  | P2     | 공개 신당 행에 `hall_seats` 가 함께 노출               | 오늘                       |
| N-10 | P2     | CSP `unsafe-inline`/`unsafe-eval` · `form-action` 부재 | 기존                       |
| N-11 | P2     | REWARD_ONLY 게이트가 카탈로그 `name` 문자열에 매임     | 오늘                       |

---

### N-1 [P0] `shrines` 행 직접 UPDATE 로 유료 신위·테마 무료 착용

**근거**

- 라이브 정책: `shrines_update_own` — `UPDATE`, `USING (auth.uid() = user_id)`, **컬럼 제한 없음**. `authenticated` 는 `shrines` 에 테이블 UPDATE 전권 보유(`information_schema.role_table_grants` 확인).
- 렌더가 소유 여부를 보지 않는다:
  - `app/actions/shrine/scene.ts:399` — `const activePack = themes.find((t) => t.id === shrine.active_pack_id)`. `loadThemes`(scene.ts:312-332)가 `owned` 플래그를 계산해 두는데도 **여기서 쓰지 않는다.**
  - `app/actions/shrine/scene.ts:447-453` — `loadMainDeity` 는 `shrine_deities` 를 `id` 로만 조회. `user_deity_bonds` 는 표시용 점수로만 읽고 착용 자격 판정에 쓰지 않는다.
- 카탈로그 id 는 누구나 얻는다: `shrine_deities_read USING (is_active = true)` · `theme_packs_public_read USING (is_active = true)`.
- 값(라이브 조회): 옥황상제 `price_krw` 39,900 / 별밭 천문각 19,900.

**공격 시나리오** — 로그인 유저가 anon 키 + 자기 JWT 로 한 번:

```
PATCH /rest/v1/shrines?user_id=eq.<self>&family_member_id=is.null
{"main_deity_id":"<옥황상제 id>","active_pack_id":"<별밭 천문각 id>"}
```

→ 결제 0원으로 최상위 신위 좌정 + 최고가 테마 적용. 신당 진입 시 씬이 그대로 렌더한다.

**왜 새 발견인가** — 2026-07-11 검토 R1·R2 는 `subscriptions`·`user_theme_packs` 자가발행을 막았고 **라이브 적용이 확인된다**(두 테이블 모두 `select_own` 만 잔존). 그러나 "구매 여부를 기록하는 표"를 잠그는 것으로는 **"착용 상태를 기록하는 표"** 가 열려 있는 한 소용이 없다. `shrines` 는 그 목록에 없었다.

**수정 제안 (코드·정책 짝으로)**

1. `app/actions/shrine/family-hall.ts:159-164` `saveFamilyHallSeats` 의 UPDATE 를 `createAdminClient()` 로 전환(액션이 이미 소유자·등급을 검증하므로 안전). 다른 유저 클라이언트 쓰기 경로도 함께 전수(신당 이름·visibility·소원 카운트).
2. 그 다음 컬럼 단위로 조인다: `REVOKE UPDATE ON public.shrines FROM authenticated;` + 필요한 컬럼만 `GRANT UPDATE (…)`. 또는 `shrines_update_own` 자체를 제거하고 전 쓰기를 서버 액션(admin) 경유로 단일화(wallets 교훈과 같은 형태).
3. 방어 2중화: `scene.ts:399` 를 `themes.find(t => t.id === shrine.active_pack_id && t.owned)` 로, `loadMainDeity` 에 `user_deity_bonds`/구매 이력 확인 추가. 정책이 무너져도 화면이 착용을 인정하지 않게.

---

### N-2 [P0] 오방기 무료 3회 상한이 동시요청으로 뚫린다 — 유료 회피

**근거** — `supabase/migrations/20260730_shrine_obangki_draws.sql`(라이브 정의 일치):

```sql
insert into public.obangki_draws (user_id, color, qtype)
select p_user_id, p_color, p_qtype
where p_paid or (select count(*) from public.obangki_draws d
                 where d.user_id = p_user_id
                   and (d.drawn_at at time zone 'Asia/Seoul')::date = p_today) < p_free_limit;
```

잠금도 유니크 제약도 없는 **count-then-insert** 다. READ COMMITTED 에서 각 문장은 자기 스냅샷을 잡고, 커밋되지 않은 형제 트랜잭션의 INSERT 는 보이지 않는다.

**마이그레이션 주석의 위험 평가가 틀렸다.** 주석은 "이론상 무료 1건 초과가 가능하지만 초과분의 이득이 1만냥 한 번 덜 무는 것뿐" 이라고 적었으나, 초과분은 1이 아니라 **동시요청 수 N** 이다. 액막이(`burn_shrine_aekmak`)도 같은 구조·같은 주석이다.

**공격 시나리오** — 오늘 뽑기 0회 상태에서 `drawObangki` 서버 액션에 50개 요청을 동시에 보낸다. 50개 문장이 모두 `count = 0 < 3` 을 보고 전부 INSERT → **50회 무료**. 정가라면 47회 × 1만냥. 이후 배치는 count 가 커져 거절되지만, 매일 첫 배치를 반복하면 오방기의 유료 구간이 사실상 사라진다.

**수정 제안** — RPC 진입부에서 유저 단위 직렬화 한 줄이면 끝난다:

```sql
perform pg_advisory_xact_lock(hashtextextended('obangki:' || p_user_id::text, 0));
```

(액막이도 같은 처리. 대안: `(user_id, kst_date, seq)` 유니크 인덱스로 DB 가 초과분을 거절하게.) 어느 쪽이든 잠금 범위가 유저 1명·트랜잭션 1개라 비용은 무시할 만하다 — 주석이 걱정한 "쓰기 직렬화 비용"은 전역 직렬화를 가정한 것이었다.

---

### N-3 [P0] 임의 신당에 소원 위조 INSERT → 남의 사랑방 좌석 점등

**근거**

- 라이브 정책 `shrine_wishes.wishes_insert_any` — `INSERT`, `WITH CHECK (true)`. 대상 롤 제한 없음(anon 포함). advisor `rls_policy_always_true` WARN 으로 이미 잡혀 있다.
- 컬럼 전부 공격자 지정 가능: `shrine_id`, `wisher_user_id`, `is_owner_wish`, `wish_text`(NOT NULL). `visibility` 를 보지 않으므로 **비공개 신당도 대상**이다.
- 오늘 화면이 이 데이터를 소비한다 — 라이브 `get_family_hall_presence` 정의:
  `... WHERE sh.user_id = v_uid AND sh.family_member_id IS NOT DISTINCT FROM s.seat_member_id AND (COALESCE(sw.is_owner_wish,false) OR sw.wisher_user_id = v_uid)`
  → `is_owner_wish = true` 인 행 하나면 그 좌석이 "오늘 기도함"으로 점등된다.

**공격 시나리오** — 제3자(비로그인 포함)가 공개 신당 목록에서 `shrine_id` 를 얻어 `POST /rest/v1/shrine_wishes {shrine_id, wish_text:"…", is_owner_wish:true}`. 피해자의 사랑방에 오지도 않은 기도가 켜지고(전원 점등 시 "만개" 연출까지 오작동), 소원 목록에 임의 문구가 남는다.

**영향 경계(확인)** — `shrine_devotion`(백일기도·기원 진행도)에는 **영향 없다.** 적립은 service_role 전용 `record_shrine_devotion` 이고 `shrine_devotion` 에 쓰기 정책이 없다. 즉 위조로 트로피·보상까지 가지는 못한다.

**수정 제안** — 소원 INSERT 를 서버 액션(admin)으로 옮기고 정책 제거. 즉시 조치가 필요하면 최소한:

```sql
WITH CHECK (
  is_owner_wish IS NOT TRUE
  AND wisher_user_id IS NOT DISTINCT FROM auth.uid()
  AND EXISTS (SELECT 1 FROM shrines s WHERE s.id = shrine_id AND s.visibility = 'public')
)
```

---

### N-4 [P1] 의식 서버 액션 4종에 멤버십 게이트가 없다

**근거** — `app/actions/shrine/rituals.ts` 의 `burnAekmak`(:135) `drawObangki`(:270) `startBaekilVow`(:515) `settleBaekilVow`(:576) 은 전부 `supabase.auth.getUser()` 만 확인하고 `getCurrentUserMembership()` 을 부르지 않는다(파일에 import 자체가 없다). 신당 계열 게이트는 `app/protected/shrine/layout.tsx` 가 **페이지 렌더에만** 건다 — 서버 액션은 그 레이아웃을 지나가지 않는다.

대조군이 같은 날 배포분 안에 있다: `app/actions/shrine/family-hall.ts:103-106`(읽기)·`:147-149`(쓰기)는 `FAMILY_HALL_TIERS` 로 등급을 검사한다. 즉 **프로젝트 자체 기준(`lib/auth/subscription.ts` 단일 기준)과의 불일치**다.

**공격 시나리오** — 멤버십 없는 로그인 유저가 공개 청크(`/_next/static/chunks/**`)에서 액션 ID 를 추출해 `Next-Action` 헤더로 POST. 얻는 것: 액막이·오방기 무료분(무료 기능이라 손실 작음), 그리고 **백일기도 완주 보상 「백일 소원끈」(정가 5만냥)** 까지의 경로. 완주에는 기원 100일이 필요해 즉시 이득은 아니지만, 멤버십 게이팅이 수익 모델의 축인 이상 구멍은 구멍이다.

**수정 제안** — 4개 액션 진입부에 `family-hall.ts` 와 같은 두 줄. 게이트 기준은 `lib/auth/subscription.ts` 하나만 쓴다(role 검사 새로 만들지 않기).

---

### N-5 [P1] 오방기 결과는 클라이언트에서 사전 계산 가능하다 — 판정: **예측 가능(YES)**

**근거 (요청하신 "실제로 가능한지" 판정)**

1. 서버가 시드를 그대로 내려보낸다 — `app/actions/shrine/rituals.ts:235` `seed: dailySeed(user.id, today)`. `getObangkiStatus` 의 반환값은 `/protected/shrine/obangki` 의 RSC 페이로드에 실려 **개발자도구 없이 페이지 소스에서 읽힌다.**
2. 색 배열을 클라가 만든다 — `components/shrine/scene/ObangkiSheet.tsx:109-112`
   `const seed = drawSeed(status.seed, seq)` → `const flags = shuffleFlags(seed)` → `const slots = assignOptions(filled.length, seed)`.
   `drawSeed`·`shuffleFlags`·`assignOptions` 는 `lib/domain/ritual/obangki.ts` 의 순수 함수이고 **클라이언트 번들에 그대로 실린다.**
3. 따라서 뽑기 전에 "n번째 자리 = 무슨 색 · 어느 선택지" 가 전부 결정돼 있고 화면이 이미 그 값을 들고 있다. `seq` 도 서버가 준 `todayCount` 라 다음 회차까지 미리 계산된다.
4. 서버는 클라가 보낸 색을 검증하지 않는다 — `drawObangki(color, qtype, confirmPaid)`(rituals.ts:270-289)는 `isObangkiColor` 타입 가드만 통과시키고 시드와 대조하지 않는다. 즉 **역산 없이 원하는 색을 그냥 보내도 기록된다.**

DOM 자체는 깨끗하다(말아둔 5기가 전부 같은 스프라이트 — ObangkiSheet.tsx:577-593, `aria-label` 도 순번뿐). 하지만 DOM 이 아니라 페이로드+번들이 답을 갖고 있다.

**왜 P0 이 아닌가** — 색에 재화가 걸려 있지 않다. 대길을 뽑아도 지급되는 것이 없고, 공유 보상은 색과 무관한 `claimShareReward`(무인자·서버 고정 금액·KST 1회·rate limit)를 탄다. 손상되는 것은 유료(1만냥) 기능의 **결과 무결성**이다.

**수정 제안** — 색 결정을 서버로 옮긴다. 원문 무저장 규율은 그대로 지킬 수 있다: 서버는 `flagIndex → color` 배정과 `optionIndex` 만 정해 응답에 실으면 되고(선택지 텍스트는 여전히 화면을 떠나지 않는다), 시드는 내려보내지 않는다. 그 전까지의 임시 조치로도 최소한 `dailySeed` 대신 **회차별 서버 확정 결과**를 내리는 편이 낫다. 색 기반 보상을 붙일 계획이 생기면 이 항목은 자동으로 P0 으로 승격한다.

---

### N-6 [P1] 의식 액션에 rate limit 이 없다

**근거** — `app/actions/shrine/rituals.ts` 에 `lib/utils/rate-limit` import 없음. 적용된 곳은 결제(`payment.ts`)·구독·바우처·비즈니스 문의·AI 채팅·공유 보상(`bok-grant.ts`)·OTP 콜백이다.

**왜 하루 상한 RPC 로 부족한가** — 상한 RPC 는 **성공한 기록만** 센다. 거절된 호출은 카운트되지 않으므로, 상한을 넘긴 뒤에도 매 호출이 `count(*)` 2회 + INSERT 시도를 돌린다. `settleBaekilVow` 는 매 호출이 UPDATE 를 시도한다(멱등이라 결과는 안전하지만 비용은 든다). N-2 의 동시요청 공격과 결합하면 그대로 증폭기가 된다.

**수정 제안** — 4개 액션 진입부에 `rateLimit(`ritual:${user.id}`, { interval: 60_000, uniqueTokenPerInterval: 30 })`. Track S-1 의 잔여 범위에 "의식 액션"을 추가.

---

### N-7 [P2] `set_shrine_vow_video` 에 소유자 검증이 없다 (현재 미사용)

**근거** — 라이브 정의: `update public.shrine_vows set video_status=…, video_url=… where v.id = p_vow_id and v.completed_at is not null`. `p_user_id` 인자가 없다.

**현재 악용 경로 0** — service_role 전용(`anon_exec=false, authed_exec=false`)이고 앱 코드 어디서도 호출하지 않는다. 테스트가 미참조를 강제한다(`lib/domain/ritual/__tests__/baekil.test.ts:551`).

**리스크는 다음 차수** — 렌더 파이프라인이 붙으면서 `vowId` 를 클라이언트에서 받는 얇은 액션으로 감싸는 순간 IDOR(남의 트로피에 영상 심기) + 임의 `video_url` 주입이 된다. 지금 `p_user_id uuid` 인자를 추가하고 `and v.user_id = p_user_id` 를 거는 편이 압도적으로 싸다.

---

### N-8 [P2] 신규 3테이블 RLS 가 `auth.uid()` 를 행마다 재평가 (performance advisor 신규 3건)

performance advisor 총 232건 중 오늘분 신규는 `auth_rls_initplan` 3건이다 — `shrine_aekmak_logs_select_own` · `obangki_draws_select_own` · `shrine_vows_select_own`. 기존 86건과 같은 유형(전체 89건). `(select auth.uid())` 로 감싸면 해소.

**인덱스는 적정 — 신규 지적 0건.** 실제 조회 패턴과 일치한다:

- `shrine_aekmak_logs_user_burned_idx (user_id, burned_at DESC)` ← 이달 범위 조회(rituals.ts:95-101)
- `obangki_draws_user_drawn_idx (user_id, drawn_at DESC)` ← 오늘 범위 조회(rituals.ts:217-222)
- `shrine_vows_user_round_idx (user_id, round DESC)` + `shrine_vows_one_active_idx (user_id) WHERE completed_at IS NULL` ← 트로피 목록·활성 서약 판정
- 신규 테이블에 `unindexed_foreign_keys`·`unused_index` 지적 없음(기존 `shrines`/`user_shrine_inventory` 항목만 잔존).

---

### N-9 [P2] 공개 신당 행에 `hall_seats` 가 함께 나간다

`shrines_public_read USING (visibility = 'public' OR auth.uid() = user_id)` 는 컬럼을 가리지 않으므로 anon 이 `GET /rest/v1/shrines?select=*` 로 공개 신당의 `hall_seats` 를 읽는다. 키가 `family_members.id` UUID 라 **이름·관계는 새지 않지만** "가족 N명 등록" 이라는 사실과 내부 식별자가 노출된다.

라이브 데이터 확인: 공개 4행(전부 본인 신당) 중 좌석 보유 1행, 가족별 신당 5행은 **전부 private**. 가족 이름 노출은 없다 — 다만 그 방어가 DB 제약이 아니라 생성 시 코드 기본값(`scene.ts:363-368` `visibility:'private'`)이라는 점만 남는다. `shrines.visibility` 의 컬럼 기본값은 `'public'` 이므로, 가족 신당을 만드는 경로가 하나라도 늘면 조용히 공개된다.

수정(선택): 공개 조회를 컬럼 화이트리스트 뷰/RPC 로 좁히고, 가족 신당은 `CHECK (family_member_id IS NULL OR visibility = 'private')` 로 DB 가 강제.

---

### N-10 [P2] 헤더·CSP — 프로덕션 적용 확인, 잔여 3가지

**배포 후 검증 항목 해소.** `https://k-haehwadang.com/` 응답에서 6종 확인: `Content-Security-Policy` · `Strict-Transport-Security: max-age=31536000; includeSubDomains` · `X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · `Referrer-Policy` · `Permissions-Policy`. `next.config.ts:43-105` 정의와 일치.

잔여(전부 기존·P2):

- `script-src` 에 `'unsafe-inline'` + `'unsafe-eval'`(next.config.ts:71) — XSS 완화가 사실상 무력. nonce 방식 전환은 별 작업.
- `form-action` 디렉티브 없음 → `default-src 'self'` 로 대체되지 않는다(form-action 은 default-src 를 상속하지 않음). 외부 폼 전송 차단이 비어 있다.
- `http://dapi.kakao.com`(평문)이 `script-src`·`connect-src`·`frame-src` 에 있다(:71,:75,:76). 브라우저가 혼합 콘텐츠로 막으므로 실효는 없지만 정책 표면이 넓다.
- HSTS 에 `preload` 없음(도메인 등록 정책과 함께 결정할 사항).

---

### N-11 [P2] REWARD_ONLY 게이트가 카탈로그 `name` 문자열에 매여 있다

`app/actions/shrine/inventory.ts:118` — `if (item.name === BAEKIL_ITEM_NAME) return { success: false, error: 'REWARD_ONLY' }`. 지급 쪽 RPC 도 이름으로 찾는다(`complete_shrine_vow` … `where c.name = p_item_name`).

카탈로그에 `code` 컬럼이 없어 내린 결정이고 주석도 사유를 정확히 적어 두었다(가격 0·비활성 둘 다 안 되는 이유). 다만 **이름 하나가 판매 차단과 보상 지급의 공통 키**라, 시드가 재실행되며 이름이 바뀌면 ①보상 지급이 조용히 실패하고 ②정가 5만냥 보상 전용 품목이 **판매 가능 상태로 열린다**. 방향: 카탈로그에 `code`(또는 `is_reward_only` boolean) 컬럼 추가. 지금 당장의 악용 경로는 없다.

---

## ③ 검증 결과 — 설계가 막겠다고 한 것들 (전부 통과)

이 절은 "문제 없음"의 근거다. 다음 감사에서 재확인 비용을 줄이기 위해 남긴다.

| 항목                     | 결과 | 근거                                                                                                                                                           |
| ------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 신규 RPC 5종 ACL         | ✅   | `proacl = {postgres=X, service_role=X}` — anon·authenticated EXECUTE **전부 false**. security advisor 신규 지적 0건                                            |
| 신규 RPC 5종 search_path | ✅   | 5종 모두 `SECURITY DEFINER` + `SET search_path TO 'public'`                                                                                                    |
| 신규 테이블 RLS          | ✅   | `shrine_aekmak_logs` / `obangki_draws` / `shrine_vows` 전부 RLS on + `select_own` 정책만. INSERT/UPDATE/DELETE 정책 미부여 → PostgREST 직접 쓰기 불가          |
| 완주 보상 이중 지급      | ✅   | `complete_shrine_vow` 의 `UPDATE … WHERE completed_at IS NULL` 이 동시 호출을 행 잠금으로 직렬화 → 2번째는 0행 → 지급 블록 미진입. 트로피=행 자체라 구조적 1개 |
| 서약 병렬 개설           | ✅   | 부분 유니크 `shrine_vows_one_active_idx (user_id) WHERE completed_at IS NULL` 이 동시 개설을 DB 에서 거절                                                      |
| 진행도 클라 미신뢰       | ✅   | `start_shrine_vow`·`complete_shrine_vow` 가 `shrine_devotion` 을 서버에서 직접 읽는다. 액션은 인자를 받지 않는다(rituals.ts:515·576)                           |
| 오방기 과금 순서         | ✅   | 무료 시도 → **응답 파싱 성공 확인**(`readDrawRow.parsed`, rituals.ts:342-350) → 명시 동의 → 차감 → 기록 실패 시 환불. "못 읽음"과 "거절"을 분리한 판단이 정확  |
| 재화 지급 경로 노출      | ✅   | `'use server'` 파일에 지급 함수 없음. 지급은 server-only `lib/services/ritual-grant.ts`·`bokchae.ts` 만                                                        |
| 원문 미전송              | ✅   | 액션 인자는 태그 / 색·질문유형 / 무인자. 3개 테이블에 텍스트 컬럼 자체가 없음(라이브 스키마 확인)                                                              |
| 좌석 입력 검증           | ✅   | `parseHallSeats`(family-hall-layout.ts:245-260) — 키 길이 ≤64, `__proto__`·`constructor`·`prototype` 차단, 항목 8개 상한, 서버 재클램프. **우수**              |
| 좌석 IDOR                | ✅   | `saveFamilyHallSeats` 가 등급 게이트 + `user_id = auth.uid()` + `family_member_id IS NULL` 3중. RLS 가 4중                                                     |
| 모아보기 가족 파라미터   | ✅   | `collection/page.tsx:75-83` 이 `member` 를 `family_members` 소유 검증 후에만 사용, 실패 시 본인으로 폴백                                                       |
| 팻말 DOM                 | ✅   | `lib/domain/shrine/plaque.ts` 는 전부 정적 상수(좌표·라벨). 사용자 데이터 0                                                                                    |
| 에러 누출                | ✅   | 액션은 열거형 코드만 반환, 원본 에러는 `logger` 로만. `console.log` 단독 처리 없음                                                                             |
| GA 스푸핑 영향           | ✅   | `trackEvent` 는 클라 GA4 전용이며 서버 신뢰 경로가 아니다. 공유 보상은 `claimShareReward`(무인자·서버 고정 금액·KST 1회·rate limit) → 영향은 분석 오염뿐       |

---

## ④ 기존 Track S · 2026-07-11 검토 잔여 현황 (라이브 대조)

### 2026-07-11 검토(REVIEW-20260711) 항목

| #   | 내용                           | 당시 상태          | **오늘 라이브 확인**                                                                                                                                                                                         |
| --- | ------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `subscriptions` 자가발행       | 파일(배포 후 적용) | ✅ **해소** — `subscriptions_select_own` 만 잔존                                                                                                                                                             |
| R2  | `user_theme_packs` 자가발행    | 파일(배포 후 적용) | ✅ **해소** — `user_theme_packs_select_own` 만 잔존                                                                                                                                                          |
| R3  | 프리미엄 통화 누수             | 코드 가드          | ✅ 가드 소멸(단일 통화 복채로 전환 완료, `PREMIUM_CURRENCY_READY` 잔재 0건). 단 **N-1 로 무료 착용 뒷문 존재**                                                                                               |
| R4  | `daily_usage_logs` 자가리셋    | 코드+파일          | ✅ **해소** — `daily_usage_logs_select_own` 만 잔존                                                                                                                                                          |
| R5  | 복 차감 원자화                 | 완료               | ✅ `deduct_bok_points` service_role 전용 유지                                                                                                                                                                |
| R6  | 거래로그 위조                  | 의도적 보류        | ❌ **잔여** — `wallet_tx_insert_own` · `bok_tx_insert_own`(WITH CHECK auth.uid()=user_id) 살아 있음. 잔액 불변이라 mint 아님, 내역 UI·매출 분석 오염                                                         |
| R7  | `admin ?? supabase` 폴백       | 보류               | ⚠️ **잔여, 위험도 상승** — `attendance.ts:55,92,242,306` · `daily-check.ts:40,80`. S1b 가 라이브 적용된 지금은 키 부재 시 재화 쓰기가 **조용히 실패**한다(당시엔 무해했음). `admin` 이 null 이면 하드 실패로 |
| R8  | 좌정 경쟁                      | 스킵(무해)         | — 유지                                                                                                                                                                                                       |
| R9  | `updateSubscriptionStatus`     | 코드 적용          | ✅ 유지                                                                                                                                                                                                      |
| R10 | 엣지함수 wallets/subscriptions | 미확인             | ⚠️ **여전히 미확인** — 배포·활성 여부 확인 필요                                                                                                                                                              |

### 로드맵 v2 Track S

| #   | 내용                       | 현황                                                                                                                                  |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| S-1 | rate limit 확장            | **부분 완료.** 결제·구독·바우처·문의·AI채팅·공유보상·OTP(`auth/callback`,`auth/confirm`) 적용. **잔여: 오늘 신설 의식 액션 4종(N-6)** |
| S-2 | 업로드 매직바이트 검증     | ✅ **완료** — `lib/security/magic-bytes.ts` 를 `app/actions/ai/image.ts:12` 가 사용, 테스트 존재                                      |
| S-3 | DNS·SPF/DKIM/DMARC·WAF·2FA | 외부 콘솔 작업 — 에이전트 범위 밖, 미확인                                                                                             |
| S-4 | 구독 지급분 캡             | 결정 "현행 유지"(2026-07-29) — 조치 불요                                                                                              |

### advisor 요약 (오늘분 신규 구분)

- **security**: WARN·INFO 총 30건. **오늘 배포로 늘어난 항목 0건** — 신규 RPC 5종은 service*role 전용이라 `anon*/authenticated_security_definer_function_executable` 목록에 등장하지 않는다.
기존 지적 그대로: anon 실행 가능 SECURITY DEFINER 4종(`is_admin`, `check_shrine_family_owner`, `get_shared_analysis_record`, `increment_shrine_visitor`) / authenticated 실행 가능 24종 / `rls_policy_always_true`4건(그중`shrine_wishes.wishes_insert_any` 가 **N-3**) / RLS-무정책 2건(`rate_limit_entries`, `saju_context_cache` — 둘 다 service_role 전용 테이블이라 의도된 상태).
  - 참고로 재화가 걸린 authenticated SECURITY DEFINER 는 전부 자기검사를 갖고 있음을 재확인했다: `increment_daily_attendance`·`record_ai_chat_turn`·`process_referral_bonus` 모두 `IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN RAISE`.
- **performance**: 총 232건(`auth_rls_initplan` 89 / `multiple_permissive_policies` 67 / `unused_index` 55 / `unindexed_foreign_keys` 20 / 기타 1). **오늘분 신규는 `auth_rls_initplan` 3건(N-8)뿐.** 신규 테이블 인덱스 설계 자체는 지적 0건.

---

## ⑤ 총평

오늘 배포분의 **DB 층 설계는 이 저장소에서 가장 잘 된 축**이다. "쓰기 정책을 주지 않는다 / 지급은 server-only 모듈만 한다 / 액션은 인자를 받지 않는다 / 판정과 기록을 한 문장에" 라는 네 규율이 실제로 지켜졌고, 라이브 ACL·RLS·advisor 어느 쪽에서도 오늘 늘어난 보안 지적이 없다. 완주 보상 이중 지급, 과금 순서 역전, 원문 유출, 프로토타입 오염처럼 **작성자가 막겠다고 선언한 것은 하나도 뚫리지 않았다.**

뚫린 셋은 성격이 다르다.

- **N-1 은 새 기능이 옛 정책에 올라탄 자리에서 났다.** `saveFamilyHallSeats` 는 스스로는 3중 검증을 하지만, 그 쓰기를 가능케 하는 `shrines_update_own` 이 같은 행의 `main_deity_id`·`active_pack_id` 까지 열어 두고 있었고 씬 렌더가 소유 여부를 보지 않았다. 7/11 검토가 "구매 기록 표"를 다 잠갔는데 **"착용 상태 표"가 남아 있었다** — 자가발행 감사를 재화 테이블 단위가 아니라 **"돈을 낸 결과가 어디에 기록되는가"** 단위로 다시 훑어야 한다는 신호다.
- **N-2 는 위험 평가의 산술 오류다.** 코드도 주석도 경합을 인지했는데 초과분을 "1건"으로 계산했다. 실제 상한은 동시요청 수이고, 그래서 "직렬화 비용이 더 크다"는 결론까지 함께 뒤집힌다(필요한 것은 전역 직렬화가 아니라 유저 단위 advisory lock 한 줄이다). 같은 패턴이 액막이에도 복사돼 있으므로 **한 번의 판단 오류가 두 곳에 퍼졌다.**
- **N-4 는 게이트가 페이지에만 걸려 있다는 구조적 문제다.** 같은 커밋 안에 올바른 사례(`family-hall.ts`)가 있어 더 아깝다.

**권장 순서**: N-1(코드+정책 짝) → N-2(RPC 한 줄, 액막이 동시 수정) → N-3(정책 축소) → N-4·N-6(액션 진입부 4곳) → 나머지 P2. N-1 은 배포 순서가 중요하다 — 7/11 교훈대로 **코드(admin 전환) 배포 → 좌석 저장 회귀 확인 → 정책/GRANT 축소** 순으로.

> 한 줄: **오늘 만든 문은 전부 제대로 잠갔다. 새 문이 기대고 선 옛 벽(`shrines` UPDATE)과, 상한을 세는 방식(count-then-insert)이 뚫려 있다.**
