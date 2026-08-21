# TODOS

이월된 작업. 각 항목은 3개월 뒤에 처음 보는 사람도 착수할 수 있게 맥락을 포함한다.

## T-1 · `createAdminClient` 로컬 재정의 4곳을 정본으로 통합

**What** — `app/actions/payment/` 의 `attendance.ts:11` · `daily-check.ts:6` · `products.ts:10` ·
`subscription.ts:91` 에 있는 로컬 `createAdminClient` 정의를 삭제하고 `@/lib/supabase/admin`
정본으로 교체. `const db = admin ?? supabase` 무증상 폴백 제거.

**Why** — 로컬 버전은 키가 없으면 `null` 을 돌려 유저 권한 클라이언트로 조용히 폴백한다.
정본은 같은 상황에서 `throw` 해서 고장을 보이게 만든다. 라이브 DB 실측(2026-08-21):
`wallets` · `bok_points` 에는 SELECT 정책만 있고, 화폐 RPC(`add_bokchae` · `add_bok_points` ·
`deduct_wallet_balance` · `add_wallet_balance`)의 `proacl` 은 `{postgres=X,service_role=X}` —
`authenticated` · `anon` 은 EXECUTE 거부. 따라서 유저 클라이언트로 떨어지는 순간 모든 재화
쓰기가 실패하는데 화면엔 「출석 완료」가 뜬다.

**Context** — 모범 사례가 같은 레포 안에 있다: `app/actions/shrine/devotion.ts` · `rituals.ts` ·
`lib/services/bokchae.ts` 는 이미 정본 import + admin client 로 RPC 를 부른다.

**Depends on / blocked by** — 없음. 결제 경로를 건드리므로 `npm run e2e` 의 payment 스펙 통과가
머지 조건.

**출처** — /gstack-plan-eng-review 2026-08-21, 결정 6A(새 코드만 정본, 기존은 분리).

## T-2 · `activity_logs` 중복 인덱스 3개 정리

**What** — 라이브 DB `activity_logs` 인덱스 8개 중 3개가 잉여. 삭제 후보:
`idx_activity_logs_type_time`(= `idx_activity_logs_type_created` 와 정의 완전 동일,
둘 다 `(activity_type, created_at DESC)`), `idx_activity_logs_type`(접두사 중복),
`idx_activity_logs_user`(접두사 중복 — 단 partial 조건이 달라 사전 확인 필요).

**Why** — 삽입마다 인덱스 8개를 전부 갱신한다. 의례 루프가 서버측 기록을 추가하면 쓰기가
늘어나는 테이블이다. 읽기 성능은 안 떨어진다 — 지우는 것들이 전부 다른 인덱스에 포함된다.

**유지해야 하는 것** — `idx_activity_logs_user_created (user_id, created_at DESC)
WHERE user_id IS NOT NULL`. 의례 장부의 월별 집계 조회가 이 인덱스를 쓴다.

**Depends on / blocked by** — 삭제 전 어드민 대시보드 쿼리가 `idx_activity_logs_user` 에
의존하는지 `EXPLAIN` 으로 확인.

**출처** — /gstack-plan-eng-review 2026-08-21, 성능 리뷰 실측(pg_indexes).
