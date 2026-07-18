-- 관리자 대시보드 집계 RPC (A2) — 행 전량 로드+클라 합산 대신 DB 집계 1콜
-- 근거: TEAM_G_DESIGN/prd/PLAN-improvement-roadmap-v1.md §A A2
-- 총회원 1000명 캡(listUsers) 제거, 매출은 SUM, 활성구독·MRR·오늘가입 추가. is_admin() 가드.

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today timestamptz := date_trunc('day', now());
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN: admin only';
  END IF;

  SELECT jsonb_build_object(
    'totalUsers', (SELECT count(*) FROM public.profiles),
    'todaySignups', (SELECT count(*) FROM public.profiles WHERE created_at >= v_today),
    'totalRevenue', (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'completed'),
    'todayRevenue', (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'completed' AND created_at >= v_today),
    'monthRevenue', (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'completed' AND created_at >= date_trunc('month', now())),
    'activeSubscriptions', (SELECT count(*) FROM public.subscriptions WHERE status = 'ACTIVE'),
    'mrr', (SELECT COALESCE(SUM(mp.price), 0) FROM public.subscriptions s JOIN public.membership_plans mp ON mp.id = s.plan_id WHERE s.status = 'ACTIVE'),
    'totalAnalyses', (SELECT count(*) FROM public.analysis_history)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated, service_role;
