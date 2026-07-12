-- ============================================================
-- S1b 후속 R1: subscriptions 자가발급 차단 (무료 유료멤버십 mint 벡터)
--
-- ⚠️ 적용 순서 엄수: 이 마이그레이션은 "빌링 상태머신 admin 전환" 코드
--    (app/actions/payment/subscription.ts — createBillingAuthUrl /
--     issueBillingKey / executeFirstPayment / cancelSubscription /
--     reactivateSubscription / changeBillingMethod 전부 service_role 쓰기)
--    가 프로덕션에 배포된 뒤에만 적용할 것.
--    먼저 적용하면 구독 생성/활성화/해지 플로우가 즉시 장애.
--
-- 공격 벡터(현재 라이브에 열려 있음):
--   POST /rest/v1/subscriptions {user_id: 본인, status:'ACTIVE', tier:...}
--   → 결제 없이 최상위 멤버십 자가발급 (REVIEW-20260711 R1)
--
-- 정당한 쓰기 경로는 전부 admin/웹훅/크론(service_role) — 정책 제거해도 무영향.
-- subscriptions_select_own(SELECT)은 유지.
-- ============================================================

DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_update_own ON public.subscriptions;
