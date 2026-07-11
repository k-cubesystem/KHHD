-- ============================================================================
-- Track S1b — 재화 무결성 하드닝
-- ⚠️⚠️⚠️  코드 배포 후에만 적용할 것 (지금 적용 금지)  ⚠️⚠️⚠️
-- ============================================================================
-- 선행조건: "재화 쓰기를 admin(service_role) 클라이언트로 전환" 커밋이 프로덕션에 배포되어야 함.
--   (wallet.ts / bok-points.ts / inventory.ts / roulette.ts / attendance.ts /
--    daily-check.ts / products.ts / scene.ts / gemini-rate-limiter.ts /
--    admin/subscriptions/actions.ts — 전부 admin 클라이언트로 전환 완료, 커밋됨)
-- 지금(미배포) 적용하면 현재 프로덕션 코드의 "인증 클라이언트 재화 쓰기"가 즉시 실패 → 보상/충전/구매 장애.
--
-- 적용 순서: ① 코드 배포(사용자 승인) → ② 프로덕션에서 재화 기능 회귀 확인 → ③ 이 마이그레이션 적용.
-- 적용 방법: mcp__supabase__apply_migration 또는 supabase db push.
-- 검증: get_advisors(security) 에서 authenticated_security_definer(MINT) 및
--       wallets/bok_points 자가쓰기 경로 해소 확인 + anon curl 재화 RPC 거부.
-- 근거: TEAM_H_SECURITY/SECURITY-DESIGN-v2.md §S1-3, get_advisors 실측.
-- ============================================================================

-- 1. MINT/자산 함수 authenticated EXECUTE 회수 (service_role 전용화)
--    (anon/PUBLIC 는 S1a 에서 이미 회수됨)
REVOKE EXECUTE ON FUNCTION public.add_wallet_balance(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_wallet_balance(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_bok_points(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_talisman(uuid, integer, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_shrine_item(uuid, uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.acquire_gemini_token() FROM authenticated;

-- 2. 재화/자산/할당량 테이블 직접 쓰기 정책 제거
--    (SELECT 본인만 유지, 모든 쓰기는 service_role 또는 SECURITY DEFINER RPC 경유)

-- wallets: 잔액 자가 UPDATE/INSERT 차단 (핵심 — 복채 자가발행 봉쇄)
DROP POLICY IF EXISTS wallets_update_own ON public.wallets;
DROP POLICY IF EXISTS wallets_insert_own ON public.wallets;
-- (wallets_select_own 유지: 본인 잔액 조회)

-- bok_points: 복포인트 자가 UPDATE/INSERT 차단
DROP POLICY IF EXISTS bok_points_update_own ON public.bok_points;
DROP POLICY IF EXISTS bok_points_insert_own ON public.bok_points;
-- (bok_points_select_own 유지)

-- user_shrine_inventory: ALL(insert/update/delete/select) → SELECT 본인만
--   지급은 grant_shrine_item(SECURITY DEFINER) + 스타터킷(admin) 경유.
DROP POLICY IF EXISTS inventory_own ON public.user_shrine_inventory;
CREATE POLICY inventory_select_own ON public.user_shrine_inventory
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ai_chat_usage: ALL → SELECT 본인만 (증가는 increment_ai_chat_usage/record_ai_chat_turn = SECURITY DEFINER)
DROP POLICY IF EXISTS ai_chat_usage_all_own ON public.ai_chat_usage;
CREATE POLICY ai_chat_usage_select_own ON public.ai_chat_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 3b. 추가 자가발행 벡터 차단 (Fable 검토 R1·R2·R4)
--     S1b 최초본이 놓친 "유저 쓰기 가능 가치 테이블" — 같은 방식으로 조인다.
--     정당한 쓰기는 전부 admin/웹훅/크론(service_role) 경유임을 확인함.
-- ============================================================

-- subscriptions: 결제 없이 유료 멤버십 자가발급 차단 (R1, mint급)
--   정당 쓰기 = 웹훅(toss)/크론(billing)/admin 뿐. 유저클라 정당 insert 없음.
DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_update_own ON public.subscriptions;
-- (subscriptions_select_own 유지: 본인 구독 조회)

-- user_theme_packs: 유료 테마팩 자가지급 차단 (R2). 지급은 purchaseThemePack(admin) 경유.
DROP POLICY IF EXISTS user_theme_packs_own ON public.user_theme_packs;
CREATE POLICY user_theme_packs_select_own ON public.user_theme_packs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- daily_usage_logs: 일일 소비한도 자가리셋 차단 (R4). 기록은 incrementDailyUsage(admin) 경유.
--   ⚠️ 선행: incrementDailyUsage 를 admin 클라이언트로 전환한 코드가 배포돼 있어야 함(커밋 포함).
DROP POLICY IF EXISTS daily_usage_logs_all_own ON public.daily_usage_logs;
CREATE POLICY daily_usage_logs_select_own ON public.daily_usage_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
